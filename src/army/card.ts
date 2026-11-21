// A card worked out: its inheritance followed, each row's line derived from its race cell,
// equipment and deltas, and its options, slots and limits read. What the read-back, the roster
// builder and the world resolver all read.
// Design: design/races-and-units.md §1 (extends: store only what differs), §2 (race base → axes →
// the unit's delta; entered as printed, the delta is printed − derived), §4–6 (units, profiles,
// mounts, slots); design/options-items-and-rules.md §1 (option groups); build-log Part B owner
// decisions 3–4 (Tree × Rank grid; a slot may set rank and career), 12–13 (Unit is the card;
// inheritance words), 16–18 (crew via slots; barding on the horse; mounts don't carry cavalry
// traits; cavalry requires a mount).
//
// Pure: no I/O. Everything here is recomputed on every read; nothing is stored.

import type { ArmyCard, Cells } from "../schema";
import { describeRange, errorText, isError, listCell, nameKey, readCost, readRange, readStat, splitCall, type Cost, type Range } from "./cells";
import { findByName, findEquipment, findRaceCell, isStub, ruleName, type ArmyLibrary } from "./library";
import { readLimits, readOptions, readSlots, type Limit, type OptionEntry, type OptionGroup } from "./options";

export const STATS = ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"];
export type StatValue = number | "-";
export type Line = Record<string, StatValue>;

// --- What a resolved card holds ---------------------------------------------------------------

export interface ResolvedRow {
  name: string; // the row's title: "State Missile Trooper", "Sergeant", "Barded Warhorse"
  kind: "model" | "slot" | "mount" | "crew" | "steed";
  link: string | null; // the slot's Link Key (C, SB …) for a slot row
  count: Range | null; // crew of 3, 2 steeds
  cost: Cost | null; // as printed on the row: 21~pi, +5
  line: Line; // the resolved line: what the card prints
  riderBonus: string[]; // "(+1)" in a mount's cell: what it gives its rider ("W +1")
  identity: string; // "Human · Core · Base", "unit line + slot", "as printed (no race)"
  steps: string[]; // the derivation, in plain words, one step per line
  storedDelta: string[]; // printed − derived: "WS +1", "M = -"
  equipment: string[]; // as written on the row
  warnings: string[];
}

export interface CardOption {
  section: "equipment" | "rules" | "slot";
  slot: string | null; // for options belonging to a slot: its row name ("Sergeant")
  group: OptionGroup;
}

export interface CardSlot {
  link: string; // C, SB, M …
  name: string; // the row's or the common link's name: "Sergeant", "Musician"
  cost: Cost | null;
  count: Range | null;
  type: string | null;
  row: ResolvedRow | null; // the slot's own row, when it has one
  carries: string[]; // equipment the common link gives it (+Standard)
}

export interface ResolvedCard {
  key: string;
  unit: string; // the card's title (the Unit column)
  category: string; // Tier column: Core, Special …
  book: string;
  reference: string; // "Forces of Fantasy;58"
  inherits: string[]; // the cards it links to, nearest first
  troopType: string;
  baseSize: string;
  size: Range | null;
  cost: Cost | null;
  status: string;
  rows: ResolvedRow[]; // the model row first, then slots, mount, crew
  rules: string[];
  options: CardOption[];
  slots: CardSlot[];
  limits: Limit[];
  notes: string;
  matches: string[]; // how each name was matched ("Lances → Lance (plural)")
  stubs: string[]; // names that matched nothing (or only a stub)
  missingRules: string[]; // rule names with no item at all, not even a stub
  warnings: string[];
}

// --- Inheritance -------------------------------------------------------------------------------

// The card and the cards it links to, nearest first. Link Key "State Troops~Unit" (or ~Name).
export function cardChain(lib: ArmyLibrary, card: ArmyCard): ArmyCard[] {
  const chain: ArmyCard[] = [card];
  let current = card;
  for (let i = 0; i < 8; i++) {
    const link = current.rows[0]["Link Key"] ?? "";
    const m = /^(.+)~(unit|name)$/i.exec(link.trim());
    if (!m) break;
    const parent = findByName(lib.cards, m[1])?.item;
    if (!parent || chain.includes(parent)) break;
    chain.push(parent);
    current = parent;
  }
  return chain;
}

// The first non-empty value of a column down the chain.
function inherited(chain: ArmyCard[], column: string): string {
  for (const card of chain) {
    const value = (card.rows[0][column] ?? "").trim();
    if (value !== "") return value;
  }
  return "";
}

