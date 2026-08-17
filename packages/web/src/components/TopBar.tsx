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
        <span className="mono top-bar-mark">△</span>
        <span className="mono top-bar-name">LOCUS</span>
      </div>
      <div className="top-bar-goal">
        <label className="label-caps" htmlFor="goal-input">
          Goal
        </label>
        <input
          id="goal-input"
          className="mono goal-input"
          value={store.goalText}
          onChange={(e) => store.setGoalText(e.target.value)}
          spellCheck={false}
        />
      </div>
      <button
        className="btn-link theme-toggle"
        onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        aria-label="Toggle color theme"
      >
        {theme === "light" ? "◐ dark" : "◑ light"}
      </button>
    </header>
  );
}
