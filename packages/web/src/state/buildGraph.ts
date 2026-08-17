import {
  FactGraph,
  applyStatement,
  parseStatement,
  runDiagnostics,
  type Diagnostic,
  type FactId,
} from "@locus/engine";
import type { LineState } from "./types.js";

export interface BuildResult {
  graph: FactGraph;
  factLineMap: Map<FactId, number>;
  lineMessages: Map<number, { severity: "error" | "info"; message: string; options?: string[] }>;
  diagnostics: Diagnostic[];
}

export function buildGraph(lines: LineState[]): BuildResult {
  const graph = new FactGraph();
  const factLineMap = new Map<FactId, number>();
  const lineMessages: BuildResult["lineMessages"] = new Map();

  lines.forEach((line, index) => {
    const text = line.text.trim();
    if (!text || text.startsWith("//")) return;

    const parsed = parseStatement(text);
    if (parsed.status === "error") {
      lineMessages.set(index, { severity: "error", message: parsed.message });
      return;
    }
    if (parsed.status === "ambiguous") {
      lineMessages.set(index, { severity: "info", message: parsed.message, options: parsed.options });
      return;
    }

    const justification =
      line.justificationKind === "reflexive"
        ? { kind: "reflexive" as const, dependsOn: [] }
        : { kind: "given" as const, dependsOn: [] };

    const applied = applyStatement(graph, parsed.statement, justification);
    for (const id of applied.factIds) {
      if (!factLineMap.has(id)) factLineMap.set(id, index);
    }
  });

  return { graph, factLineMap, lineMessages, diagnostics: runDiagnostics(graph) };
}
