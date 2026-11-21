// Rosters and army content as text: a roster in YAML, an army package back out as its sheets
// (CSV) or their YAML form. Design: build/slice-1-brief.md §3.1 ("rosters export and import as
// text, like everything else"); design/text-format-and-csv.md §1 (keys written back; names
// matched), §6 (one canonical form on export, so an export re-imports unchanged); build-log
// Part B owner decision 6 (bulk as CSVs or the same content as YAML / JSON).
//
// Pure: content in, text out (and back).

import { parse as parseYaml, stringify } from "yaml";
import type { Cells, ContentItem, Problem, Roster, RosterUnit } from "../schema";
import { PRACTICE } from "../schema";
import { nameKey, slug } from "./cells";
import { cardsToYamlObjects, SHEET_COLUMNS, writeCsv, type SheetKind } from "./sheets";

// --- Rosters -----------------------------------------------------------------------------------

// A roster as YAML, in the app's usual shape: [name, key] headers on one line. Units name their
// card by its title and key, so it re-imports exactly and still reads plainly.
export function writeRosterText(roster: Roster, content: ContentItem[]): string {
  const cards = new Map(content.filter((i) => i.class === "army_card").map((c) => [c.key, c.label]));
  const list = content.find((i) => i.class === "army_list" && i.key === roster.armyList);
  const lines = [
    "roster: " + pair(roster.label, roster.key),
    "army_list: " + pair(list?.label ?? roster.armyList, roster.armyList),
    "target: " + roster.target,
  ];
  if (roster.registration) lines.push("registered: {sandbox: " + scalar(roster.registration.sandbox) + ", context: " + scalar(roster.registration.context) + "}");
  lines.push("units:");
  for (const u of roster.units) {
    lines.push("  - unit: " + pair(cards.get(u.card) ?? u.card, u.card));
    lines.push("    id: " + scalar(u.id));
    lines.push("    size: " + u.size);
    if (u.options.length > 0) lines.push("    options: [" + u.options.map(scalar).join(", ") + "]");
    if (u.slots.length > 0) lines.push("    slots: [" + u.slots.map(scalar).join(", ") + "]");
    if (u.general) lines.push("    general: true");
  }
  return lines.join("\n") + "\n";
}

function pair(name: string, key: string): string {
  return "[" + scalar(name) + ", " + scalar(key) + "]";
}

