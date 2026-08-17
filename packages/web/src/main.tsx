import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
// Self-hosted (bundled at build time, not fetched at runtime) so the PWA
// stays fully offline-capable — no third-party font requests.
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/400-italic.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
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
