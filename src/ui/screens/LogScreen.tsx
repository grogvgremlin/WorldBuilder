// The Log tab: the open sandbox's record of what happened, in order, and nothing else. Events
// recorded in play, the GM's fixes (package switches, category orders, pins), corrections and
// withdrawals. Nothing is created here: events are recorded on World, fixes on the Sandbox tab
// and the unit card. An entry can be withdrawn; the original stays here, struck through.
// Design: design/infra.md §1–2 (the append-only log; withdrawal; the audit view), §8 (the
// entry's fields); owner, 15 Nov (build log): the log is the record, not where things are made.

import { useState } from "react";
import type { CategoryOrderValues, EventRecord, PackageSwitchValues, PinValues } from "../../schema";
import type { ReadEntry } from "../../log/log";
import type { AppData, Snapshot } from "../app-data";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  onChanged: () => Promise<void>;
}

type Filter = "all" | "event" | "fix" | "withdrawal";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "event", label: "Events" },
  { value: "fix", label: "GM fixes" },
  { value: "withdrawal", label: "Withdrawals" },
];
const FIX_KINDS = new Set(["package_switch", "category_order", "pin"]);

export function LogScreen({ data, snapshot, onChanged }: Props) {
  const sandbox = snapshot.openSandbox;
  const [filter, setFilter] = useState<Filter>("all");
  if (!sandbox) return <><h1>Log</h1><p className="muted">No sandbox yet: each sandbox has its own log.</p></>;

  const shown = snapshot.log.filter((entry) => {
    const kind = entry.body.content.kind;
    if (filter === "all") return true;
    if (filter === "fix") return FIX_KINDS.has(kind);
    return kind === filter;
  });

  return (
    <>
      <h1>Log</h1>
      <p className="muted">
        The record of what happened in this sandbox, oldest first. Nothing is made here: record events on World; switch packages and change orders on the Sandbox tab; pin from a unit's derivation. Withdrawn entries stay, struck through, and derivations skip them.
      </p>
      <div className="row">
        {FILTERS.map((f) => (
          <button key={f.value} className={"small" + (filter === f.value ? " primary" : "")} onClick={() => setFilter(f.value)}>{f.label}</button>
        ))}
      </div>
      {shown.length === 0 && <p className="muted gap-top">Nothing here.</p>}
      {shown.map((entry) => (
        <div key={entry.id} className="card">
          <div className="row spread">
            <span className={entry.status === "withdrawn" ? "withdrawn" : ""}>
              <span className="tag">{kindLabel(entry.body.content.kind)}</span> {describe(entry, snapshot)}
            </span>
            <span className={"tag " + (entry.status === "accepted" ? "good" : "bad")}>{entry.status}</span>
          </div>
          <p className="muted">
            Recorded {new Date(entry.recordedTime).toLocaleString()} by {entry.body.identity.actor} · {entry.id.slice(0, 8)}
          </p>
          {entry.status === "accepted" && entry.body.content.kind !== "withdrawal" && (
            <button className="small" onClick={async () => { await data.withdrawEntry(sandbox, entry.id, "withdrawn from the log"); await onChanged(); }}>Withdraw</button>
          )}
        </div>
      ))}
    </>
  );
}

function kindLabel(kind: string): string {
  return { event: "event", withdrawal: "withdrawal", package_switch: "package switch", category_order: "category order", pin: "pin" }[kind] ?? kind.replace(/_/g, " ");
}

// One entry in words.
function describe(entry: ReadEntry, snapshot: Snapshot): string {
  const values = entry.body.content.values;
  const label = (key: string) => snapshot.content.find((i) => i.key === key && (i.space === "library" || i.space === snapshot.openSandbox))?.label ?? key;
  switch (entry.body.content.kind) {
    case "event": {
      const event = values.event as EventRecord;
      const involved = Object.entries(event.roles).map(([role, thing]) => label(thing) + (role.startsWith("involved") ? "" : " (" + role.replace(/_/g, " ") + ")"));
      return event.label + " · from " + event.start + (event.end === null ? "" : " to " + event.end) + (involved.length ? " · " + involved.join(", ") : "");
    }
    case "withdrawal": {
      const target = snapshot.log.find((e) => e.id === entry.body.content.links.withdraws);
      const what = target?.body.content.kind === "event" ? (target.body.content.values.event as EventRecord).label : target ? kindLabel(target.body.content.kind) : "an entry";
      return "withdraws " + what + (values.reason ? " · " + String(values.reason) : "");
    }
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
      return "";
  }
}
