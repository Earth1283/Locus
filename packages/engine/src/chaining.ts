import type { FactGraph } from "./graph.js";
import { VERTEX_INDICES, complementOf } from "./geometry.js";
import { classifyTriangleMatch } from "./postulates.js";
import type { PostulateName, Triangle, VertexIndex } from "./types.js";

interface RequirementPath {
  postulate: PostulateName;
  sides: VertexIndex[];
  angles: VertexIndex[];
  rightAngleAt?: VertexIndex;
}

/**
 * Every distinct shape a valid postulate can take, expressed as the vertex
 * indices it needs matched. Multiple SAS/ASA/AAS/HL variants exist (one per
 * choice of vertex) so backward-chaining can show every legitimate branch,
 * not a single preselected path (PHILOSOPHY.md Section 2).
 */
function allRequirementPaths(): RequirementPath[] {
  const paths: RequirementPath[] = [{ postulate: "SSS", sides: [0, 1, 2], angles: [] }];

  for (const i of VERTEX_INDICES) {
    paths.push({ postulate: "SAS", sides: complementOf(i), angles: [i] });
    paths.push({ postulate: "ASA", sides: [i], angles: complementOf(i) });
    const [adjacent] = complementOf(i);
    paths.push({ postulate: "AAS", sides: [adjacent!], angles: complementOf(i) });
    paths.push({ postulate: "HL", sides: complementOf(i), angles: [i], rightAngleAt: i });
  }

  return paths;
}

export interface BackwardChainOption {
  postulate: PostulateName;
  missingSides: VertexIndex[];
  missingAngles: VertexIndex[];
  missingRightAngle: VertexIndex | null;
}

export interface BackwardChainResult {
  alreadyValid: boolean;
  /** Sorted by fewest missing items first. */
  options: BackwardChainOption[];
}

/**
 * "What do you need for X": diffs every valid postulate shape against the
 * current fact graph and reports exactly the missing slots for each. Pure
 * bookkeeping — ambient by default per PHILOSOPHY.md Section 3.
 */
export function backwardChain(graph: FactGraph, a: Triangle, b: Triangle): BackwardChainResult {
  const match = classifyTriangleMatch(graph, a, b);
  const options = allRequirementPaths()
    .map((path) => ({
      postulate: path.postulate,
      missingSides: path.sides.filter((i) => !match.matchedSides.has(i)),
      missingAngles: path.angles.filter((i) => !match.matchedAngles.has(i)),
      missingRightAngle:
        path.rightAngleAt !== undefined && !match.rightAngles.has(path.rightAngleAt) ? path.rightAngleAt : null,
    }))
    .sort(
      (x, y) =>
        x.missingSides.length +
        x.missingAngles.length +
        (x.missingRightAngle !== null ? 1 : 0) -
        (y.missingSides.length + y.missingAngles.length + (y.missingRightAngle !== null ? 1 : 0)),
    );

  return { alreadyValid: match.conclusion === "congruent", options };
}

export interface ForwardChainResult {
  newlyDerivable: boolean;
  postulate: PostulateName | null;
}

/**
 * "Show what this could combine with": on-request only (PHILOSOPHY.md
 * Section 1 — spotting combinable facts is often the actual insight of a
 * proof, so it must never run ambiently). Reports whether the current facts
 * now support a conclusion for (a, b) that wasn't derivable before.
 */
export function forwardChain(graph: FactGraph, a: Triangle, b: Triangle): ForwardChainResult {
  const match = classifyTriangleMatch(graph, a, b);
  if (match.conclusion !== "congruent" || match.postulate === "AAA" || match.postulate === "SSA") {
    return { newlyDerivable: false, postulate: null };
  }
  const alreadyStated = graph.factsOfType("congruentTriangles").some((f) => {
    const claimed = classifyTriangleMatch(graph, f.relation.a, f.relation.b);
    return claimed.conclusion === "congruent" && f.relation.a.vertices.join("|") === a.vertices.join("|") && f.relation.b.vertices.join("|") === b.vertices.join("|");
  });
  return { newlyDerivable: !alreadyStated, postulate: match.postulate };
}
