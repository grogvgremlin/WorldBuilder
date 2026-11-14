// The quick text format: valid YAML with short tuples, read into content items.
// Design: design/text-format-and-csv.md §1 (imports never block; problems per line), §2 (YAML
// with positional tuples), §3 (keys: a written key wins; otherwise match the label once; keys
// written back; slice 1: references may be labels too); build/slice-1-brief.md §2.1 (world
// content belongs to a sandbox, rules to library packages; the manifest is content).
// The shapes are proposals, recorded in build/build-log.md and explained in build/yaml-guide.md.
//
// A file is one of three kinds, set by its header (owner decisions of 14 Nov, build log):
//
//   manifest: [WFB 6th edition, wfb6]       a GAME (library): its statline, bag order, core
//   stats: [M, WS, ...]   bag_order: [set, add, multiply, cap, floor]   core: [wfb6_base]
//
//   package: [E1 rules, e1_rules]           a rules PACKAGE: in the library, or local to a
//   sandbox: e1                             sandbox when it names one
//   edition: wfb6   layer: book   requires: [...]   conflicts: [...]
//   scopes:   - scope: [label, key]  query: reaches(...)
//   rules:    - rule: [label, key]  effect: [Ld, +1]  scope: ...  trigger: ...  nature  category
//
//   sandbox: [E1 Nuln, e1]                  a SANDBOX: one world and its log
//   category_order: {origin: [place, organisation, title], stationed: [...]}
//   contexts: - context: [WFB 6th, wfb6]  manifest: wfb6  books: [...]  faqs: [...]
//               house: [...]  campaign: [...]  category_order: {...} (optional)
//   things:   - [Nuln, nuln, [settlement, polity]]          (label, key, kinds)
//   links:    - [nuln, in, wissenland, 2000]                 (from, kind, to, start, end)
//   units:    - unit: [label, key]  raised: 2520  context: wfb6  profile: [...]  links: [...]
//   events:   - event: [label, key]  kind: ...  roles: {...}  period: [start, end]
//   log:      - same as events; appended to the sandbox's log on deploy
//   scopes:   as above (a named scope can live with the world too)

import { isMap, isSeq, LineCounter, parseDocument, type Node as YamlNode, type YAMLMap } from "yaml";
import { CONTEXT_GROUPS, type CategoryRanks, type ContentItem, type EditKind, type EventRecord, type Expression, type ManifestContext, type Problem, type SourceLayer, type StepOrders } from "../schema";
import { conditionRefs, expressionToText, parseExpression } from "./expression-text";
import {
  DEFAULT_STAT_ORDER,
  listOf,
  numberOf,
  rangeOf,
  readEffect,
  readHeader,
  Reader,
  textOf,
  wordsOf,
  type Header,
} from "./text-values";

export { slugify, DEFAULT_STAT_ORDER } from "./text-values";

export type FileKind = "package" | "sandbox" | "manifest";

// One item read from the text, with the line it started on. Its space is filled in later.
export interface ParsedItem {
  line: number | null;
  item: ContentItem;
}

export interface ParsedLogEvent {
  line: number | null;
  event: EventRecord;
}

// A header written without a key: the key is decided later (label matching), then written back.
export interface HeaderNeedingKey {
  itemIndex: number; // index into `items` or `logEvents`
  label: string;
  className: ContentItem["class"];
  range: [number, number];
  restRange: [number, number] | null; // tuple fields after (label, key), kept on write-back
  isLogEvent: boolean;
}

// A place that names another item by key or by label. Matched to a key in import/draft.ts.
export interface RefSite {
  line: number | null;
  kind: "thing" | "scope" | "package" | "manifest";
  written: string;
  where: string; // "link", "scope", "roles", "context" ...
  set(key: string): void;
  range: [number, number] | null; // a plain value: replaced by the key when written back
  condition: ConditionSite | null; // inside a condition: the whole condition is re-rendered
}

export interface ConditionSite {
  range: [number, number];
  render(): string;
}

export interface ParsedText {
  fileKind: FileKind;
  headerLabel: string;
  headerKey: string | null;
  headerRange: [number, number] | null; // header written without a key
  sourceLayer: SourceLayer;
  edition: string | null;
  requires: string[];
  conflicts: string[];
  homeSandbox: string | null; // a package local to a sandbox
  categoryOrder: StepOrders | null; // a sandbox's own category order
  items: ParsedItem[];
  logEvents: ParsedLogEvent[];
  headersNeedingKeys: HeaderNeedingKey[];
  refs: RefSite[];
  problems: Problem[];
}

