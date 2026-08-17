import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { getKeywordCompletions, getObjectCompletions, getQuickFixes, type SlotType } from "@locus/engine";
import { bridge } from "./bridge.js";

export const LANGUAGE_ID = "locus";

const TRIGGER_WORDS = [
  "midpoint",
  "perpendicular",
  "bisector",
  "parallel",
  "congruent",
  "similar",
  "angle",
  "triangle",
  "line",
  "segment",
  "on",
  "connect",
];

export function registerLocusLanguage(monaco: typeof Monaco): void {
  monaco.languages.register({ id: LANGUAGE_ID });

  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [new RegExp(`\\b(${TRIGGER_WORDS.join("|")})\\b`, "i"), "keyword"],
        [/[≅~⊥∥△∠]/, "operator"],
        [/[A-Z][A-Za-z0-9']*/, "type.identifier"],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
    comments: { lineComment: "//" },
  });

  monaco.editor.defineTheme("locus-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8b8778", fontStyle: "italic" },
      { token: "keyword", foreground: "2c6e8e", fontStyle: "bold" },
      { token: "operator", foreground: "b54a2c" },
      { token: "type.identifier", foreground: "1c1b19" },
    ],
    colors: {
      "editor.background": "#f7f5f0",
      "editor.foreground": "#1c1b19",
      "editorLineNumber.foreground": "#8b8778",
      "editorLineNumber.activeForeground": "#1c1b19",
      "editor.lineHighlightBackground": "#00000000",
      "editorCursor.foreground": "#2c6e8e",
      "editorGutter.background": "#f7f5f0",
    },
  });

  monaco.editor.defineTheme("locus-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b6759", fontStyle: "italic" },
      { token: "keyword", foreground: "6fb8de", fontStyle: "bold" },
      { token: "operator", foreground: "e08a63" },
      { token: "type.identifier", foreground: "e8e4da" },
    ],
    colors: {
      "editor.background": "#14181a",
      "editor.foreground": "#e8e4da",
      "editorLineNumber.foreground": "#6b6759",
      "editorLineNumber.activeForeground": "#e8e4da",
      "editor.lineHighlightBackground": "#00000000",
      "editorCursor.foreground": "#6fb8de",
      "editorGutter.background": "#14181a",
    },
  });
}

function inferSlotTypes(lineBeforeCursor: string): SlotType[] {
  const lower = lineBeforeCursor.toLowerCase();
  if (lower.includes("perpendicular") && lower.includes("bisector")) return ["segment", "line"];
  if (lower.includes("midpoint")) return ["point", "segment"];
  if (lower.includes("perpendicular") || lower.includes("parallel")) return ["segment"];
  if (lower.includes("congruent") || lower.includes("similar")) {
    if (lower.includes("angle")) return ["angle"];
    if (lower.includes("triangle") || lower.includes("△")) return ["triangle"];
    return ["segment", "angle", "triangle"];
  }
  if (/\bon\b/.test(lower)) return ["point", "segment"];
  if (lower.includes("connect")) return ["point"];
  return [];
}

export function registerLocusCompletions(monaco: typeof Monaco): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: [" "],
    provideCompletionItems(model, position) {
      const lineBeforeCursor = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const word = model.getWordUntilPosition(position);
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: Monaco.languages.CompletionItem[] = [];

      for (const k of getKeywordCompletions(word.word)) {
        suggestions.push({
          label: k.trigger,
          kind: 17 /* Keyword */,
          detail: k.template,
          documentation: k.description,
          insertText: k.trigger,
          range,
        });
      }

      if (bridge.graph) {
        const slotTypes = inferSlotTypes(lineBeforeCursor);
        for (const slotType of slotTypes) {
          for (const label of getObjectCompletions(bridge.graph, slotType)) {
            suggestions.push({
              label,
              kind: 5 /* Field — reads as "known object" in the widget */,
              detail: slotType,
              insertText: label,
              range,
            });
          }
        }
      }

      return { suggestions };
    },
  });
}

export function registerLocusCodeActions(monaco: typeof Monaco): Monaco.IDisposable {
  return monaco.languages.registerCodeActionProvider(LANGUAGE_ID, {
    provideCodeActions(_model, _range, context) {
      const actions: Monaco.languages.CodeAction[] = [];

      for (const marker of context.markers) {
        const diagnosticIndex = typeof marker.code === "string" ? Number(marker.code) : NaN;
        const diagnostic = bridge.diagnostics[diagnosticIndex];
        if (!diagnostic || !bridge.graph) continue;

        for (const fix of getQuickFixes(bridge.graph, diagnostic)) {
          if (fix.kind === "action") {
            actions.push({
              title: fix.label,
              kind: "quickfix",
              diagnostics: [marker],
              command: {
                id: "locus.applyQuickFix",
                title: fix.label,
                arguments: [fix],
              },
            });
          } else {
            actions.push({
              title: fix.label,
              kind: "quickfix",
              diagnostics: [marker],
              disabled: fix.message,
            });
          }
        }
      }

      return { actions, dispose() {} };
    },
  });
}

let commandRegistered = false;

export function registerLocusCommands(monaco: typeof Monaco): void {
  if (commandRegistered) return;
  commandRegistered = true;
  monaco.editor.registerCommand("locus.applyQuickFix", (_accessor, fix) => {
    bridge.applyQuickFix(fix);
  });
}
