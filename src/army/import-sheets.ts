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
import { listCell, nameKey, readStat, slug } from "./cells";
import { resolveCard, STATS, type Line } from "./card";
import { describeFit, fitLine } from "./fit";
import { buildArmyLibrary, raceCells } from "./library";
import { parseCsv, sheetFromTable, SHEET_COLUMNS, writeCsv, type Sheet, type SheetRow } from "./sheets";

export interface SheetsOptions {
  manifest: string; // the game it's for ("tow")
  defaultPackage: string; // the package for sheets with no Package column (races, equipment …)
}

interface Built {
  items: { line: number | null; item: ContentItem }[];
  problems: Problem[];
  labels: Map<string, string>; // package key → its name as written ("TOW races")
  books: Map<string, string>; // package key → the book it's from, for an army package
  requires: Map<string, Set<string>>; // package key → the packages it needs
}

// A package's key from its name; a SubPackage "Common" (or none) is the book's own package
// ("Forces of Fantasy": what every army in the book shares). Its army list is keyed
// forces_of_fantasy_common, so the two never share a key.
export function packageKey(book: string, sub: string): string {
  if (!sub || nameKey(sub) === "common") return slug(book);
  return slug(sub);
}

function notePackage(built: Built, key: string, label: string): void {
  if (key && !built.labels.has(key)) built.labels.set(key, label);
}

function addRequires(built: Built, pkg: string, needed: string[]): void {
  const set = built.requires.get(pkg) ?? new Set<string>();
  for (const n of needed) if (n && n !== pkg) set.add(n);
  built.requires.set(pkg, set);
}

// Reads every sheet, then checks every card against everything in reach (the upload and what's
// already deployed). Order within and across files doesn't matter.
export function buildSheetsDraft(
  sheets: Sheet[],
  label: string,
  options: SheetsOptions,
  existing: Existing,
  deps: { newId(): string; now(): string },
): DraftBatch {
  const built: Built = { items: [], problems: [], labels: new Map(), books: new Map(), requires: new Map() };
  for (const sheet of sheets) {
    if (!sheet.kind) {
      built.problems.push({ line: null, severity: "warning", message: sheet.file + ": not a sheet I know (no Unit/Type/Name, Equipment/Match Key, Link Key/Name, Race/Tree/Rank or Rule/Rules 2 headers): skipped" });
      continue;
    }
    for (const col of sheet.unknownColumns) built.problems.push({ line: null, severity: "warning", message: sheet.file + ": column “" + col + "” isn't one I know: ignored" });
  }
  const armyRows = sheets.filter((s) => s.kind === "army entry").flatMap((s) => s.rows.map((r) => ({ sheet: s, row: r })));
  const subPackages = [...new Set(armyRows.map((r) => r.row.cells["SubPackage"]).filter(Boolean))];
  // Sheets with no Package column go to the one army package uploaded, else the default.
  const otherPackage = subPackages.length === 1 ? subPackages[0] : options.defaultPackage;

  readArmyEntry(armyRows, built);
  for (const sheet of sheets) {
    if (sheet.kind === "races") readSimple(sheet, "race", otherPackage, (c) => [c["Race"], c["Tree"] || "Core", c["Rank"] || "Base"].join(" · "), built);
    if (sheet.kind === "equipment") readSimple(sheet, "equipment", otherPackage, (c) => c["Equipment"] ?? "", built);
    if (sheet.kind === "core common links") readSimple(sheet, "common_link", otherPackage, (c) => c["Link Key"] ?? "", built);
    if (sheet.kind === "rules") readSimple(sheet, "special_rule", otherPackage, (c) => c["Rule"] ?? "", built);
  }

  // Resolve across the whole upload and what's deployed: newer items (this upload) win.
  const uploaded = new Set(built.items.map((i) => i.item.class + ":" + i.item.key));
  const deployed = existing.content.filter((i) => i.space === "library" && !uploaded.has(i.class + ":" + i.key));
  const lib = buildArmyLibrary([...deployed, ...(existing.pending ?? []), ...built.items.map((i) => i.item)]);
  const missingRules = new Map<string, Set<string>>(); // package → rule names with no item
  for (const { line, item } of built.items) {
    if (item.class !== "army_card") continue;
    lib.used.clear();
    const resolved = checkCard(lib, item, line, built.problems);
    // What the card drew on is what its package requires (owner, 21 Nov: "like a python script").
    addRequires(built, item.package ?? "", [...lib.used]);
    const missing = missingRules.get(item.package ?? "") ?? new Set<string>();
    for (const r of resolved.missingRules) missing.add(r);
    missingRules.set(item.package ?? "", missing);
  }
  addStubRules(built, missingRules, existing);
  requireBookCommon(built, existing.content);
  addPackages(built, options, existing.content);

  const before = new Map(existing.content.filter((i) => i.space === "library").map((i) => [i.class + ":" + i.key, i]));
  return {
    id: deps.newId(),
    target: { kind: "library" },
    label,
    createdTime: deps.now(),
    sourceText: sheets.map((sh) => "— " + sh.file + " —").join("\n"),
    rewrittenText: sheets.map((sh) => "— " + sh.file + " —").join("\n"),
    files: sheets.filter((sh) => sh.kind).map(sheetAsCsv),
    sheets: { manifest: options.manifest, defaultPackage: options.defaultPackage },
    content: built.items.map(({ line, item }) => ({ line, item, status: statusOf(item, before.get(item.class + ":" + item.key)) })),
    logItems: [],
    problems: built.problems.sort((a, b) => (a.line ?? 0) - (b.line ?? 0)),
  };
}

