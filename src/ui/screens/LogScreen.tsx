// The log: add an event entry, withdraw one, and the audit view with withdrawn entries.
// Design: design/infra.md §2 (withdrawal: the original stays, shown in an audit view),
// §8 (the entry's fields); build/slice-0-brief.md §3 "add or withdraw an event entry".

import { useMemo, useState } from "react";
import type { EventRecord, Expression } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import { slugify } from "../../import/text-format";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  onChanged: () => Promise<void>;
}

export function LogScreen({ data, snapshot, onChanged }: Props) {
  const suggestions = useMemo(() => eventSuggestions(snapshot), [snapshot]);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("");
  const [roles, setRoles] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const fill = (suggestion: Suggestion) => {
    setLabel(suggestion.kind.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()));
    setKind(suggestion.kind);
    setRoles(Object.entries(suggestion.roles).map(([role, thing]) => role + " = " + thing).join("\n"));
  };

  const add = async () => {
    const event: EventRecord = {
      key: slugify(label) + "_" + start,
      label,
      kind,
      roles: parseRoles(roles),
      start: Number(start),
      end: end.trim() === "" ? null : Number(end),
    };
    await data.addEvent(event);
    setLabel("");
    setStart("");
    setEnd("");
    await onChanged();
  };

  const canAdd = label.trim() !== "" && kind.trim() !== "" && start.trim() !== "" && !Number.isNaN(Number(start));

  return (
    <>
      <h1>Log</h1>
      <h2>Add an event entry</h2>
      <div className="card">
        {suggestions.length > 0 && (
          <>
            <p className="muted">Events your rules' triggers read:</p>
            <div className="row">
              {suggestions.map((s) => (
                <button key={s.text} onClick={() => fill(s)}>{s.text}</button>
              ))}
            </div>
          </>
        )}
        <label htmlFor="ev-label">Label</label>
        <input id="ev-label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <label htmlFor="ev-kind">Kind</label>
        <input id="ev-kind" value={kind} autoCapitalize="off" onChange={(e) => setKind(e.target.value)} />
        <label htmlFor="ev-roles">Roles (one per line: role = thing key)</label>
        <textarea id="ev-roles" style={{ minHeight: 60 }} value={roles} autoCapitalize="off" onChange={(e) => setRoles(e.target.value)} />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="ev-start">From</label>
            <input id="ev-start" type="number" inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="ev-end">Until (blank = still on)</label>
            <input id="ev-end" type="number" inputMode="numeric" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="primary" disabled={!canAdd} onClick={add}>Add to the log</button>
        </div>
      </div>

      <h2>Audit view</h2>
      <p className="muted">Every entry, oldest first. Withdrawn entries stay, struck through; derivations skip them.</p>
      {snapshot.log.length === 0 && <p className="muted">The log is empty.</p>}
      {snapshot.log.map((entry) => {
        const content = entry.body.content;
        const event = content.kind === "event" ? (content.values.event as EventRecord) : null;
        return (
          <div key={entry.id} className="card">
            <div className="row spread">
              <span className={entry.status === "withdrawn" ? "withdrawn" : ""}>
                <span className="tag">{content.kind}</span>
                {event ? event.label + " · from " + event.start + (event.end === null ? "" : " to " + event.end) : null}
                {content.kind === "withdrawal" ? "withdraws " + content.links.withdraws : null}
              </span>
              <span className={"tag " + (entry.status === "accepted" ? "good" : "bad")}>{entry.status}</span>
            </div>
            <p className="muted">
              {new Date(entry.recordedTime).toLocaleString()} · {entry.id.slice(0, 8)}
              {content.kind === "withdrawal" && content.values.reason ? " · " + String(content.values.reason) : ""}
            </p>
            {entry.status === "accepted" && content.kind === "event" && (
              <button onClick={async () => { await data.withdrawEntry(entry.id, "withdrawn from the log"); await onChanged(); }}>Withdraw</button>
            )}
          </div>
        );
      })}
    </>
  );
}

interface Suggestion {
  text: string;
  kind: string;
  roles: Record<string, string>;
}

// Every in_force(...) in the deployed rules' triggers, offered as a quick fill.
function eventSuggestions(snapshot: Snapshot): Suggestion[] {
  const found = new Map<string, Suggestion>();
  const visit = (e: Expression): void => {
    if (e.node === "in_force") {
      const text = e.what.replace(/_/g, " ") + Object.entries(e.roles).map(([r, t]) => " (" + r + " = " + t + ")").join("");
      found.set(text, { text, kind: e.what, roles: e.roles });
    }
    if (e.node === "all" || e.node === "any") e.of.forEach(visit);
    if (e.node === "not") visit(e.of);
  };
  for (const item of snapshot.content) if (item.class === "rule" && item.trigger) visit(item.trigger);
  return [...found.values()];
}

function parseRoles(text: string): Record<string, string> {
  const roles: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const [role, thing] = line.split("=").map((part) => part.trim());
    if (role && thing) roles[role] = thing;
  }
  return roles;
}
