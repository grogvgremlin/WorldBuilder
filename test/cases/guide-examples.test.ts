// The "try" examples in build/yaml-guide.md, run against the real import and resolver,
// so the guide can't drift from what the app does.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { importToDraft, loadFixture, resolveStored, testDeps } from "../helpers";

const guide = readFileSync(join(__dirname, "..", "..", "build", "yaml-guide.md"), "utf8");

function example(id: string): string {
  const match = new RegExp("```yaml " + id + "\\n([\\s\\S]*?)```").exec(guide);
  if (!match) throw new Error("no example " + id + " in the guide");
  return match[1];
}

describe("guide examples", () => {
  it("try-1 and try-2: garrison pride, then the move to Altdorf", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadFixture(store, deps, "e1-handgunners.yaml");
    await loadFixture(store, deps, "try-1", example("try-1"));

    const ld2525 = (await resolveStored(store, "nuln_handgunners", 2525)).derivations.Ld;
    expect(ld2525.final).toBe(8);
    expect(ld2525.steps.map((s) => [s.ruleKey, s.after])).toEqual([
      ["nuln_civic_pride", 8],
      ["gunnery_school_pride", 8],
      ["unpaid_wages", 7],
      ["nuln_garrison_pride", 8],
    ]);
    expect(ld2525.steps[3].decidedByNote).toBe("house runs after book");

    const draft = await importToDraft(store, deps, example("try-2"));
    expect(draft.content.map((c) => [c.item.key, c.status])).toEqual([
      ["handgunners_move", "new"],
      ["altdorf", "new"],
      ["nuln_handgunners~stationed_at~nuln~2520", "edit"],
      ["nuln_handgunners~stationed_at~altdorf~2526", "new"],
    ]);
    await loadFixture(store, deps, "try-2", example("try-2"));
    expect((await resolveStored(store, "nuln_handgunners", 2525)).values.Ld).toBe(8);
    const ld2526 = (await resolveStored(store, "nuln_handgunners", 2526)).derivations.Ld;
    expect(ld2526.final).toBe(7);
    expect(ld2526.lost.map((l) => [l.ruleKey, l.outcome])).toEqual([["nuln_garrison_pride", "scope not matched"]]);
  });

  it("try-3: a bag that clashes", async () => {
    const store = new MemoryStore();
    await loadFixture(store, testDeps(), "try-3", example("try-3"));
    const unit = await resolveStored(store, "middenheim_swordsmen", 2525);
    expect(unit.values.S).toBe(8);
    expect(unit.clashes.map((c) => c.message)).toEqual(["S 8 as ordered, 7 if reversed"]);
  });

  it("try-4: mistakes are reported per line and the rest imports", async () => {
    const store = new MemoryStore();
    const draft = await importToDraft(store, testDeps(), example("try-4"));
    expect(draft.content.map((c) => c.item.key)).toEqual(["mistakes", "kemperbad", "unknown_place"]);
    expect(draft.problems.map((p) => [p.line, p.message])).toEqual([
      [8, "set needs a target point: statline, inline or end"],
      [14, "scope: the condition ends too early"],
      [17, "missing reference nowhere in scope"],
    ]);
  });
});
