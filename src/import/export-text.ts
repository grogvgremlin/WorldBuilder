// Writing content back out as text, in one canonical form that re-imports exactly.
// Design: design/text-format-and-csv.md §1 ("one canonical form on export"), §6 (export and
// round trip: keys included, so an export re-imports exactly; only changed entries show as
// edits); build/slice-1-brief.md §2.1 (a library package file, or a sandbox file). The shape
// is the text format in build/yaml-guide.md.

import {
  CONTEXT_GROUPS,
  type CategoryRanks,
  type ContentItem,
  type EventRecord,
  type Link,
  type Manifest,
  type ManifestContext,
  type NamedScope,
  type NumberEdit,
  type Package,
  type Rule,
  type Sandbox,
  type Thing,
  type Unit,
  type WorldEvent,
  type StepOrders,
} from "../schema";
import { expressionToText } from "./expression-text";

export type Container = Package | Sandbox;

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

// A profile as a list in the manifest's stat order when it has exactly those stats, else a map.
function unitBlock(unit: Unit, ownLinks: Link[], statOrder: string[] | null): string[] {
  const stats = Object.keys(unit.profile);
  const isFullList = statOrder !== null && stats.length === statOrder.length && statOrder.every((stat) => stat in unit.profile);
  const profile = isFullList
    ? "[" + statOrder.map((stat) => unit.profile[stat]).join(", ") + "]"
    : "{" + stats.map((stat) => stat + ": " + unit.profile[stat]).join(", ") + "}";
  const lines = ["  - unit: " + header(unit.label, unit.key), "    raised: " + unit.raised];
  if (unit.context) lines.push("    context: " + yamlText(unit.context));
  lines.push("    profile: " + profile);
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

// --- Containers ------------------------------------------------------------------------------

function ranksText(ranks: CategoryRanks): string {
  return "[" + ranks.map((rank) => (rank.length === 1 ? rank[0] : "[" + rank.join(", ") + "]")).join(", ") + "]";
}

function keyList(keys: string[]): string {
  return "[" + keys.map(yamlText).join(", ") + "]";
}

// "category_order:" with its two steps, indented under `indent`.
function categoryOrderLines(order: StepOrders, indent: string): string[] {
  return [indent + "category_order:", indent + "  origin: " + ranksText(order.origin), indent + "  stationed: " + ranksText(order.stationed)];
}

// A manifest is a file of its own.
function manifestFile(manifest: Manifest): string[] {
  return [
    "manifest: " + header(manifest.label, manifest.key),
    "stats: [" + manifest.statOrder.join(", ") + "]",
    "bag_order: [" + manifest.bagOrder.join(", ") + "]",
    "core: " + keyList(manifest.core),
  ];
}

function contextBlock(context: ManifestContext): string[] {
  const lines = ["  - context: " + header(context.label, context.key), "    manifest: " + yamlText(context.manifest)];
  for (const { field } of CONTEXT_GROUPS) if (context[field].length) lines.push("    " + field + ": " + keyList(context[field]));
  if (context.categoryOrder) lines.push(...categoryOrderLines(context.categoryOrder, "    "));
  return lines;
}

function containerHeader(container: Container): string[] {
  if (container.class === "sandbox") {
    const lines = ["sandbox: " + header(container.label, container.key)];
    if (container.categoryOrder) lines.push(...categoryOrderLines(container.categoryOrder, ""));
    return lines;
  }
  const lines = ["package: " + header(container.label, container.key)];
  if (container.space !== "library") lines.push("sandbox: " + yamlText(container.space)); // local to a sandbox
  if (container.edition) lines.push("edition: " + yamlText(container.edition));
  lines.push("layer: " + container.sourceLayer);
  if (container.requires.length) lines.push("requires: [" + container.requires.map(yamlText).join(", ") + "]");
  if (container.conflicts.length) lines.push("conflicts: [" + container.conflicts.map(yamlText).join(", ") + "]");
  return lines;
}

// --- Sections ---------------------------------------------------------------------------------

type SectionName = "contexts" | "things" | "links" | "units" | "scopes" | "rules" | "events";

function sectionOf(item: ContentItem): SectionName | null {
  switch (item.class) {
    case "context":
      return "contexts";
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
      return null; // a manifest is a file of its own; packages and sandboxes are the header
  }
}

// The stat order for a unit: its context's manifest, looked up in all content.
function statOrderFinder(content: ContentItem[]) {
  return (unit: Unit): string[] | null => {
    const contexts = content.filter((i): i is ManifestContext => i.class === "context" && i.space === unit.space);
    const context = contexts.find((c) => c.key === unit.context) ?? contexts[0];
    const manifest = content.find((i): i is Manifest => i.class === "manifest" && i.key === context?.manifest);
    return manifest?.statOrder ?? null;
  };
}

// Sections in the order their first item appears; items in the order given, so a re-import
// keeps the written order. A unit's own links are written under it. A manifest goes first.
function sections(items: ContentItem[], content: ContentItem[]): string[] {
  const units = new Map(items.filter((i): i is Unit => i.class === "unit").map((u) => [u.key, u]));
  const linksOfUnit = (key: string) => items.filter((i): i is Link => i.class === "link" && i.from === key);
  const isUnitLink = (item: ContentItem) => item.class === "link" && units.has(item.from);
  const statOrderOf = statOrderFinder(content.length ? content : items);

  const lines: string[] = [];

  const order: SectionName[] = [];
  const blocks = new Map<SectionName, string[][]>();
  for (const item of items) {
    const name = sectionOf(item);
    if (name === null || isUnitLink(item)) continue;
    if (!blocks.has(name)) {
      order.push(name);
      blocks.set(name, []);
    }
    blocks.get(name)!.push(blockFor(item, linksOfUnit, statOrderOf));
  }
  for (const name of order) {
    lines.push("", name + ":");
    blocks.get(name)!.forEach((block, i) => {
      if (i > 0 && block.length > 1) lines.push(""); // a blank line between multi-line blocks
      lines.push(...block);
    });
  }
  return lines;
}

function blockFor(item: ContentItem, linksOfUnit: (key: string) => Link[], statOrderOf: (unit: Unit) => string[] | null): string[] {
  switch (item.class) {
    case "context":
      return contextBlock(item);
    case "thing":
      return [thingLine(item)];
    case "link":
      return [linkLine(item)];
    case "unit":
      return unitBlock(item, linksOfUnit(item.key), statOrderOf(item));
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

// --- Whole files -------------------------------------------------------------------------------

// The members of a package or sandbox that still belong to it, in written order.
function membersOf(container: Container, content: ContentItem[]): ContentItem[] {
  const inSpace = new Map(content.filter((i) => i.space === container.space).map((i) => [i.key, i]));
  return container.members.map((key) => inSpace.get(key)).filter((item): item is ContentItem => !!item && item.package === container.key);
}

// One rule as a file that re-imports into its own package without changing anything else.
export function ruleToText(rule: Rule, pkg: Package | undefined): string {
  return itemToText(rule, pkg, []);
}

// Any one item as a file that re-imports into its own package or sandbox without changing
// anything else. A unit comes with its own links; a package or sandbox gives the whole of it.
export function itemToText(item: ContentItem, container: Container | undefined, content: ContentItem[]): string {
  if (item.class === "package" || item.class === "sandbox") return containerToText(item, content);
  if (item.class === "manifest") return manifestFile(item).join("\n") + "\n";
  const members = container ? membersOf(container, content) : [];
  const ownLinks =
    item.class === "unit"
      ? members.filter((other): other is Link => other.class === "link" && other.from === item.key) // in written order
      : [];
  const head = container ? containerHeader(container) : [];
  return [...head, ...sections([item, ...ownLinks], content)].join("\n").replace(/^\n/, "") + "\n";
}

// A whole package or sandbox: every item that belongs to it, in its written order.
// Log entries are not content, so they are not included.
export function containerToText(container: Container, content: ContentItem[]): string {
  return [...containerHeader(container), ...sections(membersOf(container, content), content)].join("\n") + "\n";
}

export function packageToText(pkg: Package, content: ContentItem[]): string {
  return containerToText(pkg, content);
}
