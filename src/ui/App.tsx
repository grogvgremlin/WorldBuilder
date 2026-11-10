// The app shell: four tabs and the unit card. Screens are thin: they read a Snapshot and call
// AppData. Design: build/slice-0-brief.md §3 "Screens".

import { useCallback, useEffect, useState } from "react";
import type { AppData, Snapshot } from "./app-data";
import { WorldScreen } from "./screens/WorldScreen";
import { UnitScreen } from "./screens/UnitScreen";
import { ImportScreen } from "./screens/ImportScreen";
import { LogScreen } from "./screens/LogScreen";
import { DataScreen } from "./screens/DataScreen";

type Tab = "world" | "import" | "log" | "data";

export function App({ data }: { data: AppData }) {
  const [tab, setTab] = useState<Tab>("world");
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const refresh = useCallback(async () => setSnapshot(await data.snapshot()), [data]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!snapshot) return <main><p className="muted">Loading…</p></main>;

  const goTo = (next: Tab) => {
    setOpenUnit(null);
    setTab(next);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <main>
        {tab === "world" && openUnit === null && <WorldScreen snapshot={snapshot} onOpenUnit={setOpenUnit} onImport={() => goTo("import")} />}
        {tab === "world" && openUnit !== null && (
          <UnitScreen data={data} snapshot={snapshot} unitKey={openUnit} onBack={() => setOpenUnit(null)} onChanged={refresh} />
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
