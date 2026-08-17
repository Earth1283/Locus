import type { FactGraph, Fact, FactId } from "@locus/engine";

/**
 * The inverse of the DSL parser for the relation shapes a quick-fix can
 * introduce: congruentTriangles/similarTriangles (switching a conclusion,
 * reordering a correspondence) and segmentExists (constructing an
 * auxiliary). Everything else a quick-fix does is remove a fact or
 * re-justify one in place.
 */
export function serializeFact(fact: Fact): string | null {
  const r = fact.relation;
  switch (r.type) {
    case "congruentTriangles":
      return `△${r.a.vertices.join("")} ≅ △${r.b.vertices.join("")}`;
    case "similarTriangles":
      return `△${r.a.vertices.join("")} ~ △${r.b.vertices.join("")}`;
    case "segmentExists":
      return `connect ${r.segment.p1}${r.segment.p2}`;
    default:
      return null;
  }
}

export interface LineEdit {
  index: number;
  newText: string | null; // null = delete this line
}

export interface JustificationUpdate {
  index: number;
  kind: "given" | "reflexive";
}

export interface QuickFixLineDiff {
  lineEdits: LineEdit[];
  justificationUpdates: JustificationUpdate[];
  /** Added facts with no removed fact to replace — appended as new lines. */
  newLines: string[];
}

/**
 * Diffs the graph before/after a quick-fix's apply() against the line that
 * originally produced each touched fact, and turns that into editor text
 * edits. This is what lets every quick-fix stay a pure graph→graph function
 * in the engine: the web layer is the only place that knows about lines.
 */
export function diffQuickFixToLineEdits(
  oldGraph: FactGraph,
  newGraph: FactGraph,
  factLineMap: Map<FactId, number>,
): QuickFixLineDiff {
  const lineEdits: LineEdit[] = [];
  const justificationUpdates: JustificationUpdate[] = [];

  const removed: Fact[] = [];
  for (const fact of oldGraph.facts()) {
    const stillPresent = newGraph.getFact(fact.id);
    if (!stillPresent) {
      removed.push(fact);
    } else if (stillPresent.justification.kind !== fact.justification.kind) {
      const index = factLineMap.get(fact.id);
      if (index !== undefined && stillPresent.justification.kind === "reflexive") {
        justificationUpdates.push({ index, kind: "reflexive" });
      }
    }
  }

  const added: Fact[] = newGraph.facts().filter((f) => !oldGraph.getFact(f.id));

  removed.forEach((fact, i) => {
    const index = factLineMap.get(fact.id);
    if (index === undefined) return;
    const replacement = added[i];
    lineEdits.push({ index, newText: replacement ? serializeFact(replacement) : null });
  });

  // Additions with no removal to pair against (e.g. constructing a fresh
  // auxiliary segment) become new lines rather than being silently dropped.
  const newLines = added
    .slice(removed.length)
    .map(serializeFact)
    .filter((text): text is string => text !== null);

  return { lineEdits, justificationUpdates, newLines };
}
