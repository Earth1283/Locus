import type { Angle, LineId, PointId, Segment, SegmentOrLine, Triangle, VertexIndex } from "./types.js";

export function segment(p1: PointId, p2: PointId): Segment {
  return { p1, p2 };
}

export function segmentOperand(p1: PointId, p2: PointId): SegmentOrLine {
  return { kind: "segment", segment: segment(p1, p2) };
}

export function lineOperand(line: LineId): SegmentOrLine {
  return { kind: "line", line };
}

export function segmentOrLineKey(x: SegmentOrLine): string {
  return x.kind === "segment" ? `s:${segmentKey(x.segment)}` : `l:${x.line}`;
}

export function segmentOrLineEqual(x: SegmentOrLine, y: SegmentOrLine): boolean {
  return segmentOrLineKey(x) === segmentOrLineKey(y);
}

export function angle(vertex: PointId, p1: PointId, p2: PointId): Angle {
  return { vertex, p1, p2 };
}

export function triangle(a: PointId, b: PointId, c: PointId): Triangle {
  return { vertices: [a, b, c] };
}

/** Order-independent identity: segment AB is the same segment as BA. */
export function segmentKey(s: Segment): string {
  return [s.p1, s.p2].sort().join("|");
}

export function segmentsEqual(a: Segment, b: Segment): boolean {
  return segmentKey(a) === segmentKey(b);
}

/** Order-independent on the two rays, but the vertex is fixed. */
export function angleKey(a: Angle): string {
  return `${a.vertex}:${[a.p1, a.p2].sort().join("|")}`;
}

export function anglesEqual(a: Angle, b: Angle): boolean {
  return angleKey(a) === angleKey(b);
}

/** Order-sensitive: ABC and ACB are the same three points but different claims. */
export function triangleKey(t: Triangle): string {
  return t.vertices.join("|");
}

/** Order-independent: used to check "is this the same physical triangle." */
export function triangleSetKey(t: Triangle): string {
  return [...t.vertices].sort().join("|");
}

export function trianglesEqual(a: Triangle, b: Triangle): boolean {
  return triangleKey(a) === triangleKey(b);
}

/** Side opposite vertex i, indexed by the vertex it's opposite (BC is side 0, opposite A). */
export function triangleSide(t: Triangle, opposite: VertexIndex): Segment {
  const [a, b, c] = t.vertices;
  const others = [a, b, c].filter((_, i) => i !== opposite) as [PointId, PointId];
  return segment(others[0], others[1]);
}

export function triangleAngle(t: Triangle, at: VertexIndex): Angle {
  const [a, b, c] = t.vertices;
  const vertex = t.vertices[at];
  const others = [a, b, c].filter((_, i) => i !== at) as [PointId, PointId];
  return angle(vertex, others[0], others[1]);
}

/**
 * A side and an angle are "included" (adjacent) exactly when the angle's
 * vertex index is NOT the side's index — a triangle only has three sides and
 * three vertices, so any side not opposite the angle must touch it.
 */
export function isIncludedAngleForSides(
  angleIdx: VertexIndex,
  sideIdxs: readonly [VertexIndex, VertexIndex],
): boolean {
  return !sideIdxs.includes(angleIdx);
}

export function isIncludedSideForAngles(
  sideIdx: VertexIndex,
  angleIdxs: readonly [VertexIndex, VertexIndex],
): boolean {
  return !angleIdxs.includes(sideIdx);
}

export const VERTEX_INDICES: readonly VertexIndex[] = [0, 1, 2];

export function complementOf(idx: VertexIndex): [VertexIndex, VertexIndex] {
  return VERTEX_INDICES.filter((i) => i !== idx) as [VertexIndex, VertexIndex];
}

export function isValidLabel(token: string): boolean {
  return /^[A-Z][a-zA-Z0-9']*$/.test(token);
}
