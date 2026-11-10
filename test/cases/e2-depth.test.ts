// E2. Order within a step by depth. Design: design/test-corpus-v2.md E2;
// design/rules-overlay.md §8 ("nearer applies later"). Required for slice 0.

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { fixtureText, loadFixture, resolveStored, testDeps } from "../helpers";

describe("E2 order within a step by depth", () => {
  it("applies Wissenland (farther) then Nuln (nearer): 8", async () => {
    const store = new MemoryStore();
    await loadFixture(store, testDeps(), "e2-depth.yaml");
    const ld = (await resolveStored(store, "nuln_handgunners", 2525)).derivations.Ld;

    expect(ld.final).toBe(8);
    expect(ld.steps.map((s) => s.ruleKey)).toEqual(["wissenland_discipline", "nuln_civic_pride"]);
    expect(ld.steps[1].decidedBy).toBe("depth");
    expect(ld.steps[1].ifSwappedWithPrevious).toBe(7); // Nuln then Wissenland would give 7
  });

  it("is 8 in any order when Wissenland's discipline is written @statline", async () => {
    const text = fixtureText("e2-depth.yaml").replace("[Ld, =7, inline]", "[Ld, =7, statline]");
    const store = new MemoryStore();
    await loadFixture(store, testDeps(), "e2-depth.yaml", text);
    const ld = (await resolveStored(store, "nuln_handgunners", 2525)).derivations.Ld;

    expect(ld.final).toBe(8);
    expect(ld.steps.map((s) => [s.ruleKey, s.targetPoint])).toEqual([
      ["wissenland_discipline", "statline"],
      ["nuln_civic_pride", "inline"],
    ]);
    expect(ld.steps[1].decidedBy).toBe("target point");
  });

  it("falls to the bag with a clash notice when depth can't decide", async () => {
    // Both rules on Nuln itself: equal depth, so nothing decides the order.
    const text = fixtureText("e2-depth.yaml").replace("reaches(wissenland, raised_at > in*)", "reaches(nuln, raised_at > in*)");
    const store = new MemoryStore();
    await loadFixture(store, testDeps(), "e2-depth.yaml", text);
    const unit = await resolveStored(store, "nuln_handgunners", 2525);

    expect(unit.derivations.Ld.steps[1].decidedBy).toBe("bag");
    expect(unit.clashes.map((c) => c.message)).toEqual(["Ld 8 as ordered, 7 if reversed"]);
  });
});
