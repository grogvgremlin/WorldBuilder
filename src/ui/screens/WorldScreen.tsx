// The open sandbox's world: units, things grouped by kind, events (record, correct, withdraw),
// hooks (what game rules watch, with their state), the rules in play and named scopes. Tap any
// of them to see it in words and as text.
// Owner, 15 Nov (build log): an event stands alone; a hook watches events; a rule triggers on a
// hook. Events are recorded here, not on the Log tab, which is the record only.
// Design: design/world-structure.md §2–3 (kinds; topics are display groupings: a thing with
// several kinds shows under each); build/slice-1-brief.md §2.3 (things grouped by kind), §1.6
// (world views desktop-first: two columns on a wide screen).

import { useEffect, useState } from "react";
import type { ContentItem, EventRecord, Rule, Thing } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import type { ReadEntry } from "../../log/log";
import type { HookState } from "../../overlay/hooks";
import { expressionToText } from "../../import/expression-text";
import { EventForm } from "../components/EventForm";
import { latestDate, ReadDate } from "../components/ReadDate";
import { Trace } from "../components/Trace";
import { findByKey, itemRef, type ItemRef } from "../item-ref";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  onOpenItem: (ref: ItemRef) => void;
  onImport: () => void;
  onEditText: (text: string, label: string) => void;
  onChanged: () => Promise<void>;
}

export function WorldScreen({ data, snapshot, onOpenItem, onImport, onEditText, onChanged }: Props) {
  const logDates = snapshot.log.map((e) => e.body.order.inWorldDate).filter((d): d is number => d !== null);
  const [readDate, setReadDate] = useState(() => latestDate(snapshot.content, logDates));
  const sandbox = snapshot.openSandbox;
  if (!sandbox) {
    return (
      <>
        <h1>World</h1>
        <div className="card">
          <p>No sandbox yet.</p>
          <p className="muted">Import a sandbox file, or load a test world (E1, E2, E4) on the Import tab.</p>
          <button className="primary" onClick={onImport}>Import</button>
        </div>
        {snapshot.persistent === false && <PersistNote />}
      </>
    );
  }

  const inSandbox = (cls: ContentItem["class"]) =>
    snapshot.content.filter((i) => i.space === sandbox && i.class === cls).sort((a, b) => a.label.localeCompare(b.label));
  const things = inSandbox("thing") as Thing[];
  const sandboxLabel = snapshot.sandboxes.find((s) => s.key === sandbox)?.label ?? sandbox;

  return (
    <>
      <h1>{sandboxLabel}</h1>
      <div className="columns">
        <div>
          <Section title="Units" items={inSandbox("unit")} detail={(i) => (i.class === "unit" ? "raised " + i.raised : "")} onOpen={onOpenItem} />
          <h2>Rules in play</h2>
          <RulesInPlay snapshot={snapshot} onOpen={onOpenItem} />
          <Section title="Named scopes" items={scopesInPlay(snapshot, sandbox)} detail={(i) => i.key} onOpen={onOpenItem} />
          <Events data={data} snapshot={snapshot} sandbox={sandbox} history={inSandbox("event")} onOpenItem={onOpenItem} onChanged={onChanged} />
          <Hooks data={data} snapshot={snapshot} sandbox={sandbox} readDate={readDate} onReadDate={setReadDate} onOpenItem={onOpenItem} onEditText={onEditText} />
        </div>
        <div>
          <h2>Things, by kind</h2>
          {kindsOf(things).map((kind) => (
            <Section
              key={kind}
              title={kind}
              small
              items={things.filter((t) => (kind === "no kind" ? t.kinds.length === 0 : t.kinds.includes(kind)))}
              detail={(i) => (i.class === "thing" && i.kinds.length > 1 ? "also " + i.kinds.filter((k) => k !== kind).join(", ") : "")}
              onOpen={onOpenItem}
            />
          ))}
        </div>
      </div>
      <p className="muted gap-top">{snapshot.log.length} log entries (see the Log tab).</p>
      {snapshot.persistent === false && <PersistNote />}
    </>
  );
}

