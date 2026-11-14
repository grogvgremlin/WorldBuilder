// Any item other than a unit: what it is in plain words, what it's connected to, and its text.
// A thing shows its tree at a read date; a rule shows the units it lands on at a read date, and a
// filter to ask "why not?" about others.
// Design: design/rules-overlay.md §9 (the test view), §13 (any thing has a tree: what it reaches,
// what reaches it, the rules there); build/slice-1-brief.md §2.3 (a thing's tree at a date; a
// rule's page lists the units it applies to, never the ones it doesn't; a filter over units and
// their links); design/text-format-and-csv.md §4, §6 (read-backs; export).

import { useEffect, useState } from "react";
import { CONTEXT_GROUPS, type ContentItem, type Hook, type Link, type Manifest, type ManifestContext, type Package, type Rule, type Sandbox, type Thing, type Unit, type WorldEvent } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import { readBackCondition, readBackRule } from "../../import/read-back";
import { referencedKeys } from "../../import/expression-text";
import { describeRanks } from "../../overlay/context";
import type { Landing, UnitFilter } from "../../overlay/landing";
import { unitLinkKinds } from "../../overlay/landing";
import type { RuleCheck } from "../../overlay/derivation";
import type { ThingTree } from "../../world/tree";
import { ItemText } from "../components/ItemText";
import { latestDate, ReadDate } from "../components/ReadDate";
import { WhyNotTree } from "./UnitScreen";
import { findByKey, itemRef, type ItemRef } from "../item-ref";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  itemRef: ItemRef;
  onOpenItem: (ref: ItemRef) => void;
  onBack: () => void;
  onEditText: (text: string, label: string) => void;
}

type RefButton = (props: { k: string }) => JSX.Element;

export function ItemScreen({ data, snapshot, itemRef: ref, onOpenItem, onBack, onEditText }: Props) {
  const item = snapshot.all.find((i) => itemRef(i) === ref);
  const sandbox = snapshot.openSandbox;
  const lookup = (key: string) => findByKey(snapshot.content, key, sandbox);
  const Ref: RefButton = ({ k }) => {
    const target = lookup(k);
    return target ? <button className="link" onClick={() => onOpenItem(itemRef(target))}>{target.label}</button> : <span>{k}</span>;
  };
  const logDates = snapshot.log.map((e) => e.body.order.inWorldDate).filter((d): d is number => d !== null);
  const [readDate, setReadDate] = useState(() => latestDate(snapshot.content, logDates));

  if (!item) {
    return (
      <>
        <button className="link" onClick={onBack}>‹ Back</button>
        <p className="muted">Nothing deployed as {ref}.</p>
      </>
    );
  }
  const labelOf = (key: string) => lookup(key)?.label ?? key;

  return (
    <>
      <button className="link" onClick={onBack}>‹ Back</button>
      <h1>{item.label}</h1>
      <p className="muted">
        <span className="tag">{item.class}</span> {item.key} · in {item.space === "library" ? "the library" : "sandbox " + item.space}
        {item.package && item.package !== item.key ? <> · <Ref k={item.package} /></> : null}
      </p>

      {(item.class === "thing" || item.class === "rule") && sandbox && <ReadDate value={readDate} onChange={setReadDate} />}

      <div className="card">
        {item.class === "thing" && sandbox && <ThingView data={data} sandbox={sandbox} thing={item} readDate={readDate} Ref={Ref} onOpenItem={onOpenItem} lookup={lookup} />}
        {item.class === "thing" && <ThingLinks thing={item} content={snapshot.content} Ref={Ref} onOpenItem={onOpenItem} />}
        {item.class === "link" && <LinkView link={item} Ref={Ref} />}
        {item.class === "rule" && <RuleView rule={item} labelOf={labelOf} Ref={Ref} />}
        {item.class === "scope" && <p>Units that {readBackCondition(item.query, labelOf, "after units that")}.</p>}
        {item.class === "hook" && <HookPage hook={item} content={snapshot.content} labelOf={labelOf} Ref={Ref} />}
        {item.class === "event" && <EventView event={item} Ref={Ref} />}
        {item.class === "package" && <PackageView pkg={item} all={snapshot.all} onOpenItem={onOpenItem} />}
        {item.class === "manifest" && <ManifestView manifest={item} Ref={Ref} />}
        {item.class === "context" && <ContextView context={item} Ref={Ref} />}
        {item.class === "sandbox" && <SandboxView sandbox={item} />}
      </div>

      {item.class === "rule" && sandbox && (
        <RuleLandings data={data} snapshot={snapshot} sandbox={sandbox} rule={item} readDate={readDate} onOpenItem={onOpenItem} lookup={lookup} />
      )}

      <ItemText
        all={snapshot.all}
        item={item}
        label={item.class === "package" || item.class === "sandbox" ? "View the whole " + item.class + " as text" : "View text"}
        onEditText={onEditText}
      />
    </>
  );
}

