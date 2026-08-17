import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
// `editor.api` alone is just the bare core — it registers no feature
// contributions. Without this side-effect import there is no suggest
// controller, no code-action lightbulb, no hover/find widget: the
// completion and quick-fix providers registered below have nothing to
// attach to and silently never fire.
import "monaco-editor/esm/vs/editor/editor.all.js";
import type { ProofStore } from "../state/useProofStore.js";
import { bridge } from "../monaco/bridge.js";
import {
  LANGUAGE_ID,
  registerLocusCodeActions,
  registerLocusCommands,
  registerLocusCompletions,
  registerLocusLanguage,
} from "../monaco/language.js";

let providersRegistered = false;

function severityToMonaco(severity: "error" | "warning" | "info"): monaco.MarkerSeverity {
  switch (severity) {
    case "error":
      return monaco.MarkerSeverity.Error;
    case "warning":
      return monaco.MarkerSeverity.Warning;
    case "info":
      return monaco.MarkerSeverity.Info;
  }
}

export function EditorPane({ store }: { store: ProofStore }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!providersRegistered) {
      registerLocusLanguage(monaco);
      registerLocusCompletions(monaco);
      registerLocusCodeActions(monaco);
      registerLocusCommands(monaco);
      providersRegistered = true;
    }

    const editor = monaco.editor.create(containerRef.current, {
      value: "",
      language: LANGUAGE_ID,
      theme: document.documentElement.dataset.theme === "dark" ? "locus-dark" : "locus-light",
      minimap: { enabled: false },
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      lineNumbers: "on",
      renderLineHighlight: "none",
      scrollBeyondLastLine: false,
      automaticLayout: true,
      quickSuggestions: { other: true, comments: false, strings: false },
      // Real tab-completion: Tab accepts the nearest suggestion (keyword or
      // known object from the fact graph) even before the suggest widget has
      // been explicitly navigated. Word-based suggestions are turned off so
      // Tab always resolves to one of our precise completions, never an
      // arbitrary token scraped from the document.
      tabCompletion: "on",
      wordBasedSuggestions: "off",
      suggestSelection: "first",
    });
    editorRef.current = editor;

    const disposable = editor.onDidChangeModelContent(() => {
      store.syncLines(editor.getModel()!.getLinesContent());
    });

    const themeObserver = new MutationObserver(() => {
      monaco.editor.setTheme(document.documentElement.dataset.theme === "dark" ? "locus-dark" : "locus-light");
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      disposable.dispose();
      themeObserver.disconnect();
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the bridge (read by Monaco's globally-registered providers) current.
  useEffect(() => {
    bridge.graph = store.build.graph;
    bridge.diagnostics = store.build.diagnostics;
    bridge.applyQuickFix = store.applyQuickFix;
  });

  // Push markers whenever diagnostics or per-line parse messages change.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const markers: monaco.editor.IMarkerData[] = [];

    store.build.diagnostics.forEach((diagnostic, index) => {
      const line = store.build.factLineMap.get(diagnostic.factIds[0]!);
      if (line === undefined) return;
      markers.push({
        severity: severityToMonaco(diagnostic.severity),
        message: diagnostic.message,
        startLineNumber: line + 1,
        startColumn: 1,
        endLineNumber: line + 1,
        endColumn: model.getLineMaxColumn(line + 1),
        code: String(index),
      });
    });

    store.build.lineMessages.forEach((msg, line) => {
      markers.push({
        severity: severityToMonaco(msg.severity === "error" ? "error" : "info"),
        message: msg.options ? `${msg.message} Try: ${msg.options.join(" — or — ")}` : msg.message,
        startLineNumber: line + 1,
        startColumn: 1,
        endLineNumber: line + 1,
        endColumn: model.getLineMaxColumn(line + 1),
      });
    });

    monaco.editor.setModelMarkers(model, LANGUAGE_ID, markers);
  }, [store.build]);

  // Sync editor content when a quick-fix rewrites lines out from under it.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const current = model.getLinesContent().join("\n");
    const next = store.lines.map((l) => l.text).join("\n");
    if (current !== next) {
      const position = editor.getPosition();
      model.setValue(next);
      if (position) editor.setPosition(position);
    }
  }, [store.lines]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
