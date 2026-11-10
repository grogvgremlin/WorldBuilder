// Writing content back out as text, in one canonical form that re-imports exactly.
// Design: design/text-format-and-csv.md §1 ("one canonical form on export"), §6 (export and
// round trip: keys included, so an export re-imports exactly; only changed entries show as
// edits). The shape is the slice-0 text format (build/yaml-guide.md).

import type { ContentItem, EventRecord, Link, NamedScope, NumberEdit, Package, Rule, Thing, Unit, WorldEvent } from "../schema";
import { expressionToText } from "./expression-text";
import { STAT_ORDER } from "./text-format";

// --- Values -------------------------------------------------------------------------------

// A label or key as a YAML value: plain if that is safe, else double-quoted.
function yamlText(text: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9 _'.-]*$/.test(text) && !/ $/.test(text) ? text : JSON.stringify(text);
}

function header(label: string, key: string): string {
  return "[" + yamlText(label) + ", " + yamlText(key) + "]";
}

export function editToText(edit: NumberEdit): string {
  const value = String(edit.value);
  let words: string;
  switch (edit.kind) {
    case "set":
      return "[" + edit.stat + ", =" + value + ", " + edit.targetPoint + "]"; // a set always states it
    case "add":
      words = edit.value >= 0 ? "+" + value : value;
      break;
    case "multiply":
      words = "x" + value;
      break;
    case "cap":
      words = "at most " + value;
      break;
    case "floor":
      words = "at least " + value;
      break;
  }
  const defaultPoint = edit.kind === "cap" || edit.kind === "floor" ? "end" : "inline";
  return "[" + edit.stat + ", " + words + (edit.targetPoint === defaultPoint ? "" : ", " + edit.targetPoint) + "]";
}

function roles(record: Record<string, string>): string {
  const parts = Object.entries(record).map(([role, key]) => yamlText(role) + ": " + yamlText(key));
  return "{" + parts.join(", ") + "}";
}

function period(start: number, end: number | null): string {
  return "[" + start + (end === null ? "" : ", " + end) + "]";
}

// --- One item each -----------------------------------------------------------------------------

function thingLine(thing: Thing): string {
  return "  - [" + yamlText(thing.label) + ", " + yamlText(thing.key) + ", [" + thing.kinds.map(yamlText).join(", ") + "]]";
}

function linkLine(link: Link): string {
  const parts = [link.from, link.kind, link.to].map(yamlText);
  return "  - [" + parts.join(", ") + ", " + link.start + (link.end === null ? "" : ", " + link.end) + "]";
}

function unitBlock(unit: Unit, ownLinks: Link[]): string[] {
  const stats = Object.keys(unit.profile);
  const isFullList = stats.length === STAT_ORDER.length && STAT_ORDER.every((stat) => stat in unit.profile);
  const profile = isFullList
    ? "[" + STAT_ORDER.map((stat) => unit.profile[stat]).join(", ") + "]"
    : "{" + stats.map((stat) => stat + ": " + unit.profile[stat]).join(", ") + "}";
  const lines = ["  - unit: " + header(unit.label, unit.key), "    raised: " + unit.raised, "    profile: " + profile];
  if (ownLinks.length > 0) lines.push("    links:", ...ownLinks.map((link) => "      " + unitLinkTuple(link, unit.raised)));
  return lines;
}

// A unit's own link, short form: (kind, to), with start and end only where needed.
function unitLinkTuple(link: Link, raised: number): string {
  const parts = [yamlText(link.kind), yamlText(link.to)];
  if (link.start !== raised || link.end !== null) parts.push(String(link.start));
  if (link.end !== null) parts.push(String(link.end));
  return "- [" + parts.join(", ") + "]";
}

function scopeBlock(scope: NamedScope): string[] {
  return ["  - scope: " + header(scope.label, scope.key), "    query: " + expressionToText(scope.query)];
}

export function ruleBlock(rule: Rule): string[] {
  const lines = [
    "  - rule: " + header(rule.label, rule.key),
    "    effect: " + editToText(rule.effect),
    "    scope: " + expressionToText(rule.scope),
  ];
  if (rule.trigger) lines.push("    trigger: " + expressionToText(rule.trigger));
  lines.push("    nature: " + rule.nature, "    category: " + rule.category, "    layer: " + rule.sourceLayer);
  if (rule.base) lines.push("    base: " + yamlText(rule.base));
  if (rule.reason) lines.push("    reason: " + yamlText(rule.reason));
  return lines;
}

