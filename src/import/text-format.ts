// The quick text format for slice 0: valid YAML with short tuples, read into content items.
// Design: design/text-format-and-csv.md §1 (principles: imports never block, problems per line,
// keys never regenerated), §2 (YAML with positional tuples; profile in manifest stat order;
// number edits `[S, +1]`, `[WS, =3, statline]`; a set must state its target point),
// §3 (a written key wins; otherwise match the label once, else a new key; keys written back).
// World things, links, events, named scopes and scope + trigger rules have no text shape in the
// design yet: the shape below is the slice-0 proposal, recorded in build/build-log.md.
//
// A file is one package:
//
//   package: [E1 Handgunners, e1]        (label, key)
//   layer: book                          source layer of its rules (default book)
//   things:   - [Nuln, nuln, [settlement, polity]]          (label, key, kinds)
//   links:    - [nuln, in, wissenland, 2000]                 (from, kind, to, start, end)
//   units:    - unit: [Nuln Handgunners, nuln_handgunners]
//               raised: 2520
//               profile: [3, 3, 3, 3, 3, 1, 3, 1, 7]          (M WS BS S T W I A Ld)
//               links: - [raised_at, nuln]                    (kind, to, start, end)
//   scopes:   - scope: [commissioned by the treasury, ...]
//               query: reaches(wissenland_treasury, serves > paid_by)
//   rules:    - rule: [Nuln civic pride, nuln_civic_pride]
//               effect: [Ld, +1]                              (stat, edit, target point)
//               scope: reaches(nuln, raised_at > in*)
//               trigger: in_force(...)                        (optional)
//               nature: origin | environment
//               category: place
//   events:   - event: [label, key]  kind: ...  roles: {...}  period: [start, end]
//   log:      - same as events; appended to the log as event entries on deploy

import { isMap, isScalar, isSeq, LineCounter, parseDocument, type Node as YamlNode, type YAMLMap } from "yaml";
import type { ContentItem, EventRecord, Expression, NumberEdit, Problem, SourceLayer } from "../schema";
import { parseExpression } from "./expression-text";

// The manifest stat order for profiles written as a list (WFB).
export const STAT_ORDER = ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"];

// One item read from the text, with the line it started on.
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
  itemIndex: number; // index into `items`, or -1 for the package header
  label: string;
  className: ContentItem["class"];
  range: [number, number]; // character range of the header value in the text
  restRange: [number, number] | null; // tuple fields after (label, key), kept on write-back
  isLogEvent: boolean;
}

export interface ParsedText {
  packageLabel: string;
  packageKey: string | null;
  sourceLayer: SourceLayer;
  items: ParsedItem[];
  logEvents: ParsedLogEvent[];
  headersNeedingKeys: HeaderNeedingKey[];
  packageHeaderRange: [number, number] | null;
  problems: Problem[];
}

// --- Small helpers --------------------------------------------------------------------

export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "item"
  );
}

class Reader {
  problems: Problem[] = [];
  constructor(private lines: LineCounter) {}

  lineOf(node: YamlNode | null | undefined): number | null {
    if (!node?.range) return null;
    return this.lines.linePos(node.range[0]).line;
  }

  problem(node: YamlNode | null | undefined, severity: Problem["severity"], message: string): void {
    this.problems.push({ line: this.lineOf(node), severity, message });
  }
}

// A scalar's value as text, or null.
function textOf(node: unknown): string | null {
  if (isScalar(node) && node.value !== null && node.value !== undefined) return String(node.value);
  return null;
}

function numberOf(node: unknown): number | null {
  if (isScalar(node) && typeof node.value === "number") return node.value;
  const text = textOf(node);
  if (text !== null && text.trim() !== "" && !Number.isNaN(Number(text))) return Number(text);
  return null;
}

// The items of a flow or block list, or [] if the node isn't a list.
function listOf(node: unknown): unknown[] {
  return isSeq(node) ? node.items : [];
}

// --- The header tuple: (label, key) ---------------------------------------------------------

interface Header {
  label: string;
  key: string | null;
  node: YamlNode;
  // In a tuple, the character range of the fields after (label, key), kept when writing back.
  restRange: [number, number] | null;
}

