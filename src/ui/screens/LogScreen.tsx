// The open sandbox's log: add an event entry, withdraw one, and the audit view with withdrawn
// entries and the GM's fixes (package switches, category orders, pins).
// Design: design/infra.md §2 (withdrawal: the original stays, shown in an audit view),
// §8 (the entry's fields); build/slice-1-brief.md §1.2, §2.1 (one log per sandbox; GM fixes).

import { useMemo, useState } from "react";
import type { CategoryOrderValues, EventRecord, Expression, PackageSwitchValues, PinValues } from "../../schema";
import type { ReadEntry } from "../../log/log";
import type { AppData, Snapshot } from "../app-data";
import { slugify } from "../../import/text-format";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  onChanged: () => Promise<void>;
}

export function LogScreen({ data, snapshot, onChanged }: Props) {
  const sandbox = snapshot.openSandbox;
  const suggestions = useMemo(() => eventSuggestions(snapshot), [snapshot]);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("");
  const [roles, setRoles] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  // "Correct" (infra §2): the original is withdrawn and a new entry added; nothing is edited.
  const [correcting, setCorrecting] = useState<ReadEntry | null>(null);
  const things = snapshot.content.filter((i) => (i.class === "thing" || i.class === "unit") && i.space === sandbox);
  const knownKinds = [...new Set([...suggestions.map((x) => x.kind), ...snapshot.content.filter((i) => i.class === "event").map((i) => (i.class === "event" ? i.kind : ""))])];
  const addRole = (role: string, thingKey: string) => setRoles((roles.trim() ? roles.trim() + "\n" : "") + role + " = " + thingKey);
  const [rolePick, setRolePick] = useState({ role: "", thing: "" });

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
    if (!sandbox) return;
    if (correcting) await data.withdrawEntry(sandbox, correcting.id, "corrected by a new entry");
    await data.addEvent(sandbox, event);
    setLabel("");
    setStart("");
    setEnd("");
    setCorrecting(null);
    await onChanged();
  };

  const correct = (entry: ReadEntry) => {
    const event = entry.body.content.values.event as EventRecord;
    setCorrecting(entry);
    setLabel(event.label);
    setKind(event.kind);
    setRoles(Object.entries(event.roles).map(([role, thing]) => role + " = " + thing).join("\n"));
    setStart(String(event.start));
    setEnd(event.end === null ? "" : String(event.end));
    window.scrollTo(0, 0);
  };

  const canAdd = sandbox !== null && label.trim() !== "" && kind.trim() !== "" && start.trim() !== "" && !Number.isNaN(Number(start));
  if (!sandbox) return <><h1>Log</h1><p className="muted">No sandbox yet: each sandbox has its own log.</p></>;

  return (
    <>
      <h1>Log</h1>
      <h2>{correcting ? "Correct an event entry" : "Add an event entry"}</h2>
      <div className="card">
        {correcting && (
          <p className="problem-warning">
            Correcting “{(correcting.body.content.values.event as EventRecord).label}”. Saving withdraws the original (it stays in the audit view) and adds this one.{" "}
            <button className="link" onClick={() => setCorrecting(null)}>Cancel</button>
          </p>
        )}
        <details className="gap-bottom">
          <summary className="muted">What goes in each field?</summary>
          <p className="muted"><strong>Label</strong>: any words, shown in lists (“Wages withheld”).</p>
          <p className="muted"><strong>Kind</strong>: what rules look for, written with underscores. A rule's trigger <code>in_force(wages_withheld, …)</code> matches events of kind <code>wages_withheld</code>. Kinds the rules here use: {suggestions.length ? suggestions.map((x) => x.kind).join(", ") : "none yet"}.</p>
          <p className="muted"><strong>Roles</strong>: who takes part, one per line as <code>role = thing key</code>. A trigger asking for <code>withholder = wissenland_treasury</code> needs that role filled by that thing. Use the picker below.</p>
          <p className="muted"><strong>From / until</strong>: years. From counts, until doesn't (from 2524 until 2526 is on in 2524 and 2525). Leave until blank for “still going”.</p>
        </details>
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
        <input id="ev-kind" list="ev-kinds" value={kind} autoCapitalize="off" onChange={(e) => setKind(e.target.value)} />
        <datalist id="ev-kinds">
          {knownKinds.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
        <label htmlFor="ev-roles">Roles (one per line: role = thing key)</label>
        <textarea id="ev-roles" className="short" value={roles} autoCapitalize="off" onChange={(e) => setRoles(e.target.value)} />
        <div className="row gap-top">
          <input className="grow" placeholder="role, e.g. withholder" value={rolePick.role} autoCapitalize="off" onChange={(e) => setRolePick({ ...rolePick, role: e.target.value })} aria-label="Role" />
          <select className="inline grow" value={rolePick.thing} onChange={(e) => setRolePick({ ...rolePick, thing: e.target.value })} aria-label="Thing">
            <option value="">thing…</option>
            {things.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <button className="small" disabled={!rolePick.role || !rolePick.thing} onClick={() => { addRole(rolePick.role.trim(), rolePick.thing); setRolePick({ role: "", thing: "" }); }}>Add role</button>
        </div>
        <div className="row">
          <div className="grow">
            <label htmlFor="ev-start">From</label>
            <input id="ev-start" type="number" inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="grow">
            <label htmlFor="ev-end">Until (blank = still on)</label>
            <input id="ev-end" type="number" inputMode="numeric" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="row gap-top">
          <button className="primary" disabled={!canAdd} onClick={add}>{correcting ? "Save the correction" : "Add to the log"}</button>
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
                <span className="tag">{content.kind.replace(/_/g, " ")}</span>
                {event ? event.label + " · from " + event.start + (event.end === null ? "" : " to " + event.end) : null}
                {describeFix(entry, snapshot)}
                {content.kind === "withdrawal" ? "withdraws " + content.links.withdraws : null}
              </span>
              <span className={"tag " + (entry.status === "accepted" ? "good" : "bad")}>{entry.status}</span>
            </div>
            <p className="muted">
              {new Date(entry.recordedTime).toLocaleString()} · {entry.id.slice(0, 8)}
              {content.kind === "withdrawal" && content.values.reason ? " · " + String(content.values.reason) : ""}
            </p>
            {entry.status === "accepted" && content.kind !== "withdrawal" && (
              <div className="row">
                {content.kind === "event" && <button onClick={() => correct(entry)}>Correct</button>}
                <button onClick={async () => { await data.withdrawEntry(sandbox, entry.id, "withdrawn from the log"); await onChanged(); }}>Withdraw</button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// A GM fix in words: "WFB 6th: Wissenland campaign rules switched off".
function describeFix(entry: ReadEntry, snapshot: Snapshot): string | null {
  const values = entry.body.content.values;
  const label = (key: string) => snapshot.content.find((i) => i.key === key && (i.space === "library" || i.space === snapshot.openSandbox))?.label ?? key;
  switch (entry.body.content.kind) {
    case "package_switch": {
      const v = values as unknown as PackageSwitchValues;
      return label(v.context) + ": " + label(v.package) + " switched " + (v.on ? "on" : "off");
    }
    case "category_order": {
      const v = values as unknown as CategoryOrderValues;
      return label(v.context) + ", " + v.step + " order: " + v.order.map((r) => r.join(" / ")).join(" → ");
    }
    case "pin": {
      const v = values as unknown as PinValues;
      return label(v.context) + ", " + v.stat + ": " + label(v.first) + " before " + label(v.then) + (v.unit ? " (" + label(v.unit) + ")" : "");
    }
    default:
      return null;
  }
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
