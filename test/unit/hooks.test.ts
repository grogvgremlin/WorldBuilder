// Hook objects: world items that game rules trigger on; an inline trigger makes its hook.
// Design: design/rules-overlay.md §5, §5.1; owner decisions of 14–15 Nov (build log).

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { contentForSandbox } from "../../src/store/store";
import { acceptedEntries, withdraw } from "../../src/log/log";
import { OWNER } from "../../src/log/unseal";
import { buildDraft } from "../../src/import/draft";
import { hookStates } from "../../src/overlay/hooks";
import { eventEntryId, fixtureText, loadFixture, loadSet, resolveStored, testDeps } from "../helpers";

async function states(store: MemoryStore, sandbox: string, date: number) {
  const content = contentForSandbox(await store.listContent(), sandbox);
  return hookStates(content, acceptedEntries(await store.listEntries(sandbox), OWNER), date, null);
}

describe("hooks", () => {
  it("E1's 'Treasury not paying' is a world hook: true while the wages are withheld", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    const [treasury] = await states(store, "e1", 2525);
    expect(treasury.hook).toMatchObject({ key: "treasury_not_paying", space: "e1", fromRule: null });
    expect(treasury.trace?.result).toBe("true");
    expect(treasury.rules.map((r) => r.key)).toEqual(["unpaid_wages"]);
    expect((await states(store, "e1", 2523))[0].trace?.result).toBe("false");

    await withdraw(store, deps, "e1", await eventEntryId(store, "e1", "wages_withheld_2524"), "paid");
    expect((await states(store, "e1", 2525))[0].trace?.result).toBe("false");
    expect((await resolveStored(store, "e1", "nuln_handgunners", 2525)).values.Ld).toBe(8);
  });

  it("an inline trigger makes its hook, so it shows like any other", async () => {
    const store = new MemoryStore();
    await loadSet(store, testDeps(), "E4");
    const all = await states(store, "e4", 2525);
    expect(all.map((s) => [s.hook.key, s.hook.fromRule, s.perUnit])).toEqual([
      ["averland_levy_while_elector_holds~trigger", "averland_levy_while_elector_holds", true],
      ["averland_spinach_strength~trigger", "averland_spinach_strength", false],
    ]);
    const levy = (await resolveStored(store, "e4", "grenzstadt_spearmen", 2525)).derivations.Ld.lost[0];
    expect(levy.trigger?.text).toBe("hook “When “Averland levy” is on” (made from the rule's own trigger)");
  });

  it("a rule on a hook that doesn't exist reads 'can't tell' and doesn't apply", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    await loadFixture(store, deps, "w", fixtureText("e1-world.yaml").replace("treasury_not_paying]", "treasury_unpaid]"));
    const unit = await resolveStored(store, "e1", "nuln_handgunners", 2525);
    // Both hooks are now in the sandbox (re-import adds, never deletes); point the rule at a missing one instead.
    expect(unit.values.Ld).toBe(7);
    const rules = fixtureText("e1-campaign-rules.yaml").replace("trigger: treasury_not_paying", "trigger: nobody_paying");
    await loadFixture(store, deps, "r", rules);
    const after = await resolveStored(store, "e1", "nuln_handgunners", 2525);
    expect(after.values.Ld).toBe(8);
    expect(after.derivations.Ld.lost[0].outcome).toBe("trigger can't tell");
  });

  it("puts hooks in sandbox files only, and matches a trigger written as the hook's label", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    const inPackage = buildDraft("package: [P, p]\nhooks:\n  - hook: [H, h]\n    when: in_force(x)\n", "x", { content: [], loggedEventKeys: {} }, deps);
    expect(inPackage.problems[0].message).toBe("“hooks” is world content: it belongs in a sandbox file (start it `sandbox: [label, key]`)");

    await loadSet(store, deps, "E1");
    const byLabel = fixtureText("e1-campaign-rules.yaml").replace("trigger: treasury_not_paying", "trigger: Treasury not paying");
    const draft = buildDraft(byLabel, "r", { content: await store.listContent(), loggedEventKeys: {} }, deps);
    expect(draft.problems).toEqual([]);
    expect(draft.rewrittenText).toContain("    trigger: treasury_not_paying");
  });
});
