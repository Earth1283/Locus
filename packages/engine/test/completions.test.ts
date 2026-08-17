import { describe, expect, it } from "vitest";
import { FactGraph } from "../src/graph.js";
import { segmentOperand } from "../src/geometry.js";
import { getKeywordCompletions, getObjectCompletions } from "../src/completions.js";

describe("getKeywordCompletions", () => {
  it("matches trigger words by prefix", () => {
    const results = getKeywordCompletions("mid");
    expect(results.map((r) => r.trigger)).toEqual(["midpoint"]);
  });

  it("returns everything for an empty prefix", () => {
    expect(getKeywordCompletions("").length).toBeGreaterThan(1);
  });
});

describe("getObjectCompletions", () => {
  it("only offers segments after a slot that expects one, not points", () => {
    const graph = new FactGraph();
    ["A", "B", "C", "D"].forEach((p) => graph.ensurePoint(p));
    graph.addFact(
      { type: "perpendicular", a: segmentOperand("A", "B"), b: segmentOperand("C", "D") },
      { kind: "given", dependsOn: [] },
    );

    expect(getObjectCompletions(graph, "segment").sort()).toEqual(["AB", "CD"]);
    expect(getObjectCompletions(graph, "point").sort()).toEqual(["A", "B", "C", "D"]);
  });
});
