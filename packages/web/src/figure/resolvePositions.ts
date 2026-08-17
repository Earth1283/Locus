import type { FactGraph, PointId } from "@locus/engine";

export interface Coord {
  x: number;
  y: number;
}

/**
 * Every point named as the target of a `midpoint` fact is a computed point,
 * not draggable — its position always tracks its two endpoints, however
 * they move. Every other point is independent and keeps whatever coordinate
 * the student last dragged it to (or a default).
 */
export function resolvePositions(
  graph: FactGraph,
  draggableCoords: ReadonlyMap<PointId, Coord>,
  defaultFor: (label: string, index: number) => Coord,
): Map<PointId, Coord> {
  const midpointOf = new Map<PointId, [PointId, PointId]>();
  for (const f of graph.factsOfType("midpoint")) {
    midpointOf.set(f.relation.point, [f.relation.segment.p1, f.relation.segment.p2]);
  }

  const points = graph.points();
  const positions = new Map<PointId, Coord>();

  points.forEach((p, i) => {
    if (!midpointOf.has(p.id)) {
      positions.set(p.id, draggableCoords.get(p.id) ?? defaultFor(p.label, i));
    }
  });

  for (let pass = 0; pass < points.length; pass++) {
    let progress = false;
    for (const [target, [a, b]] of midpointOf) {
      if (positions.has(target)) continue;
      const pa = positions.get(a);
      const pb = positions.get(b);
      if (pa && pb) {
        positions.set(target, { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 });
        progress = true;
      }
    }
    if (!progress) break;
  }

  points.forEach((p, i) => {
    if (!positions.has(p.id)) positions.set(p.id, defaultFor(p.label, i));
  });

  return positions;
}

export function isDraggable(graph: FactGraph, pointId: PointId): boolean {
  return !graph.factsOfType("midpoint").some((f) => f.relation.point === pointId);
}
