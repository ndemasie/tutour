import { FileState, getFileType, isFilePath } from "@/state";
import { lineNumbers } from "@codemirror/view";
import { Component, onCleanup } from "solid-js";

import createCodemirror from "@/codemirror/createCodemirror";
import { useTheme, useThemeExtension } from "@/providers/theme";

interface Props {
  fileState: FileState;
}

export const FileEditor: Component<Props> = (props) => {
  const theme = useTheme();

  if (!isFilePath(props.fileState.pathName)) {
    return <div class={theme.fileUnsupported()}>Not Supported</div>;
  }

  const { view } = createCodemirror({
    language: getFileType(props.fileState.pathName),
    rootClass: theme?.codemirror.root(props.fileState),
    staticExtension: [lineNumbers(), theme.codemirror.baseTheme],
    reactiveExtension: useThemeExtension(),
    startingDoc: props.fileState.doc,
    onUpdate: (updates, view) => {
      props.fileState.setDoc(view.state.doc);
    },
  });

  const widget = (codeLinkId: string) => {
    const clicked = () => {
      console.log(codeLinkId);
    };
    return (<button onClick={clicked}>💬</button>) as HTMLElement;
  };

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      props.fileState.save();
    }
  }

  onCleanup(() => {
    view.destroy();
  });

  return (
    <div class={theme.fileEditorRoot()} onKeyDown={onKeyDown}>
      {view.dom}
    </div>
  );
};
