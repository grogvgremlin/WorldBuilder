// The "try" examples in build/yaml-guide.md, run against the real import and resolver,
// so the guide can't drift from what the app does.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { importToDraft, loadFixture, loadSet, resolveStored, testDeps } from "../helpers";

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
    await loadSet(store, deps, "E1");
    await loadFixture(store, deps, "try-1", example("try-1"));
    await loadFixture(store, deps, "try-1b", example("try-1b"));

    const ld2525 = (await resolveStored(store, "e1", "nuln_handgunners", 2525)).derivations.Ld;
    expect(ld2525.final).toBe(8);
    expect(ld2525.steps.map((s) => [s.ruleKey, s.after])).toEqual([
      ["nuln_civic_pride", 8],
      ["gunnery_school_pride", 8],
      ["nuln_garrison_pride", 9],
      ["unpaid_wages", 8],
    ]);
    expect(ld2525.steps[3].decidedByNote).toBe("campaign runs after house"); // adds commute: no "reversed"

    const draft = await importToDraft(store, deps, example("try-2"));
    expect(draft.problems).toEqual([]);
    expect(draft.content.map((c) => [c.item.key, c.status])).toEqual([
      ["e1", "edit"],
      ["altdorf", "new"],
      ["nuln_handgunners~stationed_at~nuln~2520", "edit"],
      ["nuln_handgunners~stationed_at~altdorf~2526", "new"],
    ]);
    expect(draft.rewrittenText).toContain("[nuln_handgunners, stationed_at, nuln, 2520, 2526]");
    await loadFixture(store, deps, "try-2", example("try-2"));
    expect((await resolveStored(store, "e1", "nuln_handgunners", 2525)).values.Ld).toBe(8);
    const ld2526 = (await resolveStored(store, "e1", "nuln_handgunners", 2526)).derivations.Ld;
    expect(ld2526.final).toBe(7);
    expect(ld2526.lost.map((l) => [l.ruleKey, l.outcome])).toEqual([["nuln_garrison_pride", "scope not matched"]]);
  });

  it("try-3: a bag that clashes", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadFixture(store, deps, "try-3", example("try-3"));
    await loadFixture(store, deps, "try-3b", example("try-3b"));
    const unit = await resolveStored(store, "middenheim_world", "middenheim_swordsmen", 2525);
    expect(unit.values.S).toBe(8);
    expect(unit.clashes.map((c) => c.message)).toEqual(["S 8 as ordered, 7 if reversed"]);
    expect(unit.contextWarnings).toEqual(["manifest wfb6 isn't in the library: built-in defaults used"]);
  });

  it("try-4: mistakes are reported per line and the rest imports", async () => {
    const store = new MemoryStore();
    const draft = await importToDraft(store, testDeps(), example("try-4"));
    expect(draft.content.map((c) => c.item.key)).toEqual(["mistakes", "unknown_place"]);
    expect(draft.problems.map((p) => [p.line, p.message])).toEqual([
      [3, "“things” is world content: it belongs in a sandbox file (start it `sandbox: [label, key]`)"],
      [8, "set needs a target point: statline, inline or end"],
      [14, "scope: the condition ends too early"],
      [19, "missing reference Nowhere at all in scope"],
    ]);
  });
});
