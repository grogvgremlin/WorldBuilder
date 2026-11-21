// L1. A pick-up list with no world. Design: build/slice-1-brief.md §3.3 L1 and §1.3 (a practice
// roster is not registered: no world, no log entries); as built for TOW (build-log, Part B, the
// cases as built): Handgunners ×10 (State Missile Troops with handguns) with a Sergeant and a
// musician, plus other units; points per unit and per category; one limit broken shows as an
// issue; Ld reads 7; nothing written to any log.

import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { savePracticeRoster } from "../../src/army/register";
import { viewRoster, type RosterView } from "../../src/army/roster";
import { PRACTICE, type Roster } from "../../src/schema";
import { l1Roster, loadTowEmpire, testDeps } from "../helpers";

describe("L1 a pick-up list with no world", () => {
  let store: MemoryStore;
  let view: RosterView;
  const deps = testDeps();

  beforeEach(async () => {
    store = new MemoryStore();
    await loadTowEmpire(store, deps);
    await savePracticeRoster(store, l1Roster());
    const roster = (await store.listContent()).find((i) => i.class === "roster")!;
    view = viewRoster(roster as Roster, await store.listContent());
  });

  it("costs the Handgunners as the list does: 10 × (7 + 1) + Sergeant 5 + musician 5 = 90", () => {
    const handgunners = view.units.find((u) => u.unit.id === "u2")!;
    expect(handgunners.points).toBe(90);
    expect(handgunners.breakdown).toEqual(["10 × 7 = 70", "Sergeant +5", "Musician +5", "Handguns: 10 × 1 = 10"]);
  });

  it("totals every unit and the roster", () => {
    expect(view.units.map((u) => [u.card?.unit, u.points])).toEqual([
      ["Captain of the Empire", 45],
      ["State Missile Troops", 90],
      ["State Troops", 165],
      ["Empire Greatswords", 110],
      ["Helblaster Volley Gun", 120],
      ["Helblaster Volley Gun", 120],
    ]);
    expect(view.total).toBe(650);
  });

  it("totals each category against the list's limits (percent of the 1,000 target)", () => {
    const byCategory = Object.fromEntries(view.categories.map((c) => [c.category, [c.points, c.ok]]));
    expect(byCategory).toMatchObject({ Characters: [45, true], Core: [255, true], Special: [110, true], Rare: [240, true] });
  });

  it("shows the one limit broken: two Helblasters where 0-1 per 1,000 points is allowed", () => {
    const illegal = view.issues.filter((i) => i.severity === "illegal");
    expect(illegal.map((i) => i.message)).toEqual([
      "Rare war machines: 2 taken, 0-1 per 1,000 points (Helblaster Volley Gun or Helstorm Rocket Battery)",
    ]);
  });

  it("reads the Handgunners' Ld as 7: the printed line, no world", () => {
    const handgunners = view.units.find((u) => u.unit.id === "u2")!;
    expect(handgunners.lines[0].name).toBe("State Missile Trooper");
    expect(handgunners.lines[0].line.Ld).toBe(7);
    // The Sergeant taken shows as a line of his own.
    expect(handgunners.lines.map((l) => l.name)).toEqual(["State Missile Trooper", "Sergeant"]);
  });

  it("writes nothing to any log: the roster is stored outside every sandbox", async () => {
    const roster = (await store.listContent()).find((i) => i.class === "roster")!;
    expect(roster.space).toBe(PRACTICE);
    const sandboxes = (await store.listContent()).filter((i) => i.class === "sandbox");
    expect(sandboxes).toEqual([]);
    expect(await store.listEntries(PRACTICE)).toEqual([]);
  });
});
