// Reading the owner's army sheets from CSV, a workbook (.xlsx), YAML or JSON into rows of cells.
// Design: design/text-format-and-csv.md §7 (one CSV per class; the header names columns by field
// label; unknown columns reported and ignored); build-log Part B owner decisions 5–6 (the
// owner's spreadsheet is the format; bulk as CSVs, a workbook, or the same content as YAML or
// JSON with the CSV's column names).
//
// Pure apart from nothing: every function takes text or bytes and returns rows.

import { parse as parseYaml } from "yaml";
import type { Cells } from "../schema";
import { readXlsx } from "./xlsx";

export type SheetKind = "army entry" | "equipment" | "core common links" | "races" | "rules";

// The columns each sheet has, by their canonical names (the owner's headers).
export const SHEET_COLUMNS: Record<SheetKind, string[]> = {
  "army entry": [
    "Package", "SubPackage", "Rule Type", "Unit", "Key", "Type", "Link Key", "Name", "Tier",
    "M", "WS", "BS", "S", "T", "W", "I", "A", "Ld", "Cost", "Equipment", "Min/Max", "Troop Type", "Base Size",
    "Slots", "Equipment Options", "Reference", "Unit Limit", "Rules", "Rules Options", "Status", "Race", "Rank", "Tree", "Save", "Requires", "Notes",
  ],
  equipment: ["Equipment", "Match Key", "M", "WS", "BS", "S", "T", "W", "I", "A", "Ld", "Save", "Rules", "Alias", "Rules 2", "Type", "R", "AP", "Cost", "Reference", "Package", "Requires", "Notes"],
  "core common links": ["Link Key", "Name", "Equipment", "Alias", "Reference", "Package", "Requires", "Notes"],
  races: ["Race", "Tree", "Rank", "M", "WS", "BS", "S", "T", "W", "I", "A", "Ld", "Rules", "Reference", "Package", "Requires", "Notes"],
  rules: ["Rule", "Rules", "Rules 2", "Reference", "Status", "Package", "Requires", "Notes"],
};

export interface SheetRow {
  number: number; // the row number as the user sees it (the header is row 1)
  cells: Cells;
}

export interface Sheet {
  file: string; // the file it came from ("army-entry.csv", "Input.xlsx › Races")
  kind: SheetKind | null; // null = not recognised
  rows: SheetRow[];
  unknownColumns: string[];
}

export interface InputFile {
  name: string;
  text?: string; // CSV, YAML or JSON
  bytes?: Uint8Array; // .xlsx
}

// --- Matching headers --------------------------------------------------------------------------

function squash(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9/]+/g, "");
}

// A header cell matched to a column name: case, spaces and underscores ignored.
function canonicalColumn(kind: SheetKind, header: string): string | null {
  const s = squash(header);
  return SHEET_COLUMNS[kind].find((c) => squash(c) === s) ?? null;
}

// Which sheet a header row is: the sheet whose identifying columns are all there.
const IDENTIFYING: Record<SheetKind, string[]> = {
  "army entry": ["Unit", "Type", "Name"],
  equipment: ["Equipment", "Match Key"],
  "core common links": ["Link Key", "Name"],
  races: ["Race", "Tree", "Rank"],
  rules: ["Rule", "Rules 2"],
};

export function sheetKindOf(headers: string[], fileName = ""): SheetKind | null {
  const have = new Set(headers.map(squash));
  for (const kind of Object.keys(IDENTIFYING) as SheetKind[]) {
    if (IDENTIFYING[kind].every((c) => have.has(squash(c)))) {
      if (kind === "core common links" && have.has(squash("Unit"))) continue;
      return kind;
    }
  }
  const byName = (Object.keys(SHEET_COLUMNS) as SheetKind[]).find((k) => squash(fileName).includes(squash(k)));
  return byName ?? null;
}

// A table (header row first) as a sheet of rows keyed by column name.
export function sheetFromTable(file: string, table: string[][]): Sheet {
  const [header = [], ...body] = table;
  const kind = sheetKindOf(header, file);
  const columns = header.map((h) => (kind ? canonicalColumn(kind, h) : h.trim()));
  const unknownColumns = header.filter((h, i) => h.trim() !== "" && columns[i] === null);
  const rows: SheetRow[] = [];
  body.forEach((values, i) => {
    const cells: Cells = {};
    values.forEach((v, j) => {
      const column = columns[j];
      if (column && v.trim() !== "") cells[column] = v.trim();
    });
    if (Object.keys(cells).length > 0) rows.push({ number: i + 2, cells });
  });
  return { file, kind, rows, unknownColumns };
}

// --- CSV -------------------------------------------------------------------------------------------

