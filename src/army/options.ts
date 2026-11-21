// Reading the owner's expression cells: Equipment Options, Rules Options, Slots and Unit Limit.
// Design: design/options-items-and-rules.md §1 (option groups: pick limit, budget, members;
// option cards: cost as a delta, replaces, nested rules); design/army-lists.md §1–3 (entry and
// composition rules); the owner's Schemae (Input_Eg.xlsx) and decisions 13–16 (build-log,
// Part B): `[A OR B;Mandatory]`, `add` / `replace~X`, `~pi`, budgets `0-25 total`, `[ ]` linked
// rules after an option, `+X` adds to inherited options, the same name replaces, `None` removes
// all, `-X` removes one; limits `what~range~per`.
//
// Pure. A part it can't read becomes a problem string beside what it could read.

import { errorText, isError, listCell, readCost, readRange, splitCall, splitTop, type Cost, type Range } from "./cells";

// --- Options -------------------------------------------------------------------------------

export interface OptionEntry {
  name: string; // "Great Weapons", "Barded Warhorse", "Magic Items", "The Witch"
  isMount: boolean; // written Name~Mount
  replaces: string[]; // replace~Shield, replace~Crossbow|Handgun
  cost: Cost | null; // +1~pi, +16, 0~pi, 30
  count: Range | null; // 0-1 inside the brackets: how many may be taken
  budget: Range | null; // "0-25 total": points that may be spent through it
  conditions: string[]; // Only(...) as written: "Only(Mounted)"
  grants: string[]; // [Troop Type(Heavy Cavalry);Counter Charge] after the option
  additive: boolean; // written with a leading +: added to inherited options
  raw: string;
}

export interface OptionGroup {
  label: string; // the members' names joined: "Great Weapons or Lances or Great Weapons"
  members: OptionEntry[];
  pick: "one" | "any"; // [A OR B]: one of; a single option: take it or not
  mandatory: boolean; // must take one
  raw: string;
}

export interface OptionsCell {
  groups: OptionGroup[];
  removeAll: boolean; // "None": drop every inherited option
  removals: string[]; // "-X": drop that inherited option
  problems: string[];
}

export function readOptions(text: string | undefined): OptionsCell {
  const cell: OptionsCell = { groups: [], removeAll: false, removals: [], problems: [] };
  for (const part of splitTop(text ?? "", ";")) {
    if (/^none$/i.test(part)) {
      cell.removeAll = true;
    } else if (part.startsWith("-") && !/^-\d/.test(part)) {
      cell.removals.push(part.slice(1).replace(/~Mount$/i, "").trim());
    } else if (part.startsWith("[") || part.startsWith("([")) {
      cell.groups.push(readGroup(part, cell.problems));
    } else if (/^mandatory$/i.test(part)) {
      // A trailing Mandatory belongs to the group before it ("[A OR B];Mandatory").
      const last = cell.groups[cell.groups.length - 1];
      if (last) last.mandatory = true;
      else cell.problems.push("“Mandatory” with no group before it");
    } else {
      const entry = readEntry(part, cell.problems);
      cell.groups.push({ label: entry.name, members: [entry], pick: "one", mandatory: false, raw: part });
    }
  }
  return cell;
}

// "[A OR B OR C;Mandatory]" (also "([ … ;Mandatory)" as the owner first wrote it, and "," for OR).
function readGroup(text: string, problems: string[]): OptionGroup {
  let inner = text.trim();
  if (inner.startsWith("(") && inner.endsWith(")")) inner = inner.slice(1, -1).trim();
  if (inner.startsWith("[")) inner = inner.slice(1);
  if (inner.endsWith("]")) inner = inner.slice(0, -1);
  let mandatory = false;
  const parts = splitTop(inner, ";");
  const memberText: string[] = [];
  for (const part of parts) {
    if (/^mandatory$/i.test(part)) mandatory = true;
    else memberText.push(part);
  }
  const joined = memberText.join(";");
  let members = splitTop(joined, " OR ");
  if (members.length === 1) members = splitTop(joined, ",");
  const entries = members.map((m) => readEntry(m, problems));
  return { label: entries.map((e) => e.name).join(" or "), members: entries, pick: "one", mandatory, raw: text };
}

// "Lance(add;+4;Only(Mounted))", "Barded Warhorse~Mount(add;+16)[Troop Type(Heavy Cavalry)]",
// "+Magic Standard (replace~Standard;0-50 total;0-1)", "Wizard(4)(replace~Wizard(3);30)".
export function readEntry(text: string, problems: string[]): OptionEntry {
  let t = text.trim();
  const additive = t.startsWith("+");
  if (additive) t = t.slice(1).trim();
  let { head, inner, rest } = splitCall(t);
  // A name with its own brackets ("Wizard(4)") followed by the arguments.
  if (rest.startsWith("(")) {
    const second = splitCall(rest);
    head = head + "(" + (inner ?? "") + ")";
    inner = second.inner;
    rest = second.rest;
  }
  const isMount = /~mount$/i.test(head);
  const name = head.replace(/~mount$/i, "").trim();
  const entry: OptionEntry = { name, isMount, replaces: [], cost: null, count: null, budget: null, conditions: [], grants: [], additive, raw: text };
  for (const arg of splitTop(inner ?? "", ";")) readArgument(arg, entry, problems);
  if (rest.startsWith("[") && rest.endsWith("]")) entry.grants = listCell(rest.slice(1, -1));
  else if (rest !== "") problems.push("“" + text + "”: can't read “" + rest + "” after the option");
  return entry;
}

