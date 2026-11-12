// C1. A package switched off in a context. Design: build/slice-1-brief.md §2.2 (C1);
// design/items-packages-and-library.md §4, §10; rules-overlay.md §12.

import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { switchPackage } from "../../src/log/log";
import { loadSet, resolveStored, testDeps } from "../helpers";

describe("C1 a package switched off in a context", () => {
  let store: MemoryStore;
  const deps = testDeps();
  const read = () => resolveStored(store, "e1", "nuln_handgunners", 2525);
  const campaignRules = (on: boolean) =>
    switchPackage(store, deps, "e1", { context: "wfb6", package: "wissenland_campaign_rules", on, note: "" });

  beforeEach(async () => {
    store = new MemoryStore();
    await loadSet(store, deps, "E1");
  });

  it("is 7 with both packages on (E1)", async () => {
    expect((await read()).values.Ld).toBe(7);
  });

  it("is 8 with the campaign rules switched off, shown as 'not in play', not a scope or trigger failure", async () => {
    await campaignRules(false);
    const unit = await read();
    expect(unit.values.Ld).toBe(8);

    const lost = unit.derivations.Ld.lost.find((l) => l.ruleKey === "unpaid_wages")!;
    expect(lost.outcome).toBe("not in play: package off in this context");
    expect(lost.outcomeNote).toBe("Wissenland campaign rules: switched off by owner, 2026-11-12");
    // The scope and trigger still read true: they aren't the reason.
    expect([lost.scope.result, lost.trigger?.result]).toEqual(["true", "true"]);

    const tree = unit.rules.find((r) => r.ruleKey === "unpaid_wages")!;
    expect(tree.tests[0]).toMatchObject({ name: "in play in this context", result: "false" });
  });

  it("is 7 again when switched back on", async () => {
    await campaignRules(false);
    await campaignRules(true);
    const unit = await read();
    expect(unit.values.Ld).toBe(7);
    expect(unit.rules.find((r) => r.ruleKey === "unpaid_wages")!.tests[0].note).toBe(
      "Wissenland campaign rules: switched on by owner, 2026-11-12",
    );
  });

  it("doesn't show rules from packages that aren't in this context at all", async () => {
    await loadSet(store, deps, "E2"); // E2's rules are in the library, but not in E1's context
    const keys = (await read()).rules.map((r) => r.ruleKey);
    expect(keys).not.toContain("wissenland_discipline");
  });
});
