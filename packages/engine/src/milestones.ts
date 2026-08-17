import type { FactGraph } from "./graph.js";
import { classifyTriangleMatch } from "./postulates.js";
import { runDiagnostics } from "./diagnostics.js";
import type { PostulateName, Triangle } from "./types.js";

export type MilestoneCondition =
  | { kind: "allPartsMatched"; postulate: PostulateName; a: Triangle; b: Triangle }
  | { kind: "proofCleared"; a: Triangle; b: Triangle; maxQuickFixesUsed: number };

/**
 * Milestones are entirely student-authored data — the engine never ships a
 * default one, only evaluates whatever the student defined. This is what
 * keeps them passing the reward-hacking litmus test (PHILOSOPHY.md Section
 * 4): the set/unset authority never leaves the student.
 */
export interface Milestone {
  id: string;
  label: string;
  condition: MilestoneCondition;
}

export interface SessionStats {
  quickFixesUsed: number;
}

export interface MilestoneEvent {
  milestoneId: string;
  label: string;
}

function isSatisfied(graph: FactGraph, condition: MilestoneCondition, stats: SessionStats): boolean {
  switch (condition.kind) {
    case "allPartsMatched": {
      const match = classifyTriangleMatch(graph, condition.a, condition.b);
      return match.postulate === condition.postulate && match.conclusion === "congruent";
    }
    case "proofCleared": {
      const match = classifyTriangleMatch(graph, condition.a, condition.b);
      if (match.conclusion !== "congruent") return false;
      if (stats.quickFixesUsed > condition.maxQuickFixesUsed) return false;
      return runDiagnostics(graph).length === 0;
    }
  }
}

export function evaluateMilestones(graph: FactGraph, milestones: Milestone[], stats: SessionStats): MilestoneEvent[] {
  return milestones
    .filter((m) => isSatisfied(graph, m.condition, stats))
    .map((m) => ({ milestoneId: m.id, label: m.label }));
}