function dates(start: number, end: number | null): string {
  return "from " + start + (end === null ? "" : " until " + end);
}

// --- A thing and its tree ---------------------------------------------------------------------

interface ThingViewProps {
  data: AppData;
  sandbox: string;
  thing: Thing;
  readDate: number;
  Ref: RefButton;
  onOpenItem: (ref: ItemRef) => void;
  lookup: (key: string) => ContentItem | undefined;
}

function ThingView({ data, sandbox, thing, readDate, Ref, onOpenItem, lookup }: ThingViewProps) {
  const [tree, setTree] = useState<ThingTree | null>(null);
  useEffect(() => {
    void data.thingTree(sandbox, thing.key, readDate).then(setTree);
  }, [data, sandbox, thing.key, readDate]);

  const open = (key: string) => {
    const target = lookup(key);
    if (target) onOpenItem(itemRef(target));
  };

  return (
    <>
      <p>
        Kinds: {thing.kinds.length ? thing.kinds.map((k) => <span key={k} className="tag">{k}</span>) : <span className="muted">none</span>}
      </p>
      {!tree && <p className="muted">Reading…</p>}
      {tree && (
        <>
          <h3>What it reaches, in {readDate}</h3>
          {tree.reaches.length === 0 && <p className="muted">Nothing.</p>}
          {tree.reaches.map((b) => (
            <p key={b.key}>
              <button className="link" onClick={() => open(b.key)}>{b.label}</button> <span className="muted">{branchNote(b)}</span>
            </p>
          ))}
          <h3>What reaches it, in {readDate}</h3>
          {tree.reachedBy.length === 0 && <p className="muted">Nothing.</p>}
          {tree.reachedBy.map((b) => (
            <p key={b.key}>
              <button className="link" onClick={() => open(b.key)}>{b.label}</button> <span className="muted">{branchNote(b)}</span>
            </p>
          ))}
          <h3>Rules that name it</h3>
          {tree.rules.length === 0 && <p className="muted">None.</p>}
          {tree.rules.map(({ rule, via }) => (
            <p key={rule.key}>
              <Ref k={rule.key} /> <span className="muted">· through {via}</span>
            </p>
          ))}
        </>
      )}
    </>
  );
}

// One hop: just the link kind. Longer: the whole route, so the steps in between show.
function branchNote(branch: { route: string; hops: number }): string {
  if (branch.hops > 1) return "· by" + branch.route;
  const kind = /[—←]([^→—]+)[→—]/.exec(branch.route)?.[1]?.trim() ?? "";
  return "· " + kind;
}

// A thing's own links, both ways, with their dates: tap one to see it and its text.
function ThingLinks({ thing, content, Ref, onOpenItem }: { thing: Thing; content: ContentItem[]; Ref: RefButton; onOpenItem: (ref: ItemRef) => void }) {
  const links = content.filter((i): i is Link => i.class === "link" && (i.from === thing.key || i.to === thing.key) && i.space === thing.space);
  return (
    <>
      <h3>Its links (all dates)</h3>
      {links.length === 0 && <p className="muted">None.</p>}
      {links.map((link) => (
        <p key={link.key}>
          {link.from === thing.key ? (
            <>
              → {link.kind.replace(/_/g, " ")} → <Ref k={link.to} />
            </>
          ) : (
            <>
              <Ref k={link.from} /> → {link.kind.replace(/_/g, " ")} →
            </>
          )}{" "}
          <span className="muted">{dates(link.start, link.end)}</span>{" "}
          <button className="link" onClick={() => onOpenItem(itemRef(link))}>open</button>
        </p>
      ))}
      <p className="muted">To change a link (end it, or move a place), open it, then Edit as text.</p>
    </>
  );
}

// A hook: what it watches, in words, and the rules that trigger on it. Its state at a date is on
// the World tab (Hooks).
function HookPage({ hook, content, labelOf, Ref }: { hook: Hook; content: ContentItem[]; labelOf: (key: string) => string; Ref: RefButton }) {
  const rules = content.filter((i): i is Rule => i.class === "rule" && i.trigger !== null && referencedKeys(i.trigger).hooks.includes(hook.key));
  return (
    <>
      <p>True when {readBackCondition(hook.condition, labelOf, "clause")}.</p>
      <p>
        Rules on it:{" "}
        {rules.length === 0
          ? "none"
          : rules.map((r, i) => (
              <span key={r.key}>
                {i > 0 ? ", " : ""}
                <Ref k={r.key} />
              </span>
            ))}
      </p>
      <p className="muted">A world item: each game binds its own rule to it. Its state at a date is under Hooks on the World tab.</p>
    </>
  );
}

