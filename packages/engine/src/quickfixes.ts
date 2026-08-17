import type { FactGraph } from "./graph.js";
import { segment, segmentsEqual, triangleAngle } from "./geometry.js";
import { classifyTriangleMatch, findValidCorrespondence } from "./postulates.js";
import type { Diagnostic } from "./diagnostics.js";
import type { Relation, Segment } from "./types.js";

/**
 * A quick-fix is either an action (a graph mutation the student can accept)
 * or guidance (text only — the tool names the fork, the student does the
 * work). Never one action pre-selected as "correct": callers should present
 * every quick-fix a diagnostic returns.
 */
export type QuickFix =
  | {
      kind: "action";
      id: string;
      label: string;
      apply: (graph: FactGraph) => FactGraph;
      /** Set when applying this fix has a real ambiguity the caller must resolve first (e.g. which point an auxiliary segment intersects). */
      needsConfirm?: { message: string };
    }
  | {
      kind: "guidance";
      id: string;
      label: string;
      message: string;
    };

function withoutFact(graph: FactGraph, id: string): FactGraph {
  const copy = graph.clone();
  copy.removeFact(id);
  return copy;
}

export function getQuickFixes(graph: FactGraph, diagnostic: Diagnostic): QuickFix[] {
  switch (diagnostic.code) {
    case "aaa-similarity-only": {
      const factId = diagnostic.factIds[0]!;
      const fact = graph.getFact(factId);
      if (!fact || fact.relation.type !== "congruentTriangles") return [];
      const { a, b } = fact.relation;
      return [
        {
          kind: "action",
          id: "switch-to-similarity",
          label: `Switch conclusion to "△${a.vertices.join("")} ~ △${b.vertices.join("")}" (similarity)`,
          apply: (g) => {
            const copy = withoutFact(g, factId);
            copy.addFact({ type: "similarTriangles", a, b }, { kind: "derived", dependsOn: [] });
            return copy;
          },
        },
        {
          kind: "guidance",
          id: "keep-congruence-add-side",
          label: "Keep congruence — but you'll need to additionally prove scale factor = 1",
          message: "Add a side-length comparison between the two triangles to upgrade AAA to AAS.",
        },
      ];
    }

    case "redundant-hypothesis": {
      const factId = diagnostic.factIds[0]!;
      const fact = graph.getFact(factId);
      if (!fact || fact.relation.type !== "congruentTriangles") return [];
      const { a, b } = fact.relation;
      const match = classifyTriangleMatch(graph, a, b);
      if (match.redundantAngle === undefined) return [];

      const redundantAngleA = triangleAngle(a, match.redundantAngle);
      const redundantFact = graph
        .factsOfType("congruentAngles")
        .find((f) => f.relation.a.vertex === redundantAngleA.vertex || f.relation.b.vertex === redundantAngleA.vertex);
      if (!redundantFact) return [];

      return [
        {
          kind: "action",
          id: "simplify-remove-redundant-angle",
          label: `Remove the redundant angle match at ${redundantAngleA.vertex}`,
          apply: (g) => withoutFact(g, redundantFact.id),
        },
      ];
    }

    case "undeclared-shared-part": {
      const factId = diagnostic.factIds[0]!;
      return [
        {
          kind: "action",
          id: "insert-reflexive-justification",
          label: "Insert reflexive-property justification",
          apply: (g) => {
            const copy = g.clone();
            copy.updateJustification(factId, { kind: "reflexive", dependsOn: [] });
            return copy;
          },
        },
      ];
    }

    case "wrong-correspondence": {
      const factId = diagnostic.factIds[0]!;
      const fact = graph.getFact(factId);
      if (!fact || fact.relation.type !== "congruentTriangles") return [];
      const { a, b } = fact.relation;
      const candidate = findValidCorrespondence(graph, a, b);
      if (!candidate) return [];

      return [
        {
          kind: "action",
          id: "reorder-correspondence",
          label: `Reorder to △${a.vertices.join("")} ≅ △${candidate.vertices.join("")}`,
          apply: (g) => {
            const copy = withoutFact(g, factId);
            copy.addFact({ type: "congruentTriangles", a, b: candidate }, { kind: "derived", dependsOn: [] });
            return copy;
          },
        },
      ];
    }

    case "ssa":
    case "circular-reasoning":
      return [];
  }
}

/**
 * Whether a segment has actually been *constructed* — not merely claimed
 * about. A congruentSegments/perpendicular/parallel fact can state something
 * about AB without AB ever having been drawn; only segmentExists, midpoint,
 * and onSegment facts are construction evidence.
 */
export function segmentExists(graph: FactGraph, seg: Segment): boolean {
  return graph.facts().some((f) => {
    const r = f.relation;
    if (r.type === "segmentExists" || r.type === "midpoint" || r.type === "onSegment") {
      return segmentsEqual(r.segment, seg);
    }
    return false;
  });
}

function referencesSegment(r: Relation, seg: Segment): boolean {
  if (r.type === "midpoint" || r.type === "onSegment" || r.type === "segmentExists") return segmentsEqual(r.segment, seg);
  if (r.type === "congruentSegments") return segmentsEqual(r.a, seg) || segmentsEqual(r.b, seg);
  if (r.type === "perpendicular" || r.type === "parallel") {
    const matches = (op: typeof r.a) => op.kind === "segment" && segmentsEqual(op.segment, seg);
    return matches(r.a) || matches(r.b);
  }
  return false;
}

/**
 * Quick-fixes for a segment the student referenced but hasn't constructed —
 * triggered on right-click of any flagged segment, not gated behind a
 * separate ambient diagnostic.
 */
export function getSegmentQuickFixes(graph: FactGraph, seg: Segment): QuickFix[] {
  if (segmentExists(graph, seg)) return [];
  const label = `${seg.p1}${seg.p2}`;

  return [
    {
      kind: "action",
      id: "remove-references",
      label: `Remove references for ${label}`,
      apply: (g) => {
        const copy = g.clone();
        for (const f of copy.facts()) {
          if (referencesSegment(f.relation, seg)) copy.removeFact(f.id);
        }
        return copy;
      },
    },
    {
      kind: "action",
      id: "create-auxiliary",
      label: `Create auxiliary for ${label} (connect ${label})`,
      // Whether this segment crosses an existing line/segment is a question
      // about actual point positions, which only the figure pane (with real
      // coordinates) can answer — the confirm step surfaces that check there.
      needsConfirm: { message: `Constructing ${label} may cross an existing line — confirm before adding it.` },
      apply: (g) => {
        const copy = g.clone();
        copy.ensurePoint(seg.p1);
        copy.ensurePoint(seg.p2);
        copy.addFact({ type: "segmentExists", segment: segment(seg.p1, seg.p2) }, { kind: "given", dependsOn: [] });
        return copy;
      },
    },
  ];
}
