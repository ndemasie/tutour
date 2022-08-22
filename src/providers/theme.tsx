import { FileData } from "../state/projectData";
import { createContext, useContext, ParentComponent } from "solid-js";
import { createStore } from "solid-js/store";
import { Extension } from "@codemirror/state";
import { defaultDark } from "../codemirror/defaultDark";
import { defaultLight } from "../codemirror/defaultLight";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "codemirror";

export interface ThemeConfig {
  tabbedEditorRoot: () => string;
  tablist: () => string;
  tablistItem: (selected: boolean, file: FileData, index: number) => string;
  codemirror: {
    root: (file: FileData | "content") => string;
    darkTheme: Extension;
    lightTheme: Extension;
  };
}

export const defaultTheme: ThemeConfig = {
  tabbedEditorRoot: () => "w-full h-full flex flex-col",
  tablist: () => "w-full flex",
  tablistItem: (selected: boolean, file: FileData, index: number) => {
    const base = `border-b-2 font-mono font-semibold px-1 text-sm border-r-0`;
    const highlighted = selected
      ? `bg-gray-200 border-blue-400 dark:bg-black`
      : `dark:bg-gray-500`;
    const dark = `dark:text-white`;
    const alternate =
      !selected && (index % 2 === 0 ? "border-gray-400" : "border-gray-700");
    return `${base} ${dark} ${highlighted} ${alternate}`;
  },
  codemirror: {
    root: (file: FileData | "content") => "w-full h-full",
    darkTheme: [
      oneDark,
      EditorView.theme({
        ".cm-t-link": {
          backgroundColor: "#57534e",
        },
      }),
    ],
    lightTheme: defaultLight,
  },
};

const ThemeContext = createContext<ThemeConfig>();

export const ThemeProvider: ParentComponent<{ theme?: ThemeConfig }> = (
  props
) => {
  const [state, setState] = createStore(props.theme || defaultTheme);

  // Potential for functionality to pick themes at runtime, save and load, etc

  return (
    <ThemeContext.Provider value={state}>
      {props.children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);