// Record an event: a standalone world item. Name, when, what's involved, and (optionally) what
// sort of event it is. Nothing here mentions rules: hooks watch events; rules trigger on hooks.
// It's saved as a dated entry in the sandbox's log (append-only; corrected by withdrawing and
// adding again).
// Design: design/world-structure.md §7 (events are dated things with participants in roles);
// design/infra.md §1–2 (the log; corrections and withdrawals); owner, 15 Nov (build log): an
// event stands alone; the screen keeps events, hooks and the log apart.

import { useState } from "react";
import type { ContentItem, EventRecord } from "../../schema";
import { slugify } from "../../import/text-format";

interface Props {
  things: ContentItem[]; // things and units in this world, to pick from
  knownTypes: string[]; // types hooks here already watch for, offered as suggestions
  start?: EventRecord | null; // when correcting an event, its current values
  onSave: (event: EventRecord) => Promise<void>;
  onCancel?: () => void;
}

interface Involved {
  thing: string;
  role: string;
}

export function EventForm({ things, knownTypes, start, onSave, onCancel }: Props) {
  const [name, setName] = useState(start?.label ?? "");
  const [from, setFrom] = useState(start ? String(start.start) : "");
  const [until, setUntil] = useState(start?.end != null ? String(start.end) : "");
  const [type, setType] = useState(start && start.kind !== slugify(start.label) ? start.kind.replace(/_/g, " ") : "");
  const [involved, setInvolved] = useState<Involved[]>(start ? Object.entries(start.roles).map(([role, thing]) => ({ thing, role: role.replace(/_/g, " ") })) : []);
  const [pick, setPick] = useState<Involved>({ thing: "", role: "" });

  const ready = name.trim() !== "" && from.trim() !== "" && !Number.isNaN(Number(from)) && (until.trim() === "" || !Number.isNaN(Number(until)));
  const labelOf = (key: string) => things.find((t) => t.key === key)?.label ?? key;

  const save = async () => {
    const roles: Record<string, string> = {};
    involved.forEach((entry, i) => {
      const role = slugify(entry.role || "involved");
      roles[role in roles ? role + "_" + (i + 1) : role] = entry.thing;
    });
    await onSave({
      key: slugify(name) + "_" + from,
      label: name.trim(),
      kind: type.trim() ? slugify(type) : slugify(name),
      roles,
      start: Number(from),
      end: until.trim() === "" ? null : Number(until),
    });
    setName("");
    setFrom("");
    setUntil("");
    setType("");
    setInvolved([]);
  };

  return (
    <div className="card">
      <label htmlFor="ev-name">Name</label>
      <input id="ev-name" value={name} placeholder="Wages withheld" onChange={(e) => setName(e.target.value)} />

      <div className="row">
        <div className="grow">
          <label htmlFor="ev-from">From (year)</label>
          <input id="ev-from" type="number" inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="grow">
          <label htmlFor="ev-until">Until (blank: still going)</label>
          <input id="ev-until" type="number" inputMode="numeric" value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
      </div>

      <label>Involved</label>
      {involved.length === 0 && <p className="muted">Nothing yet. Pick a thing; say its part if it matters (“withholder”).</p>}
      {involved.map((entry, i) => (
        <div key={i} className="row spread">
          <span>
            {labelOf(entry.thing)} {entry.role && <span className="muted">· {entry.role}</span>}
          </span>
          <button className="small" onClick={() => setInvolved(involved.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <div className="row gap-top">
        <select className="inline grow" value={pick.thing} onChange={(e) => setPick({ ...pick, thing: e.target.value })} aria-label="Thing involved">
          <option value="">thing…</option>
          {things.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <input className="grow" placeholder="its part (optional)" value={pick.role} onChange={(e) => setPick({ ...pick, role: e.target.value })} aria-label="Its part" />
        <button className="small" disabled={!pick.thing} onClick={() => { setInvolved([...involved, pick]); setPick({ thing: "", role: "" }); }}>Add</button>
      </div>

      <label htmlFor="ev-type">Type (optional)</label>
      <input id="ev-type" list="ev-types" value={type} placeholder="defaults to the name" onChange={(e) => setType(e.target.value)} />
      <datalist id="ev-types">
        {knownTypes.map((t) => (
          <option key={t} value={t.replace(/_/g, " ")} />
        ))}
      </datalist>
      <p className="muted">A hook can watch for this event by name, or for any event of this type.</p>

      <div className="row gap-top">
        <button className="primary" disabled={!ready} onClick={save}>{start ? "Save the correction" : "Record the event"}</button>
        {onCancel && <button onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}
