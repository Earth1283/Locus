import type { Coord } from "./resolvePositions.js";

export function midpoint(a: Coord, b: Coord): Coord {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function normal(a: Coord, b: Coord): Coord {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

export function distance(a: Coord, b: Coord): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Points along a segment for drawing N evenly-spaced tick hashes across its midpoint. */
export function tickPositions(a: Coord, b: Coord, count: number, spacing = 5): Coord[] {
  const mid = midpoint(a, b);
  const dx = (b.x - a.x) / distance(a, b);
  const dy = (b.y - a.y) / distance(a, b);
  const offsets = Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * spacing);
  return offsets.map((o) => ({ x: mid.x + dx * o, y: mid.y + dy * o }));
}

export function angleBetween(vertex: Coord, p1: Coord, p2: Coord): number {
  const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
  const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
  // Normalize into (-π, π] — otherwise a ray pair straddling the atan2
  // wraparound produces a near-2π "sweep" instead of the small interior angle.
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff <= -Math.PI) diff += 2 * Math.PI;
  return diff;
}
