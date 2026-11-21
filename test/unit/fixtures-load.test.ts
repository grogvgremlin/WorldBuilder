// Every fixture set loads with no errors. Guards against a fixture silently not loading (the TOW
// manifest's label had a colon and was skipped, so every TOW context warned "manifest tow isn't
// in the library": owner's report, 21 Nov).

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { FIXTURE_SETS, loadSet, loadTowEmpire, testDeps } from "../helpers";

describe("the fixtures load cleanly", () => {
  for (const set of Object.keys(FIXTURE_SETS).filter((s) => !s.startsWith("_"))) {
    it(set + " has no errors", async () => {
      const drafts = await loadSet(new MemoryStore(), testDeps(), set);
      const errors = drafts.flatMap((d) => d.problems.filter((p) => p.severity === "error").map((p) => d.label + ": " + p.message));
      expect(errors).toEqual([]);
    });
  }

  it("the TOW game and the fixture Empire have no errors", async () => {
    const drafts = await loadTowEmpire(new MemoryStore(), testDeps());
    expect(drafts.flatMap((d) => d.problems.filter((p) => p.severity === "error"))).toEqual([]);
  });
});
