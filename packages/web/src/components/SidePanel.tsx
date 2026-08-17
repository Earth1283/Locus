import { useState } from "react";
import {
  backwardChain,
  forwardChain,
  triangleAngle,
  triangleSide,
  type BackwardChainOption,
  type Diagnostic,
  type ForwardChainResult,
  type QuickFix,
  type Triangle,
  type VertexIndex,
} from "@locus/engine";
import type { ProofStore } from "../state/useProofStore.js";
import { getQuickFixes } from "@locus/engine";

function sideLabel(t: Triangle, i: VertexIndex): string {
  const s = triangleSide(t, i);
  return `${s.p1}${s.p2}`;
}

function angleLabel(t: Triangle, i: VertexIndex): string {
  const a = triangleAngle(t, i);
  return `∠${a.p1}${a.vertex}${a.p2}`;
}

function describeOption(goal: { a: Triangle; b: Triangle }, opt: BackwardChainOption): string {
  const parts: string[] = [];
  opt.missingSides.forEach((i) => parts.push(`side ${sideLabel(goal.a, i)}`));
  opt.missingAngles.forEach((i) => parts.push(`angle ${angleLabel(goal.a, i)}`));
  if (opt.missingRightAngle !== null) parts.push(`right angle at ${goal.a.vertices[opt.missingRightAngle]}`);
  return parts.length === 0 ? "Already satisfied." : `Need: ${parts.join(", ")}`;
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel-section">
      <div className="panel-section-head">
        <h2 className="label-caps">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function QuickFixButtons({ diagnostic, store }: { diagnostic: Diagnostic; store: ProofStore }) {
  const fixes = getQuickFixes(store.build.graph, diagnostic);
  if (fixes.length === 0) return null;
  return (
    <div className="quickfix-row">
      {fixes.map((fix: QuickFix) =>
        fix.kind === "action" ? (
          <button key={fix.id} className="btn-quickfix" onClick={() => store.applyQuickFix(fix)}>
            {fix.label}
          </button>
        ) : (
          <span key={fix.id} className="btn-quickfix btn-quickfix-guidance" title={fix.message}>
            {fix.label}
          </span>
        ),
      )}
    </div>
  );
}

function DiagnosticRow({ diagnostic, store }: { diagnostic: Diagnostic; store: ProofStore }) {
  return (
    <div className={`diagnostic-row diagnostic-${diagnostic.severity}`}>
      <p>{diagnostic.message}</p>
      <QuickFixButtons diagnostic={diagnostic} store={store} />
    </div>
  );
}

export function SidePanel({ store }: { store: ProofStore }) {
  const { build, goal } = store;
  const [forwardResult, setForwardResult] = useState<ForwardChainResult | null>(null);

  const backward = goal ? backwardChain(build.graph, goal.a, goal.b) : null;

  return (
    <aside className="side-panel">
      <Section title="Diagnostics">
        {build.diagnostics.length === 0 ? (
          <p className="panel-empty">No issues.</p>
        ) : (
          build.diagnostics.map((d, i) => <DiagnosticRow key={i} diagnostic={d} store={store} />)
        )}
      </Section>

      <Section title="What you need">
        {!backward ? (
          <p className="panel-empty">Set a goal above to see what's missing.</p>
        ) : backward.alreadyValid ? (
          <p className="panel-empty">Proof valid for at least one postulate.</p>
        ) : (
          <ul className="requirement-list">
            {backward.options
              .filter((o) => o.missingSides.length + o.missingAngles.length + (o.missingRightAngle !== null ? 1 : 0) > 0)
              .slice(0, 5)
              .map((opt, i) => (
                <li key={i}>
                  <span className="mono">{opt.postulate}</span> — {describeOption(goal!, opt)}
                </li>
              ))}
          </ul>
        )}
      </Section>

      <Section
        title="Combine facts"
        action={
          goal ? (
            <button
              className="btn-link"
              onClick={() => setForwardResult(forwardChain(build.graph, goal.a, goal.b))}
            >
              Show what this could combine with
            </button>
          ) : undefined
        }
      >
        {!goal ? (
          <p className="panel-empty">Set a goal to check.</p>
        ) : !forwardResult ? (
          <p className="panel-empty">On request only — click above.</p>
        ) : forwardResult.newlyDerivable ? (
          <p>
            These facts now support △{goal.a.vertices.join("")} ≅ △{goal.b.vertices.join("")} via{" "}
            <span className="mono">{forwardResult.postulate}</span>.
          </p>
        ) : (
          <p className="panel-empty">Nothing new yet.</p>
        )}
      </Section>

      <MilestonesSection store={store} />
      <SettingsSection store={store} />
    </aside>
  );
}

function MilestonesSection({ store }: { store: ProofStore }) {
  const [label, setLabel] = useState("");

  const addMilestone = () => {
    if (!label.trim() || !store.goal) return;
    store.setMilestones((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: label.trim(),
        condition: { kind: "proofCleared", a: store.goal!.a, b: store.goal!.b, maxQuickFixesUsed: 0 },
      },
    ]);
    setLabel("");
  };

  return (
    <Section title="Milestones (off by default)">
      <p className="panel-hint">Self-authored checkpoints. Revocable any time — nothing is lost if you remove one.</p>
      <div className="milestone-add">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Notify me when this proof clears cleanly"
        />
        <button className="btn-link" onClick={addMilestone}>
          Add
        </button>
      </div>
      <ul className="milestone-list">
        {store.milestones.map((m) => (
          <li key={m.id}>
            {m.label}
            <button className="btn-remove" onClick={() => store.setMilestones((prev) => prev.filter((x) => x.id !== m.id))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      {store.firedMilestones.length > 0 && (
        <ul className="milestone-fired">
          {store.firedMilestones.map((e) => (
            <li key={e.milestoneId}>✓ {e.label}</li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function SettingsSection({ store }: { store: ProofStore }) {
  return (
    <Section title="Settings">
      <label className="panel-hint" htmlFor="macro-visibility">
        Macro expansion visibility
      </label>
      <select
        id="macro-visibility"
        value={store.settings.macroVisibility}
        onChange={(e) =>
          store.setSettings((s) => ({ ...s, macroVisibility: e.target.value as typeof s.macroVisibility }))
        }
      >
        <option value="hidden">Hidden</option>
        <option value="collapsed">Collapsed</option>
        <option value="always">Always shown</option>
      </select>
    </Section>
  );
}
