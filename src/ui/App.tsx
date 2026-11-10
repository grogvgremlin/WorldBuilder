// The app shell: four tabs and the unit card. Screens are thin: they read a Snapshot and call
// AppData. Design: build/slice-0-brief.md §3 "Screens".

import { useCallback, useEffect, useState } from "react";
import type { AppData, Snapshot } from "./app-data";
import { WorldScreen } from "./screens/WorldScreen";
import { UnitScreen } from "./screens/UnitScreen";
import { ItemScreen } from "./screens/ItemScreen";
import { ImportScreen } from "./screens/ImportScreen";
import { LogScreen } from "./screens/LogScreen";
import { DataScreen } from "./screens/DataScreen";

type Tab = "world" | "import" | "log" | "data";

export function App({ data }: { data: AppData }) {
  const [tab, setTab] = useState<Tab>("world");
  // Items opened from the World tab, newest last: "Back" returns to the one before.
  const [opened, setOpened] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const refresh = useCallback(async () => setSnapshot(await data.snapshot()), [data]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!snapshot) return <main><p className="muted">Loading…</p></main>;

  const openItem = (key: string) => {
    setOpened([...opened, key]);
    window.scrollTo(0, 0);
  };
  const back = () => setOpened(opened.slice(0, -1));
  const current = opened.length ? opened[opened.length - 1] : null;
  const currentIsUnit = current !== null && snapshot.content.some((i) => i.class === "unit" && i.key === current);

  const goTo = (next: Tab) => {
    setOpened([]);
    setTab(next);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <main>
        {tab === "world" && current === null && <WorldScreen snapshot={snapshot} onOpenItem={openItem} onImport={() => goTo("import")} />}
        {tab === "world" && current !== null && currentIsUnit && (
          <UnitScreen key={current} data={data} snapshot={snapshot} unitKey={current} onBack={back} onOpenItem={openItem} onChanged={refresh} />
        )}
        {tab === "world" && current !== null && !currentIsUnit && (
          <ItemScreen key={current} snapshot={snapshot} itemKey={current} onOpenItem={openItem} onBack={back} />
        )}
        {tab === "import" && <ImportScreen data={data} snapshot={snapshot} onChanged={refresh} onDeployed={() => goTo("world")} />}
        {tab === "log" && <LogScreen data={data} snapshot={snapshot} onChanged={refresh} />}
        {tab === "data" && <DataScreen data={data} snapshot={snapshot} onChanged={refresh} />}
      </main>
      <nav className="tabs">
        {(["world", "import", "log", "data"] as Tab[]).map((name) => (
          <button key={name} className={tab === name ? "active" : ""} onClick={() => goTo(name)}>
            {name === "world" ? "World" : name === "import" ? "Import" : name === "log" ? "Log" : "Data"}
          </button>
        ))}
      </nav>
    </>
  );
}
