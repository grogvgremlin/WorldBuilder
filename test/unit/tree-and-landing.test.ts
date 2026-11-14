// A thing's tree at a date, and the units a rule lands on.
// Design: build/slice-1-brief.md §2.3; design/rules-overlay.md §9, §13.

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { contentForSandbox } from "../../src/store/store";
import { acceptedEntries } from "../../src/log/log";
import { OWNER } from "../../src/log/unseal";
import { buildWorld } from "../../src/world/world";
import { thingTree } from "../../src/world/tree";
import { filterUnits, ruleCheckFor, unitsRuleAppliesTo } from "../../src/overlay/landing";
import { loadFixture, loadSet, testDeps } from "../helpers";

async function e1(extra?: string) {
  const store = new MemoryStore();
  const deps = testDeps();
  await loadSet(store, deps, "E1");
  if (extra) await loadFixture(store, deps, "extra", extra);
  return { content: contentForSandbox(await store.listContent(), "e1"), entries: acceptedEntries(await store.listEntries("e1"), OWNER) };
}

// A second unit, raised in Wissenland but not in Nuln.
const pfeildorf = [
  "sandbox: [E1 Nuln, e1]",
  "things:",
  "  - [Pfeildorf, pfeildorf, [settlement]]",
  "links:",
  "  - [pfeildorf, in, wissenland, 2000]",
  "units:",
  "  - unit: [Pfeildorf Spearmen, pfeildorf_spearmen]",
  "    raised: 2521",
  "    profile: [4, 3, 3, 3, 3, 1, 3, 1, 7]",
  "    links:",
  "      - [raised_at, pfeildorf]",
].join("\n");

describe("a thing's tree", () => {
  it("shows what Nuln reaches, what reaches it, and the rules naming it", async () => {
    const { content, entries } = await e1();
    const tree = thingTree(buildWorld(content, entries), "nuln", 2525);
    expect(tree.reaches.map((b) => b.route)).toEqual([" —in→ Wissenland"]);
    // The unit reaches Nuln by two links; it's listed once, by the first route found.
    expect(tree.reachedBy.map((b) => b.route)).toEqual([" ←raised at— Nuln Handgunners"]);
    expect(tree.rules.map((r) => [r.rule.key, r.via])).toEqual([["nuln_civic_pride", "its scope"]]);
  });

  it("finds rules naming a thing in a trigger, or through a named scope", async () => {
    const { content, entries } = await e1();
    const tree = thingTree(buildWorld(content, entries), "wissenland_treasury", 2525);
    // Unpaid wages reaches the treasury through its hook (and its named scope); the hook is shown.
    expect(tree.rules.map((r) => [r.rule.key, r.via])).toEqual([["unpaid_wages", "hook “Treasury not paying”"]]);
    const commission = thingTree(buildWorld(content, entries), "handgunner_commission", 2525);
    expect(commission.rules).toEqual([]);
  });
});

describe("where a rule lands", () => {
  it("lists only the units Nuln civic pride applies to, each with its route", async () => {
    const { content, entries } = await e1(pfeildorf);
    expect(unitsRuleAppliesTo(content, entries, "nuln_civic_pride", 2525, OWNER)).toEqual([
      { unitKey: "nuln_handgunners", label: "Nuln Handgunners", routes: ["route: Nuln Handgunners —raised at→ Nuln"] },
    ]);
  });

  it("filters units by a link, to ask why not about one of them", async () => {
    const { content, entries } = await e1(pfeildorf);
    const inWissenland = filterUnits(content, entries, { text: "", linkKind: "raised_at", target: "wissenland", orInside: true }, 2525);
    expect(inWissenland.map((u) => u.key)).toEqual(["nuln_handgunners", "pfeildorf_spearmen"]);
    const atNulnOnly = filterUnits(content, entries, { text: "", linkKind: "raised_at", target: "wissenland", orInside: false }, 2525);
    expect(atNulnOnly).toEqual([]);

    const whyNot = ruleCheckFor(content, entries, "nuln_civic_pride", "pfeildorf_spearmen", 2525, OWNER)!;
    expect(whyNot.applies).toBe(false);
    expect(whyNot.tests.find((t) => t.name === "scope matched")?.result).toBe("false");
  });
});
