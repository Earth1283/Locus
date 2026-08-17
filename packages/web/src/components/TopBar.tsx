import { useEffect, useState } from "react";
import type { ProofStore } from "../state/useProofStore.js";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("locus-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function TopBar({ store }: { store: ProofStore }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("locus-theme", theme);
  }, [theme]);

  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <span className="brand-mark mono" aria-hidden="true">
          △
        </span>
        <span className="mono top-bar-name">Locus</span>
      </div>
      <div className="goal-field">
        <label className="label-caps goal-field-label" htmlFor="goal-input">
          Goal
        </label>
        <input
          id="goal-input"
          className="mono goal-input"
          placeholder="△ABC ≅ △XYZ"
          value={store.goalText}
          onChange={(e) => store.setGoalText(e.target.value)}
          spellCheck={false}
        />
      </div>
      <button
        className="icon-btn theme-toggle"
        onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      >
        <span className="theme-toggle-glyph mono">{theme === "light" ? "◑" : "◐"}</span>
      </button>
    </header>
  );
}
