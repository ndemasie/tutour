import { fetchRepo, RepoFile } from "@/data/github";
import { moveCompletionSelection } from "@codemirror/autocomplete";
import { Text } from "@codemirror/state";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
} from "solid-js";
import { createStore, Store } from "solid-js/store";

/* Each state factory exposes a serialized getter that returns
 * a corresponding data type. This in turn can be passed as an argument
 * to the state factory to deserialize it.
 */

const fileTypes = ["ts", "js", "tsx", "jsx", "json", "md", "html", "css"];
export type FileType = typeof fileTypes[number];

export type FilePath = `${string}.${FileType}`;

export function isFilePath(path: string): path is FilePath {
  return fileTypes.some((type) => path.endsWith(`.${type}`));
}

export function getFileType(path: FilePath): FileType {
  const parts = path.split(".");
  return parts[parts.length - 1] as FileType;
}
// TODO: reimplement CodeLinks. They probably make more sense being stored in the SlideState, and use a Context to interact them beneath.
export interface CodeLink {
  from: number;
  to?: number;
  startLine?: number;
  endLine?: number;
  id: string;
  name: string;
}

export interface CodeLinkWithPath extends CodeLink {
  pathName: FilePath;
}

export type FileData = Readonly<{
  id: string;
  doc: string;
  path: string;
  opened: boolean;
}>;

function createFileState({ id, doc, path, opened }: FileData) {
  const [getDocument, setDocument] = createSignal(doc);
  const [getPath, setPath] = createSignal(path);
  const [getOpened, setOpened] = createSignal(opened);

  const serialized = createMemo<FileData>(() => {
    return {
      id,
      opened: getOpened(),
      doc: getDocument(),
      path: getPath(),
    };
  });

  const [saved, setSaved] = createSignal(0);
  const save = () => setSaved(Date.now());
  save();
  // const [state, setState] = createStore<FileData>({
  //   doc,
  //   pathName,
  //   codeLinks: Object.fromEntries(
  //     codeLinks.map((codeLink) => [codeLink.id, codeLink])
  //   ),
  // });
  return {
    get doc() {
      return getDocument();
    },
    get pathName() {
      return getPath();
    },
    get serialized() {
      return serialized();
    },
    get opened() {
      return getOpened();
    },
    get saved() {
      return saved();
    },
    id,
    save,
    close() {
      setOpened(false);
    },
    setDoc(newDoc: Text) {
      const string = newDoc.sliceString(0);
      setDocument(string);
    },
    setPathName(newPath: FilePath) {
      if (getPath() === newPath) return false;
      setPath(newPath);
      save();
    },
  };
}

export type FileState = ReturnType<typeof createFileState>;

export type FileSystemData = Readonly<{
  files: FileData[];
}>;

export function createFileSystem(data?: FileSystemData) {
  //TODO: this will cause conflicts if you deserialize e.g. [{id: 1, id: 3, id: 4}]
  let idCounter = data?.files.length || 0;
  const [files, setFiles] = createStore<{ [id: string]: FileState }>(
    data
      ? Object.fromEntries(
          data.files.map((f) => {
            return [f.id, createFileState(f)];
          })
        )
      : {}
  );

  const [currentFileId, setCurrentFileId] = createSignal<string>(null);

  const filesSaved = createMemo(() => {
    const mappedEntries = Object.entries(files).map(([id, file]) => [
      id,
      file.saved,
    ]);
    return Object.fromEntries(mappedEntries);
  });

  const serialized = createMemo<FileSystemData>(() => ({
    files: Object.values(files).map((file) => file.serialized),
  }));

  const addFile = (args: Omit<FileData, "id" | "opened">) => {
    const newFile = createFileState({
      id: (++idCounter).toString(),
      opened: isFilePath(args.path),
      ...args,
    });
    setFiles(newFile.id, newFile);
    return newFile;
  };

  const removeFile = (id: string) => {
    setFiles(id, undefined);
  };

  const renameFile = (id: string, newPathName: FilePath) => {
    files[id]?.setPathName(newPathName);
  };

  return {
    get filesSaved() {
      return filesSaved();
    },
    get fileList() {
      return Object.values(files);
    },
    get isEmpty() {
      return Object.values(files).length === 0;
    },
    get serialized() {
      return serialized();
    },
    get currentFileId() {
      return currentFileId();
    },
    setCurrentFileId,
    addFile,
    removeFile,
    renameFile,
  };
}

export type FileSystemState = ReturnType<typeof createFileSystem>;
// const mapWithPath = (file: FileState) =>
//   file.codeLinks.map((codeLink) => ({ ...codeLink, pathName: file.pathName }));

export type SlideData = Readonly<{
  fs: FileSystemData;
  md: string;
}>;
export function createSlideState(data?: Partial<SlideData>) {
  //Setter will be used when importing file system from GitHub
  const [getFileSystem, setFileSystem] = createSignal(
    createFileSystem(data?.fs)
  );

  const [getMarkdown, setMarkdown] = createSignal(data?.md || "");

  // const [getSaved, setSaved] = createSignal(0);

  // const save = () => setSaved(Date.now());

  const serialized = createMemo<SlideData>(() => ({
    fs: getFileSystem().serialized,
    md: getMarkdown(),
  }));

  return {
    get fileSystem() {
      return getFileSystem();
    },
    get markdown() {
      return getMarkdown();
    },
    get serialized() {
      return serialized();
    },
    setFilesFromSlide(slide: SlideData) {
      const newFS = createFileSystem(slide.fs);
      setFileSystem(newFS);
    },
    setFilesFromGitHub(repoFiles: RepoFile[]) {
      const files = repoFiles.map((f, i) => ({
        ...f,
        id: `gh${i.toString()}`,
        opened: isFilePath(f.path),
      }));
      const newFS = createFileSystem({ files });
      newFS.setCurrentFileId(files.find((f) => f.opened).id);
      setFileSystem(newFS);
      console.log(getFileSystem());
    },
    setMarkdown(markdown: Text | string) {
      setMarkdown(
        typeof markdown === "string" ? markdown : markdown.sliceString(0)
      );
    },
  };
}

export type SlideState = ReturnType<typeof createSlideState>;

export type ProjectData = Readonly<{
  title: string;
  slides: SlideData[];
}>;

export function createProjectState(data?: ProjectData) {
  const [title, setTitle] = createSignal(data?.title || "");
  const [slides, setSlides] = createStore<SlideState[]>(
    data?.slides.map(createSlideState) || []
  );

  const [slideIndex, setSlideIndex] = createSignal(0);

  const serialized = createMemo<ProjectData>(() => {
    return {
      title: title(),
      slides: slides.map((slide) => slide.serialized),
    };
  });

  return {
    get title() {
      return title();
    },
    slides,
    get slideIndex() {
      return slideIndex();
    },
    get currentSlide() {
      return slides[slideIndex()];
    },
    get serialized() {
      return serialized();
    },
    setTitle,
    addSlide(slideData: Partial<SlideData>) {
      const newSlide = createSlideState(slideData);
      setSlides((slides) => [...slides, newSlide]);
      return slides.length - 1;
    },
    removeSlide(index: number) {
      setSlides((slides) => slides.filter((_, i) => i !== index));
    },
    setSlide(index: number) {
      if (index < 0 || index >= slides.length) return;
      setSlideIndex(index);
    },
  };
}

export type ProjectState = ReturnType<typeof createProjectState>;