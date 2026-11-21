// Army sheets on the Import screen: choose files (CSV, a workbook, YAML or JSON), the game and the
// package; then review the draft: every card read back like the book, each signed off before deploy.
// Design: design/text-format-and-csv.md §7–8; build-log Part B owner decisions 5–8 (the owner's
// sheets; read-back and sign-off; stubs flagged incomplete).

import { useState } from "react";
import type { DraftBatch } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import type { ArmyFixture } from "../fixtures";
import { FIXTURE_SETS } from "../fixtures";
import { buildArmyLibrary } from "../../army/library";
import { resolveCard } from "../../army/card";
import { cardText } from "../../army/read-back";
import { ArmyCardView } from "../components/ArmyCardView";

interface ImportProps {
  data: AppData;
  snapshot: Snapshot;
  fixtures: ArmyFixture[];
  onDraft: (draftId: string) => Promise<void>;
}

export function ArmySheetsImport({ data, snapshot, fixtures, onDraft }: ImportProps) {
  const manifests = snapshot.all.filter((i) => i.class === "manifest");
  const [manifest, setManifest] = useState(manifests.find((m) => m.key === "tow")?.key ?? manifests[0]?.key ?? "");
  const [pkg, setPkg] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loadedFirst, setLoadedFirst] = useState<string[]>([]);

  const run = async (inputs: { name: string; text?: string; bytes?: Uint8Array }[], defaultPackage: string, game: string) => {
    const result = await data.importSheets(inputs, { manifest: game, defaultPackage });
    if ("errors" in result) setErrors(result.errors);
    else {
      setErrors([]);
      await onDraft(result.id);
    }
  };
  // A bundled fixture loads the pieces it needs first (the game, its races and rules), if missing.
  const fromFixture = async (f: ArmyFixture) => {
    const { result, loaded } = await data.importArmyFixture(f, fixtures, FIXTURE_SETS);
    setLoadedFirst(loaded);
    if ("errors" in result) setErrors(result.errors);
    else {
      setErrors([]);
      await onDraft(result.id);
    }
  };
  const fromFiles = async () => {
    const inputs = await Promise.all(
      files.map(async (f) => (f.name.toLowerCase().endsWith(".xlsx") ? { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) } : { name: f.name, text: await f.text() })),
    );
    await run(inputs, pkg.trim() || "Uploaded", manifest);
  };

  return (
    <>
      <h2>Army sheets</h2>
      <p className="muted">
        Your spreadsheet's sheets (Army Entry, Equipment, Core Common Links, Races, Rules) as CSV files, a workbook (.xlsx), or the same in YAML or JSON.
        Each card is read back like the book for you to sign off.
      </p>
      <div className="row">
        {fixtures.map((f) => (
          <button key={f.name} onClick={() => fromFixture(f)}>
            {f.name} <span className="muted">({f.files.length} files)</span>
          </button>
        ))}
      </div>
      {loadedFirst.length > 0 && <p className="muted">Loaded first, as it needs them: {loadedFirst.join(", ")}.</p>}
      <label htmlFor="sheets">Files</label>
      <input id="sheets" type="file" multiple accept=".csv,.xlsx,.yaml,.yml,.json,text/csv" onChange={(e) => setFiles([...(e.target.files ?? [])])} />
      <label htmlFor="sheets-game">Game</label>
      <select id="sheets-game" value={manifest} onChange={(e) => setManifest(e.target.value)}>
        {manifests.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>
      <label htmlFor="sheets-package">Package, for sheets with no Package column (races, equipment …)</label>
      <input id="sheets-package" value={pkg} onChange={(e) => setPkg(e.target.value)} placeholder="TOW rules" />
      <div className="row gap-top">
        <button className="primary" disabled={files.length === 0 || !manifest} onClick={fromFiles}>
          Read the sheets into a draft
        </button>
      </div>
      {errors.map((e, i) => (
        <p key={i} className="problem-error">
          {e}
        </p>
      ))}
    </>
  );
}

interface ReviewProps {
  draft: DraftBatch;
  snapshot: Snapshot;
  onDeploy: () => void;
  onDiscard: () => void;
  onBack: () => void;
}

export function SheetsReview({ draft, snapshot, onDeploy, onDiscard, onBack }: ReviewProps) {
  const incoming = draft.content.map((c) => c.item);
  const replaced = new Set(incoming.map((i) => i.class + ":" + i.key));
  const lib = buildArmyLibrary([...snapshot.all.filter((i) => i.space === "library" && !replaced.has(i.class + ":" + i.key)), ...incoming]);
  const cards = draft.content.filter((c) => c.item.class === "army_card");
  const [signed, setSigned] = useState<Set<string>>(new Set());
  const allSigned = cards.every((c) => signed.has(c.item.key));
  const counts = { new: 0, edit: 0, unchanged: 0 };
  for (const item of draft.content) counts[item.status]++;
  const toggle = (key: string) => {
    const next = new Set(signed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSigned(next);
  };

  return (
    <>
      <button className="link" onClick={onBack}>‹ Import</button>
      <h1>Draft: {draft.label}</h1>
      <p className="muted">
        Army sheets for {draft.sheets?.manifest}: {counts.new} new · {counts.edit} edits · {counts.unchanged} unchanged. Sign off each card, then deploy.
      </p>
      <div className="row">
        <button className="primary" disabled={!allSigned} onClick={onDeploy}>
          {allSigned ? "Deploy" : "Deploy (" + (cards.length - signed.size) + " cards to sign off)"}
        </button>
        <button onClick={() => setSigned(new Set(cards.map((c) => c.item.key)))}>Sign off all</button>
        <button onClick={onDiscard}>Discard</button>
      </div>

      <h2>Problems</h2>
      {draft.problems.length === 0 ? (
        <p className="muted">None.</p>
      ) : (
        <div className="card">
          {draft.problems.map((p, i) => (
            <p key={i} className={"problem-" + p.severity}>
              {p.message}
            </p>
          ))}
        </div>
      )}

      <h2>Cards</h2>
      {cards.map(({ item, status }) =>
        item.class === "army_card" ? (
          <div key={item.key} className="gap-bottom">
            <ArmyCardView text={cardText(resolveCard(lib, item))} />
            <label className="choice">
              <input type="checkbox" checked={signed.has(item.key)} onChange={() => toggle(item.key)} />
              Signed off <span className={"tag " + (status === "new" ? "good" : status === "edit" ? "warn" : "")}>{status}</span>
            </label>
          </div>
        ) : null,
      )}

      <h2>Other items</h2>
      <ul className="plain card">
        {draft.content
          .filter((c) => c.item.class !== "army_card")
          .map(({ item, status }) => (
            <li key={item.class + item.key}>
              <span className={"tag " + (status === "new" ? "good" : status === "edit" ? "warn" : "")}>{status}</span>
              <span className="tag">{item.class}</span> {item.label}
            </li>
          ))}
      </ul>
    </>
  );
}