function LinkView({ link, Ref }: { link: Link; Ref: RefButton }) {
  return (
    <p>
      <Ref k={link.from} /> → {link.kind.replace(/_/g, " ")} → <Ref k={link.to} /> <span className="muted">{dates(link.start, link.end)}</span>
    </p>
  );
}

// --- A rule: in words, and where it lands --------------------------------------------------------

function RuleView({ rule, labelOf, Ref }: { rule: Rule; labelOf: (key: string) => string; Ref: RefButton }) {
  const named = [...referencedKeys(rule.scope).things, ...referencedKeys(rule.scope).scopes, ...(rule.trigger ? referencedKeys(rule.trigger).things : [])];
  return (
    <>
      {readBackRule(rule, labelOf).map((line, i) => (
        <p key={i}>{line}</p>
      ))}
      {named.length > 0 && (
        <p className="muted">
          Names:{" "}
          {[...new Set(named)].map((k, i) => (
            <span key={k}>
              {i > 0 ? ", " : ""}
              <Ref k={k} />
            </span>
          ))}
        </p>
      )}
    </>
  );
}

interface RuleLandingsProps {
  data: AppData;
  snapshot: Snapshot;
  sandbox: string;
  rule: Rule;
  readDate: number;
  onOpenItem: (ref: ItemRef) => void;
  lookup: (key: string) => ContentItem | undefined;
}

// The units the rule applies to at the read date. Never the ones it doesn't: to ask "why not?"
// about a unit, narrow the list with the filter and open that unit's tree.
function RuleLandings({ data, snapshot, sandbox, rule, readDate, onOpenItem, lookup }: RuleLandingsProps) {
  const [landings, setLandings] = useState<Landing[] | null>(null);
  useEffect(() => {
    void data.ruleLandings(sandbox, rule.key, readDate).then(setLandings);
  }, [data, sandbox, rule.key, readDate, snapshot]);
  const open = (key: string) => {
    const target = lookup(key);
    if (target) onOpenItem(itemRef(target));
  };

  return (
    <>
      <h2>Lands on, in {readDate}</h2>
      <div className="card">
        {!landings && <p className="muted">Reading…</p>}
        {landings?.length === 0 && <p className="muted">No unit in this sandbox.</p>}
        {landings?.map((l) => (
          <div key={l.unitKey} className="step">
            <button className="link" onClick={() => open(l.unitKey)}>{l.label}</button>
            {l.routes.map((r, i) => (
              <p key={i} className="muted indent">{r}</p>
            ))}
          </div>
        ))}
      </div>
      <WhyNotFinder data={data} snapshot={snapshot} sandbox={sandbox} rule={rule} readDate={readDate} />
    </>
  );
}