// A plain word stays plain; anything YAML could misread (commas, colons, quotes) is quoted.
function scalar(text: string): string {
  return /^[A-Za-z][A-Za-z0-9 _.'’()&-]*$/.test(text) && !/ #|: /.test(text) ? text : JSON.stringify(text);
}

// A roster from YAML. A name ("State Missile Troops") or a [name, key] pair is matched like a header.
export function readRosterText(text: string, content: ContentItem[]): { roster: Roster | null; problems: Problem[] } {
  const problems: Problem[] = [];
  let doc: Record<string, unknown>;
  try {
    doc = parseYaml(text) as Record<string, unknown>;
  } catch (e) {
    return { roster: null, problems: [{ line: null, severity: "error", message: (e as Error).message }] };
  }
  const [label, key] = header(doc.roster);
  if (!label) return { roster: null, problems: [{ line: null, severity: "error", message: "no roster: [name] at the top" }] };
  const lists = content.filter((i) => i.class === "army_list");
  const [listName, listKey] = header(doc.army_list);
  const list = lists.find((l) => l.key === listKey) ?? lists.find((l) => nameKey(l.label) === nameKey(listName ?? ""));
  if (!list) problems.push({ line: null, severity: "error", message: "no army list “" + (listName ?? "") + "”" });
  const cards = content.filter((i) => i.class === "army_card" && (!list || i.package === list.package));
  const units: RosterUnit[] = [];
  const rawUnits = Array.isArray(doc.units) ? doc.units : [];
  rawUnits.forEach((raw: Record<string, unknown>, i: number) => {
    const [name, cardKey] = header(raw.unit);
    const card = cards.find((c) => c.key === cardKey) ?? cards.find((c) => nameKey(c.label) === nameKey(name ?? ""));
    if (!card) {
      problems.push({ line: null, severity: "error", message: "unit " + (i + 1) + ": no entry “" + (name ?? "") + "” in " + (list?.label ?? "the army list") });
      return;
    }
    units.push({
      id: String(raw.id ?? "u" + (i + 1)),
      card: card.key,
      size: Number(raw.size ?? 1),
      options: (raw.options as string[] | undefined)?.map(String) ?? [],
      slots: (raw.slots as string[] | undefined)?.map(String) ?? [],
      general: raw.general === true,
    });
  });
  const reg = doc.registered as { sandbox?: string; context?: string } | undefined;
  const registration = reg?.sandbox && reg.context ? { sandbox: reg.sandbox, context: reg.context } : null;
  const roster: Roster = {
    class: "roster",
    key: key ?? slug(label),
    label,
    space: registration ? registration.sandbox : PRACTICE,
    package: registration ? registration.sandbox : null,
    armyList: list?.key ?? listKey ?? slug(listName ?? ""),
    target: Number(doc.target ?? 0),
    units,
    registration,
  };
  return { roster, problems };
}

// "name" or [name, key] → [name, key].
function header(value: unknown): [string | null, string | null] {
  if (Array.isArray(value)) return [value[0] != null ? String(value[0]) : null, value[1] != null ? String(value[1]) : null];
  if (value == null) return [null, null];
  return [String(value), null];
}

// --- Army content back out as its sheets -----------------------------------------------------------

const SHEET_OF: Partial<Record<ContentItem["class"], SheetKind>> = {
  army_card: "army entry",
  army_list: "army entry",
  race: "races",
  equipment: "equipment",
  common_link: "core common links",
  special_rule: "rules",
};

// The rows of one sheet for a package, in stored order: composition rows first, then each card.
function sheetRows(items: ContentItem[], kind: SheetKind): Cells[] {
  const rows: Cells[] = [];
  for (const item of items) {
    if (SHEET_OF[item.class] !== kind) continue;
    if (item.class === "army_list" || item.class === "army_card") rows.push(...item.rows);
    else if ("cells" in item) rows.push(item.cells);
  }
  if (kind === "army entry") rows.sort((a, b) => Number(!/composition/i.test(a["Rule Type"] ?? "")) - Number(!/composition/i.test(b["Rule Type"] ?? "")));
  return rows;
}

// One CSV per sheet, columns in the sheet's own order (only the columns used).
export function exportPackageCsv(content: ContentItem[], packageKey: string): Record<string, string> {
  const items = content.filter((i) => i.package === packageKey);
  const out: Record<string, string> = {};
  for (const kind of Object.keys(SHEET_COLUMNS) as SheetKind[]) {
    const rows = sheetRows(items, kind);
    if (rows.length === 0) continue;
    const columns = SHEET_COLUMNS[kind].filter((c) => rows.some((r) => (r[c] ?? "") !== ""));
    out[kind.replace(/ /g, "-") + ".csv"] = writeCsv([columns, ...rows.map((r) => columns.map((c) => r[c] ?? ""))]);
  }
  return out;
}

// The same content as YAML: a map of sheet name → list; Army Entry as one block per card.
export function exportPackageYaml(content: ContentItem[], packageKey: string): string {
  const items = content.filter((i) => i.package === packageKey);
  const doc: Record<string, unknown> = {};
  for (const kind of Object.keys(SHEET_COLUMNS) as SheetKind[]) {
    const rows = sheetRows(items, kind);
    if (rows.length === 0) continue;
    doc[kind] = kind === "army entry" ? cardsToYamlObjects(rows) : rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v])));
  }
  return stringify(doc);
}
