import { useCallback, useMemo, useRef, useState } from "react";
import {
  segmentKey,
  angleKey,
  triangleSide,
  triangleAngle,
  VERTEX_INDICES,
  segmentExists,
  getSegmentQuickFixes,
  type FactGraph,
  type PointId,
  type QuickFix,
  type Segment,
  type SegmentOrLine,
} from "@locus/engine";
import type { ProofStore } from "../state/useProofStore.js";
import { resolvePositions, isDraggable, type Coord } from "../figure/resolvePositions.js";
import { computeAngleTicks, computeSegmentTicks } from "../figure/tickMarks.js";
import { angleBetween, distance, normal, tickPositions } from "../figure/geometryMath.js";

const TRIANGLE_A_BASE: Coord[] = [
  { x: 90, y: 260 },
  { x: 210, y: 260 },
  { x: 150, y: 90 },
];
const TRIANGLE_B_BASE: Coord[] = [
  { x: 300, y: 260 },
  { x: 420, y: 260 },
  { x: 360, y: 90 },
];

/** Three visual states, encoding real proof status rather than decoration. */
type SegmentState = "given" | "constructed" | "unconstructed";

function segmentState(graph: FactGraph, seg: Segment, isGoalSide: boolean): SegmentState {
  if (isGoalSide) return "given";
  return segmentExists(graph, seg) ? "constructed" : "unconstructed";
}

function rightAngleAtVertex(graph: FactGraph, vertex: PointId, ray1: PointId, ray2: PointId): boolean {
  return graph.factsOfType("perpendicular").some((f) => {
    const isRay = (op: (typeof f.relation)["a"], p: PointId) =>
      op.kind === "segment" &&
      ((op.segment.p1 === vertex && op.segment.p2 === p) || (op.segment.p2 === vertex && op.segment.p1 === p));
    return (isRay(f.relation.a, ray1) && isRay(f.relation.b, ray2)) || (isRay(f.relation.a, ray2) && isRay(f.relation.b, ray1));
  });
}