// The stat order for a profile written as a list, for a unit in a given context.
export type StatOrderFor = (contextKey: string | null, contextsInFile: ManifestContext[]) => string[];

const MANIFEST_SECTIONS = new Set(["manifest", "stats", "bag_order", "core"]);
const PACKAGE_SECTIONS = new Set(["package", "sandbox", "edition", "layer", "requires", "conflicts", "scopes", "rules"]);
const SANDBOX_SECTIONS = new Set(["sandbox", "category_order", "contexts", "things", "links", "units", "events", "log", "scopes"]);
const SECTIONS: Record<FileKind, Set<string>> = { manifest: MANIFEST_SECTIONS, package: PACKAGE_SECTIONS, sandbox: SANDBOX_SECTIONS };

// --- Reading the whole text -------------------------------------------------------------------

export function readText(text: string, fallbackLabel: string, statOrderFor: StatOrderFor = () => DEFAULT_STAT_ORDER): ParsedText {
  const lines = new LineCounter();
  const doc = parseDocument(text, { lineCounter: lines, prettyErrors: false });
  const reader = new Reader(lines);
  const parsed: ParsedText = {
    fileKind: "package",
    headerLabel: fallbackLabel,
    headerKey: null,
    headerRange: null,
    sourceLayer: "book",
    edition: null,
    requires: [],
    conflicts: [],
    homeSandbox: null,
    categoryOrder: null,
    items: [],
    logEvents: [],
    headersNeedingKeys: [],
    refs: [],
    problems: reader.problems,
  };

  for (const error of doc.errors) {
    reader.problems.push({ line: lines.linePos(error.pos[0]).line, severity: "error", message: error.message.split("\n")[0] });
  }
  const root = doc.contents;
  if (!isMap(root)) {
    reader.problem(root as YamlNode, "error", "the text should be a YAML map, starting `manifest:`, `package:` or `sandbox:`");
    return parsed;
  }

  readFileHeader(root, reader, parsed);
  const allowed = SECTIONS[parsed.fileKind];
  if (parsed.fileKind === "manifest") guard(reader, root, () => readManifest(root, reader, parsed));
  if (parsed.fileKind === "sandbox" && root.get("category_order", true)) {
    parsed.categoryOrder = readStepOrders(root.get("category_order", true), reader);
  }

  // Contexts first, so units can find their manifest's stat order.
  const contextsNode = root.get("contexts", true);
  if (contextsNode && parsed.fileKind === "sandbox") listOf(contextsNode).forEach((node) => guard(reader, node, () => readContext(node, reader, parsed)));
  const contextsInFile = parsed.items.map((p) => p.item).filter((i): i is ManifestContext => i.class === "context");

  for (const pair of root.items) {
    const section = textOf(pair.key) ?? "";
    if (!allowed.has(section)) {
      reportMisplaced(section, pair.key as YamlNode, parsed.fileKind, reader);
      continue;
    }
    const items = listOf(pair.value);
    switch (section) {
      case "things":
        items.forEach((node) => guard(reader, node, () => readThing(node, reader, parsed)));
        break;
      case "links":
        items.forEach((node) => guard(reader, node, () => readLink(node, reader, parsed, null, null)));
        break;
      case "units":
        items.forEach((node) => guard(reader, node, () => readUnit(node, reader, parsed, statOrderFor, contextsInFile)));
        break;
      case "scopes":
        items.forEach((node) => guard(reader, node, () => readScope(node, reader, parsed)));
        break;
      case "rules":
        items.forEach((node) => guard(reader, node, () => readRule(node, reader, parsed)));
        break;
      case "events":
        items.forEach((node) => guard(reader, node, () => readEvent(node, reader, parsed, false)));
        break;
      case "log":
        items.forEach((node) => guard(reader, node, () => readEvent(node, reader, parsed, true)));
        break;
      default:
        break; // header fields, read above
    }
  }
  return parsed;
}

