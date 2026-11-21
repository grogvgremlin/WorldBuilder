// Army sheets → a draft: cards, army lists, races, equipment, common links, rule texts.
// Design: design/text-format-and-csv.md §1 (imports land in the draft; importing never blocks),
// §3 (names matched once; keys written back, never typed), §7 (CSV: one sheet per class),
// §8 (the import review: new / edit / unchanged, problems per line, missing references as
// stubs); build-log Part B owner decisions 5–12 (the owner's format; read everything first,
// resolve across the whole upload, then report; plural alias; stubs; fit on import; Unit is the
// card, Name a row in it).
//
// Pure: the files in, a draft out. The draft is saved and deployed by src/import/draft.ts.

import type { ArmyCard, ArmyList, Cells, CommonLink, ContentItem, DraftBatch, EquipmentItem, Package, Problem, RaceCell, SpecialRule } from "../schema";
import type { Existing } from "../import/draft";
import { nameKey, readStat, slug } from "./cells";
import { resolveCard, STATS, type Line } from "./card";
import { describeFit, fitLine } from "./fit";
import { buildArmyLibrary, raceCells } from "./library";
import type { Sheet, SheetRow } from "./sheets";

export interface SheetsOptions {
  manifest: string; // the game it's for ("tow")
  defaultPackage: string; // the package for sheets with no Package column (races, equipment …)
}

interface Built {
  items: { line: number | null; item: ContentItem }[];
  problems: Problem[];
}

// Reads every sheet, then checks every card against everything in reach (the upload and what's
// already deployed). Order within and across files doesn't matter.
export function buildSheetsDraft(
  sheets: Sheet[],
  files: { name: string; text: string }[],
  label: string,
  options: SheetsOptions,
  existing: Existing,
  deps: { newId(): string; now(): string },
): DraftBatch {
  const built: Built = { items: [], problems: [] };
  for (const sheet of sheets) {
    if (!sheet.kind) {
      built.problems.push({ line: null, severity: "warning", message: sheet.file + ": not a sheet I know (no Unit/Type/Name, Equipment/Match Key, Link Key/Name, Race/Tree/Rank or Rule/Rules 2 headers): skipped" });
      continue;
    }
    for (const col of sheet.unknownColumns) built.problems.push({ line: null, severity: "warning", message: sheet.file + ": column “" + col + "” isn't one I know: ignored" });
  }
  const armyRows = sheets.filter((s) => s.kind === "army entry").flatMap((s) => s.rows.map((r) => ({ sheet: s, row: r })));
  const subPackages = [...new Set(armyRows.map((r) => r.row.cells["SubPackage"]).filter(Boolean))];
  const otherPackage = subPackages.length === 1 ? subPackages[0] : options.defaultPackage;

  readArmyEntry(armyRows, built);
  for (const sheet of sheets) {
    if (sheet.kind === "races") readSimple(sheet, "race", otherPackage, (c) => [c["Race"], c["Tree"] || "Core", c["Rank"] || "Base"].join(" · "), built);
    if (sheet.kind === "equipment") readSimple(sheet, "equipment", otherPackage, (c) => c["Equipment"] ?? "", built);
    if (sheet.kind === "core common links") readSimple(sheet, "common_link", otherPackage, (c) => c["Link Key"] ?? "", built);
    if (sheet.kind === "rules") readSimple(sheet, "special_rule", otherPackage, (c) => c["Rule"] ?? "", built);
  }
  addPackages(built, options, armyRows.length > 0 ? armyRows[0].row.cells["Package"] ?? "" : "");

  // Resolve across the whole upload and what's deployed: newer items (this upload) win.
  const uploaded = new Set(built.items.map((i) => i.item.class + ":" + i.item.key));
  const deployed = existing.content.filter((i) => i.space === "library" && !uploaded.has(i.class + ":" + i.key));
  const lib = buildArmyLibrary([...deployed, ...(existing.pending ?? []), ...built.items.map((i) => i.item)]);
  for (const { line, item } of built.items) if (item.class === "army_card") checkCard(lib, item, line, built.problems);

  const before = new Map(existing.content.filter((i) => i.space === "library").map((i) => [i.class + ":" + i.key, i]));
  return {
    id: deps.newId(),
    target: { kind: "library" },
    label,
    createdTime: deps.now(),
    sourceText: files.map((f) => "— " + f.name + " —").join("\n"),
    rewrittenText: files.map((f) => "— " + f.name + " —").join("\n"),
    files,
    content: built.items.map(({ line, item }) => ({ line, item, status: statusOf(item, before.get(item.class + ":" + item.key)) })),
    logItems: [],
    problems: built.problems.sort((a, b) => (a.line ?? 0) - (b.line ?? 0)),
  };
}

function statusOf(item: ContentItem, before: ContentItem | undefined): "new" | "edit" | "unchanged" {
  if (!before) return "new";
  return JSON.stringify(before) === JSON.stringify(item) ? "unchanged" : "edit";
}

// --- Army Entry ----------------------------------------------------------------------------------