export function FigurePane({ store }: { store: ProofStore }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const [draggableCoords, setDraggableCoords] = useState<Map<PointId, Coord>>(new Map());
  const dragPoint = useRef<PointId | null>(null);
  const [menu, setMenu] = useState<{ seg: Segment; left: number; top: number; confirmingId: string | null } | null>(
    null,
  );

  const { graph } = store.build;
  const { goal } = store;

  const openSegmentMenu = useCallback(
    (seg: Segment) => (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = paneRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenu({ seg, left: e.clientX - rect.left, top: e.clientY - rect.top, confirmingId: null });
    },
    [],
  );

  const vertexLookup = useMemo(() => {
    const map = new Map<string, Coord>();
    if (goal) {
      goal.a.vertices.forEach((label, i) => map.set(label, TRIANGLE_A_BASE[i]!));
      goal.b.vertices.forEach((label, i) => map.set(label, TRIANGLE_B_BASE[i]!));
    }
    return map;
  }, [goal]);

  const defaultFor = useCallback(
    (label: string, index: number): Coord => {
      const known = vertexLookup.get(label);
      if (known) return known;
      const angle = (index * 137.5 * Math.PI) / 180;
      const radius = 40 + index * 14;
      return { x: 255 + radius * Math.cos(angle), y: 175 + radius * Math.sin(angle) };
    },
    [vertexLookup],
  );

  const positions = useMemo(() => {
    const resolved = resolvePositions(graph, draggableCoords, defaultFor);
    // The goal's six vertices are the starting construction — render them
    // even before any proof line has put them in the fact graph.
    if (goal) {
      [...goal.a.vertices, ...goal.b.vertices].forEach((label, i) => {
        if (!resolved.has(label)) resolved.set(label, draggableCoords.get(label) ?? defaultFor(label, i));
      });
    }
    return resolved;
  }, [graph, draggableCoords, defaultFor, goal]);
  const segmentTicks = useMemo(() => computeSegmentTicks(graph), [graph]);
  const angleTicks = useMemo(() => computeAngleTicks(graph), [graph]);

  const toSvgPoint = useCallback((clientX: number, clientY: number): Coord | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    return {
      x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
      y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height,
    };
  }, []);

  const onPointerDown = useCallback((id: PointId) => (e: React.PointerEvent) => {
    if (!isDraggable(graph, id)) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragPoint.current = id;
  }, [graph]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragPoint.current) return;
      const p = toSvgPoint(e.clientX, e.clientY);
      if (!p) return;
      const id = dragPoint.current;
      setDraggableCoords((prev) => {
        const next = new Map(prev);
        next.set(id, p);
        return next;
      });
    },
    [toSvgPoint],
  );

  const onPointerUp = useCallback(() => {
    dragPoint.current = null;
  }, []);

  if (!goal) {
    return (
      <div className="figure-empty">
        <p className="label-caps">No goal yet</p>
        <p>Type a target correspondence above, e.g. "△ABC ≅ △XYZ".</p>
      </div>
    );
  }

  const goalSegments: Segment[] = VERTEX_INDICES.flatMap((i) => [triangleSide(goal.a, i), triangleSide(goal.b, i)]);
  const goalSegKeys = new Set(goalSegments.map((s) => segmentKey(s)));

  // SegmentOrLine operands must be unwrapped — a perpendicular/parallel fact
  // can relate a segment to an auxiliary *line*, which has no drawable segment.
  const otherSegments: Segment[] = [];
  const pushSegment = (s: Segment) => otherSegments.push(s);
  const pushOperand = (op: SegmentOrLine) => {
    if (op.kind === "segment") otherSegments.push(op.segment);
  };
  graph.factsOfType("midpoint").forEach((f) => pushSegment(f.relation.segment));
  graph.factsOfType("onSegment").forEach((f) => pushSegment(f.relation.segment));
  graph.factsOfType("segmentExists").forEach((f) => pushSegment(f.relation.segment));
  graph.factsOfType("congruentSegments").forEach((f) => {
    pushSegment(f.relation.a);
    pushSegment(f.relation.b);
  });
  graph.factsOfType("perpendicular").forEach((f) => {
    pushOperand(f.relation.a);
    pushOperand(f.relation.b);
  });
  graph.factsOfType("parallel").forEach((f) => {
    pushOperand(f.relation.a);
    pushOperand(f.relation.b);
  });

  const seenOther = new Map<string, Segment>();
  otherSegments.forEach((s) => {
    if (!goalSegKeys.has(segmentKey(s))) seenOther.set(segmentKey(s), s);
  });

  // Hit-lines are collected separately and painted last (topmost) — SVG has
  // no z-index, so a click target drawn under a later decorative element
  // (an angle arc, a tick mark) would otherwise silently swallow the click.
  const hitLines: Array<{ seg: Segment; key: string }> = [];

  const renderSegment = (seg: Segment, state: SegmentState, keySuffix: string) => {
    const a = positions.get(seg.p1);
    const b = positions.get(seg.p2);
    if (!a || !b) return null;
    const dashed = state === "constructed";
    const ghost = state === "unconstructed";
    const ticks = segmentTicks.get(segmentKey(seg));
    if (state !== "given") hitLines.push({ seg, key: keySuffix });
    return (
      <g key={`seg-${keySuffix}`}>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={ghost ? "var(--warn)" : "var(--ink)"}
          strokeWidth={dashed || ghost ? 1.25 : 1.75}
          strokeDasharray={ghost ? "2 3" : dashed ? "5 4" : undefined}
          opacity={ghost ? 0.7 : dashed ? 0.75 : 1}
        />
        {ticks
          ? tickPositions(a, b, ticks).map((pos, i) => {
              const n = normal(a, b);
              return (
                <line
                  key={i}
                  x1={pos.x - n.x * 4}
                  y1={pos.y - n.y * 4}
                  x2={pos.x + n.x * 4}
                  y2={pos.y + n.y * 4}
                  stroke="var(--construction)"
                  strokeWidth={1.5}
                />
              );
            })
          : null}
      </g>
    );
  };

  const renderAngleMark = (vertex: PointId, p1: PointId, p2: PointId, keySuffix: string) => {
    const v = positions.get(vertex);
    const a1 = positions.get(p1);
    const a2 = positions.get(p2);
    if (!v || !a1 || !a2) return null;

    if (rightAngleAtVertex(graph, vertex, p1, p2)) {
      const n1x = (a1.x - v.x) / distance(v, a1);
      const n1y = (a1.y - v.y) / distance(v, a1);
      const n2x = (a2.x - v.x) / distance(v, a2);
      const n2y = (a2.y - v.y) / distance(v, a2);
      const size = 10;
      const p = { x: v.x + n1x * size, y: v.y + n1y * size };
      const q = { x: v.x + n2x * size, y: v.y + n2y * size };
      const r = { x: p.x + n2x * size, y: p.y + n2y * size };
      return (
        <path
          key={`ra-${keySuffix}`}
          d={`M ${p.x} ${p.y} L ${r.x} ${r.y} L ${q.x} ${q.y}`}
          fill="none"
          stroke="var(--construction)"
          strokeWidth={1.25}
        />
      );
    }

    const ticks = angleTicks.get(angleKey({ vertex, p1, p2 }));
    if (!ticks) return null;

    const radius = 18;
    const start = Math.atan2(a1.y - v.y, a1.x - v.x);
    const sweep = angleBetween(v, a1, a2);
    const arcs = Array.from({ length: ticks }, (_, i) => radius + i * 4);
    return (
      <g key={`am-${keySuffix}`}>
        {arcs.map((r, i) => {
          const end = start + sweep;
          const x1 = v.x + r * Math.cos(start);
          const y1 = v.y + r * Math.sin(start);
          const x2 = v.x + r * Math.cos(end);
          const y2 = v.y + r * Math.sin(end);
          const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
          const sweepFlag = sweep > 0 ? 1 : 0;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`}
              fill="none"
              stroke="var(--construction)"
              strokeWidth={1.25}
            />
          );
        })}
      </g>
    );
  };

  return (
    <div className="figure-pane" ref={paneRef} onClick={() => setMenu(null)}>
      <svg
        ref={svgRef}
        viewBox="0 0 510 340"
        className="figure-svg"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="var(--grid-line)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="510" height="340" fill="url(#grid)" />

        {goalSegments.map((s, i) => renderSegment(s, "given", `goal-${i}`))}
        {[...seenOther.values()].map((s, i) => renderSegment(s, segmentState(graph, s, false), `other-${i}`))}

        {[goal.a, goal.b].flatMap((t, ti) =>
          VERTEX_INDICES.map((idx) => {
            const a = triangleAngle(t, idx);
            return renderAngleMark(a.vertex, a.p1, a.p2, `${ti}-${idx}`);
          }),
        )}

        <g>
          {hitLines.map(({ seg, key }) => {
            const a = positions.get(seg.p1);
            const b = positions.get(seg.p2);
            if (!a || !b) return null;
            return (
              <line
                key={`hit-${key}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="transparent"
                strokeWidth={10}
                style={{ cursor: "context-menu" }}
                onContextMenu={openSegmentMenu(seg)}
              />
            );
          })}
        </g>

        {[...positions.entries()].map(([id, pos]) => {
          const draggable = isDraggable(graph, id);
          return (
            <g key={id} transform={`translate(${pos.x} ${pos.y})`}>
              <circle
                r={draggable ? 6 : 4}
                fill={draggable ? "var(--paper-raised)" : "var(--ink-faint)"}
                stroke="var(--ink)"
                strokeWidth={1.25}
                style={{ cursor: draggable ? "grab" : "default" }}
                onPointerDown={onPointerDown(id)}
              />
              <text x={9} y={-8} className="mono figure-label">
                {id}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="figure-hint label-caps">Drag any labeled point — anything that stays true is generically true.</p>
      {menu && <SegmentMenu menu={menu} setMenu={setMenu} graph={graph} store={store} />}
    </div>
  );
}

function SegmentMenu({
  menu,
  setMenu,
  graph,
  store,
}: {
  menu: { seg: Segment; left: number; top: number; confirmingId: string | null };
  setMenu: (m: { seg: Segment; left: number; top: number; confirmingId: string | null } | null) => void;
  graph: FactGraph;
  store: ProofStore;
}) {
  const fixes = getSegmentQuickFixes(graph, menu.seg);
  const label = `${menu.seg.p1}${menu.seg.p2}`;

  const runFix = (fix: QuickFix) => {
    if (fix.kind !== "action") return;
    store.applyQuickFix(fix);
    setMenu(null);
  };

  return (
    <div
      className="segment-menu"
      style={{ left: menu.left, top: menu.top }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="label-caps">{label} doesn't exist</p>
      {fixes.length === 0 ? (
        <p className="panel-empty">No actions available.</p>
      ) : (
        fixes.map((fix) => {
          if (fix.kind === "guidance") {
            return (
              <p key={fix.id} className="panel-hint segment-menu-guidance">
                {fix.label}
              </p>
            );
          }
          const awaitingConfirm = fix.needsConfirm && menu.confirmingId !== fix.id;
          return (
            <div key={fix.id}>
              {fix.needsConfirm && menu.confirmingId === fix.id && (
                <p className="panel-hint">{fix.needsConfirm.message}</p>
              )}
              <button
                className="btn-quickfix"
                onClick={() =>
                  awaitingConfirm ? setMenu({ ...menu, confirmingId: fix.id }) : runFix(fix)
                }
              >
                {awaitingConfirm ? fix.label : fix.needsConfirm ? `Confirm: ${fix.label}` : fix.label}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
