// The library (packages and manifests) and the open sandbox's manifest contexts: which packages
// are switched on, the category order per step, and pins. Every change here is a dated GM fix
// written to the sandbox's log, which can be withdrawn.
// Design: build/slice-1-brief.md §1.2 (macro: category order per context; micro: pins), §2.1
// (a context switches library packages on); design/rules-overlay.md §12 (an edit is the bulk GM
// fix, dated, shown in the derivation); design/items-packages-and-library.md §4, §10.

import { useState } from "react";
import type { CategoryRanks, ContentItem, Manifest, Package } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import { describeRanks, type ContextView } from "../../overlay/context";
import type { FoldStepName } from "../../overlay/derivation";
import { itemRef, refOf, type ItemRef } from "../item-ref";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  onOpenItem: (ref: ItemRef) => void;
  onChanged: () => Promise<void>;
}

export function LibraryScreen({ data, snapshot, onOpenItem, onChanged }: Props) {
  const library = snapshot.all.filter((i) => i.space === "library");
  const packages = library.filter((i): i is Package => i.class === "package").sort((a, b) => a.label.localeCompare(b.label));
  const manifests = library.filter((i): i is Manifest => i.class === "manifest");
  const sandbox = snapshot.openSandbox;

  return (
    <>
      <h1>Library</h1>
      <div className="columns">
        <div>
          {sandbox && snapshot.contexts.length > 0 && <h2>Contexts in this sandbox</h2>}
          {sandbox &&
            snapshot.contexts.map((view) => (
              <ContextCard key={view.context?.key} data={data} sandbox={sandbox} view={view} packages={packages} content={snapshot.content} onOpenItem={onOpenItem} onChanged={onChanged} />
            ))}
          {sandbox && snapshot.contexts.length === 0 && <p className="muted">This sandbox has no manifest context: every rule is in play.</p>}
        </div>
        <div>
          <h2>Packages</h2>
          {packages.length === 0 && <p className="muted">None yet. Import a package file on the Import tab.</p>}
          <div className="card">
            <ul className="plain">
              {packages.map((pkg) => (
                <li key={pkg.key}>
                  <button className="list-button bare" onClick={() => onOpenItem(itemRef(pkg))}>
                    <span>
                      {pkg.label} <span className="muted">· {pkg.sourceLayer}{pkg.edition ? " · " + pkg.edition : ""} · {pkg.members.length} {pkg.members.length === 1 ? "item" : "items"}</span>
                    </span>
                    <span aria-hidden>›</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {manifests.length > 0 && <h2>Manifests</h2>}
          {manifests.map((m) => (
            <button key={m.key} className="list-button card" onClick={() => onOpenItem(itemRef(m))}>
              <span>{m.label} <span className="muted">· {m.key}</span></span>
              <span aria-hidden>›</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

interface ContextCardProps {
  data: AppData;
  sandbox: string;
  view: ContextView;
  packages: Package[];
  content: ContentItem[];
  onOpenItem: (ref: ItemRef) => void;
  onChanged: () => Promise<void>;
}

function ContextCard({ data, sandbox, view, packages, content, onOpenItem, onChanged }: ContextCardProps) {
  const ruleLabel = (key: string) => content.find((i) => i.class === "rule" && i.key === key)?.label ?? key;
  const context = view.context!;
  const [adding, setAdding] = useState("");
  const labelOf = (key: string) => packages.find((p) => p.key === key)?.label ?? key + " (not in the library)";
  const notListed = packages.filter((p) => !view.packages.some((s) => s.key === p.key));
  const act = async (fn: () => Promise<void>) => {
    await fn();
    await onChanged();
  };
  const toggle = (key: string, on: boolean) => act(() => data.switchPackage(sandbox, { context: context.key, package: key, on, note: "" }));

  return (
    <div className="card">
      <div className="row spread">
        <strong>{context.label}</strong>
        <button className="link" onClick={() => onOpenItem(refOf(sandbox, context.key))}>{context.key}</button>
      </div>
      <p className="muted">Manifest: {view.manifest?.label ?? context.manifest}</p>
      {view.warnings.map((w, i) => (
        <p key={i} className="problem-warning">{w}</p>
      ))}

      <h3>Packages, in order</h3>
      <ul className="plain">
        {view.packages.map((state) => (
          <li key={state.key} className="row spread">
            <span>
              <button className="link" onClick={() => onOpenItem(refOf("library", state.key))}>{labelOf(state.key)}</button>{" "}
              <span className={"tag " + (state.on ? "good" : "bad")}>{state.on ? "on" : "off"}</span>
              <br />
              <span className="muted">{state.note}</span>
            </span>
            <button className="small" onClick={() => toggle(state.key, !state.on)}>{state.on ? "Switch off" : "Switch on"}</button>
          </li>
        ))}
      </ul>
      {notListed.length > 0 && (
        <div className="row gap-top">
          <select className="inline grow" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Package to switch on">
            <option value="">Switch on another package…</option>
            {notListed.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <button className="small" disabled={!adding} onClick={() => toggle(adding, true).then(() => setAdding(""))}>Switch on</button>
        </div>
      )}

      <h3>Category order</h3>
      {(["origin", "stationed"] as FoldStepName[]).map((step) => (
        <OrderRow key={step} data={data} sandbox={sandbox} contextKey={context.key} step={step} view={view} onChanged={onChanged} />
      ))}
      <p className="muted">Bag order: {view.bagOrder.join(" → ")} ({view.manifest?.label ?? "built-in"} default)</p>

      <h3>Pins</h3>
      {view.pins.length === 0 && <p className="muted">None. Pin a pair from a unit's derivation.</p>}
      {view.pins.map((pin) => (
        <div key={pin.entryId} className="row spread">
          <span>
            {pin.stat}: {ruleLabel(pin.first)} before {ruleLabel(pin.then)}{" "}
            <span className="muted">· {pin.unit ?? "every unit"} · {pin.note}</span>
          </span>
          <button className="small" onClick={() => act(() => data.withdrawEntry(sandbox, pin.entryId, "pin removed"))}>Remove</button>
        </div>
      ))}
    </div>
  );
}

// One step's category order, with a small editor: move a rank up or down, then save.
function OrderRow(props: { data: AppData; sandbox: string; contextKey: string; step: FoldStepName; view: ContextView; onChanged: () => Promise<void> }) {
  const order = props.view.categoryOrder[props.step];
  const [editing, setEditing] = useState<CategoryRanks | null>(null);

  const move = (index: number, by: number) => {
    if (!editing) return;
    const next = [...editing];
    const [rank] = next.splice(index, 1);
    next.splice(index + by, 0, rank);
    setEditing(next);
  };
  const save = async () => {
    await props.data.setCategoryOrder(props.sandbox, { context: props.contextKey, step: props.step, order: editing! });
    setEditing(null);
    await props.onChanged();
  };
  const backToDefault = async () => {
    await props.data.withdrawEntry(props.sandbox, order.entryId!, "category order back to default");
    await props.onChanged();
  };

  return (
    <div className="gap-bottom">
      <div className="row spread">
        <span>
          <strong>{props.step}:</strong> {describeRanks(order.ranks)}
          <br />
          <span className="muted">{order.note}</span>
        </span>
        <span className="row">
          {!editing && <button className="small" onClick={() => setEditing(order.ranks)}>Change</button>}
          {!editing && order.entryId && <button className="small" onClick={backToDefault}>Back to default</button>}
        </span>
      </div>
      {editing && (
        <div className="card">
          {editing.map((rank, i) => (
            <div key={rank.join()} className="row spread">
              <span>{i + 1}. {rank.join(" / ")}</span>
              <span className="row">
                <button className="small" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Earlier">↑</button>
                <button className="small" disabled={i === editing.length - 1} onClick={() => move(i, 1)} aria-label="Later">↓</button>
              </span>
            </div>
          ))}
          <div className="row gap-top">
            <button className="primary small" onClick={save}>Save for this context</button>
            <button className="small" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
