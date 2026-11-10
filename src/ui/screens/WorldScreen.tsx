// A list of units and things. Design: build/slice-0-brief.md §3 "a list of things and units".

import type { Snapshot } from "../app-data";

export function WorldScreen({ snapshot, onOpenUnit, onImport }: { snapshot: Snapshot; onOpenUnit: (key: string) => void; onImport: () => void }) {
  const units = snapshot.content.filter((item) => item.class === "unit");
  const things = snapshot.content.filter((item) => item.class === "thing");
  const rules = snapshot.content.filter((item) => item.class === "rule");

  if (units.length === 0 && things.length === 0) {
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

  return (
    <>
      <h1>World</h1>
      <h2>Units</h2>
      {units.map((unit) => (
        <button key={unit.key} className="list-button card" onClick={() => onOpenUnit(unit.key)}>
          <span>
            {unit.label}
            <br />
            <span className="muted">raised {unit.class === "unit" ? unit.raised : ""}</span>
          </span>
          <span aria-hidden>›</span>
        </button>
      ))}
      <h2>Things</h2>
      <div className="card">
        <ul className="plain">
          {things.map((thing) => (
            <li key={thing.key}>
              {thing.label}{" "}
              {thing.class === "thing" &&
                thing.kinds.map((kind) => (
                  <span key={kind} className="tag">
                    {kind}
                  </span>
                ))}
            </li>
          ))}
        </ul>
      </div>
      <p className="muted">
        {rules.length} rules · {snapshot.log.length} log entries
      </p>
      {snapshot.persistent === false && <PersistNote />}
    </>
  );
}

function PersistNote() {
  return <p className="muted">The browser hasn't promised to keep this data. Install the app to the home screen, and export a copy from Data now and then.</p>;
}
