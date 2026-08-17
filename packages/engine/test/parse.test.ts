import { describe, expect, it } from "vitest";
import { parseStatement } from "../src/dsl/parse.js";

describe("parseStatement", () => {
  it("parses all phrasings of midpoint identically", () => {
    const variants = ["midpoint of BC is D", "D is the midpoint of BC", "midpoint BC D"];
    for (const input of variants) {
      const result = parseStatement(input);
      expect(result).toEqual({
        status: "ok",
        statement: { kind: "midpoint", point: "D", segment: ["B", "C"] },
      });
    }
  });

  it("parses perpendicular segments", () => {
    const result = parseStatement("AB perpendicular to CD");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "perpendicular", a: ["A", "B"], b: ["C", "D"] },
    });
  });

  it("parses the ⊥ symbol the same as the word", () => {
    const withSymbol = parseStatement("AB ⊥ CD");
    const withWord = parseStatement("AB perpendicular to CD");
    expect(withSymbol).toEqual(withWord);
  });

  it("parses parallel segments", () => {
    const result = parseStatement("AB parallel to CD");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "parallel", a: ["A", "B"], b: ["C", "D"] },
    });
  });

  it("parses congruent segments", () => {
    const result = parseStatement("AB is congruent to CD");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "congruentSegments", a: ["A", "B"], b: ["C", "D"] },
    });
  });

  it("parses congruent angles when the angle keyword is present", () => {
    const result = parseStatement("angle ABC is congruent to angle XYZ");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "congruentAngles", a: ["A", "B", "C"], b: ["X", "Y", "Z"] },
    });
  });

  it("parses congruent triangles with the triangle keyword", () => {
    const result = parseStatement("triangle ABC is congruent to triangle XYZ");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "congruentTriangles", a: ["A", "B", "C"], b: ["X", "Y", "Z"] },
    });
  });

  it("parses the △ symbol as triangle", () => {
    const result = parseStatement("△ABC ≅ △XYZ");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "congruentTriangles", a: ["A", "B", "C"], b: ["X", "Y", "Z"] },
    });
  });

  it("parses similar triangles", () => {
    const result = parseStatement("△ABC ~ △XYZ");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "similarTriangles", a: ["A", "B", "C"], b: ["X", "Y", "Z"] },
    });
  });

  it("parses on-segment", () => {
    const result = parseStatement("D is on segment BC");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "onSegment", point: "D", segment: ["B", "C"] },
    });
  });

  it("parses the perpendicular-bisector macro", () => {
    const result = parseStatement("perpendicular bisector of AB is line L");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "perpendicularBisector", segment: ["A", "B"], line: "L" },
    });
  });

  it("parses connect", () => {
    const result = parseStatement("connect AB");
    expect(result).toEqual({
      status: "ok",
      statement: { kind: "connectSegment", segment: ["A", "B"] },
    });
  });

  it("falls back to an ambiguous result for a bare triple with no angle/triangle keyword", () => {
    const result = parseStatement("ABC ≅ XYZ");
    expect(result.status).toBe("ambiguous");
  });

  it("reports an error when no trigger word is recognized", () => {
    const result = parseStatement("D E F");
    expect(result.status).toBe("error");
  });

  it("reports an error on arity mismatch", () => {
    const result = parseStatement("midpoint of BC and DE is F");
    expect(result.status).toBe("error");
  });
});
