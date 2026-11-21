// A roster worked out: points per unit and per category, and the issues it has.
// Design: design/rosters.md §1–3 (a roster stores choices; size; picks), §5 (the target is an
// input set up front); design/army-lists.md §3 (composition: percentages are of the target);
// design/validation-and-fixes.md §1–2 (building never blocks; issues with severities: illegal,
// warning, notice); build-log Part B owner decision 15 (limits: what~range~per; per 1,000 of the
// roster target; an army rule wins over a unit's own).
//
// Pure: a roster and the army content in, a view out. Nothing is stored.

import type { ArmyList, ContentItem, Roster, RosterUnit } from "../schema";
import { nameKey, splitCall, splitTop } from "./cells";
import { optionId, resolveCard, type CardOption, type ResolvedCard, type ResolvedRow } from "./card";
import { buildArmyLibrary, type ArmyLibrary } from "./library";
import { readLimits, type Limit, type OptionEntry } from "./options";

export interface Issue {
  severity: "illegal" | "warning" | "notice";
  message: string;
  unit: string | null; // the roster unit's id, or null for the whole roster
}

export interface RosterUnitView {
  unit: RosterUnit;
  card: ResolvedCard | null;
  points: number;
  breakdown: string[]; // "10 × 7 = 70", "Handguns: 10 × 1 = 10", "Sergeant +5"
  lines: ResolvedRow[]; // the rows the unit fields: the model, a champion taken, its mount
}

export interface CategoryTotal {
  category: string;
  points: number;
  limit: string; // "at least 25%" (250 of 1,000)
  ok: boolean;
}

export interface RosterView {
  roster: Roster;
  list: ArmyList | null;
  units: RosterUnitView[];
  total: number;
  categories: CategoryTotal[];
  issues: Issue[];
}

export function viewRoster(roster: Roster, content: ContentItem[]): RosterView {
  const lib = buildArmyLibrary(content);
  const list = lib.lists.get(roster.armyList) ?? null;
  const units = roster.units.map((u) => viewUnit(lib, u));
  const issues: Issue[] = [];
  for (const u of units) issues.push(...unitIssues(u));
  const total = units.reduce((sum, u) => sum + u.points, 0);
  if (total > roster.target) issues.push({ severity: "illegal", message: "over the points limit: " + total + " of " + roster.target, unit: null });

  const rows = compositionRows(lib, list);
  const categories = categoryTotals(units, rows, roster.target, issues);
  armyLimits(units, rows, roster.target, issues);
  cardLimits(units, rows, roster.target, issues);
  return { roster, list, units, total, categories, issues };
}

// --- One unit ------------------------------------------------------------------------------------

function viewUnit(lib: ArmyLibrary, unit: RosterUnit): RosterUnitView {
  const card0 = lib.cardsByKey.get(unit.card);
  if (!card0) return { unit, card: null, points: 0, breakdown: ["no card " + unit.card], lines: [] };
  const card = resolveCard(lib, card0);
  const breakdown: string[] = [];
  let points = 0;
  if (card.cost) {
    const amount = card.cost.perModel ? card.cost.amount * unit.size : card.cost.amount;
    breakdown.push(card.cost.perModel ? unit.size + " × " + card.cost.amount + " = " + amount : card.unit + " " + amount);
    points += amount;
  }
  for (const slotName of unit.slots) {
    const slot = card.slots.find((s) => nameKey(s.name) === nameKey(slotName));
    const cost = slot?.cost?.amount ?? 0;
    breakdown.push(slotName + " +" + cost);
    points += cost;
  }
  for (const pick of unit.options) {
    const found = findOption(card, pick);
    if (!found) {
      breakdown.push(pick + ": not an option of " + card.unit);
      continue;
    }
    const cost = found.entry.cost;
    if (!cost) continue;
    const perModel = cost.perModel && found.option.section !== "slot";
    const amount = perModel ? cost.amount * unit.size : cost.amount;
    breakdown.push(pick + ": " + (perModel ? unit.size + " × " + cost.amount + " = " + amount : (amount >= 0 ? "+" : "") + amount));
    points += amount;
  }
  const lines = [card.rows[0], ...card.rows.filter((r) => r.kind === "mount" || r.kind === "crew" || r.kind === "steed")];
  for (const slotName of unit.slots) {
    const row = card.rows.find((r) => r.kind === "slot" && nameKey(r.name) === nameKey(slotName));
    if (row) lines.splice(1, 0, row);
  }
  return { unit, card, points, breakdown, lines };
}

