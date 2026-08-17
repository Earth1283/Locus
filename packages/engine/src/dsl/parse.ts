import { isPointToken, isSegmentToken, isTripleToken, tokenize, type Token } from "./tokenize.js";

export type ParsedStatement =
  | { kind: "midpoint"; point: string; segment: [string, string] }
  | { kind: "perpendicular"; a: [string, string]; b: [string, string] }
  | { kind: "parallel"; a: [string, string]; b: [string, string] }
  | { kind: "congruentSegments"; a: [string, string]; b: [string, string] }
  | { kind: "congruentAngles"; a: [string, string, string]; b: [string, string, string] }
  | { kind: "congruentTriangles"; a: [string, string, string]; b: [string, string, string] }
  | { kind: "similarTriangles"; a: [string, string, string]; b: [string, string, string] }
  | { kind: "onSegment"; point: string; segment: [string, string] }
  | { kind: "perpendicularBisector"; segment: [string, string]; line: string }
  | { kind: "connectSegment"; segment: [string, string] };

export type ParseResult =
  | { status: "ok"; statement: ParsedStatement }
  | { status: "error"; message: string }
  | { status: "ambiguous"; message: string; options: string[] };

function hasWord(tokens: Token[], word: string): boolean {
  return tokens.some((t) => t.text.toLowerCase() === word);
}

function segments(tokens: Token[]): string[] {
  return tokens.filter((t) => isSegmentToken(t.text)).map((t) => t.text);
}

function points(tokens: Token[]): string[] {
  return tokens.filter((t) => isPointToken(t.text)).map((t) => t.text);
}

function triples(tokens: Token[]): string[] {
  return tokens.filter((t) => isTripleToken(t.text)).map((t) => t.text);
}

function tripleToAngle(triple: string): [string, string, string] {
  return [triple[0]!, triple[1]!, triple[2]!];
}

function matchPerpendicularBisector(tokens: Token[]): ParseResult | null {
  if (!hasWord(tokens, "perpendicular") || !hasWord(tokens, "bisector")) return null;

  const segs = segments(tokens);
  const lineIdx = tokens.findIndex((t) => t.text.toLowerCase() === "line");
  const lineToken = lineIdx >= 0 ? tokens[lineIdx + 1] : undefined;

  if (segs.length !== 1) {
    return {
      status: "error",
      message: 'Perpendicular bisector needs exactly one segment, e.g. "perpendicular bisector of AB is line L".',
    };
  }
  if (!lineToken || !isPointToken(lineToken.text)) {
    return {
      status: "error",
      message: 'Perpendicular bisector needs a named line, e.g. "perpendicular bisector of AB is line L".',
    };
  }

  return {
    status: "ok",
    statement: { kind: "perpendicularBisector", segment: [segs[0]![0]!, segs[0]![1]!], line: lineToken.text },
  };
}

function matchOnSegment(tokens: Token[]): ParseResult | null {
  if (!hasWord(tokens, "on")) return null;

  const pts = points(tokens);
  const segs = segments(tokens);
  if (pts.length !== 1 || segs.length !== 1) {
    return {
      status: "error",
      message: 'On-segment needs exactly one point and one segment, e.g. "D on segment BC".',
    };
  }
  return {
    status: "ok",
    statement: { kind: "onSegment", point: pts[0]!, segment: [segs[0]![0]!, segs[0]![1]!] },
  };
}

function matchPerpendicular(tokens: Token[]): ParseResult | null {
  if (!hasWord(tokens, "perpendicular")) return null;
  const segs = segments(tokens);
  if (segs.length !== 2) {
    return {
      status: "error",
      message: 'Perpendicular needs exactly two segments, e.g. "AB perpendicular to CD".',
    };
  }
  return {
    status: "ok",
    statement: {
      kind: "perpendicular",
      a: [segs[0]![0]!, segs[0]![1]!],
      b: [segs[1]![0]!, segs[1]![1]!],
    },
  };
}