// Options down the chain, from the furthest parent to the card itself (owner, 21 Nov):
// "+X" adds; the same name without "+" replaces the inherited option; "None" removes all; "-X" one.
function mergedOptions(chain: ArmyCard[], column: string, problems: string[]): OptionGroup[] {
  let groups: OptionGroup[] = [];
  for (const card of [...chain].reverse()) {
    const cell = readOptions(card.rows[0][column]);
    problems.push(...cell.problems.map((p) => card.label + ", " + column + ": " + p));
    if (cell.removeAll) groups = [];
    for (const name of cell.removals) groups = groups.filter((g) => !g.members.some((m) => nameKey(m.name) === nameKey(name)));
    for (const group of cell.groups) {
      const additive = group.members.every((m) => m.additive);
      const same = groups.findIndex((g) => g.members.some((m) => group.members.some((n) => nameKey(n.name) === nameKey(m.name))));
      if (!additive && same >= 0) groups[same] = group;
      else groups.push(group);
    }
  }
  return groups;
}

// Rules down the chain. A cell with only plain names replaces the inherited list; "add:X" adds;
// "replace~X" removes X (owner's Schemae: "add: addition to default set up", "replace~xyz").
function mergedRules(chain: ArmyCard[]): string[] {
  let rules: string[] = [];
  for (const card of [...chain].reverse()) {
    const parts = listCell(card.rows[0]["Rules"]);
    if (parts.length === 0) continue;
    const modifying = parts.some((p) => /^add:/i.test(p) || /^replace~/i.test(p));
    if (!modifying) {
      rules = parts;
      continue;
    }
    for (const part of parts) {
      if (/^replace~/i.test(part)) rules = rules.filter((r) => nameKey(r) !== nameKey(part.slice("replace~".length)));
      else rules.push(part.replace(/^add:/i, "").trim());
    }
  }
  return rules;
}

// --- Lines -------------------------------------------------------------------------------------

function showLine(line: Partial<Line>): string {
  return STATS.map((s) => (line[s] === undefined ? "·" : String(line[s]))).join(" ");
}

// A race cell's full line. A cell written as deltas ("+1") adds to the same tree's Base cell,
// else Human · Core · Base (owner's sample: Professional · Veteran "WS +1").
function raceLine(lib: ArmyLibrary, race: string, tree: string, rank: string, warnings: string[]): Line | null {
  const cell = findRaceCell(lib, race, tree, rank);
  if (!cell) return null;
  const line: Line = {};
  const needsBase = STATS.some((s) => readStat(cell.cells[s]).kind === "delta" || readStat(cell.cells[s]).kind === "blank");
  let base: Line | null = null;
  if (needsBase) {
    const fallback = nameKey(rank || "Base") === "base" ? null : (findRaceCell(lib, race, tree, "Base") ?? findRaceCell(lib, race, "Core", "Base"));
    base = fallback ? raceLine(lib, race, fallback.cells["Tree"] ?? "", fallback.cells["Rank"] ?? "", warnings) : null;
  }
  for (const s of STATS) {
    const v = readStat(cell.cells[s]);
    if (v.kind === "absolute") line[s] = v.value;
    else if (v.kind === "none") line[s] = "-";
    else if (v.kind === "delta" && base && typeof base[s] === "number") line[s] = (base[s] as number) + v.value;
    else if (v.kind === "blank" && base) line[s] = base[s];
    else if (v.kind === "error") warnings.push("Races, " + race + " · " + tree + " · " + rank + ", " + s + ": " + v.message);
  }
  return line;
}

// The statline effects of the row's own equipment: only kit that isn't a weapon (a weapon's
// numbers are its attacks, not the bearer's line). Barding M −1 is the Empire's case.
function equipmentEffects(lib: ArmyLibrary, names: string[], matches: string[], stubs: string[]): { stat: string; value: number; item: string }[] {
  const effects: { stat: string; value: number; item: string }[] = [];
  for (const written of names) {
    if (/~mount$/i.test(written) || /\(ridden\)/i.test(written)) continue;
    const name = written.replace(/\(.*\)$/, "").trim();
    const found = findEquipment(lib, name);
    if (!found) {
      stubs.push(name);
      continue;
    }
    if (found.how !== "name") matches.push(name + " → " + found.item.cells["Equipment"] + " (" + found.how + ")");
    if (nameKey(found.item.cells["Type"] ?? "") === "weapon") continue;
    for (const s of STATS) {
      const v = readStat(found.item.cells[s]);
      if (v.kind === "absolute" || v.kind === "delta") effects.push({ stat: s, value: v.value, item: found.item.cells["Equipment"] ?? name });
    }
  }
  return effects;
}

