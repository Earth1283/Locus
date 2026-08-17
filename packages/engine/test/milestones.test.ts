import { describe, expect, it } from "vitest";
import { FactGraph } from "../src/graph.js";
import { segment, triangle } from "../src/geometry.js";
import { evaluateMilestones, type Milestone } from "../src/milestones.js";

describe("evaluateMilestones", () => {
  it("fires allPartsMatched once the named postulate is satisfied", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "congruentSegments", a: segment("B", "C"), b: segment("Y", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("A", "C"), b: segment("X", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("A", "B"), b: segment("X", "Y") }, { kind: "given", dependsOn: [] });

    const milestone: Milestone = {
      id: "m1",
      label: "SSS matched",
      condition: { kind: "allPartsMatched", postulate: "SSS", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
    };

    const events = evaluateMilestones(graph, [milestone], { quickFixesUsed: 0 });
    expect(events).toEqual([{ milestoneId: "m1", label: "SSS matched" }]);
  });

  it("stays silent until its condition is met", () => {
    const graph = new FactGraph();
    const milestone: Milestone = {
      id: "m1",
      label: "SSS matched",
      condition: { kind: "allPartsMatched", postulate: "SSS", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
    };
    expect(evaluateMilestones(graph, [milestone], { quickFixesUsed: 0 })).toEqual([]);
  });

  it("respects the student's own maxQuickFixesUsed threshold for proofCleared", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "congruentSegments", a: segment("B", "C"), b: segment("Y", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("A", "C"), b: segment("X", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("A", "B"), b: segment("X", "Y") }, { kind: "given", dependsOn: [] });

    const milestone: Milestone = {
      id: "m1",
      label: "Clean proof",
      condition: { kind: "proofCleared", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z"), maxQuickFixesUsed: 0 },
    };

    expect(evaluateMilestones(graph, [milestone], { quickFixesUsed: 1 })).toEqual([]);
    expect(evaluateMilestones(graph, [milestone], { quickFixesUsed: 0 })).toEqual([
      { milestoneId: "m1", label: "Clean proof" },
    ]);
  });
});
