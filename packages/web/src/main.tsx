import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import "./styles.css";
import { App } from "./App.js";

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