// One row's line: race cell → equipment → as printed (a delta stored where printed differs).
function deriveRow(
  lib: ArmyLibrary,
  cells: Cells,
  defaults: { race: string; tree: string; rank: string },
  equipment: string[],
  out: { matches: string[]; stubs: string[]; warnings: string[] },
  label: string,
): Pick<ResolvedRow, "line" | "riderBonus" | "identity" | "steps" | "storedDelta"> {
  const steps: string[] = [];
  const race = (cells["Race"] || defaults.race).trim();
  const tree = (cells["Tree"] || defaults.tree).trim();
  const rank = (cells["Rank"] || defaults.rank).trim();
  let derived: Line | null = null;
  let identity = "as printed (no race)";
  if (race) {
    identity = race + " · " + (tree || "Core") + " · " + (rank || "Base");
    derived = raceLine(lib, race, tree, rank, out.warnings);
    if (!derived) out.warnings.push(label + ": no race cell " + identity);
    else steps.push(identity + ": " + showLine(derived));
  }
  if (derived) {
    for (const e of equipmentEffects(lib, equipment, out.matches, out.stubs)) {
      if (typeof derived[e.stat] === "number") {
        derived[e.stat] = (derived[e.stat] as number) + e.value;
        steps.push(e.item + ": " + e.stat + " " + (e.value > 0 ? "+" : "−") + Math.abs(e.value));
      }
    }
  } else equipmentEffects(lib, equipment, out.matches, out.stubs);
  return applyPrinted(cells, derived, steps, identity, label, out.warnings);
}

// The row's own stat cells over the derived line. Entered as printed wins; the difference is the
// stored delta (races-and-units §2). A "+1" cell is a delta on the derived value.
function applyPrinted(
  cells: Cells,
  derived: Line | null,
  steps: string[],
  identity: string,
  label: string,
  warnings: string[],
): Pick<ResolvedRow, "line" | "riderBonus" | "identity" | "steps" | "storedDelta"> {
  const line: Line = {};
  const riderBonus: string[] = [];
  const storedDelta: string[] = [];
  for (const s of STATS) {
    const v = readStat(cells[s]);
    const d = derived?.[s];
    if (v.kind === "error") {
      warnings.push(label + ", " + s + ": " + v.message);
      if (d !== undefined) line[s] = d;
    } else if (v.kind === "absolute") {
      line[s] = v.value;
      if (d === "-") storedDelta.push(s + " = " + v.value);
      else if (typeof d === "number" && d !== v.value) storedDelta.push(s + " " + sign(v.value - d));
    } else if (v.kind === "delta") {
      if (typeof d === "number") line[s] = d + v.value;
      else warnings.push(label + ", " + s + ": " + sign(v.value) + " needs a value to add to");
      storedDelta.push(s + " " + sign(v.value));
    } else if (v.kind === "none") {
      line[s] = "-";
      if (d !== undefined && d !== "-") storedDelta.push(s + " = -");
    } else if (v.kind === "rider") {
      riderBonus.push(s + " " + sign(v.value));
      if (d !== undefined) line[s] = d;
    } else if (d !== undefined) line[s] = d;
  }
  if (storedDelta.length > 0) steps.push("the unit's own: " + storedDelta.join(", "));
  if (riderBonus.length > 0) steps.push("gives its rider " + riderBonus.join(", "));
  return { line, riderBonus, identity, steps, storedDelta };
}

function sign(n: number): string {
  return (n > 0 ? "+" : "−") + Math.abs(n);
}

// A slot row's line: the unit's model line plus the slot's deltas (or its own race cell, if
// the slot sets a race, tree or rank: owner, 21 Nov).
function deriveSlotRow(
  lib: ArmyLibrary,
  cells: Cells,
  model: ResolvedRow,
  defaults: { race: string; tree: string; rank: string },
  out: { matches: string[]; stubs: string[]; warnings: string[] },
): Pick<ResolvedRow, "line" | "riderBonus" | "identity" | "steps" | "storedDelta"> {
  const label = cells["Name"] ?? "slot";
  if ((cells["Race"] ?? "") || (cells["Tree"] ?? "") || (cells["Rank"] ?? "")) {
    if ((cells["Tree"] ?? "") && nameKey(cells["Tree"]) !== nameKey(defaults.tree || "Core"))
      out.warnings.push(label + ": its tree (" + cells["Tree"] + ") differs from the unit's (" + (defaults.tree || "Core") + ")");
    return deriveRow(lib, cells, defaults, [], out, label);
  }
  const steps = [model.name + "'s line: " + showLine(model.line)];
  const result = applyPrinted(cells, { ...model.line }, steps, "unit line + slot", label, out.warnings);
  result.steps = steps.map((s) => s.replace("the unit's own:", "the slot:"));
  return result;
}

