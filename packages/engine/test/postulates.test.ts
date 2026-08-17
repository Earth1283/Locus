import { describe, expect, it } from "vitest";
import { FactGraph } from "../src/graph.js";
import { angle, segment, segmentOperand, triangle } from "../src/geometry.js";
import { classifyTriangleMatch } from "../src/postulates.js";

function given(graph: FactGraph) {
  return {
    segments(a: [string, string], b: [string, string]) {
      graph.addFact(
        { type: "congruentSegments", a: segment(...a), b: segment(...b) },
        { kind: "given", dependsOn: [] },
      );
    },
    angles(a: [string, string, string], b: [string, string, string]) {
      graph.addFact(
        { type: "congruentAngles", a: angle(...a), b: angle(...b) },
        { kind: "given", dependsOn: [] },
      );
    },
    perpendicular(a: [string, string], b: [string, string]) {
      graph.addFact(
        { type: "perpendicular", a: segmentOperand(...a), b: segmentOperand(...b) },
        { kind: "given", dependsOn: [] },
      );
    },
  };
}

describe("classifyTriangleMatch", () => {
  const ABC = triangle("A", "B", "C");
  const XYZ = triangle("X", "Y", "Z");

  it("recognizes SSS", () => {
    const graph = new FactGraph();
    const g = given(graph);
    g.segments(["B", "C"], ["Y", "Z"]);
    g.segments(["A", "C"], ["X", "Z"]);
    g.segments(["A", "B"], ["X", "Y"]);

    const result = classifyTriangleMatch(graph, ABC, XYZ);
    expect(result.postulate).toBe("SSS");
    expect(result.conclusion).toBe("congruent");
  });

  it("recognizes SAS when the matched angle is included between the matched sides", () => {
    const graph = new FactGraph();
    const g = given(graph);
    // sides AB, AC matched (touch vertex A) + angle A matched -> included -> SAS
    g.segments(["A", "B"], ["X", "Y"]);
    g.segments(["A", "C"], ["X", "Z"]);
    g.angles(["A", "B", "C"], ["X", "Y", "Z"]);

    const result = classifyTriangleMatch(graph, ABC, XYZ);
    expect(result.postulate).toBe("SAS");
    expect(result.conclusion).toBe("congruent");
  });

  it("flags SSA as ambiguous when the matched angle is not included", () => {
    const graph = new FactGraph();
    const g = given(graph);
    // side BC (opposite A) + side AB (touches A) + angle A: angle A is NOT
    // included between BC and AB (BC doesn't touch A) -> classic SSA
    g.segments(["B", "C"], ["Y", "Z"]);
    g.segments(["A", "B"], ["X", "Y"]);
    g.angles(["A", "B", "C"], ["X", "Y", "Z"]);

    const result = classifyTriangleMatch(graph, ABC, XYZ);
    expect(result.postulate).toBe("SSA");
    expect(result.conclusion).toBe("ambiguous");
  });

  it("upgrades the SSA shape to HL when both triangles are right triangles at the non-included angle", () => {
    const graph = new FactGraph();
    const g = given(graph);
    // right angle at A and X (legs AB/AC and XY/XZ perpendicular)
    g.perpendicular(["A", "B"], ["A", "C"]);
    g.perpendicular(["X", "Y"], ["X", "Z"]);
    // hypotenuse BC/YZ (opposite the right angle) + one leg AB/XY
    g.segments(["B", "C"], ["Y", "Z"]);
    g.segments(["A", "B"], ["X", "Y"]);

    const result = classifyTriangleMatch(graph, ABC, XYZ);
    expect(result.postulate).toBe("HL");
    expect(result.conclusion).toBe("congruent");
  });

  it("recognizes ASA when the matched side is included between the matched angles", () => {
    const graph = new FactGraph();
    const g = given(graph);
    g.angles(["A", "B", "C"], ["X", "Y", "Z"]);
    g.angles(["B", "A", "C"], ["Y", "X", "Z"]);
    g.segments(["A", "B"], ["X", "Y"]); // side AB touches both A and B -> included

    const result = classifyTriangleMatch(graph, ABC, XYZ);
    expect(result.postulate).toBe("ASA");
    expect(result.conclusion).toBe("congruent");
  });

  it("recognizes AAS when the matched side is not included between the matched angles", () => {
    const graph = new FactGraph();
    const g = given(graph);
    g.angles(["A", "B", "C"], ["X", "Y", "Z"]);
    g.angles(["B", "A", "C"], ["Y", "X", "Z"]);
    g.segments(["B", "C"], ["Y", "Z"]); // side BC opposite A, not included with angle A+B

    const result = classifyTriangleMatch(graph, ABC, XYZ);
    expect(result.postulate).toBe("AAS");
    expect(result.conclusion).toBe("congruent");
  });

  it("recognizes AAA as similarity-only", () => {
    const graph = new FactGraph();
    const g = given(graph);
    g.angles(["A", "B", "C"], ["X", "Y", "Z"]);
    g.angles(["B", "A", "C"], ["Y", "X", "Z"]);
    g.angles(["C", "A", "B"], ["Z", "X", "Y"]);

    const result = classifyTriangleMatch(graph, ABC, XYZ);
    expect(result.postulate).toBe("AAA");
    expect(result.conclusion).toBe("similarity-only");
  });

  it("upgrades AAA + one side to AAS and flags the redundant angle", () => {
    const graph = new FactGraph();
    const g = given(graph);
    g.angles(["A", "B", "C"], ["X", "Y", "Z"]);
    g.angles(["B", "A", "C"], ["Y", "X", "Z"]);
    g.angles(["C", "A", "B"], ["Z", "X", "Y"]);
    g.segments(["A", "B"], ["X", "Y"]);

    const result = classifyTriangleMatch(graph, ABC, XYZ);
    expect(result.postulate).toBe("AAS");
    expect(result.conclusion).toBe("congruent");
    expect(result.redundantAngle).not.toBeUndefined();
  });

  it("reports insufficient when too little is matched", () => {
    const graph = new FactGraph();
    const g = given(graph);
    g.segments(["A", "B"], ["X", "Y"]);

    const result = classifyTriangleMatch(graph, ABC, XYZ);
    expect(result.conclusion).toBe("insufficient");
  });
});