// Cards: every row with the same Unit belongs to one card; its first "Unit" row is the card's
// own. Composition rows (no Unit, Rule Type or Type "Composition") make each SubPackage's list.
function readArmyEntry(rows: { sheet: Sheet; row: SheetRow }[], built: Built): void {
  const cards = new Map<string, { line: number; rows: Cells[]; pkg: string; book: string }>();
  const lists = new Map<string, { line: number; rows: Cells[]; book: string }>();
  for (const { sheet, row } of rows) {
    const c = row.cells;
    const where = sheet.file + " row " + row.number;
    const isComposition = /^composition$/i.test(c["Rule Type"] ?? "") || /^composition$/i.test(c["Type"] ?? "");
    const pkg = c["SubPackage"] ?? "";
    if (isComposition) {
      const list = lists.get(pkg) ?? { line: row.number, rows: [], book: c["Package"] ?? "" };
      list.rows.push(c);
      lists.set(pkg, list);
      continue;
    }
    const unit = (c["Unit"] ?? "").trim();
    if (!unit) {
      built.problems.push({ line: row.number, severity: "error", message: where + ": no Unit (the card it belongs to): skipped" });
      continue;
    }
    if (!c["Reference"]) built.problems.push({ line: row.number, severity: "warning", message: where + " (" + unit + "): no Reference (book;page)" });
    const card = cards.get(nameKey(unit));
    if (!card) {
      if (!/^unit$/i.test(c["Type"] ?? "")) built.problems.push({ line: row.number, severity: "warning", message: where + ": the first row of “" + unit + "” is a " + (c["Type"] || "row with no Type") + ", not its Unit row" });
      cards.set(nameKey(unit), { line: row.number, rows: [c], pkg, book: c["Package"] ?? "" });
    } else {
      if (/^unit$/i.test(c["Type"] ?? "")) built.problems.push({ line: row.number, severity: "warning", message: where + ": a second Unit row for “" + unit + "”: read as a row within the card (one card per army entry)" });
      card.rows.push(c);
    }
  }
  for (const [, card] of cards) {
    const unit = card.rows[0]["Unit"]!;
    const item: ArmyCard = { class: "army_card", key: slug(card.pkg) + "." + slug(unit), label: unit, space: "library", package: slug(card.pkg) || null, rows: card.rows };
    built.items.push({ line: card.line, item });
  }
  for (const [pkg, list] of lists) {
    const label = pkg || "Common";
    const item: ArmyList = { class: "army_list", key: slug(list.book + " " + label), label, space: "library", package: slug(pkg) || slug(list.book + " common"), book: list.book, rows: list.rows };
    built.items.push({ line: list.line, item });
  }
}

// --- The other sheets: one item per row --------------------------------------------------------

const KEY_PREFIX = { race: "race.", equipment: "kit.", common_link: "link.", special_rule: "rule." } as const;

function readSimple(
  sheet: Sheet,
  cls: "race" | "equipment" | "common_link" | "special_rule",
  pkg: string,
  labelOf: (c: Cells) => string,
  built: Built,
): void {
  for (const row of sheet.rows) {
    const label = labelOf(row.cells).trim();
    if (!label || label === " ·  · ") {
      built.problems.push({ line: row.number, severity: "error", message: sheet.file + " row " + row.number + ": no name: skipped" });
      continue;
    }
    // Cards keep the plain key (package.unit); other kinds carry a prefix, so a weapon and the
    // card it's named after (Helblaster Volley Gun) never share a key.
    const key = slug(pkg) + "." + KEY_PREFIX[cls] + slug(label);
    const base = { key, label, space: "library", package: slug(pkg), cells: row.cells };
    let item: RaceCell | EquipmentItem | CommonLink | SpecialRule;
    if (cls === "race") item = { class: "race", ...base };
    else if (cls === "equipment") item = { class: "equipment", ...base };
    else if (cls === "common_link") item = { class: "common_link", ...base };
    else item = { class: "special_rule", ...base };
    built.items.push({ line: row.number, item });
  }
}

function addPackages(built: Built, options: SheetsOptions, book: string): void {
  const members = new Map<string, string[]>();
  for (const { item } of built.items) {
    if (!item.package) continue;
    members.set(item.package, [...(members.get(item.package) ?? []), item.key]);
  }
  for (const [key, keys] of members) {
    const label = built.items.find((i) => i.item.package === key && i.item.class === "army_list")?.item.label ?? labelFor(built, key) ?? key;
    const pkg: Package = { class: "package", key, label, space: "library", package: key, sourceLayer: "book", edition: options.manifest, requires: [], conflicts: [], members: keys };
    built.items.unshift({ line: null, item: pkg });
  }
  void book;
}

function labelFor(built: Built, key: string): string | null {
  for (const { item } of built.items) {
    if (item.class === "army_card" && item.package === key) return item.rows[0]["SubPackage"] ?? null;
  }
  return null;
}

// --- Checking a card -------------------------------------------------------------------------

function checkCard(lib: ReturnType<typeof buildArmyLibrary>, card: ArmyCard, line: number | null, problems: Problem[]): void {
  const resolved = resolveCard(lib, card);
  for (const w of resolved.warnings) problems.push({ line, severity: "warning", message: card.label + ": " + w });
  if (resolved.stubs.length > 0)
    problems.push({ line, severity: "warning", message: card.label + ": not entered yet (stubs, incomplete): " + resolved.stubs.join(", ") });
  // Fit on import: a card with a full printed line and no race gets a suggestion.
  const own = card.rows[0];
  // An engine (several "-" stats: a war machine, a chariot) has no race on purpose.
  const hasStats = STATS.every((s) => (own[s] ?? "") !== "") && STATS.filter((s) => own[s] === "-").length <= 1;
  if (!own["Race"] && !own["Link Key"] && hasStats) {
    const printed: Partial<Line> = {};
    for (const s of STATS) {
      const v = readStat(own[s]);
      if (v.kind === "absolute") printed[s] = v.value;
      if (v.kind === "none") printed[s] = "-";
    }
    const races = [...new Set(lib.races.map((r) => r.cells["Race"] ?? ""))];
    const fits = fitLine(races.flatMap((r) => raceCells(lib, r)), printed);
    if (fits.length > 0) problems.push({ line, severity: "warning", message: card.label + ": no race given. Closest: " + fits.map(describeFit).join("; ") });
  }
}