function reportMisplaced(section: string, node: YamlNode, fileKind: FileKind, reader: Reader): void {
  if (fileKind === "package" && section === "manifest") {
    reader.problem(node, "error", "a manifest is a file of its own: start it `manifest: [label, key]`, with stats, bag_order and core");
  } else if (fileKind === "manifest" && section === "category_order") {
    reader.problem(node, "error", "the category order belongs to the world: put it in a sandbox file (or a context)");
  } else if (fileKind !== "sandbox" && SANDBOX_SECTIONS.has(section)) {
    reader.problem(node, "error", "“" + section + "” is world content: it belongs in a sandbox file (start it `sandbox: [label, key]`)");
  } else if (fileKind !== "package" && PACKAGE_SECTIONS.has(section)) {
    reader.problem(node, "error", "“" + section + "” belongs in a rules package file (start it `package: [label, key]`), switched on in a context");
  } else if (fileKind !== "manifest" && MANIFEST_SECTIONS.has(section)) {
    reader.problem(node, "error", "“" + section + "” belongs in a manifest file (start it `manifest: [label, key]`)");
  } else {
    reader.problem(node, "warning", "unknown section “" + section + "” ignored");
  }
}

// One bad item never stops the rest of the import.
function guard(reader: Reader, node: unknown, read: () => void): void {
  try {
    read();
  } catch (error) {
    reader.problem(node as YamlNode, "error", (error as Error).message);
  }
}

// manifest: …  -> a game. package: … (with an optional `sandbox: key`) -> a rules package.
// sandbox: … alone -> a sandbox.
function readFileHeader(root: YAMLMap, reader: Reader, parsed: ParsedText): void {
  const packageNode = root.get("package", true);
  const sandboxNode = root.get("sandbox", true);
  const manifestNode = root.get("manifest", true);
  parsed.fileKind = packageNode ? "package" : sandboxNode ? "sandbox" : manifestNode ? "manifest" : "package";
  if (parsed.fileKind === "manifest") {
    // The manifest is the file's one item; its header is read with it (readManifest).
    const header = readHeader(manifestNode, reader, "manifest");
    if (header) {
      parsed.headerLabel = header.label;
      parsed.headerKey = header.key;
    }
    return;
  }
  const headerNode = parsed.fileKind === "sandbox" ? sandboxNode : packageNode;
  if (headerNode) {
    const header = readHeader(headerNode, reader, parsed.fileKind);
    if (header) {
      parsed.headerLabel = header.label;
      parsed.headerKey = header.key;
      if (!header.key) parsed.headerRange = rangeOf(header.node);
    }
  }
  if (parsed.fileKind === "sandbox") return;

  // A package naming a sandbox is local to it (a campaign's own rules).
  if (sandboxNode) {
    parsed.homeSandbox = textOf(sandboxNode);
    if (!parsed.homeSandbox) reader.problem(sandboxNode as YamlNode, "error", "`sandbox:` in a package file is the key of the sandbox it belongs to");
  }

  const layerNode = root.get("layer", true);
  const layer = textOf(layerNode);
  if (layer) {
    if (["book", "faq", "house", "campaign"].includes(layer)) parsed.sourceLayer = layer as SourceLayer;
    else reader.problem(layerNode as YamlNode, "error", "layer should be book, faq, house or campaign");
  }
  parsed.edition = textOf(root.get("edition", true));
  parsed.requires = wordsOf(root.get("requires", true));
  parsed.conflicts = wordsOf(root.get("conflicts", true));
}

// Records an item; if its header had no key, remembers it for matching and writing back.
function addItem(parsed: ParsedText, header: Header, item: ContentItem, line: number | null): void {
  parsed.items.push({ line, item });
  const range = rangeOf(header.node);
  if (!header.key && range) {
    parsed.headersNeedingKeys.push({
      itemIndex: parsed.items.length - 1,
      label: header.label,
      className: item.class,
      range,
      restRange: header.restRange,
      isLogEvent: false,
    });
  }
}

// A plain value naming another item: matched later, written back if it was a label.
function addRef(parsed: ParsedText, reader: Reader, node: unknown, kind: RefSite["kind"], where: string, set: (key: string) => void): void {
  const written = textOf(node);
  if (!written) return;
  parsed.refs.push({ line: reader.lineOf(node as YamlNode), kind, written, where, set, range: rangeOf(node), condition: null });
}

// --- Library package: manifest, scopes, rules ----------------------------------------------------

