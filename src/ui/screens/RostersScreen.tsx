// The roster builder (phone-first): a roster from an army list → add units → size → options and
// command → points by category against the limits → issues; each unit's card; the roster as text;
// register it in the open sandbox. Screens stay thin: the work is in src/army (via AppData).
// Design: build/slice-1-brief.md §3.1 (roster builder; practice and registered rosters), §1.3,
// §1.6 (lists phone-first; tokens only for look); design/rosters.md §1–3; design/validation-and-fixes.md §2.

import { useEffect, useState } from "react";
import type { ArmyList, ContentItem, Roster, RosterUnit } from "../../schema";
import { PRACTICE } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import { optionId, type CardOption, type ResolvedCard } from "../../army/card";
import { cardText } from "../../army/read-back";
import { slug, nameKey } from "../../army/cells";
import type { RosterUnitView, RosterView } from "../../army/roster";
import type { OptionEntry } from "../../army/options";
import { ArmyCardView } from "../components/ArmyCardView";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  onChanged: () => Promise<void>;
}

export function RostersScreen({ data, snapshot, onChanged }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rosters = snapshot.all.filter((i): i is Roster => i.class === "roster" && (i.space === PRACTICE || i.space === snapshot.openSandbox));
  const open = rosters.find((r) => r.key === openKey) ?? null;
  if (open) return <RosterDetail key={open.key + open.space} data={data} snapshot={snapshot} roster={open} onBack={() => setOpenKey(null)} onChanged={onChanged} />;

  return (
    <>
      <h1>Rosters</h1>
      {rosters.length === 0 && <p className="muted">No rosters yet.</p>}
      {rosters.map((r) => (
        <button key={r.space + r.key} className="list-button card" onClick={() => setOpenKey(r.key)}>
          <span>
            {r.label}
            <br />
            <span className="muted">
              {listLabel(snapshot.all, r.armyList)} · {r.target} points · {r.units.length} {r.units.length === 1 ? "unit" : "units"} ·{" "}
              {r.registration ? "registered in " + r.registration.sandbox : "practice (no world)"}
            </span>
          </span>
          <span aria-hidden>›</span>
        </button>
      ))}
      <NewRoster data={data} snapshot={snapshot} onCreated={async (key) => { await onChanged(); setOpenKey(key); }} />
      <RosterFromText data={data} onDone={onChanged} />
    </>
  );
}

function armyLists(all: ContentItem[]): ArmyList[] {
  return all.filter((i): i is ArmyList => i.class === "army_list" && nameKey(i.label) !== "common");
}

function listLabel(all: ContentItem[], key: string): string {
  return all.find((i) => i.class === "army_list" && i.key === key)?.label ?? key;
}

function NewRoster({ data, snapshot, onCreated }: { data: AppData; snapshot: Snapshot; onCreated: (key: string) => void }) {
  const lists = armyLists(snapshot.all);
  const [name, setName] = useState("");
  const [list, setList] = useState(lists[0]?.key ?? "");
  const [target, setTarget] = useState(1000);
  if (lists.length === 0) return <p className="muted gap-top-lg">Import an army list first (Import → army sheets).</p>;
  const create = async () => {
    const key = slug(name) + "_" + Date.now().toString(36);
    const roster: Roster = { class: "roster", key, label: name, space: PRACTICE, package: null, armyList: list, target, units: [], registration: null };
    await data.saveRoster(roster);
    onCreated(key);
  };
  return (
    <>
      <h2>New roster</h2>
      <label htmlFor="r-name">Name</label>
      <input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pick-up game" />
      <label htmlFor="r-list">Army list</label>
      <select id="r-list" value={list} onChange={(e) => setList(e.target.value)}>
        {lists.map((l) => (
          <option key={l.key} value={l.key}>
            {l.label} ({l.book})
          </option>
        ))}
      </select>
      <label htmlFor="r-target">Points limit</label>
      <input id="r-target" type="number" inputMode="numeric" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
      <div className="row gap-top">
        <button className="primary" disabled={!name.trim() || !list} onClick={create}>
          Start the roster
        </button>
      </div>
    </>
  );
}

