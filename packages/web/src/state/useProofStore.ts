import { useCallback, useMemo, useState } from "react";
import type { QuickFix, Triangle } from "@locus/engine";
import { parseStatement } from "@locus/engine";
import { buildGraph } from "./buildGraph.js";
import { diffQuickFixToLineEdits } from "../engine-bridge/serialize.js";
import type { LineState, Settings } from "./types.js";
import type { Milestone, MilestoneEvent } from "@locus/engine";
import { evaluateMilestones } from "@locus/engine";

function parseGoal(text: string): { a: Triangle; b: Triangle } | null {
  const parsed = parseStatement(text);
  if (parsed.status !== "ok") return null;
  if (parsed.statement.kind === "congruentTriangles" || parsed.statement.kind === "similarTriangles") {
    return { a: { vertices: parsed.statement.a }, b: { vertices: parsed.statement.b } };
  }
  return null;
}

export function useProofStore() {
  const [lines, setLines] = useState<LineState[]>([{ text: "", justificationKind: "given" }]);
  const [goalText, setGoalText] = useState("△ABC ≅ △XYZ");
  const [settings, setSettings] = useState<Settings>({ macroVisibility: "collapsed" });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [quickFixesUsed, setQuickFixesUsed] = useState(0);
  const [firedMilestones, setFiredMilestones] = useState<MilestoneEvent[]>([]);

  const build = useMemo(() => buildGraph(lines), [lines]);

  const goal: { a: Triangle; b: Triangle } | null = useMemo(() => {
    const typed = parseGoal(goalText);
    if (typed) return typed;
    const congruent = build.graph.factsOfType("congruentTriangles")[0];
    if (congruent) return { a: congruent.relation.a, b: congruent.relation.b };
    const similar = build.graph.factsOfType("similarTriangles")[0];
    if (similar) return { a: similar.relation.a, b: similar.relation.b };
    return null;
  }, [build.graph, goalText]);

  const setLineText = useCallback((index: number, text: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, text };
      return next;
    });
  }, []);

  /**
   * Syncs from Monaco's current line texts. Same line count -> preserve each
   * line's justification flag and only touch changed text (the common
   * single-line-edit case). Different count (a line was inserted/deleted)
   * -> best-effort carry justification by index; worst case a reflexive flag
   * needs reapplying, which just re-surfaces the diagnostic, never silently
   * breaks correctness.
   */
  const syncLines = useCallback((texts: string[]) => {
    setLines((prev) => {
      if (texts.length === prev.length) {
        return texts.map((text, i) => (text === prev[i]!.text ? prev[i]! : { ...prev[i]!, text }));
      }
      return texts.map((text, i) => ({ text, justificationKind: prev[i]?.justificationKind ?? "given" }));
    });
  }, []);

  const applyQuickFix = useCallback(
    (fix: QuickFix) => {
      if (fix.kind !== "action") return;
      const newGraph = fix.apply(build.graph);
      const { lineEdits, justificationUpdates, newLines } = diffQuickFixToLineEdits(
        build.graph,
        newGraph,
        build.factLineMap,
      );

      setLines((prev) => {
        let next = [...prev];
        for (const update of justificationUpdates) {
          next[update.index] = { ...next[update.index]!, justificationKind: update.kind };
        }
        // Apply deletions last-to-first so earlier indices stay valid.
        const sorted = [...lineEdits].sort((a, b) => b.index - a.index);
        for (const edit of sorted) {
          if (edit.newText === null) {
            next.splice(edit.index, 1);
          } else {
            next[edit.index] = { ...next[edit.index]!, text: edit.newText };
          }
        }
        for (const text of newLines) {
          next.push({ text, justificationKind: "given" });
        }
        return next;
      });

      setQuickFixesUsed((n) => n + 1);
    },
    [build.graph, build.factLineMap],
  );

  const checkMilestones = useCallback(() => {
    const events = evaluateMilestones(build.graph, milestones, { quickFixesUsed });
    if (events.length > 0) {
      setFiredMilestones((prev) => {
        const seen = new Set(prev.map((e) => e.milestoneId));
        return [...prev, ...events.filter((e) => !seen.has(e.milestoneId))];
      });
    }
  }, [build.graph, milestones, quickFixesUsed]);

  return {
    lines,
    setLineText,
    syncLines,
    build,
    goal,
    goalText,
    setGoalText,
    settings,
    setSettings,
    milestones,
    setMilestones,
    quickFixesUsed,
    applyQuickFix,
    firedMilestones,
    checkMilestones,
  };
}

export type ProofStore = ReturnType<typeof useProofStore>;