// A pick's option: addressed by its id ("Handguns", "Great Weapons instead of Shield").
// A plain name also does when only one option has it ("Handguns" for "Handguns instead of Crossbow").
export function findOption(card: ResolvedCard, pick: string): { option: CardOption; entry: OptionEntry } | null {
  const all = card.options.flatMap((option) => option.group.members.map((entry) => ({ option, entry })));
  const exact = all.find((o) => nameKey(optionId(o.entry)) === nameKey(pick));
  if (exact) return exact;
  const byName = all.filter((o) => nameKey(o.entry.name) === nameKey(pick));
  return byName.length === 1 ? byName[0] : null;
}

// Whether a pick names this option (by its id, or by its plain name).
export function picks(pickList: string[], entry: OptionEntry): boolean {
  return pickList.some((p) => nameKey(p) === nameKey(optionId(entry)) || nameKey(p) === nameKey(entry.name));
}

function unitIssues(u: RosterUnitView): Issue[] {
  const issues: Issue[] = [];
  const card = u.card;
  if (!card) return [{ severity: "illegal", message: u.unit.card + ": no such entry in the army list", unit: u.unit.id }];
  if (card.size && u.unit.size < card.size.min)
    issues.push({ severity: "illegal", message: card.unit + ": below minimum size (" + u.unit.size + " of at least " + card.size.min + ")", unit: u.unit.id });
  if (card.size && card.size.max !== null && u.unit.size > card.size.max)
    issues.push({ severity: "illegal", message: card.unit + ": over maximum size (" + u.unit.size + " of at most " + card.size.max + ")", unit: u.unit.id });
  for (const option of card.options) {
    const taken = option.group.members.filter((m) => picks(u.unit.options, m));
    if (option.group.mandatory && taken.length === 0 && option.section !== "slot")
      issues.push({ severity: "illegal", message: card.unit + ": must take one of " + option.group.members.map(optionId).join(", "), unit: u.unit.id });
    if (option.group.members.length > 1 && option.group.pick === "one" && taken.length > 1)
      issues.push({ severity: "illegal", message: card.unit + ": only one of " + option.group.members.map(optionId).join(", "), unit: u.unit.id });
  }
  for (const b of u.breakdown) if (b.includes("not an option")) issues.push({ severity: "warning", message: b, unit: u.unit.id });
  return issues;
}

// --- Composition -------------------------------------------------------------------------------

interface CompositionRow {
  name: string; // the row's Name ("Core", "Rare war machines")
  category: string; // its Tier, for a category limit
  limit: Limit;
}

// The list's own composition rows, plus its book's common rows (SubPackage "Common").
function compositionRows(lib: ArmyLibrary, list: ArmyList | null): CompositionRow[] {
  if (!list) return [];
  const lists = [list, ...[...lib.lists.values()].filter((l) => l !== list && l.book === list.book && nameKey(l.label) === "common")];
  const rows: CompositionRow[] = [];
  for (const l of lists) {
    for (const cells of l.rows) {
      for (const limit of readLimits(cells["Unit Limit"]).limits) rows.push({ name: cells["Name"] ?? "", category: cells["Tier"] ?? "", limit });
    }
  }
  return rows;
}

function categoryTotals(units: RosterUnitView[], rows: CompositionRow[], target: number, issues: Issue[]): CategoryTotal[] {
  const totals: CategoryTotal[] = [];
  const pointsIn = (category: string) => units.filter((u) => nameKey(u.card?.category ?? "") === nameKey(category)).reduce((s, u) => s + u.points, 0);
  for (const row of rows) {
    if (row.limit.what.toLowerCase() !== "points" || !row.limit.percent) continue;
    const category = row.category || row.name;
    const points = pointsIn(category);
    const min = (row.limit.range.min / 100) * target;
    const max = row.limit.range.max === null ? null : (row.limit.range.max / 100) * target;
    const ok = points >= min && (max === null || points <= max);
    const limit = max === null ? "at least " + row.limit.range.min + "% (" + min + ")" : row.limit.range.min > 0 ? row.limit.range.min + "–" + row.limit.range.max + "%" : "up to " + row.limit.range.max + "% (" + max + ")";
    totals.push({ category, points, limit, ok });
    if (!ok) issues.push({ severity: "illegal", message: category + ": " + points + " points, " + limit, unit: null });
  }
  return totals;
}

