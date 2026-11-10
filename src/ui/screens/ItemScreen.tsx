// Any deployed item: what it is in plain words, what it's connected to, and its text.
// Design: design/rules-overlay.md §13 ("any thing has a tree": what it reaches, what reaches
// it, the rules active there; this is a first, static step: links and rules naming it);
// design/text-format-and-csv.md §4, §6 (read-backs; export). Units open the unit card instead.

import type { ContentItem, Expression, Link, Rule, WorldEvent } from "../../schema";
import type { Snapshot } from "../app-data";
import { readBackCondition, readBackRule } from "../../import/read-back";
import { referencedKeys } from "../../import/expression-text";
import { ItemText } from "../components/ItemText";

interface Props {
  snapshot: Snapshot;
  itemKey: string;
  onOpenItem: (key: string) => void;
  onBack: () => void;
}

export function ItemScreen({ snapshot, itemKey, onOpenItem, onBack }: Props) {
  const content = snapshot.content;
  const item = content.find((i) => i.key === itemKey);
  const labelOf = (key: string) => content.find((i) => i.key === key)?.label ?? key;
  const Ref = ({ k }: { k: string }) => (
    <button className="link" onClick={() => onOpenItem(k)}>
      {labelOf(k)}
    </button>
  );

  if (!item) {
    return (
      <>
        <button className="link" onClick={onBack}>‹ Back</button>
        <p className="muted">Nothing deployed with the key {itemKey}.</p>
      </>
    );
  }

  return (
    <>
      <button className="link" onClick={onBack}>‹ Back</button>
      <h1>{item.label}</h1>
      <p className="muted">
        <span className="tag">{item.class}</span> {item.key}
        {item.package && item.package !== item.key ? <> · package <Ref k={item.package} /></> : null}
      </p>

      <div className="card">
        {item.class === "thing" && <ThingView thing={item} content={content} Ref={Ref} />}
        {item.class === "link" && <LinkView link={item} Ref={Ref} />}
        {item.class === "rule" && <RuleView rule={item} labelOf={labelOf} Ref={Ref} />}
        {item.class === "scope" && (
          <>
            <p>Units that {readBackCondition(item.query, labelOf, "after units that")}.</p>
            <RulesNaming title="Rules using this scope" rules={rulesUsing(content, item.key)} Ref={Ref} />
          </>
        )}
        {item.class === "event" && <EventView event={item} Ref={Ref} />}
        {item.class === "package" && (
          <>
            <p>{item.sourceLayer} layer · {item.members.length} items</p>
            <ul className="plain">
              {item.members.map((key) => (
                <li key={key}>
                  <span className="tag">{content.find((i) => i.key === key)?.class ?? "?"}</span> <Ref k={key} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ItemText content={content} itemKey={item.key} label={item.class === "package" ? "View package text" : "View text"} />
    </>
  );
}

type RefComponent = (props: { k: string }) => JSX.Element;

function dates(start: number, end: number | null): string {
  return "from " + start + (end === null ? "" : " until " + end);
}

function ThingView({ thing, content, Ref }: { thing: ContentItem & { class: "thing" }; content: ContentItem[]; Ref: RefComponent }) {
  const links = content.filter((i): i is Link => i.class === "link");
  const out = links.filter((l) => l.from === thing.key);
  const into = links.filter((l) => l.to === thing.key);
  const events = content.filter((i): i is WorldEvent => i.class === "event" && Object.values(i.roles).includes(thing.key));
  return (
    <>
      <p>
        Kinds:{" "}
        {thing.kinds.length ? thing.kinds.map((k) => <span key={k} className="tag">{k}</span>) : <span className="muted">none</span>}
      </p>
      <h3>Links from it</h3>
      {out.length === 0 && <p className="muted">None.</p>}
      {out.map((l) => (
        <p key={l.key}>
          {l.kind.replace(/_/g, " ")} → <Ref k={l.to} /> <span className="muted">{dates(l.start, l.end)}</span>
        </p>
      ))}
      <h3>Links to it</h3>
      {into.length === 0 && <p className="muted">None.</p>}
      {into.map((l) => (
        <p key={l.key}>
          <Ref k={l.from} /> → {l.kind.replace(/_/g, " ")} <span className="muted">{dates(l.start, l.end)}</span>
        </p>
      ))}
      {events.length > 0 && (
        <>
          <h3>Events it takes part in</h3>
          {events.map((e) => (
            <p key={e.key}>
              <Ref k={e.key} /> <span className="muted">{dates(e.start, e.end)}</span>
            </p>
          ))}
        </>
      )}
      <RulesNaming title="Rules that name it" rules={rulesNaming(content, thing.key)} Ref={Ref} />
    </>
  );
}

function LinkView({ link, Ref }: { link: Link; Ref: RefComponent }) {
  return (
    <p>
      <Ref k={link.from} /> → {link.kind.replace(/_/g, " ")} → <Ref k={link.to} /> <span className="muted">{dates(link.start, link.end)}</span>
    </p>
  );
}

function RuleView({ rule, labelOf, Ref }: { rule: Rule; labelOf: (key: string) => string; Ref: RefComponent }) {
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
      <p className="muted">How it lands on a unit, and why not: open the unit's card.</p>
    </>
  );
}

function EventView({ event, Ref }: { event: WorldEvent; Ref: RefComponent }) {
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

function RulesNaming({ title, rules, Ref }: { title: string; rules: Rule[]; Ref: RefComponent }) {
  return (
    <>
      <h3>{title}</h3>
      {rules.length === 0 && <p className="muted">None.</p>}
      {rules.map((r) => (
        <p key={r.key}>
          <Ref k={r.key} />
        </p>
      ))}
    </>
  );
}

// --- Who names what ------------------------------------------------------------------------

function namesKey(expression: Expression, key: string): boolean {
  const refs = referencedKeys(expression);
  return refs.things.includes(key) || refs.scopes.includes(key);
}

// Rules naming a thing in their scope or trigger, directly or through a named scope.
function rulesNaming(content: ContentItem[], key: string): Rule[] {
  const scopesNamingIt = content.filter((i) => i.class === "scope" && namesKey(i.query, key)).map((i) => i.key);
  return content.filter(
    (i): i is Rule =>
      i.class === "rule" &&
      (namesKey(i.scope, key) || (i.trigger !== null && namesKey(i.trigger, key)) || scopesNamingIt.some((s) => namesKey(i.scope, s))),
  );
}

function rulesUsing(content: ContentItem[], scopeKey: string): Rule[] {
  return content.filter((i): i is Rule => i.class === "rule" && (namesKey(i.scope, scopeKey) || (i.trigger !== null && namesKey(i.trigger, scopeKey))));
}