function readArgument(arg: string, entry: OptionEntry, problems: string[]): void {
  const a = arg.trim();
  if (a === "" || /^add$/i.test(a) || /^upgrade$/i.test(a)) return;
  if (/^replace~/i.test(a)) {
    entry.replaces.push(...a.slice("replace~".length).split("|").map((x) => x.trim()));
    return;
  }
  if (/^only\(/i.test(a) || /^maybe\(/i.test(a)) {
    entry.conditions.push(a);
    return;
  }
  if (/total$/i.test(a)) {
    const range = readRange(a.replace(/total$/i, "").trim());
    if (range && !isError(range)) entry.budget = range;
    else problems.push("“" + entry.raw + "”: can't read the budget “" + a + "”");
    return;
  }
  const cost = readCost(a);
  if (cost && !isError(cost)) {
    entry.cost = cost;
    return;
  }
  const range = readRange(a);
  if (range && !isError(range)) {
    entry.count = range;
    return;
  }
  problems.push("“" + entry.raw + "”: can't read “" + a + "”");
}

// --- Slots ---------------------------------------------------------------------------------

export interface SlotRef {
  link: string; // C, SB, M, BSB, Crew, Steed
  fromRows: boolean; // X(slots): look at this card's row with Link Key X
  count: Range | null;
  type: string | null; // upgrade, crew, steed
  cost: Cost | null;
  raw: string;
}

export interface SlotsCell {
  slots: SlotRef[];
  none: boolean; // "None": no slots (overrides inherited)
  problems: string[];
}

export function readSlots(text: string | undefined): SlotsCell {
  const cell: SlotsCell = { slots: [], none: false, problems: [] };
  for (const part of splitTop(text ?? "", ";")) {
    if (/^none$/i.test(part)) {
      cell.none = true;
      continue;
    }
    const { head, inner } = splitCall(part);
    const ref: SlotRef = { link: head, fromRows: false, count: null, type: null, cost: null, raw: part };
    const args = splitTop(inner ?? "", ";");
    if (args.length === 1 && /^slots$/i.test(args[0])) ref.fromRows = true;
    else {
      const [count, type, cost] = args;
      const range = readRange(count);
      if (range && !isError(range)) ref.count = range;
      else if (count) cell.problems.push("slot “" + part + "”: can't read the count “" + count + "”");
      ref.type = type?.trim() || null;
      const c = readCost(cost);
      if (c && !isError(c)) ref.cost = c;
      else if (c && isError(c)) cell.problems.push("slot “" + part + "”: " + errorText(c));
    }
    cell.slots.push(ref);
  }
  return cell;
}

// --- Limits --------------------------------------------------------------------------------

export interface Limit {
  what: string; // "unit", "rules options", "Drilled", "SB(Magic Standard)", "points", "unit(A,B)"
  units: string[]; // for unit(A,B): the entries counted together
  range: Range; // 0-1, 0-3, 25%- (as a range of percent when percent is true)
  percent: boolean;
  perPoints: number | null; // 1000 → "per 1,000 points"
  basis: string; // "roster target", "army"
  raw: string;
}

export interface LimitsCell {
  limits: Limit[];
  none: boolean;
  problems: string[];
}

// "unit~0-1~1000 roster target", "points~-50%~roster target", "unit(Great Cannon,Mortar)~0-3~1000 roster target",
// "rules options~0-1~1000 roster target;SB(Magic Standard)~0-1~1000 roster target", "unit~0-1~army".
export function readLimits(text: string | undefined): LimitsCell {
  const cell: LimitsCell = { limits: [], none: false, problems: [] };
  for (const part of splitTop(text ?? "", ";")) {
    if (/^none$/i.test(part)) {
      cell.none = true;
      continue;
    }
    const pieces = splitTop(part, "~");
    if (pieces.length < 2) {
      cell.problems.push("limit “" + part + "”: expected what~limit~per");
      continue;
    }
    const [what, amount, per = "army"] = pieces;
    const percent = amount.includes("%");
    const range = readRange(amount.replace(/%/g, ""));
    if (!range || isError(range)) {
      cell.problems.push("limit “" + part + "”: can't read “" + amount + "”");
      continue;
    }
    const perMatch = /^(\d+)\s*(.*)$/.exec(per.trim());
    const call = splitCall(what);
    const units = call.head.toLowerCase() === "unit" && call.inner ? call.inner.split(",").map((u) => u.trim()) : [];
    cell.limits.push({
      what: what.trim(),
      units,
      range,
      percent,
      perPoints: perMatch ? Number(perMatch[1]) : null,
      basis: (perMatch ? perMatch[2] : per).trim() || "army",
      raw: part,
    });
  }
  return cell;
}