// How many a "per 1,000 points" limit allows at this target: 1,000 → 1, 2,500 → 2.
function allowed(limit: Limit, target: number): number {
  const max = limit.range.max ?? Infinity;
  if (limit.perPoints === null) return max;
  return max * Math.floor(target / limit.perPoints);
}

function describeLimit(limit: Limit): string {
  const range = limit.range.max === null ? "at least " + limit.range.min : limit.range.min + "-" + limit.range.max;
  return range + (limit.perPoints ? " per " + limit.perPoints.toLocaleString("en-GB") + " points" : " per army");
}

// Army-level rows that count units: unit(A,B)~0-1~1000, units[…]~3-~army, General[Character]~1~army.
function armyLimits(units: RosterUnitView[], rows: CompositionRow[], target: number, issues: Issue[]): void {
  for (const row of rows) {
    const what = row.limit.what;
    if (row.limit.units.length > 0) {
      const names = row.limit.units.map(nameKey);
      const count = units.filter((u) => u.card && names.includes(nameKey(u.card.unit))).length;
      const max = allowed(row.limit, target);
      if (count > max) issues.push({ severity: "illegal", message: (row.name || what) + ": " + count + " taken, " + describeLimit(row.limit) + " (" + row.limit.units.join(" or ") + ")", unit: null });
    } else if (/^units\[/i.test(what)) {
      const count = units.filter((u) => matchesSelector(u, what.slice(6, -1))).length;
      if (count < row.limit.range.min) issues.push({ severity: "illegal", message: (row.name || "Units") + ": " + count + " of at least " + row.limit.range.min, unit: null });
    } else if (/^general/i.test(what)) {
      const generals = units.filter((u) => u.unit.general);
      if (generals.length !== row.limit.range.min)
        issues.push({ severity: "illegal", message: "The General: " + (generals.length === 0 ? "none chosen" : generals.length + " chosen") + "; exactly 1 needed", unit: null });
      for (const g of generals)
        if (nameKey(g.card?.category ?? "") !== "characters") issues.push({ severity: "illegal", message: (g.card?.unit ?? "") + " can't be the General: not a character", unit: g.unit.id });
    }
  }
}

// "not Character; Troop Type not Swarm,War Beasts,War Machine"
function matchesSelector(u: RosterUnitView, selector: string): boolean {
  const card = u.card;
  if (!card) return false;
  for (const part of splitTop(selector, ";")) {
    if (/^not character$/i.test(part)) {
      if (nameKey(card.category) === "characters" || /\(character\)/i.test(card.troopType)) return false;
    }
    const tt = /^troop type not (.+)$/i.exec(part);
    if (tt) {
      const excluded = tt[1].split(",").map(nameKey);
      if (excluded.some((e) => nameKey(card.troopType).startsWith(e))) return false;
    }
  }
  return true;
}

// Limits written on a card: unit~0-1~1000 (this entry), rules options~…, Drilled~…, SB(Magic Standard)~….
// An army row naming the same entry wins (owner, 21 Nov).
function cardLimits(units: RosterUnitView[], rows: CompositionRow[], target: number, issues: Issue[]): void {
  const cards = new Map<string, RosterUnitView[]>();
  for (const u of units) if (u.card) cards.set(u.card.key, [...(cards.get(u.card.key) ?? []), u]);
  for (const [, group] of cards) {
    const card = group[0].card!;
    const armyNamesIt = rows.some((r) => r.limit.units.map(nameKey).includes(nameKey(card.unit)));
    for (const limit of card.limits) {
      const what = limit.what.trim();
      let count: number;
      if (/^unit$/i.test(what)) {
        if (armyNamesIt) continue;
        count = group.length;
      } else count = group.filter((u) => usesLimited(u, what)).length;
      const max = allowed(limit, target);
      if (count > max) issues.push({ severity: "illegal", message: card.unit + ": " + count + " " + (/^unit$/i.test(what) ? "taken" : "taking " + what) + ", " + describeLimit(limit), unit: null });
    }
  }
}

// Does a unit use what a limit counts? "rules options" (any of them), "Drilled" (that one),
// "SB(Magic Standard)" (the standard bearer's magic standard).
function usesLimited(u: RosterUnitView, what: string): boolean {
  const card = u.card!;
  if (/^rules options$/i.test(what)) return card.options.some((o) => o.section === "rules" && o.group.members.some((m) => picks(u.unit.options, m)));
  const { head, inner } = splitCall(what);
  const name = inner ?? head;
  return u.unit.options.some((p) => nameKey(p) === nameKey(name));
}