function RosterFromText({ data, onDone }: { data: AppData; onDone: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string[] | null>(null);
  return (
    <details className="gap-top-lg">
      <summary>A roster from text</summary>
      <textarea value={text} spellCheck={false} autoCapitalize="off" onChange={(e) => setText(e.target.value)} placeholder={"roster: Quick list\narmy_list: The Empire of Man\ntarget: 500\nunits:\n  - unit: State Troops\n    size: 20"} />
      <button
        disabled={!text.trim()}
        onClick={async () => {
          const read = await data.importRosterText(text);
          setResult(read.problems.length ? read.problems.map((p) => p.message) : ["Saved: " + (read.roster?.label ?? "")]);
          await onDone();
        }}
      >
        Read it
      </button>
      {result?.map((r, i) => (
        <p key={i} className="muted">
          {r}
        </p>
      ))}
    </details>
  );
}

// --- One roster ---------------------------------------------------------------------------------

function RosterDetail({ data, snapshot, roster, onBack, onChanged }: { data: AppData; snapshot: Snapshot; roster: Roster; onBack: () => void; onChanged: () => Promise<void> }) {
  const [view, setView] = useState<RosterView | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    void data.rosterView(roster).then(setView);
  }, [data, roster]);

  const save = async (next: Roster) => {
    await data.saveRoster(next);
    await onChanged();
  };
  if (!view) return <p className="muted">Working it out…</p>;
  const unitView = view.units.find((u) => u.unit.id === editing);
  if (unitView)
    return (
      <UnitEditor
        view={unitView}
        onBack={() => setEditing(null)}
        onChange={(u) => save({ ...roster, units: roster.units.map((x) => (x.id === u.id ? u : x)) })}
        onRemove={async () => { setEditing(null); await save({ ...roster, units: roster.units.filter((x) => x.id !== unitView.unit.id) }); }}
      />
    );

  const illegal = view.issues.filter((i) => i.severity === "illegal");
  return (
    <>
      <button className="link" onClick={onBack}>‹ Rosters</button>
      <h1>{roster.label}</h1>
      <p className="muted">
        {view.list?.label ?? roster.armyList} · {roster.registration ? "registered in " + roster.registration.sandbox : "practice: no world, nothing logged"}
      </p>
      <p>
        <strong>{view.total}</strong> of{" "}
        <input className="inline" type="number" inputMode="numeric" value={roster.target} aria-label="Points limit" onChange={(e) => save({ ...roster, target: Number(e.target.value) })} /> points
      </p>

      <div className="card totals">
        {view.categories.map((c) => (
          <div key={c.category} className="totals-row">
            <span>{c.category}</span>
            <span className={c.ok ? "" : "bad"}>{c.points}</span>
            <span className="muted">{c.limit}</span>
          </div>
        ))}
      </div>

      {view.issues.length > 0 && (
        <div className="card gap-top">
          {illegal.length > 0 && <p className="problem-error">{illegal.length === 1 ? "1 issue makes it illegal" : illegal.length + " issues make it illegal"}</p>}
          {view.issues.map((issue, i) => (
            <p key={i} className={issue.severity === "illegal" ? "problem-error" : "problem-warning"}>
              {issue.message}
            </p>
          ))}
        </div>
      )}

      <h2>Units</h2>
      {view.units.map((u) => (
        <button key={u.unit.id} className="list-button card" onClick={() => setEditing(u.unit.id)}>
          <span>
            {u.card?.unit ?? u.unit.card} {u.unit.size > 1 ? "×" + u.unit.size : ""} {u.unit.general && <span className="tag good">General</span>}
            <br />
            <span className="muted">
              {u.card?.category} · {[...u.unit.slots, ...u.unit.options].join(", ") || "no upgrades"}
            </span>
          </span>
          <span>{u.points}</span>
        </button>
      ))}
      <AddUnit snapshot={snapshot} roster={roster} onAdd={(unit) => save({ ...roster, units: [...roster.units, unit] })} />

      <div className="row gap-top-lg">
        <button onClick={() => setShowText(!showText)}>{showText ? "Hide text" : "View text"}</button>
      </div>
      {showText && (
        <>
          <pre className="code">{data.rosterText(roster, snapshot.all)}</pre>
          <button onClick={() => navigator.clipboard?.writeText(data.rosterText(roster, snapshot.all))}>Copy text</button>
        </>
      )}
      {!roster.registration && snapshot.openSandbox && <RegisterForm data={data} snapshot={snapshot} roster={roster} view={view} onDone={onChanged} />}
    </>
  );
}