function readHeader(node: unknown, reader: Reader, what: string): Header | null {
  if (isScalar(node) && textOf(node)) return { label: textOf(node)!, key: null, node, restRange: null };
  if (isSeq(node)) {
    const label = textOf(node.items[0]);
    const key = textOf(node.items[1]);
    const rest = node.items.slice(2) as YamlNode[];
    const restRange: [number, number] | null =
      rest.length > 0 && rest[0].range && rest[rest.length - 1].range
        ? [rest[0].range[0], rest[rest.length - 1].range![1]]
        : null;
    if (label) return { label, key: key ?? null, node, restRange };
  }
  reader.problem(node as YamlNode, "error", what + " needs a label: [label, key]");
  return null;
}

// --- Number edits: (stat, kind and value, target point) -----------------------------------------

const TARGET_POINT_WORDS: Record<string, NumberEdit["targetPoint"]> = {
  statline: "statline",
  inline: "inline",
  "in-line": "inline",
  end: "end",
};

// Reads `[Ld, +1]`, `[Ld, =8, inline]`, `[M, x0.5]`, `[WS, at most 2]`.
export function readEffect(node: unknown, reader: Reader): NumberEdit | null {
  if (!isSeq(node) || node.items.length < 2) {
    reader.problem(node as YamlNode, "error", "effect should be [stat, edit] or [stat, edit, target point]");
    return null;
  }
  const stat = textOf(node.items[0]);
  const editNode = node.items[1];
  const pointText = textOf(node.items[2])?.replace(/^@/, "") ?? null;
  if (!stat) {
    reader.problem(node, "error", "effect needs a stat");
    return null;
  }
  const edit = readEditWords(editNode);
  if (!edit) {
    reader.problem(node, "error", "can't read the edit “" + textOf(editNode) + "”");
    return null;
  }
  let targetPoint: NumberEdit["targetPoint"];
  if (pointText !== null) {
    if (!(pointText in TARGET_POINT_WORDS)) {
      reader.problem(node, "error", "unknown target point “" + pointText + "” (statline, inline or end)");
      return null;
    }
    targetPoint = TARGET_POINT_WORDS[pointText];
  } else if (edit.kind === "set") {
    reader.problem(node, "error", "set needs a target point: statline, inline or end");
    return null;
  } else {
    targetPoint = edit.kind === "cap" || edit.kind === "floor" ? "end" : "inline";
  }
  return { stat, kind: edit.kind, value: edit.value, targetPoint };
}

function readEditWords(node: unknown): { kind: NumberEdit["kind"]; value: number } | null {
  // A bare number is an add: `2` is read as `+2` (text-format §2).
  if (isScalar(node) && typeof node.value === "number") return { kind: "add", value: node.value };
  const text = textOf(node)?.trim().replace(/−/g, "-");
  if (!text) return null;
  const patterns: [RegExp, NumberEdit["kind"]][] = [
    [/^=\s*(-?[\d.]+)$/, "set"],
    [/^([+-][\d.]+)$/, "add"],
    [/^[x×*]\s*([\d.]+)$/, "multiply"],
    [/^at most\s+(-?[\d.]+)$/, "cap"],
    [/^at least\s+(-?[\d.]+)$/, "floor"],
  ];
  for (const [pattern, kind] of patterns) {
    const match = pattern.exec(text);
    if (match) return { kind, value: Number(match[1]) };
  }
  return null;
}

// --- Reading the whole text -------------------------------------------------------------------

