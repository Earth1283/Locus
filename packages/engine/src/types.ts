export type PointId = string;
export type LineId = string;
export type CircleId = string;
export type FactId = string;

export interface PointObject {
  kind: "point";
  id: PointId;
  label: string;
}

export interface LineObject {
  kind: "line";
  id: LineId;
  label: string;
}

export interface CircleObject {
  kind: "circle";
  id: CircleId;
  label: string;
  center: PointId;
}

export type GeometryObject = PointObject | LineObject | CircleObject;

/**
 * Segments, angles and triangles are values derived from point labels, not
 * graph nodes with their own identity. A proof never needs to "declare" a
 * segment before naming it, only assert facts about it.
 */
export interface Segment {
  readonly p1: PointId;
  readonly p2: PointId;
}

export interface Angle {
  readonly vertex: PointId;
  readonly p1: PointId;
  readonly p2: PointId;
}

/** Vertex order is significant here: it encodes a claimed correspondence. */
export interface Triangle {
  readonly vertices: readonly [PointId, PointId, PointId];
}

export type VertexIndex = 0 | 1 | 2;

export type RelationType =
  | "midpoint"
  | "perpendicular"
  | "parallel"
  | "congruentSegments"
  | "congruentAngles"
  | "congruentTriangles"
  | "similarTriangles"
  | "onSegment"
  | "segmentExists";

export interface MidpointFact {
  type: "midpoint";
  point: PointId;
  segment: Segment;
}

/**
 * Perpendicular/parallel can relate two segments, or an auxiliary line to a
 * segment (the shape the perpendicular-bisector macro expands into).
 */
export type SegmentOrLine = { kind: "segment"; segment: Segment } | { kind: "line"; line: LineId };

export interface PerpendicularFact {
  type: "perpendicular";
  a: SegmentOrLine;
  b: SegmentOrLine;
}

export interface ParallelFact {
  type: "parallel";
  a: SegmentOrLine;
  b: SegmentOrLine;
}

export interface CongruentSegmentsFact {
  type: "congruentSegments";
  a: Segment;
  b: Segment;
}

export interface CongruentAnglesFact {
  type: "congruentAngles";
  a: Angle;
  b: Angle;
}

export interface CongruentTrianglesFact {
  type: "congruentTriangles";
  a: Triangle;
  b: Triangle;
}

export interface SimilarTrianglesFact {
  type: "similarTriangles";
  a: Triangle;
  b: Triangle;
}

export interface OnSegmentFact {
  type: "onSegment";
  point: PointId;
  segment: Segment;
}

export interface SegmentExistsFact {
  type: "segmentExists";
  segment: Segment;
}

export type Relation =
  | MidpointFact
  | PerpendicularFact
  | ParallelFact
  | CongruentSegmentsFact
  | CongruentAnglesFact
  | CongruentTrianglesFact
  | SimilarTrianglesFact
  | OnSegmentFact
  | SegmentExistsFact;

export type JustificationKind = "given" | "reflexive" | "derived" | "postulate";

export type PostulateName = "SSS" | "SAS" | "ASA" | "AAS" | "HL";

export interface Justification {
  kind: JustificationKind;
  /** Other facts this one's proof relies on. Used for circular-reasoning detection. */
  dependsOn: FactId[];
  postulate?: PostulateName;
}

export interface Fact {
  id: FactId;
  relation: Relation;
  justification: Justification;
}