function readRanks(node: unknown, reader: Reader): CategoryRanks | null {
  if (!isSeq(node)) {
    reader.problem(node as YamlNode, "error", "an order is a list of categories: [place, organisation, title]");
    return null;
  }
  // Each entry is one category, or a list of categories sharing a rank.
  return node.items.map((entry) => (isSeq(entry) ? wordsOf(entry) : [textOf(entry) ?? ""]));
}

function readStepOrders(node: unknown, reader: Reader): StepOrders | null {
  if (!isMap(node)) {
    reader.problem(node as YamlNode, "error", "category_order needs origin and stationed lists");
    return null;
  }
  const origin = readRanks(node.get("origin", true), reader);
  const stationed = readRanks(node.get("stationed", true), reader);
  return origin && stationed ? { origin, stationed } : null;
}

// A manifest file: the game's statline, how it combines numbers, and its core packages.
function readManifest(root: YAMLMap, reader: Reader, parsed: ParsedText): void {
  const header = readHeader(root.get("manifest", true), reader, "manifest");
  if (!header) return;
  const stats = wordsOf(root.get("stats", true));
  const bag = wordsOf(root.get("bag_order", true)) as EditKind[];
  if (stats.length === 0) {
    reader.problem(header.node, "error", "a manifest needs its stats: [M, WS, BS, S, T, W, I, A, Ld]");
    return;
  }
  const kinds: EditKind[] = ["set", "add", "multiply", "cap", "floor"];
  if (bag.length !== kinds.length || !kinds.every((k) => bag.includes(k))) {
    reader.problem(header.node, "error", "bag_order should list set, add, multiply, cap and floor once each");
    return;
  }
  const manifest: ContentItem = { class: "manifest", key: header.key ?? "", label: header.label, space: "", package: null, statOrder: stats, bagOrder: bag, core: [] };
  addItem(parsed, header, manifest, reader.lineOf(header.node));
  listOf(root.get("core", true)).forEach((node, i) => {
    if (manifest.class !== "manifest") return;
    manifest.core.push(textOf(node) ?? "");
    addRef(parsed, reader, node, "package", "core", (key) => (manifest.core[i] = key));
  });
}

// Reads a condition and registers every name in it for matching.
function readCondition(node: unknown, reader: Reader, parsed: ParsedText, what: string): Expression | null {
  const text = textOf(node);
  if (!text) {
    reader.problem(node as YamlNode, "error", what + " is missing");
    return null;
  }
  let expression: Expression;
  try {
    expression = parseExpression(text);
  } catch (error) {
    reader.problem(node as YamlNode, "error", what + ": " + (error as Error).message);
    return null;
  }
  const range = rangeOf(node);
  const site: ConditionSite | null = range ? { range, render: () => expressionToText(expression) } : null;
  for (const ref of conditionRefs(expression)) {
    parsed.refs.push({ line: reader.lineOf(node as YamlNode), kind: ref.kind, written: ref.written, where: what, set: ref.set, range: null, condition: site });
  }
  return expression;
}

function readScope(node: unknown, reader: Reader, parsed: ParsedText): void {
  if (!isMap(node)) {
    reader.problem(node as YamlNode, "error", "a named scope should be a map: scope, query");
    return;
  }
  const header = readHeader(node.get("scope", true), reader, "scope");
  const query = readCondition(node.get("query", true), reader, parsed, "query");
  if (!header || !query) return;
  addItem(parsed, header, { class: "scope", key: header.key ?? "", label: header.label, space: "", package: null, query }, reader.lineOf(node));
}

function readRule(node: unknown, reader: Reader, parsed: ParsedText): void {
  if (!isMap(node)) {
    reader.problem(node as YamlNode, "error", "a rule should be a map: rule, effect, scope, trigger, nature, category");
    return;
  }
  const header = readHeader(node.get("rule", true), reader, "rule");
  const effect = readEffect(node.get("effect", true), reader);
  const scope = readCondition(node.get("scope", true), reader, parsed, "scope");
  const triggerNode = node.get("trigger", true);
  const trigger = triggerNode ? readCondition(triggerNode, reader, parsed, "trigger") : null;
  const nature = textOf(node.get("nature", true));
  const category = textOf(node.get("category", true));
  const layer = textOf(node.get("layer", true)) ?? parsed.sourceLayer;
  if (nature !== "origin" && nature !== "environment") {
    reader.problem(node, "error", "nature should be origin (read as of raising) or environment (read now)");
    return;
  }
  if (!category) reader.problem(node, "warning", "no category: it runs after the known categories");
  if (!header || !effect || !scope || (triggerNode && !trigger)) return;
  addItem(
    parsed,
    header,
    {
      class: "rule",
      key: header.key ?? "",
      label: header.label,
      space: "",
      package: null,
      effect,
      scope,
      trigger,
      nature,
      category: category ?? "other",
      sourceLayer: layer as SourceLayer,
      base: textOf(node.get("base", true)),
      reason: textOf(node.get("reason", true)),
    },
    reader.lineOf(node),
  );
}

