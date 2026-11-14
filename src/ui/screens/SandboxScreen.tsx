// The open sandbox's setup: the world's category order, its manifest contexts (each game played
// in it: the manifest and its core, then books, FAQs, house rules and campaign packages, each
// switchable; the category order for that game; pins), and packages local to the sandbox.
// Every change is a dated GM fix in the sandbox's log, which can be withdrawn.
// Design: build/slice-1-brief.md §1.2 (macro and micro configurable), §2.1 (containers);
// design/rules-overlay.md §12 (the category order: shipped with the world, editable per context;
// the bulk GM fix, dated; pins); design/items-packages-and-library.md §4 (the core is always
// applied), §10 (switch-offs). Owner decisions of 14 Nov (build log).

import { useState } from "react";
import type { CategoryRanks, ContentItem, Package, Sandbox } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import { describeRanks, type ContextView, type PackageGroup } from "../../overlay/context";
import type { FoldStepName } from "../../overlay/derivation";
import { ItemText } from "../components/ItemText";
import { findByKey, itemRef, type ItemRef } from "../item-ref";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  onOpenItem: (ref: ItemRef) => void;
  onEditText: (text: string, label: string) => void;
  onChanged: () => Promise<void>;
}

const GROUP_TITLES: Record<PackageGroup, string> = { core: "Core (from the manifest)", books: "Books", faqs: "FAQs", house: "House rules", campaign: "Campaign" };

export function SandboxScreen({ data, snapshot, onOpenItem, onEditText, onChanged }: Props) {
  const key = snapshot.openSandbox;
  const sandbox = snapshot.content.find((i): i is Sandbox => i.class === "sandbox" && i.key === key);
  if (!key || !sandbox) {
    return (
      <>
        <h1>Sandbox</h1>
        <p className="muted">No sandbox yet. A sandbox is one world: import a sandbox file, or load a test world on the Import tab.</p>
      </>
    );
  }
  const packages = snapshot.content.filter((i): i is Package => i.class === "package");
  const local = packages.filter((p) => p.space === key);

  return (
    <>
      <h1>{sandbox.label}</h1>
      <p className="muted">Sandbox {sandbox.key}: one world, its log, and the games played in it.</p>
      <ItemText all={snapshot.all} item={sandbox} label="View the whole sandbox as text" onEditText={onEditText} />

      <div className="columns">
        <div>
          <h2>Games played here (contexts)</h2>
          {snapshot.contexts.length === 0 && <p className="muted">None: every rule is in play. Add a context to the sandbox file.</p>}
          {snapshot.contexts.map((view) => (
            <ContextCard key={view.context?.key} data={data} sandbox={key} view={view} packages={packages} content={snapshot.content} onOpenItem={onOpenItem} onChanged={onChanged} />
          ))}
        </div>
        <div>
          <h2>The world's category order</h2>
          <div className="card">
            {sandbox.categoryOrder ? (
              <>
                <p><strong>origin:</strong> {describeRanks(sandbox.categoryOrder.origin)}</p>
                <p><strong>stationed:</strong> {describeRanks(sandbox.categoryOrder.stationed)}</p>
              </>
            ) : (
              <p>Built-in default: place → organisation → title.</p>
            )}
            <p className="muted">How places, organisations and titles stack for this world's rules. A game (context) can override it for itself, in its card.</p>
          </div>

          <h2>Packages local to this sandbox</h2>
          {local.length === 0 && <p className="muted">None. A package file with `sandbox: {key}` under its header lives here, not in the library.</p>}
          {local.length > 0 && (
            <div className="card">
              <ul className="plain">
                {local.map((p) => (
                  <li key={p.key}>
                    <button className="link" onClick={() => onOpenItem(itemRef(p))}>{p.label}</button> <span className="muted">· {p.sourceLayer}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
  const context = view.context!;
  const [adding, setAdding] = useState("");
  const ruleLabel = (key: string) => content.find((i) => i.class === "rule" && i.key === key)?.label ?? key;
  const pkg = (key: string) => findByKey(packages, key, sandbox) as Package | undefined;
  const notListed = packages.filter((p) => !view.packages.some((s) => s.key === p.key));
  const act = async (fn: () => Promise<void>) => {
    await fn();
    await onChanged();
  };
  const toggle = (key: string, on: boolean) => act(() => data.switchPackage(sandbox, { context: context.key, package: key, on, note: "" }));
  const groups = (Object.keys(GROUP_TITLES) as PackageGroup[]).filter((g) => view.packages.some((p) => p.group === g));

  return (
    <div className="card">
      <div className="row spread">
        <strong>{context.label}</strong>
        <button className="link" onClick={() => onOpenItem(itemRef(context))}>{context.key}</button>
      </div>
      <p>
        Game:{" "}
        {view.manifest ? <button className="link" onClick={() => onOpenItem(itemRef(view.manifest!))}>{view.manifest.label}</button> : context.manifest + " (not in the library)"}
      </p>
      {view.warnings.map((w, i) => (
        <p key={i} className="problem-warning">{w}</p>
      ))}

      {groups.map((group) => (
        <div key={group}>
          <h3>{GROUP_TITLES[group]}</h3>
          <ul className="plain">
            {view.packages.filter((p) => p.group === group).map((state) => (
              <li key={state.key} className="row spread">
                <span>
                  {pkg(state.key) ? <button className="link" onClick={() => onOpenItem(itemRef(pkg(state.key)!))}>{pkg(state.key)!.label}</button> : state.key + " (missing)"}{" "}
                  <span className={"tag " + (state.on ? "good" : "bad")}>{state.on ? "on" : "off"}</span>
                  <br />
                  <span className="muted">{state.note}</span>
                </span>
                {!state.locked && <button className="small" onClick={() => toggle(state.key, !state.on)}>{state.on ? "Switch off" : "Switch on"}</button>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {notListed.length > 0 && (
        <div className="row gap-top">
          <select className="inline grow" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Package to switch on">
            <option value="">Switch on another package…</option>
            {notListed.map((p) => (
              <option key={p.space + p.key} value={p.key}>{p.label} ({p.sourceLayer})</option>
            ))}
          </select>
          <button className="small" disabled={!adding} onClick={() => toggle(adding, true).then(() => setAdding(""))}>Switch on</button>
        </div>
      )}

      <h3>Category order for this game</h3>
      {(["origin", "stationed"] as FoldStepName[]).map((step) => (
        <OrderRow key={step} data={data} sandbox={sandbox} contextKey={context.key} step={step} view={view} onChanged={onChanged} />
      ))}
      <p className="muted">Bag order: {view.bagOrder.join(" → ")} (from {view.manifest?.label ?? "the built-in default"})</p>

      <h3>Pins</h3>
      {view.pins.length === 0 && <p className="muted">None. Pin a pair from a unit's derivation.</p>}
      {view.pins.map((pin) => (
        <div key={pin.entryId} className="row spread">
          <span>
            {pin.stat}: {ruleLabel(pin.first)} before {ruleLabel(pin.then)} <span className="muted">· {pin.unit ?? "every unit"} · {pin.note}</span>
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
              <span>
                {i + 1}. {rank.join(" / ")}
              </span>
              <span className="row">
                <button className="small" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Earlier">↑</button>
                <button className="small" disabled={i === editing.length - 1} onClick={() => move(i, 1)} aria-label="Later">↓</button>
              </span>
            </div>
          ))}
          <div className="row gap-top">
            <button className="primary small" onClick={save}>Save for this game</button>
            <button className="small" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
