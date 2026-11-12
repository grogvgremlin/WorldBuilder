// Export and import of the whole copy; wipe; storage status.
// Design: CLAUDE.md "No server, ever": data leaves the device only by an export the user
// makes; build/slice-0-brief.md §2 (round trip), §3 (persistent storage).

import { useState } from "react";
import type { AppData, Snapshot } from "../app-data";
import { saveFile } from "../save-file";

export function DataScreen({ data, snapshot, onChanged }: { data: AppData; snapshot: Snapshot; onChanged: () => Promise<void> }) {
  const [message, setMessage] = useState<string | null>(null);

  const exportCopy = async () => {
    const copy = await data.exportCopy();
    const name = "worldbuilder-" + copy.exportedTime.slice(0, 19).replace(/[:T]/g, "-") + ".json";
    await saveFile(name, JSON.stringify(copy, null, 2), "application/json");
    setMessage("Exported " + name);
  };

  const importCopy = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm("Replace everything on this device with " + file.name + "?")) return;
    try {
      await data.importCopy(await file.text());
      await onChanged();
      setMessage("Imported " + file.name);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const wipe = async () => {
    if (!confirm("Delete everything on this device? Export a copy first if you want to keep it.")) return;
    await data.wipe();
    await onChanged();
    setMessage("Wiped.");
  };

  const counts = {
    entries: snapshot.log.length,
    content: snapshot.content.length,
    drafts: snapshot.drafts.length,
  };

  return (
    <>
      <h1>Data</h1>
      <div className="card">
        <p>
          {counts.content} content items · {counts.entries} log entries · {counts.drafts} drafts
        </p>
        <p className="muted">
          Storage:{" "}
          {snapshot.persistent === true ? "persistent (the browser won't clear it)" : snapshot.persistent === false ? "not promised persistent" : "unknown"}
        </p>
        <p className="muted">Everything stays on this device. It leaves only in a copy you export.</p>
      </div>

      <h2>Whole copy</h2>
      <div className="row">
        <button className="primary" onClick={exportCopy}>Export</button>
      </div>
      <label htmlFor="copy-file">Import a copy (replaces everything)</label>
      <input id="copy-file" type="file" accept=".json,application/json" onChange={(e) => importCopy(e.target.files?.[0])} />

      <h2>Start again</h2>
      <button onClick={wipe}>Wipe this device</button>

      {message && <p className="muted gap-top">{message}</p>}
      <p className="muted gap-top-lg">Version {__APP_VERSION__}</p>
    </>
  );
}
