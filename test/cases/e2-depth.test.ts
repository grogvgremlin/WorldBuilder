// E2. Order within a step by depth. Design: design/test-corpus-v2.md E2;
// design/rules-overlay.md §8 ("nearer applies later").

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { fixtureText, loadSet, resolveStored, testDeps } from "../helpers";

async function ldWith(replace: Record<string, string> = {}) {
  const store = new MemoryStore();
  await loadSet(store, testDeps(), "E2", replace);
  return resolveStored(store, "e2", "nuln_handgunners", 2525);
}

describe("E2 order within a step by depth", () => {
  it("applies Wissenland (farther) then Nuln (nearer): 8", async () => {
    const ld = (await ldWith()).derivations.Ld;
    expect(ld.final).toBe(8);
    expect(ld.steps.map((s) => s.ruleKey)).toEqual(["wissenland_discipline", "nuln_civic_pride_e2"]);
    expect(ld.steps[1].decidedBy).toBe("depth");
    expect(ld.steps[1].ifSwappedWithPrevious).toBe(7); // Nuln then Wissenland would give 7
    expect(ld.steps[1].decidedByNote).toBe("depth: nearer on a shared chain applies later, so after Wissenland discipline; reversed it would be 7");
  });

  it("is 8 in any order when Wissenland's discipline is written @statline", async () => {
    const rules = fixtureText("e2-rules.yaml").replace("[Ld, =7, inline]", "[Ld, =7, statline]");
    const ld = (await ldWith({ "e2-rules.yaml": rules })).derivations.Ld;
    expect(ld.final).toBe(8);
    expect(ld.steps.map((s) => [s.ruleKey, s.targetPoint])).toEqual([
      ["wissenland_discipline", "statline"],
      ["nuln_civic_pride_e2", "inline"],
    ]);
    expect(ld.steps[1].decidedBy).toBe("target point");
  });

  it("falls to the bag with a clash notice when depth can't decide", async () => {
    // Both rules on Nuln itself: equal depth, so nothing decides the order.
    const rules = fixtureText("e2-rules.yaml").replace("reaches(wissenland, raised_at > in*)", "reaches(nuln, raised_at > in*)");
    const unit = await ldWith({ "e2-rules.yaml": rules });
    expect(unit.derivations.Ld.steps[1].decidedBy).toBe("bag");
    expect(unit.clashes.map((c) => c.message)).toEqual(["Ld 8 as ordered, 7 if reversed"]);
  });
});
