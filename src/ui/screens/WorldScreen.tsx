// The open sandbox's world: units, things grouped by kind, the rules in play, named scopes and
// events. Tap any of them to see it in words and as text.
// Design: design/world-structure.md §2–3 (kinds; topics are display groupings: a thing with
// several kinds shows under each); build/slice-1-brief.md §2.3 (things grouped by kind), §1.6
// (world views desktop-first: two columns on a wide screen).

import type { ContentItem, Rule, Thing } from "../../schema";
import type { Snapshot } from "../app-data";
import { itemRef, type ItemRef } from "../item-ref";

interface Props {
  snapshot: Snapshot;
  onOpenItem: (ref: ItemRef) => void;
  onImport: () => void;
}

export function WorldScreen({ snapshot, onOpenItem, onImport }: Props) {
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
          <Section title="Events (world history)" items={inSandbox("event")} detail={(i) => (i.class === "event" ? "from " + i.start : "")} onOpen={onOpenItem} />
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
