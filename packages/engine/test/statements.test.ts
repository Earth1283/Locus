import { describe, expect, it } from "vitest";
import { FactGraph } from "../src/graph.js";
import { applyStatement } from "../src/statements.js";
import { parseStatement } from "../src/dsl/parse.js";

function parseAndApply(graph: FactGraph, input: string) {
  const parsed = parseStatement(input);
  if (parsed.status !== "ok") throw new Error(`expected parse to succeed: ${input}`);
  return applyStatement(graph, parsed.statement);
}

describe("applyStatement", () => {
  it("auto-creates referenced points", () => {
    const graph = new FactGraph();
    parseAndApply(graph, "midpoint of BC is D");
    expect(graph.points().map((p) => p.label).sort()).toEqual(["B", "C", "D"]);
  });

  it("expands the perpendicular-bisector macro into perpendicular + midpoint facts", () => {
    const graph = new FactGraph();
    const applied = parseAndApply(graph, "perpendicular bisector of AB is line L");

    expect(applied.factIds).toHaveLength(2);
    expect(applied.expandedFrom).toBe("perpendicularBisector");
    expect(graph.factsOfType("perpendicular")).toHaveLength(1);
    expect(graph.factsOfType("midpoint")).toHaveLength(1);
    expect(graph.lines().map((l) => l.label)).toEqual(["L"]);
  });

  it("re-asserting the same statement doesn't create duplicate facts", () => {
    const graph = new FactGraph();
    parseAndApply(graph, "AB is congruent to CD");
    parseAndApply(graph, "AB is congruent to CD");
    expect(graph.factsOfType("congruentSegments")).toHaveLength(1);
  });

  it("connect asserts the segment exists", () => {
    const graph = new FactGraph();
    parseAndApply(graph, "connect AB");
    expect(graph.factsOfType("segmentExists")).toHaveLength(1);
    expect(graph.points().map((p) => p.label).sort()).toEqual(["A", "B"]);
  });
});