function AddUnit({ snapshot, roster, onAdd }: { snapshot: Snapshot; roster: Roster; onAdd: (unit: RosterUnit) => void }) {
  const list = snapshot.all.find((i) => i.class === "army_list" && i.key === roster.armyList);
  const cards = snapshot.all.filter((i) => i.class === "army_card" && list && i.package === list.package && (i.rows[0]["Tier"] ?? "") !== "" && !/mount/i.test(i.rows[0]["Tier"] ?? ""));
  const categories = [...new Set(cards.map((c) => (c.class === "army_card" ? c.rows[0]["Tier"] : "") ?? ""))];
  const [pick, setPick] = useState("");
  const add = () => {
    const card = cards.find((c) => c.key === pick);
    if (!card || card.class !== "army_card") return;
    const min = Number(/^(\d+)/.exec(card.rows[0]["Min/Max"] ?? "1")?.[1] ?? 1) || 1;
    const n = roster.units.reduce((m, u) => Math.max(m, Number(u.id.replace(/\D/g, "")) || 0), 0) + 1;
    onAdd({ id: "u" + n, card: card.key, size: min, options: [], slots: [], general: false });
    setPick("");
  };
  return (
    <div className="row gap-top">
      <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Unit to add" className="grow">
        <option value="">Add a unit…</option>
        {categories.map((cat) => (
          <optgroup key={cat} label={cat}>
            {cards
              .filter((c) => c.class === "army_card" && c.rows[0]["Tier"] === cat)
              .map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <button className="primary" disabled={!pick} onClick={add}>
        Add
      </button>
    </div>
  );
}

// --- One unit -------------------------------------------------------------------------------------

function UnitEditor({ view, onBack, onChange, onRemove }: { view: RosterUnitView; onBack: () => void; onChange: (u: RosterUnit) => void; onRemove: () => void }) {
  const unit = view.unit;
  const card = view.card;
  if (!card) return <><button className="link" onClick={onBack}>‹ Roster</button><p className="problem-error">No entry {unit.card} in the army list.</p></>;
  const set = (patch: Partial<RosterUnit>) => onChange({ ...unit, ...patch });
  const isCharacter = card.size !== null && card.size.max === 1;
  const slotsToPick = card.slots.filter((s) => s.type !== "crew" && s.type !== "steed");
  return (
    <>
      <button className="link" onClick={onBack}>‹ Roster</button>
      <h1>{card.unit}</h1>
      <p>
        <strong>{view.points}</strong> points <span className="muted">({view.breakdown.join(" · ")})</span>
      </p>
      {!isCharacter && (
        <div className="stepper gap-top">
          <button onClick={() => set({ size: Math.max(1, unit.size - 1) })} aria-label="One fewer">−</button>
          <input type="number" inputMode="numeric" value={unit.size} aria-label="Models" onChange={(e) => set({ size: Math.max(1, Number(e.target.value) || 1) })} />
          <button onClick={() => set({ size: unit.size + 1 })} aria-label="One more">+</button>
          <span className="muted">models{card.size ? " (" + (card.size.max === null ? card.size.min + "+" : card.size.min + "–" + card.size.max) + ")" : ""}</span>
        </div>
      )}
      {isCharacter && (
        <label className="choice">
          <input type="checkbox" checked={unit.general} onChange={(e) => set({ general: e.target.checked })} /> The General
        </label>
      )}

      {slotsToPick.length > 0 && <h2>Command</h2>}
      {slotsToPick.map((slot) => (
        <label key={slot.link} className="choice">
          <input
            type="checkbox"
            checked={unit.slots.some((s) => nameKey(s) === nameKey(slot.name))}
            onChange={(e) => set({ slots: e.target.checked ? [...unit.slots, slot.name] : unit.slots.filter((s) => nameKey(s) !== nameKey(slot.name)) })}
          />
          {slot.name} {slot.cost ? <span className="muted">+{slot.cost.amount}</span> : null}
        </label>
      ))}

      <h2>Options</h2>
      {card.options
        .filter((o) => o.section !== "slot" || unit.slots.some((s) => nameKey(s) === nameKey(o.slot ?? "")))
        .map((o, i) => (
          <OptionGroupPicker key={i} option={o} picks={unit.options} onChange={(options) => set({ options })} />
        ))}

      <h2>Card</h2>
      <ArmyCardView text={cardText({ ...card, rows: view.lines } as ResolvedCard)} />
      <div className="row gap-top-lg">
        <button onClick={onRemove}>Remove from the roster</button>
      </div>
    </>
  );
}

function isPicked(picks: string[], entry: OptionEntry): boolean {
  return picks.some((p) => nameKey(p) === nameKey(optionId(entry)) || nameKey(p) === nameKey(entry.name));
}

function OptionGroupPicker({ option, picks, onChange }: { option: CardOption; picks: string[]; onChange: (picks: string[]) => void }) {
  const group = option.group;
  const ids = group.members.map(optionId);
  const without = picks.filter((p) => !group.members.some((m) => nameKey(p) === nameKey(optionId(m)) || nameKey(p) === nameKey(m.name)));
  const prefix = option.slot ? option.slot + ": " : "";
  // Allowances (magic items) are shown, not picked: not built in slice 1 (brief §3.2).
  if (group.members.every((m) => m.budget)) {
    return <p className="muted">{prefix}{group.members.map((m) => m.name + " up to " + (m.budget?.max ?? "any") + " points").join("; ")} (allowances not built yet)</p>;
  }
  if (group.members.length === 1) {
    const m = group.members[0];
    return (
      <label className="choice">
        <input type="checkbox" checked={isPicked(picks, m)} onChange={(e) => onChange(e.target.checked ? [...without, ids[0]] : without)} />
        {prefix}
        {ids[0]} <span className="muted">{costLabel(m)}</span>
      </label>
    );
  }
  const name = "g-" + ids.join("|");
  return (
    <fieldset className="card">
      <legend className="muted">{prefix}{group.mandatory ? "must take one" : "one of"}</legend>
      {!group.mandatory && (
        <label className="choice">
          <input type="radio" name={name} checked={!group.members.some((m) => isPicked(picks, m))} onChange={() => onChange(without)} /> none
        </label>
      )}
      {group.members.map((m, i) => (
        <label key={i} className="choice">
          <input type="radio" name={name} checked={isPicked(picks, m)} onChange={() => onChange([...without, ids[i]])} />
          {ids[i]} <span className="muted">{costLabel(m)}</span>
        </label>
      ))}
    </fieldset>
  );
}

function costLabel(m: OptionEntry): string {
  if (!m.cost) return "";
  if (m.cost.amount === 0) return "free";
  return (m.cost.amount > 0 ? "+" : "") + m.cost.amount + (m.cost.perModel ? " per model" : "");
}

// --- Register in the open sandbox ------------------------------------------------------------------

function RegisterForm({ data, snapshot, roster, view, onDone }: { data: AppData; snapshot: Snapshot; roster: Roster; view: RosterView; onDone: () => Promise<void> }) {
  const sandbox = snapshot.openSandbox!;
  const contexts = snapshot.contexts.filter((c) => c.context).map((c) => c.context!);
  const things = snapshot.content.filter((i) => i.class === "thing" && i.space === sandbox);
  const [context, setContext] = useState(contexts[0]?.key ?? "");
  const [raised, setRaised] = useState(2520);
  const [links, setLinks] = useState<Record<string, Record<string, string>>>({});
  const kinds = ["raised_at", "member_of", "serves", "stationed_at"];
  const setLink = (unitId: string, kind: string, to: string) => setLinks({ ...links, [unitId]: { ...(links[unitId] ?? {}), [kind]: to } });
  const register = async () => {
    await data.registerRoster(
      roster,
      sandbox,
      context,
      view.units.map((u) => ({
        unit: u.unit.id,
        key: slug(roster.label + " " + (u.card?.unit ?? u.unit.card) + " " + u.unit.id),
        label: (u.card?.unit ?? u.unit.card) + " (" + roster.label + ")",
        raised,
        links: kinds.filter((k) => links[u.unit.id]?.[k]).map((k) => [k, links[u.unit.id][k]] as [string, string]),
      })),
    );
    await onDone();
  };
  return (
    <details className="gap-top-lg">
      <summary>Register in {snapshot.sandboxes.find((s) => s.key === sandbox)?.label ?? sandbox}</summary>
      <p className="muted">Each unit becomes a unit in this world, linked to where it was raised, from the raising date. World rules then reach it.</p>
      <label htmlFor="reg-context">Game in this world</label>
      <select id="reg-context" value={context} onChange={(e) => setContext(e.target.value)}>
        {contexts.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label} ({c.manifest})
          </option>
        ))}
      </select>
      <label htmlFor="reg-raised">Raised in</label>
      <input id="reg-raised" type="number" inputMode="numeric" value={raised} onChange={(e) => setRaised(Number(e.target.value))} />
      {view.units.map((u) => (
        <div key={u.unit.id} className="card gap-top">
          <h3>{u.card?.unit ?? u.unit.card}</h3>
          {kinds.map((k) => (
            <label key={k} className="choice">
              <span className="muted link-kind">{k.replace("_", " ")}</span>
              <select value={links[u.unit.id]?.[k] ?? ""} onChange={(e) => setLink(u.unit.id, k, e.target.value)} aria-label={k}>
                <option value="">—</option>
                {things.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ))}
      <button className="primary gap-top" disabled={!context} onClick={register}>
        Register
      </button>
    </details>
  );
}