// A sheet kept as CSV (a workbook's sheets too), so the draft can be rebuilt later.
function sheetAsCsv(sheet: Sheet): { name: string; text: string } {
  const columns = SHEET_COLUMNS[sheet.kind!].filter((c) => sheet.rows.some((r) => (r.cells[c] ?? "") !== ""));
  return { name: sheet.file, text: writeCsv([columns, ...sheet.rows.map((r) => columns.map((c) => r.cells[c] ?? ""))]) };
}

// Rebuilds a sheets draft against what's deployed now (src/import/draft.ts refreshDraft).
export function refreshSheetsDraft(draft: DraftBatch, existing: Existing): DraftBatch {
  const sheets = (draft.files ?? []).map((f) => sheetFromTable(f.name, parseCsv(f.text)));
  const options = draft.sheets ?? { manifest: "", defaultPackage: draft.label };
  const fresh = buildSheetsDraft(sheets, draft.label, options, existing, { newId: () => draft.id, now: () => draft.createdTime });
  return { ...fresh, label: draft.label };
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
    const pkg = packageKey(c["Package"] ?? "", c["SubPackage"] ?? "");
    notePackage(built, pkg, !c["SubPackage"] || nameKey(c["SubPackage"]) === "common" ? (c["Package"] ?? "") : c["SubPackage"]);
    built.books.set(pkg, c["Package"] ?? "");
    addRequires(built, pkg, listCell(c["Requires"]).map(slug));
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
    const item: ArmyCard = { class: "army_card", key: card.pkg + "." + slug(unit), label: unit, space: "library", package: card.pkg || null, rows: card.rows };
    built.items.push({ line: card.line, item });
  }
  for (const [pkg, list] of lists) {
    const label = list.rows[0]["SubPackage"] || "Common";
    const item: ArmyList = { class: "army_list", key: slug(list.book + " " + label), label, space: "library", package: pkg, book: list.book, rows: list.rows };
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
    // A Package column on the row wins over the sheet's package.
    const rowPackage = row.cells["Package"] || pkg;
    const pkgKey = slug(rowPackage);
    notePackage(built, pkgKey, rowPackage);
    addRequires(built, pkgKey, listCell(row.cells["Requires"]).map(slug));
    const key = pkgKey + "." + KEY_PREFIX[cls] + slug(label);
    const base = { key, label, space: "library", package: pkgKey, cells: row.cells };
    let item: RaceCell | EquipmentItem | CommonLink | SpecialRule;
    if (cls === "race") item = { class: "race", ...base };
    else if (cls === "equipment") item = { class: "equipment", ...base };
    else if (cls === "common_link") item = { class: "common_link", ...base };
    else item = { class: "special_rule", ...base };
    built.items.push({ line: row.number, item });
  }
}

// Rules a card names that nothing defines become stubs, in a stubs package of their own: they
// show as "not entered yet" until a real rule of that name comes in, which wins (owner, 21 Nov).
function addStubRules(built: Built, missing: Map<string, Set<string>>, existing: Existing): void {
  const known = new Set(existing.content.filter((i) => i.class === "special_rule" && i.space === "library").map((i) => i.key));
  for (const [pkg, names] of missing) {
    if (!pkg || names.size === 0) continue;
    const stubPkg = pkg + "_stubs";
    notePackage(built, stubPkg, "Stubs: " + (built.labels.get(pkg) ?? pkg));
    addRequires(built, pkg, [stubPkg]);
    for (const name of [...names].sort()) {
      const key = stubPkg + "." + KEY_PREFIX.special_rule + slug(name);
      if (known.has(key)) continue;
      const item: SpecialRule = { class: "special_rule", key, label: name, space: "library", package: stubPkg, cells: { Rule: name, Status: "Stub", Notes: "named by " + (built.labels.get(pkg) ?? pkg) + "; not entered yet" } };
      built.items.push({ line: null, item });
    }
  }
}

// An army package needs its book's common package (the composition rules every army of the
// book shares), when that package is uploaded or already in the library.
function requireBookCommon(built: Built, content: ContentItem[]): void {
  const present = new Set([...built.labels.keys(), ...content.filter((i) => i.class === "package").map((i) => i.key)]);
  for (const [pkg, book] of built.books) {
    const common = packageKey(book, "");
    if (pkg !== common && present.has(common)) addRequires(built, pkg, [common]);
  }
}

// One package item per package written to. A package already in the library (a game's core
// package from YAML, an earlier upload) keeps its name, layer and edition; requires and members
// are added to.
function addPackages(built: Built, options: SheetsOptions, content: ContentItem[]): void {
  const members = new Map<string, string[]>();
  for (const { item } of built.items) {
    if (!item.package) continue;
    members.set(item.package, [...(members.get(item.package) ?? []), item.key]);
  }
  for (const [key, keys] of members) {
    const before = content.find((i): i is Package => i.class === "package" && i.space === "library" && i.key === key);
    const requires = [...(built.requires.get(key) ?? [])].sort();
    const pkg: Package = before
      ? { ...before, requires: unique([...before.requires, ...requires]), members: unique([...before.members, ...keys]) }
      : { class: "package", key, label: built.labels.get(key) ?? key, space: "library", package: key, sourceLayer: "book", edition: options.manifest || null, requires, conflicts: [], members: keys };
    built.items.unshift({ line: null, item: pkg });
  }
}

function unique(list: string[]): string[] {
  return [...new Set(list)];
}

// --- Checking a card -------------------------------------------------------------------------

function checkCard(lib: ReturnType<typeof buildArmyLibrary>, card: ArmyCard, line: number | null, problems: Problem[]): ReturnType<typeof resolveCard> {
  const resolved = resolveCard(lib, card);
  const used = new Set(lib.used); // what the card itself drew on (the fit below looks wider)
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
  lib.used.clear();
  for (const u of used) lib.used.add(u);
  return resolved;
}