// --- The card ----------------------------------------------------------------------------------

function rowKind(type: string): ResolvedRow["kind"] {
  const t = nameKey(type);
  if (t.startsWith("slots")) return "slot";
  if (t === "mount") return "mount";
  if (t === "crew") return "crew";
  if (t === "steed") return "steed";
  return "model";
}

export function resolveCard(lib: ArmyLibrary, card: ArmyCard): ResolvedCard {
  const chain = cardChain(lib, card);
  const own = card.rows[0];
  const out = { matches: [] as string[], stubs: [] as string[], warnings: [] as string[] };
  const problems: string[] = [];
  const get = (column: string) => inherited(chain, column);
  const defaults = { race: get("Race"), tree: get("Tree"), rank: get("Rank") };

  // The model row: the card's own row, its stats over the parent's.
  const modelCells: Cells = {};
  for (const s of STATS) modelCells[s] = get(s);
  for (const c of ["Race", "Tree", "Rank"]) modelCells[c] = get(c);
  const equipment = listCell(get("Equipment"));
  const modelName = (own["Name"] || inherited(chain, "Name") || card.label).trim();
  const model: ResolvedRow = {
    name: modelName,
    kind: rowKind(own["Type"] ?? "Unit") === "model" ? "model" : rowKind(own["Type"] ?? "Unit"),
    link: null,
    count: null,
    cost: costOf(get("Cost"), out.warnings, card.label),
    equipment,
    warnings: [],
    ...deriveRow(lib, modelCells, { race: "", tree: "", rank: "" }, equipment, out, modelName),
  };
  const rows: ResolvedRow[] = [model];

  // Mounts named in the equipment ("Barded Warhorse(Ridden)~Mount"): the mount card's line. The
  // book prints them last (model, champion, mount), so they're added after the card's own rows.
  const mountRows: ResolvedRow[] = [];
  for (const written of equipment.filter((e) => /~mount$/i.test(e))) {
    const name = splitCall(written.replace(/~mount$/i, "")).head;
    const mountCard = findByName(lib.cards, name)?.item;
    if (!mountCard) {
      out.stubs.push(name);
      continue;
    }
    const mount = resolveCard(lib, mountCard);
    mountRows.push({ ...mount.rows[0], kind: "mount", name: mount.rows[0].name, cost: null });
    out.matches.push(...mount.matches);
  }

  // Rows within the card: slots, mounts, crew, steeds (own rows; a linked card's when it has none).
  const extraRows = card.rows.slice(1).length > 0 ? card.rows.slice(1) : (chain[1]?.rows.slice(1) ?? []);
  const slots = readSlots(get("Slots"));
  problems.push(...slots.problems.map((p) => card.label + ", Slots: " + p));
  const cardSlots: CardSlot[] = [];
  const options: CardOption[] = [];

  for (const cells of extraRows) {
    const kind = rowKind(cells["Type"] ?? "");
    const name = (cells["Name"] ?? "").trim();
    const link = (cells["Link Key"] ?? "").trim() || null;
    const rowEquipment = listCell(cells["Equipment"]);
    const derived =
      kind === "slot"
        ? deriveSlotRow(lib, cells, model, defaults, out)
        : deriveRow(lib, cells, kind === "mount" || kind === "steed" ? { race: "", tree: "", rank: "" } : defaults, rowEquipment, out, name);
    const slotRef = slots.slots.find((s) => link && nameKey(s.link) === nameKey(link));
    const row: ResolvedRow = {
      name,
      kind,
      link,
      count: slotRef?.count ?? rangeOf(cells["Min/Max"], out.warnings, name),
      cost: costOf(cells["Cost"], out.warnings, name),
      equipment: rowEquipment,
      warnings: [],
      ...derived,
    };
    rows.push(row);
    const rowOptions = readOptions(cells["Equipment Options"]);
    problems.push(...rowOptions.problems.map((p) => name + ", Equipment Options: " + p));
    for (const group of rowOptions.groups) options.push({ section: "slot", slot: name, group });
  }
  rows.push(...mountRows);
  // The stats table shows the model, mounts, crew, steeds, and the slots that change the line
  // (champions); a standard bearer or musician keeps the model's line, so isn't repeated.
  const shownRows = rows.filter((r) => r.kind !== "slot" || r.storedDelta.length > 0 || r.identity !== "unit line + slot");

  // Slots: from this card's rows (X(slots)) or written inline (X(0-1;upgrade;+5)).
  if (!slots.none) {
    for (const ref of slots.slots) {
      const common = lib.links.get(nameKey(ref.link));
      const row = rows.find((r) => r.link && nameKey(r.link) === nameKey(ref.link)) ?? null;
      const rowCells = extraRows.find((c) => nameKey(c["Link Key"] ?? "") === nameKey(ref.link));
      if (!common) out.warnings.push("Slots: “" + ref.link + "” isn't in Core Common Links");
      cardSlots.push({
        link: ref.link,
        name: row?.name || common?.cells["Name"] || ref.link,
        cost: ref.fromRows ? (row?.cost ?? null) : ref.cost,
        count: ref.fromRows ? rangeOf(rowCells?.["Min/Max"], out.warnings, ref.link) : ref.count,
        type: ref.type ?? (rowCells ? "upgrade" : null),
        row,
        carries: listCell(common?.cells["Equipment"]).map((e) => e.replace(/^\+/, "")),
      });
    }
  }

  const equipmentOptions = mergedOptions(chain, "Equipment Options", problems).map((group): CardOption => ({ section: "equipment", slot: null, group }));
  options.unshift(...equipmentOptions);
  const ruleOptions = mergedOptions(chain, "Rules Options", problems);
  for (const group of ruleOptions) options.push({ section: "rules", slot: null, group });
  checkOptionNames(lib, options, out);

  const limits = readLimits(get("Unit Limit"));
  problems.push(...limits.problems.map((p) => card.label + ", Unit Limit: " + p));
  const rules = mergedRules(chain);
  const missingRules: string[] = [];
  for (const r of rules) {
    const found = lib.rules.get(nameKey(ruleName(r)));
    if (!found || isStub(found)) out.stubs.push(ruleName(r));
    if (!found) missingRules.push(ruleName(r));
  }

  const troopType = get("Troop Type");
  const mounted = isMounted(equipment, get("Status")) || options.some((o) => o.group.mandatory && o.group.members.every((m) => m.isMount));
  if (/cavalry/i.test(troopType) && !mounted) out.warnings.push(troopType + " needs a mount (cavalry requires being mounted)");

  return {
    key: card.key,
    unit: card.label,
    category: get("Tier"),
    book: get("Package"),
    reference: own["Reference"] || get("Reference"),
    inherits: chain.slice(1).map((c) => c.label),
    troopType,
    baseSize: get("Base Size"),
    size: rangeOf(get("Min/Max"), out.warnings, card.label),
    cost: model.cost,
    status: get("Status"),
    rows: shownRows,
    rules,
    options,
    slots: cardSlots,
    limits: limits.none ? [] : limits.limits,
    notes: own["Notes"] ?? "",
    matches: unique(out.matches),
    stubs: unique(out.stubs),
    missingRules: unique(missingRules),
    warnings: unique([...problems, ...out.warnings]),
  };
}