function matchParallel(tokens: Token[]): ParseResult | null {
  if (!hasWord(tokens, "parallel")) return null;
  const segs = segments(tokens);
  if (segs.length !== 2) {
    return { status: "error", message: 'Parallel needs exactly two segments, e.g. "AB parallel to CD".' };
  }
  return {
    status: "ok",
    statement: { kind: "parallel", a: [segs[0]![0]!, segs[0]![1]!], b: [segs[1]![0]!, segs[1]![1]!] },
  };
}

function matchMidpoint(tokens: Token[]): ParseResult | null {
  if (!hasWord(tokens, "midpoint")) return null;
  const pts = points(tokens);
  const segs = segments(tokens);
  if (pts.length !== 1 || segs.length !== 1) {
    return {
      status: "error",
      message: 'Midpoint needs exactly one point and one segment, e.g. "midpoint of BC is D".',
    };
  }
  return {
    status: "ok",
    statement: { kind: "midpoint", point: pts[0]!, segment: [segs[0]![0]!, segs[0]![1]!] },
  };
}

function matchConnect(tokens: Token[]): ParseResult | null {
  if (!hasWord(tokens, "connect")) return null;
  const segs = segments(tokens);
  if (segs.length !== 1) {
    return { status: "error", message: 'Connect needs exactly one segment, e.g. "connect AB".' };
  }
  return { status: "ok", statement: { kind: "connectSegment", segment: [segs[0]![0]!, segs[0]![1]!] } };
}

function matchCongruentOrSimilar(tokens: Token[]): ParseResult | null {
  const congruent = hasWord(tokens, "congruent");
  const similar = hasWord(tokens, "similar");
  if (!congruent && !similar) return null;

  const segs = segments(tokens);
  const trip = triples(tokens);
  const isAngle = hasWord(tokens, "angle");
  const isTriangle = hasWord(tokens, "triangle");

  if (segs.length === 2 && trip.length === 0) {
    if (similar) {
      return { status: "error", message: "Segments are congruent or not equal length; similarity doesn't apply." };
    }
    return {
      status: "ok",
      statement: {
        kind: "congruentSegments",
        a: [segs[0]![0]!, segs[0]![1]!],
        b: [segs[1]![0]!, segs[1]![1]!],
      },
    };
  }

  if (trip.length === 2 && segs.length === 0) {
    if (isAngle && !isTriangle) {
      if (similar) {
        return { status: "error", message: "Angles are congruent, not similar." };
      }
      return {
        status: "ok",
        statement: { kind: "congruentAngles", a: tripleToAngle(trip[0]!), b: tripleToAngle(trip[1]!) },
      };
    }
    if (isTriangle) {
      const statement: ParsedStatement = similar
        ? { kind: "similarTriangles", a: tripleToAngle(trip[0]!), b: tripleToAngle(trip[1]!) }
        : { kind: "congruentTriangles", a: tripleToAngle(trip[0]!), b: tripleToAngle(trip[1]!) };
      return { status: "ok", statement };
    }
    return {
      status: "ambiguous",
      message: `"${trip[0]} ${congruent ? "≅" : "~"} ${trip[1]}" could be a triangle or an angle correspondence.`,
      options: [`triangle ${trip[0]} ${congruent ? "≅" : "~"} triangle ${trip[1]}`, `angle ${trip[0]} ≅ angle ${trip[1]}`],
    };
  }

  return {
    status: "error",
    message: "Congruence needs two segments, two angles, or two triangles of matching shape.",
  };
}

const MATCHERS = [
  matchPerpendicularBisector,
  matchConnect,
  matchOnSegment,
  matchPerpendicular,
  matchParallel,
  matchMidpoint,
  matchCongruentOrSimilar,
];

/**
 * Lenient, order-independent parsing: find a trigger word, then grab nearby
 * capitalized tokens as slots by their shape (1 letter = point, 2 letters =
 * segment, 3 letters = angle/triangle). Sentence structure is not enforced.
 */
export function parseStatement(input: string): ParseResult {
  const tokens = tokenize(input);
  for (const matcher of MATCHERS) {
    const result = matcher(tokens);
    if (result) return result;
  }
  return {
    status: "error",
    message: "No recognized relation keyword found (midpoint, perpendicular, parallel, congruent, on segment, connect).",
  };
}
