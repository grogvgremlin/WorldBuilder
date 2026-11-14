// The words a condition can use, and warnings for words nothing uses.
// Design: design/rules-overlay.md §17 (conditions: `reaches` along link kinds, `any <kind>`,
// `in_force` with an event type and roles; named scopes; hooks), §5 (hooks); build/yaml-guide.md
// §6; owner feedback of 15 Nov ("how do I know what I can actually write?"; warn on unknown words;
// rules naming world things belong in campaign).
//
// Pure: reads content only. Used by the import review (warnings) and the "What can I write?" panel.

import type { ContentItem, EventRecord, Expression, Problem } from "../schema";
import type { ParsedItem } from "./text-format";

export interface LinkKindWord {
  kind: string;
  count: number;
  example: string; // one link of this kind, as "Nuln → in → Wissenland"
}

export interface Vocabulary {
  things: { key: string; label: string; kinds: string[] }[];
  thingKinds: string[];
  linkKinds: LinkKindWord[];
  eventTypes: { type: string; parts: string[] }[]; // each type with the parts (roles) its events use
  events: { key: string; label: string }[];
  hooks: { key: string; label: string }[];
  scopes: { key: string; label: string }[];
}

// The world a space's conditions can name: a sandbox's own items; for the library, every
// sandbox's (a library rule is world-agnostic, so any world's words are fair).
function worldItems(content: ContentItem[], space: string): ContentItem[] {
  return content.filter((i) => (space === "library" ? i.space !== "library" : i.space === space));
}

// `logged`: events recorded in the sandbox's log, which count as much as the world's history.
export function vocabulary(content: ContentItem[], space: string, logged: EventRecord[] = []): Vocabulary {
  const world = worldItems(content, space);
  const labelOf = (key: string) => world.find((i) => i.key === key)?.label ?? key;
  const things = world.flatMap((i) =>
    i.class === "thing" ? [{ key: i.key, label: i.label, kinds: i.kinds }] : i.class === "unit" ? [{ key: i.key, label: i.label, kinds: ["unit"] }] : [],
  );
  const links = world.flatMap((i) => (i.class === "link" ? [i] : []));
  const linkKinds = unique(links.map((l) => l.kind)).map((kind) => {
    const these = links.filter((l) => l.kind === kind);
    const first = these[0];
    return { kind, count: these.length, example: labelOf(first.from) + " → " + kind + " → " + labelOf(first.to) };
  });
  const events: EventRecord[] = [...world.flatMap((i) => (i.class === "event" ? [i] : [])), ...logged];
  const scopesSpace = (i: ContentItem) => i.space === "library" || i.space === space || space === "library";
  return {
    things: things.sort((a, b) => a.label.localeCompare(b.label)),
    thingKinds: unique(things.flatMap((t) => t.kinds)),
    linkKinds,
    eventTypes: unique(events.map((e) => e.kind)).map((type) => ({ type, parts: unique(events.filter((e) => e.kind === type).flatMap((e) => Object.keys(e.roles))) })),
    events: events.map((e) => ({ key: e.key, label: e.label })),
    hooks: world.flatMap((i) => (i.class === "hook" ? [{ key: i.key, label: i.label }] : [])),
    scopes: content.flatMap((i) => (i.class === "scope" && scopesSpace(i) ? [{ key: i.key, label: i.label }] : [])),
  };
}

function unique(words: string[]): string[] {
  return [...new Set(words)].sort();
}

// --- Warnings on import -------------------------------------------------------------------------

// Each condition in an imported item, with where it sits, for the warnings below.
function conditionsOf(item: ContentItem): { where: string; condition: Expression }[] {
  switch (item.class) {
    case "rule":
      return [{ where: "rule " + item.key + " scope", condition: item.scope }, ...(item.trigger ? [{ where: "rule " + item.key + " trigger", condition: item.trigger }] : [])];
    case "scope":
      return [{ where: "scope " + item.key, condition: item.query }];
    case "hook":
      return [{ where: "hook " + item.key, condition: item.condition }];
    default:
      return [];
  }
}

// Every `reaches` in a condition, however deeply nested.
function reachesIn(condition: Expression): Extract<Expression, { node: "reaches" }>[] {
  switch (condition.node) {
    case "reaches":
      return [condition];
    case "all":
    case "any":
      return condition.of.flatMap(reachesIn);
    case "not":
      return reachesIn(condition.of);
    default:
      return [];
  }
}

// Warns when a route follows a link kind no link in the world uses, or looks for `any <kind>`
// no thing has: the condition can never be true, which is usually a typo. A warning only: the
// links may come later. The import's own items count, so a sandbox file naming its own links is fine.
export function unknownWordWarnings(items: ParsedItem[], content: ContentItem[], space: string): Problem[] {
  const words = vocabulary([...content, ...items.map((p) => p.item)], space);
  const linkKinds = new Set(words.linkKinds.map((l) => l.kind));
  const thingKinds = new Set(words.thingKinds);
  const used = (set: Set<string>) => (set.size === 0 ? "none yet" : [...set].join(", "));
  const problems: Problem[] = [];
  for (const { line, item } of items) {
    for (const { where, condition } of conditionsOf(item)) {
      for (const reach of reachesIn(condition)) {
        for (const step of reach.via) {
          if (!linkKinds.has(step.link))
            problems.push({ line, severity: "warning", message: "link kind “" + step.link + "” in " + where + " isn't used by any link in this world, so the route reaches nothing (link kinds in use: " + used(linkKinds) + ")" });
        }
        if (reach.target.by === "kind" && !thingKinds.has(reach.target.kind))
          problems.push({ line, severity: "warning", message: "no thing in this world is a “" + reach.target.kind + "” (" + where + "; kinds in use: " + used(thingKinds) + ")" });
      }
    }
  }
  return problems;
}

// Rules in a core, book or FAQ package that name world things or hooks: game rules don't know
// any one world, so a rule tied to one belongs in a campaign package (owner, 15 Nov).
export function worldNamingWarnings(items: ParsedItem[], layer: string, namedWorldKeys: (condition: Expression) => string[]): Problem[] {
  if (layer === "campaign" || layer === "house") return [];
  const problems: Problem[] = [];
  for (const { line, item } of items) {
    if (item.class !== "rule") continue;
    const named = [...new Set(conditionsOf(item).flatMap(({ condition }) => namedWorldKeys(condition)))];
    if (named.length > 0)
      problems.push({ line, severity: "warning", message: "rule " + item.key + " names world things (" + named.join(", ") + "): a rule tied to a world belongs in a campaign package (layer: campaign), and this one is " + layer });
  }
  return problems;
}