// Events: world history (from the sandbox file) and events recorded during play (in the log).
// Recording, correcting and withdrawing happen here.
function Events(props: { data: AppData; snapshot: Snapshot; sandbox: string; history: ContentItem[]; onOpenItem: (ref: ItemRef) => void; onChanged: () => Promise<void> }) {
  const { data, snapshot, sandbox } = props;
  const [recording, setRecording] = useState(false);
  const [correcting, setCorrecting] = useState<ReadEntry | null>(null);
  const logged = snapshot.log.filter((e) => e.body.content.kind === "event");
  const things = snapshot.content.filter((i) => (i.class === "thing" || i.class === "unit") && i.space === sandbox).sort((a, b) => a.label.localeCompare(b.label));
  const knownTypes = [...new Set(snapshot.content.flatMap((i) => (i.class === "hook" || i.class === "rule" ? typesWatched(i) : [])))];

  const record = async (event: EventRecord) => {
    if (correcting) await data.withdrawEntry(sandbox, correcting.id, "corrected by a new entry");
    await data.addEvent(sandbox, event);
    setRecording(false);
    setCorrecting(null);
    await props.onChanged();
  };

  return (
    <>
      <div className="row spread">
        <h2>Events</h2>
        {!recording && !correcting && <button className="small" onClick={() => setRecording(true)}>Record an event</button>}
      </div>
      {(recording || correcting) && (
        <EventForm
          key={correcting?.id ?? "new"}
          things={things}
          knownTypes={knownTypes}
          start={correcting ? (correcting.body.content.values.event as EventRecord) : null}
          onSave={record}
          onCancel={() => { setRecording(false); setCorrecting(null); }}
        />
      )}
      {correcting && <p className="muted">Saving withdraws the original (it stays in the log) and records this one.</p>}
      {props.history.length === 0 && logged.length === 0 && !recording && <p className="muted">None yet.</p>}
      {(props.history.length > 0 || logged.length > 0) && (
        <div className="card">
          <ul className="plain">
            {props.history.map((item) => (
              <li key={item.key}>
                <button className="link" onClick={() => props.onOpenItem(itemRef(item))}>{item.label}</button>{" "}
                <span className="muted">· {item.class === "event" ? dates(item.start, item.end) : ""} · world history</span>
              </li>
            ))}
            {logged.map((entry) => {
              const event = entry.body.content.values.event as EventRecord;
              const standing = entry.status === "accepted";
              return (
                <li key={entry.id} className="row spread">
                  <span className={standing ? "" : "withdrawn"}>
                    {event.label} <span className="muted">· {dates(event.start, event.end)} · recorded{standing ? "" : ", withdrawn"}</span>
                  </span>
                  {standing && (
                    <span className="row">
                      <button className="small" onClick={() => { setCorrecting(entry); setRecording(false); }}>Correct</button>
                      <button className="small" onClick={async () => { await data.withdrawEntry(sandbox, entry.id, "withdrawn from World"); await props.onChanged(); }}>Withdraw</button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

// The event types hooks and rule triggers look for, offered when recording an event.
function typesWatched(item: ContentItem): string[] {
  const condition = item.class === "hook" ? item.condition : item.class === "rule" ? item.trigger : null;
  if (!condition) return [];
  const found: string[] = [];
  const visit = (e: typeof condition): void => {
    if (!e) return;
    if (e.node === "in_force") found.push(e.what);
    if (e.node === "all" || e.node === "any") e.of.forEach(visit);
    if (e.node === "not") visit(e.of);
  };
  visit(condition);
  return found;
}

function dates(start: number, end: number | null): string {
  return "from " + start + (end === null ? "" : " to " + end);
}

// Hooks: what the game rules watch, each with its state at the read date, what it read, and the
// rules bound to it. A hook made from a rule's inline trigger shows here too, marked as such.
function Hooks(props: {
  data: AppData;
  snapshot: Snapshot;
  sandbox: string;
  readDate: number;
  onReadDate: (date: number) => void;
  onOpenItem: (ref: ItemRef) => void;
  onEditText: (text: string, label: string) => void;
}) {
  const { data, snapshot, sandbox, readDate } = props;
  const [states, setStates] = useState<HookState[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    void data.hookStates(sandbox, readDate).then(setStates);
  }, [data, sandbox, readDate, snapshot]);
  const sandboxLabel = snapshot.sandboxes.find((s) => s.key === sandbox)?.label ?? sandbox;
  const openRule = (key: string) => {
    const rule = findByKey(snapshot.content, key, sandbox);
    if (rule) props.onOpenItem(itemRef(rule));
  };

  // Turning an auto hook into a world hook: a sandbox file adding the hook (the rule can then
  // name it as its trigger).
  const makeWorldHook = (state: HookState) => {
    const key = state.hook.fromRule + "_hook";
    const text = "sandbox: [" + sandboxLabel + ", " + sandbox + "]\n\nhooks:\n  - hook: [" + state.hook.label.replace(/[“”]/g, "") + ", " + key + "]\n    when: " + expressionToText(state.hook.condition) + "\n";
    props.onEditText(text, key + ".yaml");
  };

  return (
    <>
      <h2>Hooks</h2>
      <ReadDate value={readDate} onChange={props.onReadDate} label="Hooks read at" />
      {!states && <p className="muted">Reading…</p>}
      {states?.length === 0 && <p className="muted">None. A hook is what a game rule watches (“treasury not paying”); add one to the sandbox file.</p>}
      {states?.map((state) => (
        <div key={state.hook.key} className="card">
          <button className="list-button bare" onClick={() => setOpen(open === state.hook.key ? null : state.hook.key)}>
            <span>
              {state.hook.label}
              {state.hook.fromRule && <span className="muted"> · made from a rule's trigger</span>}
            </span>
            {state.perUnit ? (
              <span className="tag">depends on the unit</span>
            ) : state.trace?.result === "true" ? (
              <span className="tag good">true</span>
            ) : state.trace?.result === "false" ? (
              <span className="tag bad">false</span>
            ) : (
              <span className="tag warn">can't tell</span>
            )}
          </button>
          {open === state.hook.key && (
            <div className="gap-top">
              {state.trace && <Trace trace={state.trace} />}
              {state.perUnit && <p className="muted">It follows links from a unit, so each unit's card shows its own answer.</p>}
              <p className="muted">
                Rules on it:{" "}
                {state.rules.length === 0
                  ? "none"
                  : state.rules.map((r, i) => (
                      <span key={r.key}>
                        {i > 0 ? ", " : ""}
                        <button className="link" onClick={() => openRule(r.key)}>{r.label}</button>
                      </span>
                    ))}
              </p>
              {state.hook.fromRule && (
                <button className="small" onClick={() => makeWorldHook(state)}>Make it a world hook</button>
              )}
              {!state.hook.fromRule && (
                <button className="link" onClick={() => props.onOpenItem(itemRef({ space: state.hook.space, key: state.hook.key }))}>Open hook</button>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function kindsOf(things: Thing[]): string[] {
  const kinds = new Set<string>();
  for (const thing of things) thing.kinds.forEach((k) => kinds.add(k));
  const sorted = [...kinds].sort();
  return things.some((t) => t.kinds.length === 0) ? [...sorted, "no kind"] : sorted;
}

function packagesOn(snapshot: Snapshot): Set<string> {
  return new Set(snapshot.contexts.flatMap((c) => c.packages.filter((p) => p.on).map((p) => p.key)));
}

// Named scopes of this sandbox, and those in library packages switched on here.
function scopesInPlay(snapshot: Snapshot, sandbox: string): ContentItem[] {
  const on = packagesOn(snapshot);
  return snapshot.content.filter((i) => i.class === "scope" && (i.space === sandbox || (i.package !== null && on.has(i.package))));
}

// The rules whose package is switched on in one of the sandbox's contexts.
function RulesInPlay({ snapshot, onOpen }: { snapshot: Snapshot; onOpen: (ref: ItemRef) => void }) {
  const on = packagesOn(snapshot);
  const rules = snapshot.content.filter((i): i is Rule => i.class === "rule" && i.package !== null && on.has(i.package));
  if (rules.length === 0) return <p className="muted">None: switch a rules package on in a context (Library tab).</p>;
  return (
    <Section
      title=""
      items={rules.sort((a, b) => a.label.localeCompare(b.label))}
      detail={(i) => (i.class === "rule" ? i.effect.stat + " · " + i.nature + " · " + i.category : "")}
      onOpen={onOpen}
    />
  );
}

function Section(props: { title: string; items: ContentItem[]; detail: (item: ContentItem) => string; onOpen: (ref: ItemRef) => void; small?: boolean }) {
  if (props.items.length === 0) return null;
  return (
    <>
      {props.title && (props.small ? <h3>{props.title}</h3> : <h2>{props.title}</h2>)}
      <div className="card">
        <ul className="plain">
          {props.items.map((item) => (
            <li key={itemRef(item)}>
              <button className="list-button bare" onClick={() => props.onOpen(itemRef(item))}>
                <span>
                  {item.label} {props.detail(item) && <span className="muted">· {props.detail(item)}</span>}
                </span>
                <span aria-hidden>›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function PersistNote() {
  return <p className="muted">The browser hasn't promised to keep this data. Install the app to the home screen, and export a copy from Data now and then.</p>;
}
