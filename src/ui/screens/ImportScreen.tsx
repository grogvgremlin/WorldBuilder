// Paste or open a YAML file, or load a test world -> review the draft -> deploy or discard.
// Design: design/text-format-and-csv.md §1, §3, §8 (import review); build/slice-0-brief.md §3.

import { useState } from "react";
import type { DraftBatch } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import { FIXTURE_SETS } from "../fixtures";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  onChanged: () => Promise<void>;
  onDeployed: () => void;
}

export function ImportScreen({ data, snapshot, onChanged, onDeployed }: Props) {
  const [text, setText] = useState("");
  const [fileLabel, setFileLabel] = useState("pasted.yaml");
  const [openDraftId, setOpenDraftId] = useState<string | null>(null);
  const draft = snapshot.drafts.find((d) => d.id === openDraftId) ?? null;

  const makeDraft = async (source: string, label: string) => {
    const created = await data.importText(source, label);
    await onChanged();
    setOpenDraftId(created.id);
  };

  // A test world: one draft per file, left for review; "Deploy all" deploys them in order.
  const loadSet = async (files: { name: string; text: string }[]) => {
    for (const file of files) await data.importText(file.text, file.name);
    await onChanged();
  };

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
    setFileLabel(file.name);
  };

  if (draft) {
    return (
      <DraftReview
        draft={draft}
        onDeploy={async () => { await data.deploy(draft); setOpenDraftId(null); await onChanged(); onDeployed(); }}
        onDiscard={async () => { await data.discard(draft.id); setOpenDraftId(null); await onChanged(); }}
        onBack={() => setOpenDraftId(null)}
      />
    );
  }

  return (
    <>
      <h1>Import</h1>
      <h2>Test worlds</h2>
      <p className="muted">Each loads as drafts, one per file (base package, rules, world, log). Review them, then deploy.</p>
      <div className="row">
        {FIXTURE_SETS.map((set) => (
          <button key={set.name} onClick={() => loadSet(set.files)}>
            {set.name} <span className="muted">({set.files.length} files)</span>
          </button>
        ))}
      </div>

      <h2>Your own text</h2>
      <label htmlFor="file">Open a YAML file</label>
      <input id="file" type="file" accept=".yaml,.yml,.txt,text/plain" onChange={(e) => openFile(e.target.files?.[0])} />
      <label htmlFor="text">Or paste it</label>
      <textarea id="text" value={text} spellCheck={false} autoCapitalize="off" autoCorrect="off"
        onChange={(e) => setText(e.target.value)} placeholder={"package: [My notes, my_notes]\nthings:\n  - [Nuln, nuln, [settlement]]"} />
      <div className="row gap-top">
        <button className="primary" disabled={!text.trim()} onClick={() => makeDraft(text, fileLabel)}>
          Import into a draft
        </button>
      </div>

      {snapshot.drafts.length > 0 && (
        <>
          <div className="row spread">
            <h2>Drafts waiting</h2>
            {snapshot.drafts.length > 1 && (
              <button className="primary small" onClick={async () => { await data.deployAll(snapshot.drafts); await onChanged(); onDeployed(); }}>
                Deploy all, in order
              </button>
            )}
          </div>
          {[...snapshot.drafts].sort((a, b) => a.createdTime.localeCompare(b.createdTime)).map((d) => (
            <button key={d.id} className="list-button card" onClick={() => setOpenDraftId(d.id)}>
              <span>
                {d.label}
                <br />
                <span className="muted">
                  {d.target.kind === "library" ? "library package" : "sandbox " + d.target.sandbox} · {d.content.length} items · {d.problems.length} problems
                </span>
              </span>
              <span aria-hidden>›</span>
            </button>
          ))}
        </>
      )}
    </>
  );
}

function DraftReview({ draft, onDeploy, onDiscard, onBack }: { draft: DraftBatch; onDeploy: () => void; onDiscard: () => void; onBack: () => void }) {
  const counts = { new: 0, edit: 0, unchanged: 0 };
  for (const item of draft.content) counts[item.status]++;
  const keysChanged = draft.rewrittenText !== draft.sourceText;

  return (
    <>
      <button className="link" onClick={onBack}>‹ Import</button>
      <h1>Draft: {draft.label}</h1>
      <p className="muted">Deploys to {draft.target.kind === "library" ? "the library" : "sandbox " + draft.target.sandbox}.</p>
      <p className="muted">
        {counts.new} new · {counts.edit} edits · {counts.unchanged} unchanged · {draft.logItems.length} log entries
      </p>
      <div className="row">
        <button className="primary" onClick={onDeploy}>Deploy</button>
        <button onClick={onDiscard}>Discard</button>
      </div>

      <h2>Problems</h2>
      {draft.problems.length === 0 ? (
        <p className="muted">None.</p>
      ) : (
        <div className="card">
          {draft.problems.map((problem, i) => (
            <p key={i} className={"problem-" + problem.severity}>
              {problem.line !== null ? "Line " + problem.line + ": " : ""}
              {problem.message}
            </p>
          ))}
          <p className="muted">Items with errors are left out; everything else still imports.</p>
        </div>
      )}

      <h2>Items</h2>
      <div className="card">
        <ul className="plain">
          {draft.content.map(({ item, status, line }) => (
            <li key={item.class + item.key}>
              <span className={"tag " + (status === "new" ? "good" : status === "edit" ? "warn" : "")}>{status}</span>
              <span className="tag">{item.class}</span> {item.label} <span className="muted">· {item.key}{line ? " · line " + line : ""}</span>
            </li>
          ))}
          {draft.logItems.map(({ event, line }) => (
            <li key={"log" + event.key}>
              <span className="tag good">log entry</span> {event.label} <span className="muted">· from {event.start}{line ? " · line " + line : ""}</span>
            </li>
          ))}
        </ul>
      </div>

      {keysChanged && (
        <>
          <h2>Text with keys written back</h2>
          <p className="muted">Keep this version: re-importing it edits the same items.</p>
          <pre className="code">{draft.rewrittenText}</pre>
          <button onClick={() => navigator.clipboard?.writeText(draft.rewrittenText)}>Copy text</button>
        </>
      )}
    </>
  );
}