export function readText(text: string, fallbackLabel: string): ParsedText {
  const lines = new LineCounter();
  const doc = parseDocument(text, { lineCounter: lines, prettyErrors: false });
  const reader = new Reader(lines);
  const parsed: ParsedText = {
    packageLabel: fallbackLabel,
    packageKey: null,
    sourceLayer: "book",
    items: [],
    logEvents: [],
    headersNeedingKeys: [],
    packageHeaderRange: null,
    problems: reader.problems,
  };

  for (const error of doc.errors) {
    reader.problems.push({ line: lines.linePos(error.pos[0]).line, severity: "error", message: error.message.split("\n")[0] });
  }
  const root = doc.contents;
  if (!isMap(root)) {
    reader.problem(root as YamlNode, "error", "the text should be a YAML map: package, things, links, units, scopes, rules, events, log");
    return parsed;
  }

  readPackageHeader(root, reader, parsed);
  for (const pair of root.items) {
    const section = textOf(pair.key);
    const items = listOf(pair.value);
    switch (section) {
      case "package":
      case "layer":
        break;
      case "things":
        items.forEach((node) => guard(reader, node, () => readThing(node, reader, parsed)));
        break;
      case "links":
        items.forEach((node) => guard(reader, node, () => readLink(node, reader, parsed)));
        break;
      case "units":
        items.forEach((node) => guard(reader, node, () => readUnit(node, reader, parsed)));
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
        reader.problem(pair.key as YamlNode, "warning", "unknown section “" + section + "” ignored");
    }
  }
  return parsed;
}

// One bad item never stops the rest of the import.
function guard(reader: Reader, node: unknown, read: () => void): void {
  try {
    read();
  } catch (error) {
    reader.problem(node as YamlNode, "error", (error as Error).message);
  }
}

function readPackageHeader(root: YAMLMap, reader: Reader, parsed: ParsedText): void {
  const headerNode = root.get("package", true);
  if (headerNode) {
    const header = readHeader(headerNode, reader, "package");
    if (header) {
      parsed.packageLabel = header.label;
      parsed.packageKey = header.key;
      if (!header.key && header.node.range) parsed.packageHeaderRange = [header.node.range[0], header.node.range[1]];
    }
  }
  const layer = textOf(root.get("layer", true));
  if (layer) {
    if (["book", "faq", "house", "campaign"].includes(layer)) parsed.sourceLayer = layer as SourceLayer;
    else reader.problem(root.get("layer", true) as YamlNode, "error", "layer should be book, faq, house or campaign");
  }
}

// Records an item; if its header had no key, remembers it for matching and writing back.
function addItem(parsed: ParsedText, header: Header, item: ContentItem, line: number | null): void {
  parsed.items.push({ line, item });
  if (!header.key && header.node.range) {
    parsed.headersNeedingKeys.push({
      itemIndex: parsed.items.length - 1,
      label: header.label,
      className: item.class,
      range: [header.node.range[0], header.node.range[1]],
      restRange: header.restRange,
      isLogEvent: false,
    });
  }
}

// Things: [label, key, kinds]. Kinds may be a list or words separated by spaces.
function readThing(node: unknown, reader: Reader, parsed: ParsedText): void {
  const header = readHeader(node, reader, "thing");
  if (!header) return;
  const kindsNode = isSeq(node) ? node.items[2] : undefined;
  const kinds = isSeq(kindsNode)
    ? kindsNode.items.map(textOf).filter((k): k is string => !!k)
    : (textOf(kindsNode)?.split(/\s+/).filter(Boolean) ?? []);
  if (kinds.length === 0) reader.problem(node as YamlNode, "warning", "“" + header.label + "” has no kinds");
  addItem(
    parsed,
    header,
    { class: "thing", key: header.key ?? "", label: header.label, package: null, kinds, attributes: {} },
    reader.lineOf(node as YamlNode),
  );
}

// Links: [from, kind, to, start, end]. The key is the tuple itself.
function readLink(node: unknown, reader: Reader, parsed: ParsedText, fromOverride?: string, defaultStart?: number): void {
  if (!isSeq(node)) {
    reader.problem(node as YamlNode, "error", "a link should be [from, kind, to, start, end]");
    return;
  }
  const parts = fromOverride ? [fromOverride, ...node.items] : node.items;
  const from = typeof parts[0] === "string" ? parts[0] : textOf(parts[0]);
  const kind = textOf(parts[1]);
  const to = textOf(parts[2]);
  const start = parts[3] === undefined ? (defaultStart ?? null) : numberOf(parts[3]);
  const end = parts[4] === undefined ? null : numberOf(parts[4]);
  if (!from || !kind || !to || start === null) {
    reader.problem(node, "error", fromOverride ? "a unit link should be [kind, to, start, end]" : "a link should be [from, kind, to, start, end]");
    return;
  }
  parsed.items.push({
    line: reader.lineOf(node),
    item: { class: "link", key: [from, kind, to, start].join("~"), label: kind.replace(/_/g, " "), package: null, kind, from, to, start, end },
  });
}