// RFC 4180 CSV: fields in double quotes may hold commas, line breaks and doubled quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Writes rows as CSV, quoting a field only when it needs it.
export function writeCsv(table: string[][]): string {
  const quote = (v: string) => (/[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
  return table.map((r) => r.map(quote).join(",")).join("\n") + "\n";
}

// --- YAML / JSON (the same columns: build-log Part B, "the same card in YAML") -------------------

// Field names in YAML / JSON are the column names in any case ("equipment options", "Min/Max").
// A card is one block with its rows nested under `rows`; `stats` may hold M … Ld as a map.
// The document is either a list of cards (Army Entry), or a map of sheet name → list.
export function sheetsFromYaml(file: string, text: string): Sheet[] | { error: string } {
  let doc: unknown;
  try {
    doc = file.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseYaml(text);
  } catch (e) {
    return { error: file + ": " + (e as Error).message };
  }
  const sheets: Sheet[] = [];
  if (Array.isArray(doc)) sheets.push(sheetFromObjects(file, "army entry", doc));
  else if (doc && typeof doc === "object") {
    for (const [name, list] of Object.entries(doc as Record<string, unknown>)) {
      const kind = (Object.keys(SHEET_COLUMNS) as SheetKind[]).find((k) => squash(k) === squash(name)) ?? null;
      if (!Array.isArray(list)) continue;
      if (!kind) sheets.push({ file: file + " › " + name, kind: null, rows: [], unknownColumns: [] });
      else sheets.push(sheetFromObjects(file + " › " + name, kind, list));
    }
  } else return { error: file + ": expected a list of cards, or a map of sheets" };
  return sheets;
}

function sheetFromObjects(file: string, kind: SheetKind, list: unknown[]): Sheet {
  const rows: SheetRow[] = [];
  const unknown = new Set<string>();
  let number = 0;
  const add = (obj: Record<string, unknown>, inherit: Cells) => {
    number++;
    const cells: Cells = { ...inherit };
    for (const [k, v] of Object.entries(obj)) {
      if (k === "rows") continue;
      if (k === "stats" && v && typeof v === "object") {
        for (const [s, sv] of Object.entries(v as Record<string, unknown>)) cells[s] = String(sv);
        continue;
      }
      const column = canonicalColumn(kind, k);
      if (column) cells[column] = String(v ?? "").trim();
      else unknown.add(k);
    }
    rows.push({ number, cells });
    return cells;
  };
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const card = add(item as Record<string, unknown>, {});
    const nested = (item as Record<string, unknown>).rows;
    // Rows within a card carry the card's Package, SubPackage, Rule Type and Unit.
    const inherit: Cells = {};
    for (const c of ["Package", "SubPackage", "Rule Type", "Unit"]) if (card[c]) inherit[c] = card[c];
    if (Array.isArray(nested)) for (const r of nested) if (r && typeof r === "object") add(r as Record<string, unknown>, inherit);
  }
  return { file, kind, rows, unknownColumns: [...unknown] };
}

// The YAML form of Army Entry rows: one block per card, its other rows nested (for export).
export function cardsToYamlObjects(rows: Cells[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  let current: Record<string, unknown> | null = null;
  for (const cells of rows) {
    const obj: Record<string, unknown> = {};
    const stats: Record<string, string> = {};
    for (const [k, v] of Object.entries(cells)) {
      if (["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"].includes(k)) stats[k] = v;
      else obj[k.toLowerCase()] = v;
    }
    if (Object.keys(stats).length > 0) obj.stats = stats;
    const startsCard = current === null || cells["Unit"] !== (current["unit"] as string) || (cells["Rule Type"] ?? "").toLowerCase() === "composition";
    if (startsCard) {
      current = obj;
      out.push(current);
    } else {
      for (const c of ["package", "subpackage", "rule type", "unit"]) delete obj[c];
      const card = current as Record<string, unknown>;
      if (!Array.isArray(card.rows)) card.rows = [];
      (card.rows as Record<string, unknown>[]).push(obj);
    }
  }
  return out;
}

// --- Any file ----------------------------------------------------------------------------------

export async function readInputFile(file: InputFile): Promise<Sheet[] | { error: string }> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    if (!file.bytes) return { error: file.name + ": no data" };
    try {
      const workbook = await readXlsx(file.bytes);
      return workbook.map((s) => sheetFromTable(file.name + " › " + s.name, s.rows));
    } catch (e) {
      return { error: file.name + ": can't read the workbook (" + (e as Error).message + ")" };
    }
  }
  const text = file.text ?? (file.bytes ? new TextDecoder().decode(file.bytes) : "");
  if (lower.endsWith(".yaml") || lower.endsWith(".yml") || lower.endsWith(".json")) return sheetsFromYaml(file.name, text);
  return [sheetFromTable(file.name, parseCsv(text))];
}
