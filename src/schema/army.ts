// Army lists, races and rosters: the data shapes.
// Design: design/army-lists.md §1–3 (army lists, entries, composition); design/races-and-units.md
// §2 (races, tier axes: the owner's Tree × Rank grid), §4–6 (units, profiles, slots);
// design/options-items-and-rules.md §1, §3 (option groups, equipment); design/rosters.md §1–3
// (a roster stores what the user chose, never resolved values); build/slice-1-brief.md §1.3
// (practice and registered rosters), §3.1. The input format is the owner's spreadsheet
// (build-log, Part B owner decisions 5, 12–20).
//
// Army content is stored AS ENTERED: every cell exactly as typed, keyed by its column name.
// Parsing the cells, following Link Keys and working out lines are all derived on read
// (src/army/). That keeps the stored truth small and lets an export give back what was typed.

import { z } from "zod";

// Cells as typed, keyed by the column name as the sheet headed it ("Equipment Options").
export const Cells = z.record(z.string(), z.string());
export type Cells = z.infer<typeof Cells>;

const armyBase = {
  key: z.string().min(1),
  label: z.string(),
  space: z.string().min(1), // "library" for army content; a sandbox key or "practice" for rosters
  package: z.string().nullable(),
};

// One cell of a race's grid: Race · Tree · Rank (the owner's Races sheet).
export const RaceCell = z.object({
  class: z.literal("race"),
  ...armyBase,
  cells: Cells, // Race, Tree, Rank, M … Ld, Rules, Reference, Notes
});
export type RaceCell = z.infer<typeof RaceCell>;

// An item of equipment, mundane or magic (the Equipment sheet).
export const EquipmentItem = z.object({
  class: z.literal("equipment"),
  ...armyBase,
  cells: Cells, // Equipment, Match Key, M … Ld, Save, Rules, Alias, Rules 2, Type, R, AP, Cost, Reference
});
export type EquipmentItem = z.infer<typeof EquipmentItem>;

// A shared slot kind (the Core Common Links sheet): champion, standard bearer, musician, BSB, crew.
export const CommonLink = z.object({
  class: z.literal("common_link"),
  ...armyBase,
  cells: Cells, // Link Key, Name, Equipment, Alias, Reference
});
export type CommonLink = z.infer<typeof CommonLink>;

// A special rule's text as printed in a book (the Rules sheet). Not a world rule.
export const SpecialRule = z.object({
  class: z.literal("special_rule"),
  ...armyBase,
  cells: Cells, // Rule, Rules, Rules 2, Reference
});
export type SpecialRule = z.infer<typeof SpecialRule>;

// A card: one army entry (the book's unit entry), its own row first, then the rows within it
// (champion and other slots, mounts, crew). Owner, 21 Nov: Unit is the card, Name a row in it.
export const ArmyCard = z.object({
  class: z.literal("army_card"),
  ...armyBase,
  rows: z.array(Cells).min(1), // Army Entry rows, as typed; rows[0] is the card's own row
});
export type ArmyCard = z.infer<typeof ArmyCard>;

// An army list (or a book's common list): its composition rows (Rule Type "Composition").
export const ArmyList = z.object({
  class: z.literal("army_list"),
  ...armyBase,
  book: z.string(), // the Package column: the book it comes from
  rows: z.array(Cells), // composition rows, as typed
});
export type ArmyList = z.infer<typeof ArmyList>;

// --- Rosters (design/rosters.md: what the user chose; never resolved values) ----------------

export const RosterUnit = z.object({
  id: z.string(), // unique within the roster
  card: z.string(), // the army card's key
  size: z.number().int().min(1),
  options: z.array(z.string()), // option picks, by "Group › Option" address
  slots: z.array(z.string()), // the slot rows taken, by name ("Sergeant", "Musician")
  general: z.boolean(), // holds the General role
});
export type RosterUnit = z.infer<typeof RosterUnit>;

// A unit registered in a world: where it was raised and what it's linked to (brief §3.1).
export const Registration = z.object({
  sandbox: z.string(),
  context: z.string(), // the manifest context it's registered in
});
export type Registration = z.infer<typeof Registration>;

export const Roster = z.object({
  class: z.literal("roster"),
  ...armyBase,
  armyList: z.string(), // the army list's key
  target: z.number(), // points limit (rosters.md §5: an input set up front)
  units: z.array(RosterUnit),
  registration: Registration.nullable(), // null = a practice roster (brief §1.3)
});
export type Roster = z.infer<typeof Roster>;

// Where the army content and rosters sit, besides the world.
export const PRACTICE = "practice"; // the space practice rosters live in: outside every sandbox
