import { angleKey, segmentKey, type FactGraph } from "@locus/engine";

/** Union-find over the keys connected by a set of pair-facts. */
function groupKeys(pairs: Array<[string, string]>): Map<string, string[]> {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };
  const union = (x: string, y: string) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  };

  for (const [a, b] of pairs) union(a, b);

  const groups = new Map<string, string[]>();
  for (const key of parent.keys()) {
    const root = find(key);
    const list = groups.get(root);
    if (list) list.push(key);
    else groups.set(root, [key]);
  }
  return groups;
}

function assignTickCounts(groups: Map<string, string[]>): Map<string, number> {
  const ticks = new Map<string, number>();
  let n = 0;
  for (const [, members] of groups) {
    if (members.length < 2) continue;
    n++;
    const count = Math.min(n, 4);
    for (const key of members) ticks.set(key, count);
  }
  return ticks;
}

/** segmentKey -> tick mark count (1-4), only for segments in a congruence group of 2+. */
export function computeSegmentTicks(graph: FactGraph): Map<string, number> {
  const pairs = graph
    .factsOfType("congruentSegments")
    .map((f): [string, string] => [segmentKey(f.relation.a), segmentKey(f.relation.b)]);
  return assignTickCounts(groupKeys(pairs));
}

/** angleKey -> arc mark count (1-4), only for angles in a congruence group of 2+. */
export function computeAngleTicks(graph: FactGraph): Map<string, number> {
  const pairs = graph
    .factsOfType("congruentAngles")
    .map((f): [string, string] => [angleKey(f.relation.a), angleKey(f.relation.b)]);
  return assignTickCounts(groupKeys(pairs));
}