function WhyNotFinder({ data, snapshot, sandbox, rule, readDate }: { data: AppData; snapshot: Snapshot; sandbox: string; rule: Rule; readDate: number }) {
  const [filter, setFilter] = useState<UnitFilter>({ text: "", linkKind: null, target: null, orInside: true });
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [checks, setChecks] = useState<Record<string, RuleCheck | null | "loading">>({});
  const things = snapshot.content.filter((i): i is Thing => i.class === "thing" && i.space === sandbox).sort((a, b) => a.label.localeCompare(b.label));
  const kinds = unitLinkKinds(snapshot.content.filter((i) => i.space === sandbox));

  const search = async () => {
    setChecks({});
    setUnits(await data.filterUnits(sandbox, filter, readDate));
  };
  const whyNot = async (unitKey: string) => {
    setChecks({ ...checks, [unitKey]: "loading" });
    const check = await data.ruleCheck(sandbox, rule.key, unitKey, readDate);
    setChecks((current) => ({ ...current, [unitKey]: check }));
  };

  return (
    <>
      <h2>Why not?</h2>
      <div className="card">
        <p className="muted">Find units to check: by name, and (optionally) by a link.</p>
        <label htmlFor="f-text">Name contains</label>
        <input id="f-text" value={filter.text} onChange={(e) => setFilter({ ...filter, text: e.target.value })} />
        <div className="row">
          <div className="grow">
            <label htmlFor="f-link">Link</label>
            <select id="f-link" value={filter.linkKind ?? ""} onChange={(e) => setFilter({ ...filter, linkKind: e.target.value || null })}>
              <option value="">any</option>
              {kinds.map((k) => (
                <option key={k} value={k}>{k.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="grow">
            <label htmlFor="f-target">to</label>
            <select id="f-target" value={filter.target ?? ""} onChange={(e) => setFilter({ ...filter, target: e.target.value || null })}>
              <option value="">anything</option>
              {things.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="inline gap-top">
          <input type="checkbox" checked={filter.orInside} onChange={(e) => setFilter({ ...filter, orInside: e.target.checked })} />
          or anywhere inside it
        </label>
        <div className="row gap-top">
          <button onClick={search}>Find units</button>
        </div>
        {units?.length === 0 && <p className="muted gap-top">No units match.</p>}
        {units?.map((unit) => {
          const check = checks[unit.key];
          return (
            <div key={unit.key} className="gap-top">
              <div className="row spread">
                <span>{unit.label}</span>
                <button className="small" onClick={() => whyNot(unit.key)}>Why / why not?</button>
              </div>
              {check === "loading" && <p className="muted">Reading…</p>}
              {check === null && <p className="muted">This rule isn't in this unit's context.</p>}
              {check && check !== "loading" && (
                <>
                  <p>{check.applies ? <span className="tag good">applies</span> : <span className="tag bad">doesn't apply</span>}</p>
                  <WhyNotTree check={check} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// --- Other items -----------------------------------------------------------------------------------

function EventView({ event, Ref }: { event: WorldEvent; Ref: RefButton }) {
  return (
    <>
      <p>
        Kind: {event.kind.replace(/_/g, " ")} · {dates(event.start, event.end)}
      </p>
      {Object.entries(event.roles).map(([role, key]) => (
        <p key={role}>
          {role.replace(/_/g, " ")}: <Ref k={key} />
        </p>
      ))}
    </>
  );
}

function PackageView({ pkg, all, onOpenItem }: { pkg: Package; all: ContentItem[]; onOpenItem: (ref: ItemRef) => void }) {
  return (
    <>
      <p>
        {pkg.sourceLayer} layer{pkg.edition ? " · edition " + pkg.edition : ""} · {pkg.members.length} {pkg.members.length === 1 ? "item" : "items"}
      </p>
      {pkg.requires.length > 0 && <p className="muted">Requires: {pkg.requires.join(", ")}</p>}
      {pkg.conflicts.length > 0 && <p className="muted">Conflicts with: {pkg.conflicts.join(", ")}</p>}
      <ul className="plain">
        {pkg.members.map((key) => {
          const member = all.find((i) => i.space === pkg.space && i.key === key);
          return (
            <li key={key}>
              <span className="tag">{member?.class ?? "?"}</span>{" "}
              {member ? <button className="link" onClick={() => onOpenItem(itemRef(member))}>{member.label}</button> : key}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ManifestView({ manifest, Ref }: { manifest: Manifest; Ref: RefButton }) {
  return (
    <>
      <p>Stats: {manifest.statOrder.join(" ")}</p>
      <p>Bag order: {manifest.bagOrder.join(" → ")}</p>
      <p>
        Core, always applied:{" "}
        {manifest.core.length === 0
          ? "none"
          : manifest.core.map((k, i) => (
              <span key={k}>
                {i > 0 ? ", " : ""}
                <Ref k={k} />
              </span>
            ))}
      </p>
      <p className="muted">The game itself. Which books, FAQs, house rules and campaign packages go with it is set per sandbox, on the Sandbox tab.</p>
    </>
  );
}

function ContextView({ context, Ref }: { context: ManifestContext; Ref: RefButton }) {
  return (
    <>
      <p>
        Game: <Ref k={context.manifest} /> (its core comes with it)
      </p>
      {CONTEXT_GROUPS.map(({ field }) =>
        context[field].length === 0 ? null : (
          <p key={field}>
            {field}:{" "}
            {context[field].map((k, i) => (
              <span key={k}>
                {i > 0 ? ", " : ""}
                <Ref k={k} />
              </span>
            ))}
          </p>
        ),
      )}
      {context.categoryOrder && <p>Its own category order: origin {describeRanks(context.categoryOrder.origin)}; stationed {describeRanks(context.categoryOrder.stationed)}</p>}
      <p className="muted">Switch packages, change the order and see pins on the Sandbox tab.</p>
    </>
  );
}

function SandboxView({ sandbox }: { sandbox: Sandbox }) {
  return <p>{sandbox.members.length} items in this world. Its units, things and rules in play are on the World tab.</p>;
}
