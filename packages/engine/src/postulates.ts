import type { FactGraph } from "./graph.js";
import {
  VERTEX_INDICES,
  anglesEqual,
  complementOf,
  isIncludedAngleForSides,
  isIncludedSideForAngles,
  segmentsEqual,
  triangleAngle,
  triangleSide,
} from "./geometry.js";
import { triangle } from "./geometry.js";
import type { PointId, PostulateName, Triangle, VertexIndex } from "./types.js";

export type Conclusion = "congruent" | "similarity-only" | "ambiguous" | "insufficient";

export interface TriangleMatch {
  matchedSides: Set<VertexIndex>;
  matchedAngles: Set<VertexIndex>;
  /** Angle indices that are right angles in *both* triangles (perpendicular sides at that vertex). */
  rightAngles: Set<VertexIndex>;
  postulate: PostulateName | "AAA" | "SSA" | null;
  conclusion: Conclusion;
  /** Set when the match is valid but a matched part wasn't needed (the AAA-escape-hatch case). */
  redundantAngle?: VertexIndex;
}

function rightAngleAt(graph: FactGraph, t: Triangle, at: VertexIndex): boolean {
  const [j, k] = complementOf(at);
  const sideJ = triangleSide(t, j);
  const sideK = triangleSide(t, k);
  const isSide = (op: { kind: string }, side: ReturnType<typeof triangleSide>) =>
    op.kind === "segment" && segmentsEqual((op as { kind: "segment"; segment: typeof side }).segment, side);
  return graph
    .factsOfType("perpendicular")
    .some(
      (f) =>
        (isSide(f.relation.a, sideJ) && isSide(f.relation.b, sideK)) ||
        (isSide(f.relation.a, sideK) && isSide(f.relation.b, sideJ)),
    );
}

/**
 * Walks the fact graph to find which of the six corresponding side/angle
 * pairs between two (position-correspondent) triangles are already proven
 * congruent, then classifies the resulting postulate pattern.
 */
export function classifyTriangleMatch(graph: FactGraph, a: Triangle, b: Triangle): TriangleMatch {
  const matchedSides = new Set<VertexIndex>();
  const matchedAngles = new Set<VertexIndex>();
  const rightAngles = new Set<VertexIndex>();

  for (const idx of VERTEX_INDICES) {
    const sideA = triangleSide(a, idx);
    const sideB = triangleSide(b, idx);
    const sideMatch = graph
      .factsOfType("congruentSegments")
      .some(
        (f) =>
          (segmentsEqual(f.relation.a, sideA) && segmentsEqual(f.relation.b, sideB)) ||
          (segmentsEqual(f.relation.a, sideB) && segmentsEqual(f.relation.b, sideA)),
      );
    if (sideMatch) matchedSides.add(idx);

    const angleA = triangleAngle(a, idx);
    const angleB = triangleAngle(b, idx);
    const angleMatch = graph
      .factsOfType("congruentAngles")
      .some(
        (f) =>
          (anglesEqual(f.relation.a, angleA) && anglesEqual(f.relation.b, angleB)) ||
          (anglesEqual(f.relation.a, angleB) && anglesEqual(f.relation.b, angleA)),
      );

    const bothRight = rightAngleAt(graph, a, idx) && rightAngleAt(graph, b, idx);
    if (bothRight) rightAngles.add(idx);
    if (angleMatch || bothRight) matchedAngles.add(idx);
  }

  return classify(matchedSides, matchedAngles, rightAngles);
}

function classify(
  matchedSides: Set<VertexIndex>,
  matchedAngles: Set<VertexIndex>,
  rightAngles: Set<VertexIndex>,
): TriangleMatch {
  const s = matchedSides.size;
  const a = matchedAngles.size;
  const base = { matchedSides, matchedAngles, rightAngles };

  if (s === 3) {
    return { ...base, postulate: "SSS", conclusion: "congruent" };
  }

  if (s === 2 && a === 1) {
    const [angleIdx] = matchedAngles;
    const sideIdxs = [...matchedSides] as [VertexIndex, VertexIndex];
    if (isIncludedAngleForSides(angleIdx!, sideIdxs)) {
      return { ...base, postulate: "SAS", conclusion: "congruent" };
    }
    if (rightAngles.has(angleIdx!)) {
      return { ...base, postulate: "HL", conclusion: "congruent" };
    }
    return { ...base, postulate: "SSA", conclusion: "ambiguous" };
  }

  if (s === 1 && a === 2) {
    const [sideIdx] = matchedSides;
    const angleIdxs = [...matchedAngles] as [VertexIndex, VertexIndex];
    if (isIncludedSideForAngles(sideIdx!, angleIdxs)) {
      return { ...base, postulate: "ASA", conclusion: "congruent" };
    }
    return { ...base, postulate: "AAS", conclusion: "congruent" };
  }

  if (s === 1 && a === 3) {
    // AAA already proves similarity; the one matched side upgrades it to a
    // congruence via AAS. The angle not adjacent to the chosen AAS pair is
    // logically redundant (angle sum determines it from the other two).
    const sideIdx = [...matchedSides][0]!;
    const [, redundantAngle] = complementOf(sideIdx);
    return { ...base, postulate: "AAS", conclusion: "congruent", redundantAngle };
  }

  if (s === 0 && a === 3) {
    return { ...base, postulate: "AAA", conclusion: "similarity-only" };
  }

  return { ...base, postulate: null, conclusion: "insufficient" };
}

function permutationsOf3<T>(items: readonly [T, T, T]): Array<[T, T, T]> {
  const [a, b, c] = items;
  return [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
}

/**
 * Given a claimed correspondence (a, b) that doesn't classify as congruent,
 * searches the other five vertex orderings of b for one the matched parts
 * actually support. Returns null if no reordering would help.
 */
export function findValidCorrespondence(graph: FactGraph, a: Triangle, b: Triangle): Triangle | null {
  for (const perm of permutationsOf3(b.vertices as [PointId, PointId, PointId])) {
    const candidate = triangle(perm[0], perm[1], perm[2]);
    if (candidate.vertices.join("|") === b.vertices.join("|")) continue;
    if (classifyTriangleMatch(graph, a, candidate).conclusion === "congruent") {
      return candidate;
    }
  }
  return null;
}
