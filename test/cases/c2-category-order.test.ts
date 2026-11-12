// C2. Category order from the context, then a pin. Design: build/slice-1-brief.md §1.2, §2.2
// (C2); design/rules-overlay.md §12 (a category-order edit is the bulk GM fix, dated, shown in
// the derivation; pins remain for a single pair).

import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { pinOrder, setCategoryOrder, withdraw } from "../../src/log/log";
import { loadSet, resolveStored, testDeps } from "../helpers";

describe("C2 category order from the context", () => {
  let store: MemoryStore;
  const deps = testDeps();
  const read = () => resolveStored(store, "e1", "nuln_handgunners", 2525);
  const organisationFirst = () =>
    setCategoryOrder(store, deps, "e1", { context: "wfb6", step: "origin", order: [["organisation"], ["place"], ["title"]] });
  const pinNulnFirst = () =>
    pinOrder(store, deps, "e1", { context: "wfb6", unit: "nuln_handgunners", stat: "Ld", first: "nuln_civic_pride", then: "gunnery_school_pride" });

  beforeEach(async () => {
    store = new MemoryStore();
    await loadSet(store, deps, "E1");
  });

  it("organisation → place: School = 8 then Nuln +1 → 9; stationed −1 → 8", async () => {
    await organisationFirst();
    const ld = (await read()).derivations.Ld;
    expect(ld.steps.map((s) => [s.ruleKey, s.after])).toEqual([
      ["gunnery_school_pride", 8],
      ["nuln_civic_pride", 9],
      ["unpaid_wages", 8],
    ]);
    expect(ld.final).toBe(8);
    expect(ld.steps[1].decidedByNote).toBe(
      "category: place runs after organisation (order organisation → place → title, set for this context by owner, 2026-11-12); reversed it would be 8",
    );
  });

  it("is back to 7 when the override entry is withdrawn", async () => {
    const override = await organisationFirst();
    await withdraw(store, deps, "e1", override, "back to the default");
    expect((await read()).values.Ld).toBe(7);
  });

  it("a pin on this unit: Nuln before the School → 7, shown as pinned", async () => {
    const override = await organisationFirst();
    await withdraw(store, deps, "e1", override, "back to the default");
    await pinNulnFirst();
    const ld = (await read()).derivations.Ld;
    expect(ld.final).toBe(7);
    expect(ld.steps.slice(0, 2).map((s) => [s.ruleKey, s.decidedBy])).toEqual([
      ["nuln_civic_pride", "pin"],
      ["gunnery_school_pride", "pin"],
    ]);
    expect(ld.steps[1].decidedByNote).toBe("pinned: Nuln civic pride before Gunnery School (owner, 2026-11-12); reversed it would be 9");
  });

  it("a pin beats the context's category order for that pair", async () => {
    await organisationFirst();
    await pinNulnFirst();
    expect((await read()).values.Ld).toBe(7);
  });

  it("a pin on one unit doesn't touch another", async () => {
    await pinOrder(store, deps, "e1", { context: "wfb6", unit: "someone_else", stat: "Ld", first: "gunnery_school_pride", then: "nuln_civic_pride" });
    expect((await read()).derivations.Ld.steps[0].ruleKey).toBe("nuln_civic_pride");
  });
});
