import { segmentKey, angleKey, triangleKey, segmentOrLineKey } from "./geometry.js";
import type {
  CircleId,
  CircleObject,
  Fact,
  FactId,
  GeometryObject,
  Justification,
  LineId,
  LineObject,
  PointId,
  PointObject,
  Relation,
  RelationType,
} from "./types.js";

function relationKey(r: Relation): string {
  switch (r.type) {
    case "midpoint":
      return `midpoint:${r.point}:${segmentKey(r.segment)}`;
    case "perpendicular":
      return `perpendicular:${[segmentOrLineKey(r.a), segmentOrLineKey(r.b)].sort().join(",")}`;
    case "parallel":
      return `parallel:${[segmentOrLineKey(r.a), segmentOrLineKey(r.b)].sort().join(",")}`;
    case "congruentSegments":
      return `congruentSegments:${[segmentKey(r.a), segmentKey(r.b)].sort().join(",")}`;
    case "congruentAngles":
      return `congruentAngles:${[angleKey(r.a), angleKey(r.b)].sort().join(",")}`;
    case "congruentTriangles":
      return `congruentTriangles:${triangleKey(r.a)}:${triangleKey(r.b)}`;
    case "similarTriangles":
      return `similarTriangles:${triangleKey(r.a)}:${triangleKey(r.b)}`;
    case "onSegment":
      return `onSegment:${r.point}:${segmentKey(r.segment)}`;
    case "segmentExists":
      return `segmentExists:${segmentKey(r.segment)}`;
  }
}

/**
 * The fact graph: geometry objects (points/lines/circles) and the relations
 * asserted between them. This is the one mutable, stateful module in the
 * engine — everything else (diagnostics, completions, quick-fixes, chaining)
 * is a pure function that reads through this interface and returns results.
 */
export class FactGraph {
  #objects = new Map<PointId | LineId | CircleId, GeometryObject>();
  #facts = new Map<FactId, Fact>();
  #factsByType = new Map<RelationType, Set<FactId>>();
  #factByRelationKey = new Map<string, FactId>();
  #nextFactId = 1;

  ensurePoint(label: string): PointId {
    const existing = this.#objects.get(label);
    if (existing) {
      if (existing.kind !== "point") {
        throw new Error(`"${label}" is already a ${existing.kind}, not a point`);
      }
      return existing.id;
    }
    const point: PointObject = { kind: "point", id: label, label };
    this.#objects.set(label, point);
    return point.id;
  }

  ensureLine(label: string): LineId {
    const existing = this.#objects.get(label);
    if (existing) {
      if (existing.kind !== "line") {
        throw new Error(`"${label}" is already a ${existing.kind}, not a line`);
      }
      return existing.id;
    }
    const line: LineObject = { kind: "line", id: label, label };
    this.#objects.set(label, line);
    return line.id;
  }

  ensureCircle(label: string, center: PointId): CircleId {
    const existing = this.#objects.get(label);
    if (existing) {
      if (existing.kind !== "circle") {
        throw new Error(`"${label}" is already a ${existing.kind}, not a circle`);
      }
      return existing.id;
    }
    const circle: CircleObject = { kind: "circle", id: label, label, center };
    this.#objects.set(label, circle);
    return circle.id;
  }

  getObject(id: string): GeometryObject | undefined {
    return this.#objects.get(id);
  }

  hasObject(id: string): boolean {
    return this.#objects.has(id);
  }

  objects(): GeometryObject[] {
    return [...this.#objects.values()];
  }

  points(): PointObject[] {
    return this.objects().filter((o): o is PointObject => o.kind === "point");
  }

  lines(): LineObject[] {
    return this.objects().filter((o): o is LineObject => o.kind === "line");
  }

  /**
   * Adds a fact. Re-asserting an identical relation returns the id of the
   * existing fact rather than creating a duplicate.
   */
  addFact(relation: Relation, justification: Justification): FactId {
    const key = relationKey(relation);
    const existing = this.#factByRelationKey.get(key);
    if (existing) return existing;

    const id = `f${this.#nextFactId++}`;
    const fact: Fact = { id, relation, justification };
    this.#facts.set(id, fact);
    this.#factByRelationKey.set(key, id);
    const bucket = this.#factsByType.get(relation.type);
    if (bucket) bucket.add(id);
    else this.#factsByType.set(relation.type, new Set([id]));
    return id;
  }

  removeFact(id: FactId): void {
    const fact = this.#facts.get(id);
    if (!fact) return;
    this.#facts.delete(id);
    this.#factByRelationKey.delete(relationKey(fact.relation));
    this.#factsByType.get(fact.relation.type)?.delete(id);
  }

  getFact(id: FactId): Fact | undefined {
    return this.#facts.get(id);
  }

  /** Upgrades a fact's justification in place (e.g. "given" -> "reflexive"). */
  updateJustification(id: FactId, justification: Justification): void {
    const fact = this.#facts.get(id);
    if (!fact) return;
    this.#facts.set(id, { ...fact, justification });
  }

  facts(): Fact[] {
    return [...this.#facts.values()];
  }

  factsOfType<T extends Relation["type"]>(type: T): Array<Fact & { relation: Extract<Relation, { type: T }> }> {
    const ids = this.#factsByType.get(type);
    if (!ids) return [];
    return [...ids].map((id) => this.#facts.get(id) as Fact & { relation: Extract<Relation, { type: T }> });
  }

  findFactByRelation(relation: Relation): Fact | undefined {
    const id = this.#factByRelationKey.get(relationKey(relation));
    return id ? this.#facts.get(id) : undefined;
  }

  hasRelation(relation: Relation): boolean {
    return this.#factByRelationKey.has(relationKey(relation));
  }

  clone(): FactGraph {
    const copy = new FactGraph();
    copy.#objects = new Map(this.#objects);
    copy.#facts = new Map([...this.#facts].map(([id, f]) => [id, { ...f, justification: { ...f.justification, dependsOn: [...f.justification.dependsOn] } }]));
    copy.#factsByType = new Map([...this.#factsByType].map(([t, ids]) => [t, new Set(ids)]));
    copy.#factByRelationKey = new Map(this.#factByRelationKey);
    copy.#nextFactId = this.#nextFactId;
    return copy;
  }
}
