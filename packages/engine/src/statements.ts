import type { FactGraph } from "./graph.js";
import { angle, lineOperand, segment, segmentOperand, triangle } from "./geometry.js";
import type { ParsedStatement } from "./dsl/parse.js";
import type { FactId, Justification } from "./types.js";

export interface AppliedStatement {
  factIds: FactId[];
  /** Present when the statement expanded via a macro (e.g. perpendicular-bisector). */
  expandedFrom?: ParsedStatement["kind"];
}

const DEFAULT_JUSTIFICATION: Justification = { kind: "given", dependsOn: [] };

function freshPointLabel(graph: FactGraph, base: string): string {
  if (!graph.hasObject(base)) return base;
  let n = 1;
  while (graph.hasObject(`${base}${n}`)) n++;
  return `${base}${n}`;
}

/**
 * Binds a parsed statement into the fact graph: ensures every referenced
 * point/line exists, then asserts the resulting fact(s). Macros (currently
 * just perpendicular-bisector) expand into their atomic facts here, so
 * derived theorems fall out as graph queries rather than needing special-casing.
 */
export function applyStatement(
  graph: FactGraph,
  statement: ParsedStatement,
  justification: Justification = DEFAULT_JUSTIFICATION,
): AppliedStatement {
  switch (statement.kind) {
    case "midpoint": {
      graph.ensurePoint(statement.point);
      graph.ensurePoint(statement.segment[0]);
      graph.ensurePoint(statement.segment[1]);
      const id = graph.addFact(
        { type: "midpoint", point: statement.point, segment: segment(...statement.segment) },
        justification,
      );
      return { factIds: [id] };
    }
    case "perpendicular": {
      graph.ensurePoint(statement.a[0]);
      graph.ensurePoint(statement.a[1]);
      graph.ensurePoint(statement.b[0]);
      graph.ensurePoint(statement.b[1]);
      const id = graph.addFact(
        { type: "perpendicular", a: segmentOperand(...statement.a), b: segmentOperand(...statement.b) },
        justification,
      );
      return { factIds: [id] };
    }
    case "parallel": {
      graph.ensurePoint(statement.a[0]);
      graph.ensurePoint(statement.a[1]);
      graph.ensurePoint(statement.b[0]);
      graph.ensurePoint(statement.b[1]);
      const id = graph.addFact(
        { type: "parallel", a: segmentOperand(...statement.a), b: segmentOperand(...statement.b) },
        justification,
      );
      return { factIds: [id] };
    }
    case "congruentSegments": {
      statement.a.forEach((p) => graph.ensurePoint(p));
      statement.b.forEach((p) => graph.ensurePoint(p));
      const id = graph.addFact(
        { type: "congruentSegments", a: segment(...statement.a), b: segment(...statement.b) },
        justification,
      );
      return { factIds: [id] };
    }
    case "congruentAngles": {
      statement.a.forEach((p) => graph.ensurePoint(p));
      statement.b.forEach((p) => graph.ensurePoint(p));
      const id = graph.addFact(
        {
          type: "congruentAngles",
          a: angle(statement.a[1], statement.a[0], statement.a[2]),
          b: angle(statement.b[1], statement.b[0], statement.b[2]),
        },
        justification,
      );
      return { factIds: [id] };
    }
    case "congruentTriangles": {
      statement.a.forEach((p) => graph.ensurePoint(p));
      statement.b.forEach((p) => graph.ensurePoint(p));
      const id = graph.addFact(
        { type: "congruentTriangles", a: triangle(...statement.a), b: triangle(...statement.b) },
        justification,
      );
      return { factIds: [id] };
    }
    case "similarTriangles": {
      statement.a.forEach((p) => graph.ensurePoint(p));
      statement.b.forEach((p) => graph.ensurePoint(p));
      const id = graph.addFact(
        { type: "similarTriangles", a: triangle(...statement.a), b: triangle(...statement.b) },
        justification,
      );
      return { factIds: [id] };
    }
    case "onSegment": {
      graph.ensurePoint(statement.point);
      graph.ensurePoint(statement.segment[0]);
      graph.ensurePoint(statement.segment[1]);
      const id = graph.addFact(
        { type: "onSegment", point: statement.point, segment: segment(...statement.segment) },
        justification,
      );
      return { factIds: [id] };
    }
    case "connectSegment": {
      graph.ensurePoint(statement.segment[0]);
      graph.ensurePoint(statement.segment[1]);
      const id = graph.addFact({ type: "segmentExists", segment: segment(...statement.segment) }, justification);
      return { factIds: [id] };
    }
    case "perpendicularBisector": {
      graph.ensurePoint(statement.segment[0]);
      graph.ensurePoint(statement.segment[1]);
      graph.ensureLine(statement.line);
      const midpointLabel = freshPointLabel(graph, `M${statement.segment[0]}${statement.segment[1]}`);
      graph.ensurePoint(midpointLabel);

      const perpId = graph.addFact(
        { type: "perpendicular", a: lineOperand(statement.line), b: segmentOperand(...statement.segment) },
        { kind: "derived", dependsOn: [] },
      );
      const midpointId = graph.addFact(
        { type: "midpoint", point: midpointLabel, segment: segment(...statement.segment) },
        { kind: "derived", dependsOn: [] },
      );
      return { factIds: [perpId, midpointId], expandedFrom: "perpendicularBisector" };
    }
  }
}