function eventBlock(event: EventRecord | WorldEvent): string[] {
  const lines = ["  - event: " + header(event.label, event.key), "    kind: " + yamlText(event.kind)];
  if (Object.keys(event.roles).length > 0) lines.push("    roles: " + roles(event.roles));
  lines.push("    period: " + period(event.start, event.end));
  return lines;
}

// --- Whole files ---------------------------------------------------------------------------------

function packageHeader(pkg: Package): string[] {
  return ["package: " + header(pkg.label, pkg.key), "layer: " + pkg.sourceLayer];
}

type SectionName = "things" | "links" | "units" | "scopes" | "rules" | "events";

function sectionOf(item: ContentItem): SectionName | null {
  switch (item.class) {
    case "thing":
      return "things";
    case "link":
      return "links";
    case "unit":
      return "units";
    case "scope":
      return "scopes";
    case "rule":
      return "rules";
    case "event":
      return "events";
    default:
      return null;
  }
}

// Sections in the order their first item appears; items in the order given, so a re-import
// keeps the package's written order. A unit's own links are written under it.
function sections(items: ContentItem[]): string[] {
  const units = new Map(items.filter((i): i is Unit => i.class === "unit").map((u) => [u.key, u]));
  const linksOfUnit = (key: string) => items.filter((i): i is Link => i.class === "link" && i.from === key);
  const isUnitLink = (item: ContentItem) => item.class === "link" && units.has(item.from);

  const order: SectionName[] = [];
  const blocks = new Map<SectionName, string[][]>();
  for (const item of items) {
    const name = sectionOf(item);
    if (name === null || isUnitLink(item)) continue;
    if (!blocks.has(name)) {
      order.push(name);
      blocks.set(name, []);
    }
    blocks.get(name)!.push(blockFor(item, linksOfUnit));
  }

  const lines: string[] = [];
  for (const name of order) {
    lines.push("", name + ":");
    blocks.get(name)!.forEach((block, i) => {
      if (i > 0 && block.length > 1) lines.push(""); // a blank line between multi-line blocks
      lines.push(...block);
    });
  }
  return lines;
}

function blockFor(item: ContentItem, linksOfUnit: (key: string) => Link[]): string[] {
  switch (item.class) {
    case "thing":
      return [thingLine(item)];
    case "link":
      return [linkLine(item)];
    case "unit":
      return unitBlock(item, linksOfUnit(item.key));
    case "scope":
      return scopeBlock(item);
    case "rule":
      return ruleBlock(item);
    case "event":
      return eventBlock(item);
    default:
      return [];
  }
}

// One rule as a file that re-imports into its own package without changing anything else.
export function ruleToText(rule: Rule, pkg: Package | undefined): string {
  return itemToText(rule, pkg, []);
}

// Any one item as a file that re-imports into its own package without changing anything else.
// A unit comes with its own links from the same package; a package gives the whole package.
export function itemToText(item: ContentItem, pkg: Package | undefined, content: ContentItem[]): string {
  if (item.class === "package") return packageToText(item, content);
  const ownLinks =
    item.class === "unit"
      ? content
          .filter((other): other is Link => other.class === "link" && other.from === item.key && other.package === item.package)
          .sort((a, b) => (pkg?.members.indexOf(a.key) ?? 0) - (pkg?.members.indexOf(b.key) ?? 0)) // as written
      : [];
  const head = pkg ? packageHeader(pkg) : [];
  return [...head, ...sections([item, ...ownLinks])].join("\n").replace(/^\n/, "") + "\n";
}

// A whole package: every item that belongs to it, in its written order.
// A unit's links are written under the unit, as typed.
// Log entries are not content, so they are not included.
export function packageToText(pkg: Package, content: ContentItem[]): string {
  const byKey = new Map(content.map((item) => [item.key, item]));
  const members = pkg.members.map((key) => byKey.get(key)).filter((item): item is ContentItem => !!item && item.package === pkg.key);
  return [...packageHeader(pkg), ...sections(members)].join("\n") + "\n";
}
