// L2. The same list, registered. Design: build/slice-1-brief.md §3.3 L2 and §3.1 (registered: each
// unit registered in the world as a thing linked to its world links, with a raising date); as
// built for TOW (build-log, Part B, the cases as built): E1's sandbox with a TOW context and TOW
// copies of E1's campaign rules bound to the same hook. Ld at 2525 = 7 with wages withheld,
// 8 with wages paid; the derivation shows the army-list base first, then the world steps.

import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { withdraw } from "../../src/log/log";
import { registerRoster } from "../../src/army/register";
import { eventEntryId, l1Roster, loadSet, loadSheets, EMPIRE_SHEETS, resolveStored, testDeps, TOW_CORE_SHEETS } from "../helpers";

describe("L2 the same list, registered in E1's sandbox", () => {
  let store: MemoryStore;
  const deps = testDeps();
  const read = (date: number) => resolveStored(store, "e1", "nuln_handgunners_tow", date);

  beforeEach(async () => {
    store = new MemoryStore();
    await loadSet(store, deps, "L2");
    await loadSheets(store, deps, "tow", TOW_CORE_SHEETS, { manifest: "tow", defaultPackage: "TOW rulebook" });
    await loadSheets(store, deps, "tow", EMPIRE_SHEETS, { manifest: "tow", defaultPackage: "The Empire of Man" });
    const roster = { ...l1Roster(), key: "nuln_garrison", label: "Nuln garrison" };
    await registerRoster(store, roster, "e1", "tow", [
      {
        unit: "u2",
        key: "nuln_handgunners_tow",
        label: "Nuln Handgunners",
        raised: 2520,
        links: [
          ["raised_at", "nuln"],
          ["member_of", "gunnery_school"],
          ["serves", "handgunner_commission"],
          ["stationed_at", "nuln"],
        ],
      },
    ]);
  });

  it("reads Ld 7 at 2525 with wages withheld: the E1 value, now through the roster", async () => {
    const unit = await read(2525);
    expect(unit.context?.key).toBe("tow");
    expect(unit.values.Ld).toBe(7);
  });

  it("shows the army-list base first, then the world steps", async () => {
    const ld = (await read(2525)).derivations.Ld;
    expect(ld.base).toBe(7);
    expect(ld.baseNote).toBe("army list: State Missile Trooper (State Missile Troops), Forces of Fantasy p. 58");
    expect(ld.baseSteps).toEqual(["Human · Core · Base: 4 3 3 3 3 1 3 1 7", "matches the printed line: no delta stored"]);
    expect(ld.steps.map((s) => [s.ruleKey, s.before, s.after])).toEqual([
      ["nuln_civic_pride_tow", 7, 8],
      ["gunnery_school_pride_tow", 8, 8],
      ["unpaid_wages_tow", 8, 7],
    ]);
  });

  it("reads Ld 8 once the wages are paid (the entry withdrawn)", async () => {
    const wages = await eventEntryId(store, "e1", "wages_withheld_2524");
    await withdraw(store, deps, "e1", wages, "paid after all");
    expect((await read(2525)).values.Ld).toBe(8);
  });

  it("only TOW's copies of the rules land on it: the WFB 6th rules are another game's", async () => {
    const unit = await read(2525);
    expect(unit.rules.map((r) => r.ruleKey).sort()).toEqual(["gunnery_school_pride_tow", "nuln_civic_pride_tow", "unpaid_wages_tow"]);
  });

  it("is still the printed line, read before it was raised", async () => {
    const unit = await read(2519);
    expect(unit.notYetRaised).toBe(true);
    expect(unit.values.Ld).toBe(7);
    expect(unit.derivations.Ld.baseNote).toBe("army list: State Missile Trooper (State Missile Troops), Forces of Fantasy p. 58 (not raised until 2520)");
  });
});
