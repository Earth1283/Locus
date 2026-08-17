import type { FactGraph } from "./graph.js";
import { segmentKey, angleKey, triangleSetKey } from "./geometry.js";
import type { Segment, Angle, Triangle } from "./types.js";

export type SlotType = "point" | "segment" | "angle" | "triangle" | "line";

export interface KeywordCompletion {
  trigger: string;
  template: string;
  description: string;
}

const KEYWORD_VOCABULARY: KeywordCompletion[] = [
  { trigger: "midpoint", template: "midpoint of ___ is ___", description: "Assert a point is the midpoint of a segment" },
  { trigger: "perpendicular", template: "___ perpendicular to ___", description: "Assert two segments (or a line and a segment) meet at a right angle" },
  { trigger: "parallel", template: "___ parallel to ___", description: "Assert two segments never meet" },
  { trigger: "congruent", template: "___ is congruent to ___", description: "Assert two segments, angles, or triangles are congruent" },
  { trigger: "similar", template: "___ is similar to ___", description: "Assert two triangles are similar" },
  { trigger: "on", template: "___ is on segment ___", description: "Assert a point lies on a segment" },
  { trigger: "connect", template: "connect ___", description: "Construct an auxiliary segment between two existing points" },
  {
    trigger: "perpendicular bisector",
    template: "perpendicular bisector of ___ is line ___",
    description: "Construct the perpendicular bisector of a segment",
  },
];

/** Boring, standard trigger-word completion — matched by prefix, case-insensitive. */
export function getKeywordCompletions(prefix: string): KeywordCompletion[] {
  const p = prefix.toLowerCase();
  if (!p) return KEYWORD_VOCABULARY;
  return KEYWORD_VOCABULARY.filter((k) => k.trigger.startsWith(p));
}

export function listSegments(graph: FactGraph): Segment[] {
  const seen = new Map<string, Segment>();
  const add = (s: Segment) => seen.set(segmentKey(s), s);

  for (const f of graph.facts()) {
    const r = f.relation;
    if (r.type === "midpoint" || r.type === "onSegment" || r.type === "segmentExists") add(r.segment);
    if (r.type === "congruentSegments") {
      add(r.a);
      add(r.b);
    }
    if (r.type === "perpendicular" || r.type === "parallel") {
      if (r.a.kind === "segment") add(r.a.segment);
      if (r.b.kind === "segment") add(r.b.segment);
    }
  }
  return [...seen.values()];
}

export function listAngles(graph: FactGraph): Angle[] {
  const seen = new Map<string, Angle>();
  for (const f of graph.factsOfType("congruentAngles")) {
    seen.set(angleKey(f.relation.a), f.relation.a);
    seen.set(angleKey(f.relation.b), f.relation.b);
  }
  return [...seen.values()];
}

export function listTriangles(graph: FactGraph): Triangle[] {
  const seen = new Map<string, Triangle>();
  for (const f of [...graph.factsOfType("congruentTriangles"), ...graph.factsOfType("similarTriangles")]) {
    seen.set(triangleSetKey(f.relation.a), f.relation.a);
    seen.set(triangleSetKey(f.relation.b), f.relation.b);
  }
  return [...seen.values()];
}

/**
 * Context-aware completion for an open slot: only objects that already
 * exist in the fact graph and match the slot's type. Finalizes what's
 * already there — it never invents an object the student hasn't named.
 */
export function getObjectCompletions(graph: FactGraph, slotType: SlotType): string[] {
  switch (slotType) {
    case "point":
      return graph.points().map((p) => p.label);
    case "line":
      return graph.lines().map((l) => l.label);
    case "segment":
      return listSegments(graph).map((s) => `${s.p1}${s.p2}`);
    case "angle":
      return listAngles(graph).map((a) => `${a.p1}${a.vertex}${a.p2}`);
    case "triangle":
      return listTriangles(graph).map((t) => t.vertices.join(""));
  }
}
