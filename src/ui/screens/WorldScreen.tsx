// Everything deployed, by kind: units, things, rules, named scopes, events and packages.
// Tap any of them to see it in words and as text.
// Design: build/slice-0-brief.md §3 "a list of things and units".

import type { ContentItem } from "../../schema";
import type { Snapshot } from "../app-data";

interface Props {
  snapshot: Snapshot;
  onOpenItem: (key: string) => void;
  onImport: () => void;
}

export function WorldScreen({ snapshot, onOpenItem, onImport }: Props) {
  const ofClass = (name: ContentItem["class"]) =>
    snapshot.content.filter((item) => item.class === name).sort((a, b) => a.label.localeCompare(b.label));

  if (snapshot.content.length === 0) {
    return (
      <>
        <h1>World</h1>
        <div className="card">
          <p>Nothing here yet.</p>
          <p className="muted">Import a YAML file, or load one of the test worlds (E1, E2, E4).</p>
          <button className="primary" onClick={onImport}>
            Import
          </button>
        </div>
        {snapshot.persistent === false && <PersistNote />}
      </>
    );
  }

  const section = (title: string, items: ContentItem[], detail: (item: ContentItem) => string) =>
    items.length === 0 ? null : (
      <>
        <h2>{title}</h2>
        <div className="card">
          <ul className="plain">
            {items.map((item) => (
              <li key={item.key}>
                <button className="list-button" style={{ border: "none", padding: 0, minHeight: 36 }} onClick={() => onOpenItem(item.key)}>
                  <span>
                    {item.label} <span className="muted">· {detail(item)}</span>
                  </span>
                  <span aria-hidden>›</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </>
    );

  return (
    <>
      <h1>World</h1>
      {section("Units", ofClass("unit"), (i) => (i.class === "unit" ? "raised " + i.raised : ""))}
      {section("Things", ofClass("thing"), (i) => (i.class === "thing" ? i.kinds.join(", ") || i.key : ""))}
      {section("Rules", ofClass("rule"), (i) => (i.class === "rule" ? i.effect.stat + " · " + i.nature : ""))}
      {section("Named scopes", ofClass("scope"), (i) => i.key)}
      {section("Events (world history)", ofClass("event"), (i) => (i.class === "event" ? "from " + i.start : ""))}
      {section("Packages", ofClass("package"), (i) => (i.class === "package" ? i.sourceLayer + " · " + i.members.length + " items" : ""))}
      <p className="muted">{snapshot.log.length} log entries (see the Log tab).</p>
      {snapshot.persistent === false && <PersistNote />}
    </>
  );
}

function PersistNote() {
  return <p className="muted">The browser hasn't promised to keep this data. Install the app to the home screen, and export a copy from Data now and then.</p>;
}
