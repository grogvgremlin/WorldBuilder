// L3. Racial deltas. Design: build/slice-1-brief.md §3.3 L3; design/races-and-units.md §2 (race
// base → tier → the unit's delta; entered as printed, the delta is printed − derived); as built
// for TOW (build-log, Part B, the cases as built and owner decisions 3–4): a race's grid is
// Tree × Rank; a champion is the unit's line plus the slot's delta.
// (c) and (d), "Brutal Orcs: S +1 to race Orc", wait for the Orcs & Goblins pages (owner, 15 Nov).

import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { buildArmyLibrary } from "../../src/army/library";
import { resolveCard, type ResolvedCard } from "../../src/army/card";
import { loadTowEmpire, testDeps } from "../helpers";

describe("L3 racial deltas", () => {
  let card: (key: string) => ResolvedCard;

  beforeEach(async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const lib = buildArmyLibrary(await store.listContent());
    card = (key) => resolveCard(lib, lib.cardsByKey.get("the_empire_of_man." + key)!);
  });

  it("(a) Handgunners read race base Human → no delta → Ld 7", () => {
    const trooper = card("state_missile_troops").rows[0];
    expect(trooper.name).toBe("State Missile Trooper");
    expect(trooper.identity).toBe("Human · Core · Base");
    expect(trooper.steps).toEqual(["Human · Core · Base: 4 3 3 3 3 1 3 1 7"]);
    expect(trooper.storedDelta).toEqual([]);
    expect(trooper.line.Ld).toBe(7);
  });

  it("(b) the Handgunners' Sergeant reads the unit's line + the slot's delta (BS +1)", () => {
    const sergeant = card("state_missile_troops").rows.find((r) => r.name === "Sergeant")!;
    expect(sergeant.identity).toBe("unit line + slot");
    expect(sergeant.steps).toEqual(["State Missile Trooper's line: 4 3 3 3 3 1 3 1 7", "the slot: BS +1"]);
    expect(sergeant.line.BS).toBe(4);
    expect(sergeant.line.A).toBe(1);
  });

  it("a unit off its race cell stores only the difference (Greatswords' Count's Champion: WS +1, A +1)", () => {
    const greatswords = card("empire_greatswords");
    expect(greatswords.rows[0].identity).toBe("Human · Professional · Veteran");
    expect(greatswords.rows[0].storedDelta).toEqual([]);
    const champion = greatswords.rows.find((r) => r.name === "Count's Champion")!;
    expect(champion.storedDelta).toEqual(["WS +1", "A +1"]);
    expect(champion.line).toMatchObject({ WS: 5, A: 2, Ld: 8 });
  });

  it("a character stores its own delta against its cell (Captain: Professional · Hero, BS +2)", () => {
    const captain = card("captain_of_the_empire").rows[0];
    expect(captain.identity).toBe("Human · Professional · Hero");
    expect(captain.storedDelta).toEqual(["BS +2"]);
    expect(captain.line.BS).toBe(5);
  });

  it.todo("(c) a homebrew “Brutal Orcs: S +1 to race Orc” reaches Orc Boyz and Black Orcs; “Orc only” leaves Black Orcs: waits for the O&G pages");
  it.todo("(d) switched off, everything is back as printed: waits with (c)");
});
