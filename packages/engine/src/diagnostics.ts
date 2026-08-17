import type { FactGraph } from "./graph.js";
import { anglesEqual, segmentsEqual } from "./geometry.js";
import { classifyTriangleMatch, findValidCorrespondence } from "./postulates.js";
import type { Fact, FactId } from "./types.js";

export type DiagnosticCode =
  | "ssa"
  | "wrong-correspondence"
  | "undeclared-shared-part"
  | "circular-reasoning"
  | "aaa-similarity-only"
  | "redundant-hypothesis";

export interface Diagnostic {
  code: DiagnosticCode;
  severity: "error" | "warning" | "info";
  message: string;
  factIds: FactId[];
}

/**
 * SSA and AAA-similarity-only share one root cause: the student claimed a
 * stronger conclusion than the matched parts support. Both are reported here
 * from the same classification pass, since they're the same check applied to
 * different claimed relation types.
 */
function checkPostulateClaims(graph: FactGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const fact of graph.factsOfType("congruentTriangles")) {
    const match = classifyTriangleMatch(graph, fact.relation.a, fact.relation.b);
    if (match.conclusion === "ambiguous") {
      diagnostics.push({
        code: "ssa",
        severity: "warning",
        message:
          "Two sides and a non-included angle (SSA) don't guarantee congruence — a second, non-congruent triangle can satisfy the same measurements.",
        factIds: [fact.id],
      });
    } else if (match.conclusion === "similarity-only") {
      diagnostics.push({
        code: "aaa-similarity-only",
        severity: "warning",
        message: "AAA proves similarity, not congruence.",
        factIds: [fact.id],
      });
    } else if (match.conclusion === "congruent" && match.redundantAngle !== undefined) {
      diagnostics.push({
        code: "redundant-hypothesis",
        severity: "info",
        message: `Proof valid. You proved 3 angles + 1 side. That's AAS — the third angle wasn't needed. Simplify?`,
        factIds: [fact.id],
      });
    }
  }

  return diagnostics;
}

/**
 * The vertex order in a congruence claim encodes a correspondence. If the
 * parts actually proven congruent imply a different pairing than the one
 * written, the claim is a type error, not a postulate failure.
 */
function checkCorrespondenceOrder(graph: FactGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const fact of graph.factsOfType("congruentTriangles")) {
    const { a, b } = fact.relation;
    const claimed = classifyTriangleMatch(graph, a, b);
    if (claimed.conclusion === "congruent") continue;

    const candidate = findValidCorrespondence(graph, a, b);
    if (candidate) {
      diagnostics.push({
        code: "wrong-correspondence",
        severity: "error",
        message: `△${a.vertices.join("")} ≅ △${b.vertices.join("")} doesn't match the proven parts — they imply △${a.vertices.join("")} ≅ △${candidate.vertices.join("")} instead.`,
        factIds: [fact.id],
      });
    }
  }

  return diagnostics;
}

/**
 * A reflexive share (e.g. BC ≅ BC as a leg common to both triangles) must be
 * justified as the reflexive property, not asserted as if it were given data.
 */
function checkUndeclaredSharedParts(graph: FactGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const fact of graph.factsOfType("congruentSegments")) {
    if (segmentsEqual(fact.relation.a, fact.relation.b) && fact.justification.kind !== "reflexive") {
      diagnostics.push({
        code: "undeclared-shared-part",
        severity: "warning",
        message: `${fact.relation.a.p1}${fact.relation.a.p2} is shared by both triangles — state it as the reflexive property.`,
        factIds: [fact.id],
      });
    }
  }
  for (const fact of graph.factsOfType("congruentAngles")) {
    if (anglesEqual(fact.relation.a, fact.relation.b) && fact.justification.kind !== "reflexive") {
      diagnostics.push({
        code: "undeclared-shared-part",
        severity: "warning",
        message: `∠${fact.relation.a.p1}${fact.relation.a.vertex}${fact.relation.a.p2} is shared by both triangles — state it as the reflexive property.`,
        factIds: [fact.id],
      });
    }
  }

  return diagnostics;
}

/** DFS cycle detection over each fact's justification.dependsOn edges. */
function checkCircularReasoning(graph: FactGraph): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const facts = graph.facts();
  const byId = new Map(facts.map((f) => [f.id, f]));

  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<FactId, number>(facts.map((f) => [f.id, WHITE]));
  const reported = new Set<FactId>();

  function visit(fact: Fact, stack: FactId[]): void {
    color.set(fact.id, GRAY);
    stack.push(fact.id);

    for (const depId of fact.justification.dependsOn) {
      const dep = byId.get(depId);
      if (!dep) continue;
      const depColor = color.get(depId);
      if (depColor === GRAY) {
        const cycleStart = stack.indexOf(depId);
        const cycle = stack.slice(cycleStart);
        if (!cycle.some((id) => reported.has(id))) {
          cycle.forEach((id) => reported.add(id));
          diagnostics.push({
            code: "circular-reasoning",
            severity: "error",
            message: `Circular reasoning: ${cycle.join(" → ")} → ${depId} depends on itself.`,
            factIds: cycle,
          });
        }
      } else if (depColor === WHITE) {
        visit(dep, stack);
      }
    }

    stack.pop();
    color.set(fact.id, BLACK);
  }

  for (const fact of facts) {
    if (color.get(fact.id) === WHITE) visit(fact, []);
  }

  return diagnostics;
}

export function runDiagnostics(graph: FactGraph): Diagnostic[] {
  return [
    ...checkCircularReasoning(graph),
    ...checkCorrespondenceOrder(graph),
    ...checkPostulateClaims(graph),
    ...checkUndeclaredSharedParts(graph),
  ];
}