// --- Sandbox: contexts, things, links, units, events, log ------------------------------------------

function readContext(node: unknown, reader: Reader, parsed: ParsedText): void {
  if (!isMap(node)) {
    reader.problem(node as YamlNode, "error", "a context should be a map: context, manifest, books, faqs, house, campaign");
    return;
  }
  const header = readHeader(node.get("context", true), reader, "context");
  const manifestNode = node.get("manifest", true);
  const manifest = textOf(manifestNode);
  if (!header) return;
  if (!manifest) {
    reader.problem(node, "error", "context “" + header.label + "” needs a manifest: wfb6");
    return;
  }
  if (node.get("packages", true)) {
    reader.problem(node.get("packages", true) as YamlNode, "error", "list a context's packages as books, faqs, house and campaign (the manifest brings its core)");
  }
  const orderNode = node.get("category_order", true);
  const context: ManifestContext = {
    class: "context",
    key: header.key ?? "",
    label: header.label,
    space: "",
    package: null,
    manifest,
    books: [],
    faqs: [],
    house: [],
    campaign: [],
    categoryOrder: orderNode ? readStepOrders(orderNode, reader) : null,
  };
  addItem(parsed, header, context, reader.lineOf(node));
  addRef(parsed, reader, manifestNode, "manifest", "context manifest", (key) => (context.manifest = key));
  for (const { field } of CONTEXT_GROUPS) {
    listOf(node.get(field, true)).forEach((packageNode, i) => {
      context[field].push(textOf(packageNode) ?? "");
      addRef(parsed, reader, packageNode, "package", "context " + field, (key) => (context[field][i] = key));
    });
  }
}

// Things: [label, key, kinds]. Kinds may be a list or words separated by spaces.
function readThing(node: unknown, reader: Reader, parsed: ParsedText): void {
  const header = readHeader(node, reader, "thing");
  if (!header) return;
  const kindsNode = isSeq(node) ? node.items[2] : undefined;
  const kinds = isSeq(kindsNode) ? wordsOf(kindsNode) : (textOf(kindsNode)?.split(/\s+/).filter(Boolean) ?? []);
  if (kinds.length === 0) reader.problem(node as YamlNode, "warning", "“" + header.label + "” has no kinds");
  addItem(parsed, header, { class: "thing", key: header.key ?? "", label: header.label, space: "", package: null, kinds, attributes: {} }, reader.lineOf(node as YamlNode));
}

// Links: [from, kind, to, start, end]. A unit's own links leave out `from`; their start
// defaults to the raising date. The key is the tuple itself, set once references are matched.
function readLink(node: unknown, reader: Reader, parsed: ParsedText, unitIndex: number | null, defaultStart: number | null): void {
  if (!isSeq(node)) {
    reader.problem(node as YamlNode, "error", "a link should be [from, kind, to, start, end]");
    return;
  }
  const parts = unitIndex !== null ? [null, ...node.items] : node.items;
  const from = unitIndex !== null ? "@unit:" + unitIndex : textOf(parts[0]);
  const kind = textOf(parts[1]);
  const to = textOf(parts[2]);
  const start = parts[3] === undefined ? defaultStart : numberOf(parts[3]);
  const end = parts[4] === undefined ? null : numberOf(parts[4]);
  if (!from || !kind || !to || start === null) {
    reader.problem(node, "error", unitIndex !== null ? "a unit link should be [kind, to, start, end]" : "a link should be [from, kind, to, start, end]");
    return;
  }
  const link: ContentItem = { class: "link", key: "", label: kind.replace(/_/g, " "), space: "", package: null, kind, from, to, start, end };
  parsed.items.push({ line: reader.lineOf(node), item: link });
  if (unitIndex === null) addRef(parsed, reader, parts[0], "thing", "link", (key) => (link.from = key));
  addRef(parsed, reader, parts[2], "thing", "link", (key) => (link.to = key));
}

