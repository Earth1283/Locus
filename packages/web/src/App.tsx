import { useEffect } from "react";
import { useProofStore } from "./state/useProofStore.js";
import { TopBar } from "./components/TopBar.js";
import { EditorPane } from "./components/EditorPane.js";
import { FigurePane } from "./components/FigurePane.js";
import { SidePanel } from "./components/SidePanel.js";

export function App() {
  const store = useProofStore();

  useEffect(() => {
    store.checkMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.build.graph]);

  return (
    <div className="app-shell">
      <div className="grain-overlay" aria-hidden="true" />
      <TopBar store={store} />
      <main className="app-main">
        <div className="pane pane-editor">
          <EditorPane store={store} />
        </div>
        <div className="pane pane-figure">
          <FigurePane store={store} />
        </div>
        <SidePanel store={store} />
      </main>
    </div>
  );
}
