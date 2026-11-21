// Reading single cells of the owner's army sheets: costs, sizes, stats, lists.
// Design: design/text-format-and-csv.md §2 (short values: `-` none, `+1` relative, sizes,
// costs as deltas); the owner's Schemae and Glossary (Input_Eg.xlsx; build-log, Part B owner
// decisions 11, 14): `;` general delimiter, `()` detail, `[]` linked rules, `~` a qualifier,
// "pi" = per item; sizes `10-` (10 or more), `-10` (10 or less), `0-1`, and `>=` / `<=`.
//
// Every function here is pure and small. A cell it can't read gives a problem message, never
// an exception, so an import carries on (text-format §1: importing never blocks).

// --- Splitting ----------------------------------------------------------------------------

// Splits on a separator, but only at the top level: not inside (), [] or {}.
// splitTop("A(x;y);B", ";") → ["A(x;y)", "B"]
export function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    if (depth === 0 && text.startsWith(separator, i)) {
      parts.push(current);
      current = "";
      i += separator.length - 1;
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p !== "");
}

// A `;` list cell: "Hand Weapon;Light Armour" → ["Hand Weapon", "Light Armour"].
export function listCell(text: string | undefined): string[] {
  return splitTop(text ?? "", ";");
}

// The text inside the first top-level brackets, and what comes before and after.
// "Lance(add;+4;Only(Mounted))[x]" → { head: "Lance", inner: "add;+4;Only(Mounted)", rest: "[x]" }
export function splitCall(text: string): { head: string; inner: string | null; rest: string } {
  const open = text.indexOf("(");
  if (open < 0) return { head: text.trim(), inner: null, rest: "" };
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    if (text[i] === ")") depth--;
    if (depth === 0) return { head: text.slice(0, open).trim(), inner: text.slice(open + 1, i), rest: text.slice(i + 1).trim() };
  }
  return { head: text.slice(0, open).trim(), inner: text.slice(open + 1), rest: "" };
}

// --- Numbers ------------------------------------------------------------------------------

// A stat cell: "4" absolute, "+1" / "-1" a delta, "-" no such stat, "(+1)" a bonus to a rider,
// "" not given (inherited, or from the race).
export type StatCell =
  | { kind: "absolute"; value: number }
  | { kind: "delta"; value: number }
  | { kind: "none" }
  | { kind: "rider"; value: number }
  | { kind: "blank" };

export function readStat(text: string | undefined): StatCell | { kind: "error"; message: string } {
  const t = (text ?? "").trim();
  if (t === "") return { kind: "blank" };
  if (t === "-" || t === "–") return { kind: "none" };
  const rider = /^\(([+-]\d+)\)$/.exec(t);
  if (rider) return { kind: "rider", value: Number(rider[1]) };
  if (/^[+-]\d+(\.0+)?$/.test(t)) return { kind: "delta", value: Number(t) };
  if (/^\d+(\.0+)?$/.test(t)) return { kind: "absolute", value: Number(t) };
  return { kind: "error", message: "can't read the stat “" + t + "” (a number, +1 / -1, - or (+1))" };
}

// A cost: "21~pi" per model, "+6" a delta, "90" flat, "" none. Owner's Glossary: pi = per item.
export interface Cost {
  amount: number;
  perModel: boolean; // ~pi: for each model (or item) it applies to
}

export function readCost(text: string | undefined): Cost | null | { error: string } {
  const t = (text ?? "").trim();
  if (t === "") return null;
  const m = /^([+-]?\d+(?:\.\d+)?)\s*(~\s*pi)?$/i.exec(t);
  if (!m) return { error: "can't read the cost “" + t + "” (e.g. 21~pi, +6, 90)" };
  return { amount: Number(m[1]), perModel: Boolean(m[2]) };
}

// A size or a count: "10-" (10 or more), "-10" (10 or less), "0-1", "2-12", "1", ">=10", "<=1",
// "1 per (Empire Knights)" (one for each model of that unit).
export interface Range {
  min: number;
  max: number | null; // null = no maximum
  perModelOf: string | null; // "1 per (X)": the range is per model of X
}

export function readRange(text: string | undefined): Range | null | { error: string } {
  const t = (text ?? "").trim().replace(/\s+/g, "");
  if (t === "") return null;
  const per = /^(\d+)per\((.+)\)$/i.exec((text ?? "").trim().replace(/\s+per\s+/i, "per"));
  if (per) return { min: Number(per[1]), max: Number(per[1]), perModelOf: per[2].trim() };
  let m: RegExpExecArray | null;
  if ((m = /^(\d+)$/.exec(t))) return { min: Number(m[1]), max: Number(m[1]), perModelOf: null };
  if ((m = /^(\d+)-$/.exec(t)) || (m = /^(\d+)\+$/.exec(t)) || (m = /^>=(\d+)$/.exec(t))) return { min: Number(m[1]), max: null, perModelOf: null };
  if ((m = /^>(\d+)$/.exec(t))) return { min: Number(m[1]) + 1, max: null, perModelOf: null };
  if ((m = /^-(\d+)$/.exec(t)) || (m = /^<=(\d+)$/.exec(t))) return { min: 0, max: Number(m[1]), perModelOf: null };
  if ((m = /^<(\d+)$/.exec(t))) return { min: 0, max: Number(m[1]) - 1, perModelOf: null };
  if ((m = /^(\d+)-(\d+)$/.exec(t))) return { min: Number(m[1]), max: Number(m[2]), perModelOf: null };
  return { error: "can't read the size “" + (text ?? "").trim() + "” (e.g. 10-, 0-1, 2-12, >=10)" };
}

// A range read back in the book's words: "10+", "0-1", "1".
export function describeRange(range: Range): string {
  if (range.perModelOf) return range.min + " per model of " + range.perModelOf;
  if (range.max === null) return range.min + "+";
  if (range.min === range.max) return String(range.min);
  return range.min + "-" + range.max;
}

export function isError<T>(value: T | { error: string } | { kind: "error"; message: string }): value is { error: string } | { kind: "error"; message: string } {
  return value !== null && typeof value === "object" && ("error" in value || ("kind" in value && (value as { kind: string }).kind === "error"));
}

export function errorText(value: { error: string } | { kind: "error"; message: string }): string {
  return "error" in value ? value.error : value.message;
}

// --- Names ----------------------------------------------------------------------------------

// The key for a name: lower case, words joined by _. "Empire Knights" → "empire_knights".
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// A name as matched: case, spaces and a trailing * (extremely common) ignored.
export function nameKey(text: string): string {
  return text.trim().replace(/\*$/, "").trim().toLowerCase().replace(/\s+/g, " ");
}
