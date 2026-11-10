// E4. Grenzstadt spinach, first part (stretch). Design: design/test-corpus-v2.md E4;
// design/rules-overlay.md §7 (origin read as of raising; environment read now).

import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { loadFixture, resolveStored, testDeps } from "../helpers";

describe("E4 Grenzstadt spinach", () => {
  let store: MemoryStore;
  beforeEach(async () => {
    store = new MemoryStore();
    await loadFixture(store, testDeps(), "e4-grenzstadt.yaml");
  });

  it("keeps +1 S in 2525: origin is read as of raising (2520)", async () => {
    const unit = await resolveStored(store, "grenzstadt_spearmen", 2525);
    expect(unit.values.S).toBe(4);
    const step = unit.derivations.S.steps[0];
    expect(step.readDateNote).toBe("as of raising, 2520");
    expect(step.scope.inputs).toEqual(["route: Grenzstadt Spearmen —raised at→ Grenzstadt —in→ Averland"]);
  });

  it("'+1 Ld while the Elector holds Grenzstadt' applies in 2522 and stops in 2523", async () => {
    expect((await resolveStored(store, "grenzstadt_spearmen", 2522)).values.Ld).toBe(8);
    expect((await resolveStored(store, "grenzstadt_spearmen", 2523)).values.Ld).toBe(7);
    const later = await resolveStored(store, "grenzstadt_spearmen", 2525);
    expect(later.values.Ld).toBe(7);
    expect(later.derivations.Ld.lost[0].outcome).toBe("trigger false");
  });
});