function readUnit(node: unknown, reader: Reader, parsed: ParsedText): void {
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
  const profile = readProfile(node.get("profile", true), reader);
  if (!profile) return;
  addItem(parsed, header, { class: "unit", key: header.key ?? "", label: header.label, package: null, profile, raised }, reader.lineOf(node));
  // The unit's own links start at its raising date unless they say otherwise.
  const unitIndex = parsed.items.length - 1;
  for (const linkNode of listOf(node.get("links", true))) {
    guard(reader, linkNode, () => readLink(linkNode, reader, parsed, "@unit:" + unitIndex, raised));
  }
}

function readProfile(node: unknown, reader: Reader): Record<string, number> | null {
  const profile: Record<string, number> = {};
  if (isSeq(node)) {
    if (node.items.length > STAT_ORDER.length) reader.problem(node, "warning", "profile has more values than stats (" + STAT_ORDER.join(" ") + ")");
    node.items.forEach((valueNode, i) => {
      const value = numberOf(valueNode);
      if (value !== null && i < STAT_ORDER.length) profile[STAT_ORDER[i]] = value;
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
  reader.problem(node as YamlNode, "error", "a unit needs a profile: [M, WS, BS, S, T, W, I, A, Ld] or a map");
  return null;
}

function readCondition(node: unknown, reader: Reader, what: string): Expression | null {
  const text = textOf(node);
  if (!text) {
    reader.problem(node as YamlNode, "error", what + " is missing");
    return null;
  }
  try {
    return parseExpression(text);
  } catch (error) {
    reader.problem(node as YamlNode, "error", what + ": " + (error as Error).message);
    return null;
  }
}

function readScope(node: unknown, reader: Reader, parsed: ParsedText): void {
  if (!isMap(node)) {
    reader.problem(node as YamlNode, "error", "a named scope should be a map: scope, query");
    return;
  }
  const header = readHeader(node.get("scope", true), reader, "scope");
  const query = readCondition(node.get("query", true), reader, "query");
  if (!header || !query) return;
  addItem(parsed, header, { class: "scope", key: header.key ?? "", label: header.label, package: null, query }, reader.lineOf(node));
}

function readRule(node: unknown, reader: Reader, parsed: ParsedText): void {
  if (!isMap(node)) {
    reader.problem(node as YamlNode, "error", "a rule should be a map: rule, effect, scope, trigger, nature, category");
    return;
  }
  const header = readHeader(node.get("rule", true), reader, "rule");
  const effect = readEffect(node.get("effect", true), reader);
  const scope = readCondition(node.get("scope", true), reader, "scope");
  const triggerNode = node.get("trigger", true);
  const trigger = triggerNode ? readCondition(triggerNode, reader, "trigger") : null;
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
  const roles: Record<string, string> = {};
  const rolesNode = node.get("roles", true);
  if (isMap(rolesNode)) {
    for (const pair of rolesNode.items) {
      const role = textOf(pair.key);
      const thing = textOf(pair.value);
      if (role && thing) roles[role] = thing;
    }
  }
  if (!header) return;
  if (!kind || start === null) {
    reader.problem(node, "error", "event “" + header.label + "” needs a kind and a period: [start, end]");
    return;
  }
  const record: EventRecord = { key: header.key ?? "", label: header.label, kind, roles, start, end };
  if (toLog) {
    parsed.logEvents.push({ line: reader.lineOf(node), event: record });
    if (!header.key && header.node.range) {
      parsed.headersNeedingKeys.push({
        itemIndex: parsed.logEvents.length - 1,
        label: header.label,
        className: "event",
        range: [header.node.range[0], header.node.range[1]],
        restRange: header.restRange,
        isLogEvent: true,
      });
    }
    return;
  }
  addItem(parsed, header, { class: "event", ...record, package: null }, reader.lineOf(node));
}
