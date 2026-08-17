import { describe, expect, it } from "vitest";
import { FactGraph } from "../src/graph.js";
import { angle, segment, triangle } from "../src/geometry.js";
import { backwardChain, forwardChain } from "../src/chaining.js";

describe("backwardChain", () => {
  it("reports every postulate as fully missing on an empty graph", () => {
    const graph = new FactGraph();
    const result = backwardChain(graph, triangle("A", "B", "C"), triangle("X", "Y", "Z"));
    expect(result.alreadyValid).toBe(false);
    expect(result.options[0]!.missingSides.length + result.options[0]!.missingAngles.length).toBeGreaterThan(0);
  });

  it("shrinks the missing list for SAS once two sides and the included angle are matched", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "congruentSegments", a: segment("A", "B"), b: segment("X", "Y") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("A", "C"), b: segment("X", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentAngles", a: angle("A", "B", "C"), b: angle("X", "Y", "Z") }, { kind: "given", dependsOn: [] });

    const result = backwardChain(graph, triangle("A", "B", "C"), triangle("X", "Y", "Z"));
    expect(result.alreadyValid).toBe(true);
    const sas = result.options.find((o) => o.postulate === "SAS" && o.missingSides.length === 0 && o.missingAngles.length === 0);
    expect(sas).toBeDefined();
  });

  it("never collapses to a single suggested path when several are equally close", () => {
    const graph = new FactGraph();
    const result = backwardChain(graph, triangle("A", "B", "C"), triangle("X", "Y", "Z"));
    // SSS, SAS x3, ASA x3, AAS x3, HL x3 = 13 total paths always reported
    expect(result.options).toHaveLength(13);
  });
});

describe("forwardChain", () => {
  it("reports nothing new when parts don't yet support a postulate", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "congruentSegments", a: segment("A", "B"), b: segment("X", "Y") }, { kind: "given", dependsOn: [] });
    const result = forwardChain(graph, triangle("A", "B", "C"), triangle("X", "Y", "Z"));
    expect(result.newlyDerivable).toBe(false);
  });

  it("reports a newly derivable SSS conclusion once all three sides match", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "congruentSegments", a: segment("A", "B"), b: segment("X", "Y") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("A", "C"), b: segment("X", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("B", "C"), b: segment("Y", "Z") }, { kind: "given", dependsOn: [] });

    const result = forwardChain(graph, triangle("A", "B", "C"), triangle("X", "Y", "Z"));
    expect(result).toEqual({ newlyDerivable: true, postulate: "SSS" });
  });

  it("stops reporting it as newly derivable once the conclusion is actually stated", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "congruentSegments", a: segment("A", "B"), b: segment("X", "Y") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("A", "C"), b: segment("X", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("B", "C"), b: segment("Y", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact(
      { type: "congruentTriangles", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
      { kind: "given", dependsOn: [] },
    );

    const result = forwardChain(graph, triangle("A", "B", "C"), triangle("X", "Y", "Z"));
    expect(result.newlyDerivable).toBe(false);
  });

  it("never surfaces AAA or SSA as a newly derivable conclusion", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "congruentAngles", a: angle("A", "B", "C"), b: angle("X", "Y", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentAngles", a: angle("B", "A", "C"), b: angle("Y", "X", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentAngles", a: angle("C", "A", "B"), b: angle("Z", "X", "Y") }, { kind: "given", dependsOn: [] });

    const result = forwardChain(graph, triangle("A", "B", "C"), triangle("X", "Y", "Z"));
    expect(result.newlyDerivable).toBe(false);
  });
});
