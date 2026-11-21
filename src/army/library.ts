// The army content in reach, indexed by name, and how a name is matched.
// Design: design/text-format-and-csv.md §3 (a label is matched once: one match → that item;
// none → a stub; several → the user picks); build-log Part B owner decisions 8–9 (names, never
// keys, in an upload; a trailing "s" matches the name without it; Alias and Match Key columns).
//
// Pure: built from content items; does no I/O.

import type { ArmyCard, ArmyList, CommonLink, ContentItem, EquipmentItem, RaceCell, SpecialRule } from "../schema";
import { listCell, nameKey } from "./cells";

export interface ArmyLibrary {
  cards: Map<string, ArmyCard>; // by the card's name (Unit), matched loosely
  cardsByKey: Map<string, ArmyCard>;
  equipment: Map<string, EquipmentItem>; // by name and by each alias
  links: Map<string, CommonLink>; // by Link Key (C, SB, M …)
  rules: Map<string, SpecialRule>;
  races: RaceCell[];
  lists: Map<string, ArmyList>; // by key
}

export function buildArmyLibrary(content: ContentItem[]): ArmyLibrary {
  const lib: ArmyLibrary = { cards: new Map(), cardsByKey: new Map(), equipment: new Map(), links: new Map(), rules: new Map(), races: [], lists: new Map() };
  for (const item of content) {
    if (item.class === "army_card") {
      lib.cards.set(nameKey(item.label), item);
      lib.cardsByKey.set(item.key, item);
    } else if (item.class === "equipment") {
      lib.equipment.set(nameKey(item.cells["Equipment"] ?? item.label), item);
      for (const alias of (item.cells["Alias"] ?? "").split(",")) if (alias.trim()) lib.equipment.set(nameKey(alias), item);
    } else if (item.class === "common_link") lib.links.set(nameKey(item.cells["Link Key"] ?? item.key), item);
    else if (item.class === "special_rule") lib.rules.set(nameKey(ruleName(item.cells["Rule"] ?? item.label)), item);
    else if (item.class === "race") lib.races.push(item);
    else if (item.class === "army_list") lib.lists.set(item.key, item);
  }
  return lib;
}

// How a name was matched: shown in the derivation ("Lances → Lance, by the plural").
export interface Match<T> {
  item: T;
  how: "name" | "alias" | "plural" | "alias, plural";
}

// Looks a name up in one index: exactly, then by the plural rule (a trailing "s" only).
export function findByName<T>(index: Map<string, T>, name: string): Match<T> | null {
  const key = nameKey(name);
  const exact = index.get(key);
  if (exact) return { item: exact, how: "name" };
  if (key.endsWith("s")) {
    const single = index.get(key.slice(0, -1));
    if (single) return { item: single, how: "plural" };
  }
  return null;
}

export function findEquipment(lib: ArmyLibrary, name: string): Match<EquipmentItem> | null {
  const match = findByName(lib.equipment, name);
  if (!match) return null;
  const own = nameKey(match.item.cells["Equipment"] ?? "");
  const looked = nameKey(name);
  const viaAlias = match.how === "plural" ? own !== looked.slice(0, -1) : own !== looked;
  if (!viaAlias) return match;
  return { item: match.item, how: match.how === "plural" ? "alias, plural" : "alias" };
}

// A rule written with a parameter, "Magic Resistance(-1)" or "Fly (10)": its name.
export function ruleName(written: string): string {
  return written.replace(/\s*\(.*\)\s*$/, "").replace(/^add:/i, "").trim();
}

// The race cell for Race · Tree · Rank. Blank Tree reads Core, blank Rank reads Base (owner).
export function findRaceCell(lib: ArmyLibrary, race: string, tree: string, rank: string): RaceCell | null {
  const t = nameKey(tree || "Core");
  const r = nameKey(rank || "Base");
  return lib.races.find((c) => nameKey(c.cells["Race"] ?? "") === nameKey(race) && nameKey(c.cells["Tree"] || "Core") === t && nameKey(c.cells["Rank"] || "Base") === r) ?? null;
}

// Every cell of one race (for the fit suggestion and the "no such cell" problem).
export function raceCells(lib: ArmyLibrary, race: string): RaceCell[] {
  return lib.races.filter((c) => nameKey(c.cells["Race"] ?? "") === nameKey(race));
}

// The items an equipment cell names: "Hand Weapon;Light Armour", "Barded Warhorse(Ridden)~Mount",
// "Knight: Hand Weapon | Barded Warhorse: …" (per row). Returns the names for one row.
export function equipmentNames(cell: string | undefined): string[] {
  return listCell(cell);
}