function isMounted(equipment: string[], status: string): boolean {
  return equipment.some((e) => /~mount$/i.test(e)) || /mounted/i.test(status);
}

function checkOptionNames(lib: ArmyLibrary, options: CardOption[], out: { matches: string[]; stubs: string[] }): void {
  for (const option of options) {
    if (option.section !== "equipment" && option.section !== "slot") continue;
    for (const member of option.group.members) {
      if (member.isMount) {
        if (!findByName(lib.cards, member.name)) out.stubs.push(member.name);
        continue;
      }
      const found = findEquipment(lib, member.name);
      if (!found) out.stubs.push(member.name);
      else if (found.how !== "name") out.matches.push(member.name + " → " + found.item.cells["Equipment"] + " (" + found.how + ")");
    }
  }
}

function costOf(text: string | undefined, warnings: string[], label: string): Cost | null {
  const cost = readCost(text);
  if (cost && isError(cost)) {
    warnings.push(label + ", Cost: " + errorText(cost));
    return null;
  }
  return cost;
}

function rangeOf(text: string | undefined, warnings: string[], label: string): Range | null {
  const range = readRange(text);
  if (range && isError(range)) {
    warnings.push(label + ", Min/Max: " + errorText(range));
    return null;
  }
  return range;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

// An option's address within its card: its name, plus what it replaces when two options share a
// name (Great Weapons, and Great Weapons instead of Shields).
export function optionId(entry: OptionEntry): string {
  return entry.name + (entry.replaces.length > 0 ? " instead of " + entry.replaces.join(" or ") : "");
}

export { describeRange };
