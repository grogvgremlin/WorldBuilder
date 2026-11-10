// E1. Handgunners' Ld: 8 or 7. Design: design/test-corpus-v2.md E1;
// design/rules-overlay.md §8, §12–13. Required for slice 0.

import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { withdraw } from "../../src/log/log";
import { eventEntryId, loadFixture, resolveStored, testDeps } from "../helpers";

describe("E1 Handgunners' Ld", () => {
  let store: MemoryStore;
  const deps = testDeps();

  beforeEach(async () => {
    store = new MemoryStore();
    await loadFixture(store, deps, "e1-handgunners.yaml");
  });

  it("is 7 read in 2525 with wages withheld in force", async () => {
    const unit = await resolveStored(store, "nuln_handgunners", 2525);
    expect(unit.values.Ld).toBe(7);
  });

  it("folds origin 7 -> 8 (place) -> 8 (organisation), then stationed -1 -> 7", async () => {
    const ld = (await resolveStored(store, "nuln_handgunners", 2525)).derivations.Ld;
    expect(ld.base).toBe(7);
    expect(ld.steps.map((s) => [s.ruleKey, s.step, s.before, s.after])).toEqual([
      ["nuln_civic_pride", "origin", 7, 8],
      ["gunnery_school_pride", "origin", 8, 8],
      ["unpaid_wages", "stationed", 8, 7],
    ]);
  });

  it("shows each scope route, the trigger state and what decided the order", async () => {
    const [pride, school, wages] = (await resolveStored(store, "nuln_handgunners", 2525)).derivations.Ld.steps;

    expect(pride.scope.inputs).toEqual(["route: Nuln Handgunners —raised at→ Nuln"]);
    expect(pride.readDateNote).toBe("as of raising, 2520");
    expect(pride.decidedBy).toBe("first");

    expect(school.scope.inputs).toEqual(["route: Nuln Handgunners —member of→ Gunnery School"]);
    expect(school.decidedBy).toBe("category");
    expect(school.ifSwappedWithPrevious).toBe(9); // = 8 then +1 would give 9

    expect(wages.scope.text).toBe("named scope “commissioned by the treasury”");
    expect(wages.scope.children[0].inputs).toEqual([
      "route: Nuln Handgunners —serves→ Handgunners' commission —paid by→ Wissenland treasury",
    ]);
    expect(wages.trigger?.result).toBe("true");
    expect(wages.trigger?.inputs[0]).toMatch(/^Wages withheld in force since 2524 \(log entry e-\d+\)$/);
    expect(wages.readDateNote).toBe("now, 2525");
    expect(wages.decidedBy).toBe("step");
  });

  it("raises no clash notice: the category decided the order", async () => {
    const unit = await resolveStored(store, "nuln_handgunners", 2525);
    expect(unit.clashes).toEqual([]);
  });

  it("is 8 once the wages entry is withdrawn; the entry stays in the log", async () => {
    const wagesEntry = await eventEntryId(store, "wages_withheld_2524");
    const before = (await store.listEntries()).length;
    await withdraw(store, deps, wagesEntry, "paid after all");

    expect((await store.listEntries()).length).toBe(before + 1); // appended, nothing deleted
    const unit = await resolveStored(store, "nuln_handgunners", 2525);
    expect(unit.values.Ld).toBe(8);

    const lost = unit.derivations.Ld.lost.find((l) => l.ruleKey === "unpaid_wages");
    expect(lost?.outcome).toBe("trigger false");
    const tree = unit.rules.find((r) => r.ruleKey === "unpaid_wages")!;
    expect(tree.applies).toBe(false);
    expect(tree.tests.map((t) => [t.name, t.result])).toEqual([
      ["scope matched", "true"],
      ["trigger true", "false"],
      ["not switched off", "true"],
      ["not ignored", "true"],
    ]);
  });

  it("is 8 read in 2523, before the wages were withheld", async () => {
    const unit = await resolveStored(store, "nuln_handgunners", 2523);
    expect(unit.values.Ld).toBe(8);
  });
});
