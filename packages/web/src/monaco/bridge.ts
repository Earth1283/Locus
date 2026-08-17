import type { Diagnostic, FactGraph, QuickFix } from "@locus/engine";

/**
 * Monaco's language providers are registered once, globally, outside
 * React's render cycle — this mutable box is how the current build state
 * and the applyQuickFix callback reach those closures without threading
 * React context through Monaco's API.
 */
export interface EditorBridge {
  graph: FactGraph | null;
  diagnostics: Diagnostic[];
  applyQuickFix: (fix: QuickFix) => void;
  lineTextBeforeCursor: (lineNumber: number, column: number) => string;
}

export const bridge: EditorBridge = {
  graph: null,
  diagnostics: [],
  applyQuickFix: () => {},
  lineTextBeforeCursor: () => "",
};
