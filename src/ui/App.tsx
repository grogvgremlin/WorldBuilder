// The app shell: six tabs, a sandbox switch, and a back stack for opened items.
// Screens are thin: they read a Snapshot and call AppData.
// Design: build/slice-1-brief.md §1.4 (play screens, no editors), §2.1 (one sandbox open at a
// time), §2.3 (display).

import { useCallback, useEffect, useState } from "react";
import type { AppData, Snapshot } from "./app-data";
import { WorldScreen } from "./screens/WorldScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { SandboxScreen } from "./screens/SandboxScreen";
import { UnitScreen } from "./screens/UnitScreen";
import { ItemScreen } from "./screens/ItemScreen";
import { ImportScreen } from "./screens/ImportScreen";
import { LogScreen } from "./screens/LogScreen";
import { DataScreen } from "./screens/DataScreen";
import { itemRef, type ItemRef } from "./item-ref";

type Tab = "world" | "sandbox" | "library" | "import" | "log" | "data";
const TAB_LABELS: Record<Tab, string> = { world: "World", sandbox: "Sandbox", library: "Library", import: "Import", log: "Log", data: "Data" };

export function App({ data }: { data: AppData }) {
  const [tab, setTab] = useState<Tab>("world");
  // Items opened from the World or Library tab, newest last: "Back" returns to the one before.
  const [opened, setOpened] = useState<ItemRef[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  // Text handed to the Import screen by "Edit as text".
  const [importStart, setImportStart] = useState<{ text: string; label: string; n: number } | null>(null);

  const refresh = useCallback(async () => setSnapshot(await data.snapshot()), [data]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!snapshot) return <main><p className="muted">Loading…</p></main>;

  const openItem = (ref: ItemRef) => {
    setOpened([...opened, ref]);
    window.scrollTo(0, 0);
  };
  const back = () => setOpened(opened.slice(0, -1));
  const goTo = (next: Tab) => {
    setOpened([]);
    setTab(next);
    window.scrollTo(0, 0);
  };
  const editAsText = (text: string, label: string) => {
    setImportStart({ text, label, n: (importStart?.n ?? 0) + 1 });
    goTo("import");
  };
  const switchSandbox = async (key: string) => {
    await data.openSandbox(key);
    setOpened([]);
    await refresh();
  };

  const current = opened.length ? opened[opened.length - 1] : null;
  const currentItem = current ? snapshot.all.find((i) => itemRef(i) === current) : undefined;
  const showSandboxSwitch = (tab === "world" || tab === "log" || tab === "sandbox") && current === null && snapshot.sandboxes.length > 0;
  const browsing = tab === "world" || tab === "library" || tab === "sandbox";

  return (
    <>
      <main>
        {showSandboxSwitch && (
          <div className="topbar">
            <span className="muted">Sandbox</span>
            <select className="inline" value={snapshot.openSandbox ?? ""} onChange={(e) => switchSandbox(e.target.value)} aria-label="Open sandbox">
              {snapshot.sandboxes.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {browsing && current !== null && currentItem?.class === "unit" && snapshot.openSandbox && (
          <UnitScreen key={current} data={data} snapshot={snapshot} sandbox={snapshot.openSandbox} unitKey={currentItem.key} onBack={back} onOpenItem={openItem} onEditText={editAsText} onChanged={refresh} />
        )}
        {browsing && current !== null && currentItem?.class !== "unit" && (
          <ItemScreen key={current} data={data} snapshot={snapshot} itemRef={current} onOpenItem={openItem} onBack={back} onEditText={editAsText} />
        )}
        {tab === "world" && current === null && <WorldScreen data={data} snapshot={snapshot} onOpenItem={openItem} onImport={() => goTo("import")} onEditText={editAsText} onChanged={refresh} />}
        {tab === "sandbox" && current === null && <SandboxScreen data={data} snapshot={snapshot} onOpenItem={openItem} onEditText={editAsText} onChanged={refresh} />}
        {tab === "library" && current === null && <LibraryScreen snapshot={snapshot} onOpenItem={openItem} />}
        {tab === "import" && (
          <ImportScreen key={importStart?.n ?? 0} data={data} snapshot={snapshot} start={importStart} onChanged={refresh} onDeployed={() => goTo("world")} />
        )}
        {tab === "log" && <LogScreen data={data} snapshot={snapshot} onChanged={refresh} />}
        {tab === "data" && <DataScreen data={data} snapshot={snapshot} onChanged={refresh} />}
      </main>
      <nav className="tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((name) => (
          <button key={name} className={tab === name ? "active" : ""} onClick={() => goTo(name)}>
            {TAB_LABELS[name]}
          </button>
        ))}
      </nav>
    </>
  );
}
