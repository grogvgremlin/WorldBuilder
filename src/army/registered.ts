// A unit registered in a world from a roster: its base line comes from the army list.
// Design: build/slice-1-brief.md §3.1 (registered rosters: each unit registered in the world as a
// thing linked to its world links), §3.3 L2 ("the derivation shows the army-list base first, then
// the world steps"); design/rosters.md §1 (the roster stores choices, never resolved values).
//
// Pure: the army content in reach and the unit's source in, its base line and how it was made out.

import type { ContentItem, UnitSource } from "../schema";
import { resolveCard } from "./card";
import { buildArmyLibrary } from "./library";

export interface ArmyBase {
  profile: Record<string, number>; // the model's line, numbers only ("-" stats are left out)
  note: string; // "army list: Handgunners (State Missile Troops), Forces of Fantasy p. 58"
  steps: string[]; // how the line was made: race cell, equipment, the unit's own delta
}

export function armyBaseFor(army: ContentItem[], source: UnitSource): ArmyBase | null {
  const roster = army.find((i) => i.class === "roster" && i.key === source.roster);
  if (!roster || roster.class !== "roster") return null;
  const unit = roster.units.find((u) => u.id === source.unit);
  if (!unit) return null;
  const lib = buildArmyLibrary(army);
  const card = lib.cardsByKey.get(unit.card);
  if (!card) return null;
  const resolved = resolveCard(lib, card);
  const model = resolved.rows[0];
  const profile: Record<string, number> = {};
  for (const [stat, value] of Object.entries(model.line)) if (typeof value === "number") profile[stat] = value;
  const [book, page] = resolved.reference.split(";").map((s) => s.trim());
  const steps = [...model.steps];
  if (model.storedDelta.length === 0 && model.identity.includes("·")) steps.push("matches the printed line: no delta stored");
  return {
    profile,
    note: "army list: " + model.name + " (" + resolved.unit + ")" + (book ? ", " + book + (page ? " p. " + page : "") : ""),
    steps,
  };
}
