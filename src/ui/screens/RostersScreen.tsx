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
import { sectionsOf, type AddableCard, type Issue, type Offer, type RosterUnitView, type RosterView, type Section } from "../../army/roster";
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

// "Show options for": the roster's target by default; wider values offer more (and may cause issues).
const SHOW_FOR = [500, 1000, 1500, 2000, 2500, 3000, 4000];

function RosterDetail({ data, snapshot, roster, onBack, onChanged }: { data: AppData; snapshot: Snapshot; roster: Roster; onBack: () => void; onChanged: () => Promise<void> }) {
  const [view, setView] = useState<RosterView | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [showFor, setShowFor] = useState<"target" | "all" | number>("target");
  const [editing, setEditing] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const [saved, setSaved] = useState<{ ok: boolean; text: string } | null>(null);
  const points = showFor === "target" ? roster.target : showFor === "all" ? null : showFor;
  useEffect(() => {
    void data.rosterView(roster).then(setView);
  }, [data, roster]);
  useEffect(() => {
    void data.rosterOffer(roster, points).then(setOffer);
  }, [data, roster, points]);

  // Every change is saved as it's made; the note says so, or why it wasn't.
  const save = async (next: Roster) => {
    try {
      await data.saveRoster(next);
      setSaved({ ok: true, text: "Saved " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    } catch (e) {
      setSaved({ ok: false, text: "Not saved: " + (e instanceof Error ? e.message : String(e)) });
    }
    await onChanged();
  };
  if (!view || !offer) return <p className="muted">Working it out…</p>;
  const unitView = view.units.find((u) => u.unit.id === editing);
  if (unitView)
    return (
      <UnitEditor
        view={unitView}
        issues={view.issues.filter((i) => i.affects.includes(unitView.unit.id))}
        offer={offer}
        saved={saved}
        onBack={() => setEditing(null)}
        onChange={(u) => save({ ...roster, units: roster.units.map((x) => (x.id === u.id ? u : x)) })}
        onRemove={async () => { setEditing(null); await save({ ...roster, units: roster.units.filter((x) => x.id !== unitView.unit.id) }); }}
      />
    );

  const categories = [...view.categories.map((c) => c.category), ...offer.cards.map((c) => c.category)];
  const sections = sectionsOf(view, [...new Set(categories)]);
  // Category totals already show red in the summary: their issues aren't listed twice.
  const rosterIssues = view.issues.filter((i) => i.affects.length === 0 && !view.categories.some((c) => !c.ok && i.message.startsWith(c.category + ":")));
  const unitIssues = view.issues.filter((i) => i.affects.length > 0);
  const illegal = view.issues.filter((i) => i.severity === "illegal").length;
  const over = view.total > roster.target;
  const add = (unit: RosterUnit) => save({ ...roster, units: [...roster.units, unit] });
  return (
    <>
      <button className="link" onClick={onBack}>‹ Rosters</button>
      <h1>{roster.label}</h1>
      <p className="muted">
        {view.list?.label ?? roster.armyList} · {roster.registration ? "registered in " + roster.registration.sandbox : "practice: no world, nothing logged"}
        {saved && <span className={saved.ok ? "" : " problem-error"}> · {saved.text}</span>}
      </p>

      <div className="card">
        <p className={over ? "over-limit" : "within-limit"}>
          {view.total}/<NumberField value={roster.target} label="Points limit" className="points-input" onCommit={(target) => save({ ...roster, target })} /> points
        </p>
        {sections.filter((sec) => sec.total).map((sec) => (
          <p key={sec.category} className={sec.total!.ok ? "within-limit" : "over-limit"}>
            {sectionSummary(sec)}
          </p>
        ))}
        {rosterIssues.map((issue, i) => (
          <p key={i} className={issue.severity === "illegal" ? "over-limit" : "problem-warning"}>
            {issue.message}
          </p>
        ))}
        {illegal > 0 && <p className="muted">{illegal === 1 ? "1 issue makes it illegal" : illegal + " issues make it illegal"}{unitIssues.length > 0 ? "; units with issues are marked below" : ""}.</p>}
      </div>

      <label htmlFor="show-for">Show options for</label>
      <select id="show-for" value={String(showFor)} onChange={(e) => setShowFor(e.target.value === "target" || e.target.value === "all" ? e.target.value : Number(e.target.value))}>
        <option value="target">this roster ({roster.target} points)</option>
        {SHOW_FOR.filter((n) => n > roster.target).map((n) => (
          <option key={n} value={n}>
            up to {n} points (may cause issues)
          </option>
        ))}
        <option value="all">everything (may cause issues)</option>
      </select>

      {sections.map((sec) => (
        <section key={sec.category}>
          <h2 className={sec.total ? (sec.total.ok ? "within-limit" : "over-limit") : ""}>{sec.total ? sectionSummary(sec) : sec.category + " " + sec.units.reduce((n, u) => n + u.points, 0)}</h2>
          {sec.units.map((u) => (
            <UnitRow key={u.unit.id} view={u} issues={view.issues.filter((i) => i.affects.includes(u.unit.id))} onOpen={() => setEditing(u.unit.id)} />
          ))}
          <AddUnit roster={roster} cards={offer.cards.filter((c) => c.category === sec.category && c.offered)} onAdd={add} />
          {offer.cards.some((c) => c.category === sec.category && !c.offered) && (
            <p className="muted">
              Not offered at {offer.points} points: {offer.cards.filter((c) => c.category === sec.category && !c.offered).map((c) => c.label).join(", ")}.
            </p>
          )}
        </section>
      ))}

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

// "Characters 45/250 (up to 50%)" (owner, 21 Nov).
function sectionSummary(sec: Section): string {
  const t = sec.total!;
  return sec.category + " " + t.points + "/" + t.bound + " (" + t.percent + ")";
}

// A unit in its section: tap to open; its cost folds out, a line per part; its issues under it.
function UnitRow({ view, issues, onOpen }: { view: RosterUnitView; issues: Issue[]; onOpen: () => void }) {
  const u = view.unit;
  return (
    <div className={"card unit-row" + (issues.some((i) => i.severity === "illegal") ? " has-issue" : "")}>
      <button className="list-button bare" onClick={onOpen}>
        <span>
          {view.card?.unit ?? u.card} {u.size > 1 ? "×" + u.size : ""} {u.general && <span className="tag good">General</span>}
          <br />
          <span className="muted">{[...u.slots, ...u.options].join(", ") || "no upgrades"}</span>
        </span>
        <span aria-hidden>›</span>
      </button>
      <CostLines view={view} />
      {issues.map((issue, i) => (
        <p key={i} className={issue.severity === "illegal" ? "over-limit" : "problem-warning"}>
          {issue.message}
        </p>
      ))}
    </div>
  );
}

function CostLines({ view }: { view: RosterUnitView }) {
  return (
    <details>
      <summary>{view.points} points</summary>
      <ul className="cost-lines">
        {view.breakdown.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </details>
  );
}

// A number box that can be cleared while typing: the value is kept only when it's a whole number
// of at least `min`; on leaving the box, a blank or bad entry goes back to the last good value.
function NumberField({ value, min = 1, label, className, onCommit }: { value: number; min?: number; label: string; className?: string; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const read = (t: string) => (/^\d+$/.test(t.trim()) && Number(t) >= min ? Number(t) : null);
  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = read(e.target.value);
        if (n !== null && n !== value) onCommit(n);
      }}
      onBlur={() => setText(String(read(text) ?? value))}
    />
  );
}

function AddUnit({ roster, cards, onAdd }: { roster: Roster; cards: AddableCard[]; onAdd: (unit: RosterUnit) => void }) {
  if (cards.length === 0) return null;
  const add = (key: string) => {
    if (!key) return;
    const n = roster.units.reduce((m, u) => Math.max(m, Number(u.id.replace(/\D/g, "")) || 0), 0) + 1;
    const size = cards.find((c) => c.key === key)?.minSize ?? 1;
    onAdd({ id: "u" + n, card: key, size, options: [], slots: [], general: false });
  };
  return (
    <select value="" onChange={(e) => add(e.target.value)} aria-label={"Add to " + cards[0].category} className="gap-top">
      <option value="">Add…</option>
      {cards.map((c) => (
        <option key={c.key} value={c.key}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

// --- One unit -------------------------------------------------------------------------------------

function UnitEditor({ view, issues, offer, saved, onBack, onChange, onRemove }: { view: RosterUnitView; issues: Issue[]; offer: Offer; saved: { ok: boolean; text: string } | null; onBack: () => void; onChange: (u: RosterUnit) => void; onRemove: () => void }) {
  const unit = view.unit;
  const card = view.card;
  if (!card) return <><button className="link" onClick={onBack}>‹ Roster</button><p className="problem-error">No entry {unit.card} in the army list.</p></>;
  const set = (patch: Partial<RosterUnit>) => onChange({ ...unit, ...patch });
  const isCharacter = card.size !== null && card.size.max === 1;
  const slotsToPick = card.slots.filter((s) => s.type !== "crew" && s.type !== "steed");
  // Options the points shown don't allow are hidden, unless already picked (so they can be undone).
  const shown = (o: CardOption): CardOption => ({ ...o, group: { ...o.group, members: o.group.members.filter((m) => offer.optionOffered(card, o, m) || isPicked(unit.options, m)) } });
  return (
    <>
      <button className="link" onClick={onBack}>‹ Roster</button>
      <h1>{card.unit}</h1>
      {saved && <p className={saved.ok ? "muted" : "problem-error"}>{saved.text}</p>}
      {issues.map((issue, i) => (
        <p key={i} className={issue.severity === "illegal" ? "over-limit" : "problem-warning"}>
          {issue.message}
        </p>
      ))}
      <CostLines view={view} />
      {!isCharacter && (
        <div className="stepper gap-top">
          <button onClick={() => set({ size: Math.max(1, unit.size - 1) })} aria-label="One fewer">−</button>
          <NumberField value={unit.size} label="Models" onCommit={(size) => set({ size })} />
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
        .map(shown)
        .filter((o) => o.group.members.length > 0)
        .map((o, i) => (
          <OptionGroupPicker key={i} option={o} picks={unit.options} onChange={(options) => set({ options })} />
        ))}
      {offer.points !== null && <p className="muted">Showing options for {offer.points} points.</p>}

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
