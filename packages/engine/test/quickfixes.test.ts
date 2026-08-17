import { describe, expect, it } from "vitest";
import { FactGraph } from "../src/graph.js";
import { angle, segment, segmentOperand, triangle } from "../src/geometry.js";
import { runDiagnostics } from "../src/diagnostics.js";
import { getQuickFixes, getSegmentQuickFixes } from "../src/quickfixes.js";

describe("getQuickFixes", () => {
  it("offers switch-to-similarity and keep-congruence-with-guidance for AAA", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "congruentAngles", a: angle("A", "B", "C"), b: angle("X", "Y", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentAngles", a: angle("B", "A", "C"), b: angle("Y", "X", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentAngles", a: angle("C", "A", "B"), b: angle("Z", "X", "Y") }, { kind: "given", dependsOn: [] });
    const factId = graph.addFact(
      { type: "congruentTriangles", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
      { kind: "given", dependsOn: [] },
    );

    const [diagnostic] = runDiagnostics(graph).filter((d) => d.code === "aaa-similarity-only");
    expect(diagnostic).toBeDefined();
    const fixes = getQuickFixes(graph, diagnostic!);
    expect(fixes.map((f) => f.id)).toEqual(["switch-to-similarity", "keep-congruence-add-side"]);

    const action = fixes[0]!;
    if (action.kind !== "action") throw new Error("expected action");
    const result = action.apply(graph);
    expect(result.factsOfType("similarTriangles")).toHaveLength(1);
    expect(result.getFact(factId)).toBeUndefined();
    // original graph is untouched
    expect(graph.getFact(factId)).toBeDefined();
  });

  it("upgrades a shared-side fact's justification to reflexive", () => {
    const graph = new FactGraph();
    const factId = graph.addFact(
      { type: "congruentSegments", a: segment("B", "C"), b: segment("B", "C") },
      { kind: "given", dependsOn: [] },
    );

    const [diagnostic] = runDiagnostics(graph);
    const fixes = getQuickFixes(graph, diagnostic!);
    const fix = fixes[0]!;
    if (fix.kind !== "action") throw new Error("expected action");
    const result = fix.apply(graph);
    expect(result.getFact(factId)!.justification.kind).toBe("reflexive");
  });

  it("offers reorder-correspondence when the correspondence is wrong", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "congruentSegments", a: segment("A", "B"), b: segment("X", "Z") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("A", "C"), b: segment("X", "Y") }, { kind: "given", dependsOn: [] });
    graph.addFact({ type: "congruentSegments", a: segment("B", "C"), b: segment("Z", "Y") }, { kind: "given", dependsOn: [] });
    graph.addFact(
      { type: "congruentTriangles", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
      { kind: "given", dependsOn: [] },
    );

    const [diagnostic] = runDiagnostics(graph).filter((d) => d.code === "wrong-correspondence");
    const fixes = getQuickFixes(graph, diagnostic!);
    expect(fixes).toHaveLength(1);
    const fix = fixes[0]!;
    if (fix.kind !== "action") throw new Error("expected action");
    const result = fix.apply(graph);
    const [fixed] = result.factsOfType("congruentTriangles");
    expect(fixed!.relation.b.vertices).toEqual(["X", "Z", "Y"]);
  });
});

describe("getSegmentQuickFixes", () => {
  it("offers remove/create-auxiliary options for a segment with no backing fact", () => {
    const graph = new FactGraph();
    graph.ensurePoint("A");
    graph.ensurePoint("B");
    const fixes = getSegmentQuickFixes(graph, segment("A", "B"));
    expect(fixes.map((f) => f.id)).toEqual(["remove-references", "create-auxiliary"]);
  });

  it("still flags a segment that's only claimed about, not constructed", () => {
    const graph = new FactGraph();
    graph.addFact(
      { type: "perpendicular", a: segmentOperand("A", "B"), b: segmentOperand("C", "D") },
      { kind: "given", dependsOn: [] },
    );
    // A perpendicular *claim* about AB isn't proof AB was ever drawn.
    expect(getSegmentQuickFixes(graph, segment("A", "B"))).not.toEqual([]);
  });

  it("offers nothing once the segment is actually constructed", () => {
    const graph = new FactGraph();
    graph.addFact({ type: "segmentExists", segment: segment("A", "B") }, { kind: "given", dependsOn: [] });
    expect(getSegmentQuickFixes(graph, segment("A", "B"))).toEqual([]);
  });
});
