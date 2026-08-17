import { describe, expect, it } from "vitest";
import { FactGraph } from "../src/graph.js";
import { angle, segment, triangle } from "../src/geometry.js";
import { runDiagnostics } from "../src/diagnostics.js";

function addCongruentSegments(graph: FactGraph, a: [string, string], b: [string, string], kind: "given" | "reflexive" = "given") {
  return graph.addFact({ type: "congruentSegments", a: segment(...a), b: segment(...b) }, { kind, dependsOn: [] });
}

function addCongruentAngles(graph: FactGraph, a: [string, string, string], b: [string, string, string]) {
  graph.addFact(
    { type: "congruentAngles", a: angle(a[1], a[0], a[2]), b: angle(b[1], b[0], b[2]) },
    { kind: "given", dependsOn: [] },
  );
}

describe("runDiagnostics", () => {
  it("flags SSA when a congruence is claimed on SSA-shaped matched parts", () => {
    const graph = new FactGraph();
    addCongruentSegments(graph, ["B", "C"], ["Y", "Z"]);
    addCongruentSegments(graph, ["A", "B"], ["X", "Y"]);
    addCongruentAngles(graph, ["B", "A", "C"], ["Y", "X", "Z"]); // angle A (vertex is the middle letter)
    graph.addFact(
      { type: "congruentTriangles", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
      { kind: "given", dependsOn: [] },
    );

    const diagnostics = runDiagnostics(graph);
    expect(diagnostics.some((d) => d.code === "ssa")).toBe(true);
  });

  it("flags AAA claimed as congruence as similarity-only", () => {
    const graph = new FactGraph();
    addCongruentAngles(graph, ["B", "A", "C"], ["Y", "X", "Z"]); // angle A
    addCongruentAngles(graph, ["A", "B", "C"], ["X", "Y", "Z"]); // angle B
    addCongruentAngles(graph, ["A", "C", "B"], ["X", "Z", "Y"]); // angle C
    graph.addFact(
      { type: "congruentTriangles", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
      { kind: "given", dependsOn: [] },
    );

    const diagnostics = runDiagnostics(graph);
    expect(diagnostics.some((d) => d.code === "aaa-similarity-only")).toBe(true);
  });

  it("flags redundant hypothesis when AAA is upgraded with one side", () => {
    const graph = new FactGraph();
    addCongruentAngles(graph, ["B", "A", "C"], ["Y", "X", "Z"]); // angle A
    addCongruentAngles(graph, ["A", "B", "C"], ["X", "Y", "Z"]); // angle B
    addCongruentAngles(graph, ["A", "C", "B"], ["X", "Z", "Y"]); // angle C
    addCongruentSegments(graph, ["A", "B"], ["X", "Y"]);
    graph.addFact(
      { type: "congruentTriangles", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
      { kind: "given", dependsOn: [] },
    );

    const diagnostics = runDiagnostics(graph);
    expect(diagnostics.some((d) => d.code === "redundant-hypothesis")).toBe(true);
    expect(diagnostics.some((d) => d.code === "ssa" || d.code === "aaa-similarity-only")).toBe(false);
  });

  it("flags an undeclared shared side as needing the reflexive property", () => {
    const graph = new FactGraph();
    addCongruentSegments(graph, ["B", "C"], ["B", "C"], "given");

    const diagnostics = runDiagnostics(graph);
    expect(diagnostics.some((d) => d.code === "undeclared-shared-part")).toBe(true);
  });

  it("does not flag a shared side that was properly justified as reflexive", () => {
    const graph = new FactGraph();
    addCongruentSegments(graph, ["B", "C"], ["B", "C"], "reflexive");

    const diagnostics = runDiagnostics(graph);
    expect(diagnostics.some((d) => d.code === "undeclared-shared-part")).toBe(false);
  });

  it("flags wrong correspondence order when the claimed order doesn't match proven parts", () => {
    const graph = new FactGraph();
    // Proven parts actually correspond A<->X, B<->Z, C<->Y (not A<->X, B<->Y, C<->Z as claimed).
    addCongruentSegments(graph, ["A", "B"], ["X", "Z"]);
    addCongruentSegments(graph, ["A", "C"], ["X", "Y"]);
    addCongruentSegments(graph, ["B", "C"], ["Z", "Y"]);
    graph.addFact(
      { type: "congruentTriangles", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
      { kind: "given", dependsOn: [] },
    );

    const diagnostics = runDiagnostics(graph);
    expect(diagnostics.some((d) => d.code === "wrong-correspondence")).toBe(true);
  });

  it("detects circular reasoning in fact justifications", () => {
    const graph = new FactGraph();
    // Fact ids are assigned sequentially ("f1", "f2", ...) on a fresh graph,
    // so each fact's dependency on the other can be wired up before both exist.
    graph.addFact(
      { type: "congruentSegments", a: segment("A", "B"), b: segment("X", "Y") },
      { kind: "given", dependsOn: ["f2"] },
    );
    graph.addFact(
      { type: "congruentSegments", a: segment("A", "C"), b: segment("X", "Z") },
      { kind: "given", dependsOn: ["f1"] },
    );

    const diagnostics = runDiagnostics(graph);
    expect(diagnostics.some((d) => d.code === "circular-reasoning")).toBe(true);
  });

  it("reports nothing for a clean SSS proof", () => {
    const graph = new FactGraph();
    addCongruentSegments(graph, ["B", "C"], ["Y", "Z"]);
    addCongruentSegments(graph, ["A", "C"], ["X", "Z"]);
    addCongruentSegments(graph, ["A", "B"], ["X", "Y"]);
    graph.addFact(
      { type: "congruentTriangles", a: triangle("A", "B", "C"), b: triangle("X", "Y", "Z") },
      { kind: "given", dependsOn: [] },
    );

    expect(runDiagnostics(graph)).toEqual([]);
  });
});