function readUnit(node: unknown, reader: Reader, parsed: ParsedText, statOrderFor: StatOrderFor, contextsInFile: ManifestContext[]): void {
  if (!isMap(node)) {
    reader.problem(node as YamlNode, "error", "a unit should be a map: unit, raised, profile, links");
    return;
  }
  const header = readHeader(node.get("unit", true), reader, "unit");
  if (!header) return;
  const raised = numberOf(node.get("raised", true));
  if (raised === null) {
    reader.problem(node, "error", "unit “" + header.label + "” needs a raising date: raised: 2520");
    return;
  }
  const context = textOf(node.get("context", true));
  const profile = readProfile(node.get("profile", true), reader, statOrderFor(context, contextsInFile));
  if (!profile) return;
  addItem(parsed, header, { class: "unit", key: header.key ?? "", label: header.label, space: "", package: null, profile, raised, context }, reader.lineOf(node));
  const unitIndex = parsed.items.length - 1;
  for (const linkNode of listOf(node.get("links", true))) {
    guard(reader, linkNode, () => readLink(linkNode, reader, parsed, unitIndex, raised));
  }
}

function readProfile(node: unknown, reader: Reader, statOrder: string[]): Record<string, number> | null {
  const profile: Record<string, number> = {};
  if (isSeq(node)) {
    if (node.items.length > statOrder.length) reader.problem(node, "warning", "profile has more values than stats (" + statOrder.join(" ") + ")");
    node.items.forEach((valueNode, i) => {
      const value = numberOf(valueNode);
      if (value !== null && i < statOrder.length) profile[statOrder[i]] = value;
      else if (textOf(valueNode) !== "-") reader.problem(valueNode as YamlNode, "warning", "can't read profile value “" + textOf(valueNode) + "”");
    });
    return profile;
  }
  if (isMap(node)) {
    for (const pair of node.items) {
      const stat = textOf(pair.key);
      const value = numberOf(pair.value);
      if (stat && value !== null) profile[stat] = value;
      else reader.problem(pair.key as YamlNode, "warning", "can't read profile entry");
    }
    return profile;
  }
  reader.problem(node as YamlNode, "error", "a unit needs a profile: a list in the manifest's stat order, or a map");
  return null;
}

function readEvent(node: unknown, reader: Reader, parsed: ParsedText, toLog: boolean): void {
  if (!isMap(node)) {
    reader.problem(node as YamlNode, "error", "an event should be a map: event, kind, roles, period");
    return;
  }
  const header = readHeader(node.get("event", true), reader, "event");
  const kind = textOf(node.get("kind", true));
  const period = listOf(node.get("period", true));
  const start = numberOf(period[0]);
  const end = period[1] === undefined ? null : numberOf(period[1]);
  if (!header) return;
  if (!kind || start === null) {
    reader.problem(node, "error", "event “" + header.label + "” needs a kind and a period: [start, end]");
    return;
  }
  const record: EventRecord = { key: header.key ?? "", label: header.label, kind, roles: {}, start, end };
  const rolesNode = node.get("roles", true);
  if (isMap(rolesNode)) {
    for (const pair of rolesNode.items) {
      const role = textOf(pair.key);
      const thing = textOf(pair.value);
      if (!role || !thing) continue;
      record.roles[role] = thing;
      addRef(parsed, reader, pair.value, "thing", "roles", (key) => (record.roles[role] = key));
    }
  }
  if (!toLog) {
    // The content item shares `record.roles`, so matching a role's label updates both.
    addItem(parsed, header, { class: "event", ...record, space: "", package: null }, reader.lineOf(node));
    return;
  }
  parsed.logEvents.push({ line: reader.lineOf(node), event: record });
  const range = rangeOf(header.node);
  if (!header.key && range) {
    parsed.headersNeedingKeys.push({
      itemIndex: parsed.logEvents.length - 1,
      label: header.label,
      className: "event",
      range,
      restRange: header.restRange,
      isLogEvent: true,
    });
  }
}
