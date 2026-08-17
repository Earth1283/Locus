export interface Token {
  text: string;
  index: number;
}

const SYMBOL_WORDS: Record<string, string> = {
  "≅": "congruent",
  "~": "similar",
  "⊥": "perpendicular",
  "∥": "parallel",
  "△": "triangle",
  "∠": "angle",
};

const FILLER_WORDS = new Set(["of", "is", "the", "a", "an", "to", "with", "and", "that", "are"]);

/**
 * Splits raw input into words, normalizing geometry symbols to their
 * spelled-out trigger word and dropping filler words that carry no slot
 * information. Punctuation is stripped except where it's a known symbol.
 */
export function tokenize(input: string): Token[] {
  const withSpacedSymbols = input.replace(/[≅~⊥∥△∠]/g, (s) => ` ${s} `);
  const raw = withSpacedSymbols
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const tokens: Token[] = [];
  raw.forEach((text, index) => {
    const normalized = SYMBOL_WORDS[text] ?? text.replace(/[.,;:!?]+$/, "");
    if (!normalized) return;
    if (FILLER_WORDS.has(normalized.toLowerCase())) return;
    tokens.push({ text: normalized, index });
  });
  return tokens;
}

export function isPointToken(text: string): boolean {
  return /^[A-Z]$/.test(text);
}

export function isSegmentToken(text: string): boolean {
  return /^[A-Z]{2}$/.test(text);
}

export function isTripleToken(text: string): boolean {
  return /^[A-Z]{3}$/.test(text);
}
