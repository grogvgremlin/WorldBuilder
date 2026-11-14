// E1. Handgunners' Ld: 8 or 7. Design: design/test-corpus-v2.md E1;
// design/rules-overlay.md §8, §12–13. Slice 1: fixtures split by container (world, rules, log).

import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { withdraw } from "../../src/log/log";
import { eventEntryId, loadSet, resolveStored, testDeps } from "../helpers";

describe("E1 Handgunners' Ld", () => {
  let store: MemoryStore;
  const deps = testDeps();
  const read = (date: number) => resolveStored(store, "e1", "nuln_handgunners", date);

  beforeEach(async () => {
    store = new MemoryStore();
    await loadSet(store, deps, "E1");
  });

  it("is 7 read in 2525 with wages withheld in force", async () => {
    expect((await read(2525)).values.Ld).toBe(7);
  });

  it("folds origin 7 -> 8 (place) -> 8 (organisation), then stationed -1 -> 7", async () => {
    const ld = (await read(2525)).derivations.Ld;
    expect(ld.base).toBe(7);
    expect(ld.steps.map((s) => [s.ruleKey, s.step, s.before, s.after])).toEqual([
      ["nuln_civic_pride", "origin", 7, 8],
      ["gunnery_school_pride", "origin", 8, 8],
      ["unpaid_wages", "stationed", 8, 7],
    ]);
  });

  it("shows each scope route, the trigger state and what decided the order", async () => {
    const [pride, school, wages] = (await read(2525)).derivations.Ld.steps;

    expect(pride.scope.inputs).toEqual(["route: Nuln Handgunners —raised at→ Nuln"]);
    expect(pride.readDateNote).toBe("as of raising, 2520");
    expect(pride.decidedBy).toBe("first");
    expect(pride.scopeKind).toBe("Nuln (settlement · polity), read as place");

    expect(school.scope.inputs).toEqual(["route: Nuln Handgunners —member of→ Gunnery School"]);
    expect(school.decidedBy).toBe("category");
    // Q2: the ordering detail goes into the derivation text.
    expect(school.decidedByNote).toBe(
      "category: organisation runs after place (order place → organisation → title, E1 Nuln default); reversed it would be 9",
    );

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
    expect((await read(2525)).clashes).toEqual([]);
  });

  it("is 8 once the wages entry is withdrawn; the entry stays in the log", async () => {
    const wagesEntry = await eventEntryId(store, "e1", "wages_withheld_2524");
    const before = (await store.listEntries("e1")).length;
    await withdraw(store, deps, "e1", wagesEntry, "paid after all");

    expect((await store.listEntries("e1")).length).toBe(before + 1); // appended, nothing deleted
    const unit = await read(2525);
    expect(unit.values.Ld).toBe(8);

    const lost = unit.derivations.Ld.lost.find((l) => l.ruleKey === "unpaid_wages");
    expect(lost?.outcome).toBe("trigger false");
    const tree = unit.rules.find((r) => r.ruleKey === "unpaid_wages")!;
    expect(tree.applies).toBe(false);
    expect(tree.tests.map((t) => [t.name, t.result])).toEqual([
      ["in play in this context", "true"],
      ["scope matched", "true"],
      ["trigger true", "false"],
      ["not switched off", "true"],
      ["not ignored", "true"],
    ]);
  });

  it("shows the printed profile only, read before it was raised (2519)", async () => {
    const unit = await read(2519);
    expect(unit.notYetRaised).toBe(true);
    expect(unit.values.Ld).toBe(7);
    expect(unit.derivations.Ld.steps).toEqual([]);
    expect(unit.derivations.Ld.baseNote).toBe("profile (not raised until 2520)");
    expect(unit.rules).toEqual([]);
    expect((await read(2520)).notYetRaised).toBe(false);
  });

  it("is 8 read in 2523, before the wages were withheld", async () => {
    expect((await read(2523)).values.Ld).toBe(8);
  });

  it("reads its manifest and context", async () => {
    const unit = await read(2525);
    expect(unit.context).toEqual({ key: "wfb6", label: "WFB 6th" });
    expect(unit.manifest?.key).toBe("wfb6");
    expect(unit.statOrder).toEqual(["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"]);
    expect(unit.contextWarnings).toEqual([]);
  });
});
