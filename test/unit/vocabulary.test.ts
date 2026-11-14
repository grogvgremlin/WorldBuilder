// "What can I write?" and the warnings for words nothing uses (owner feedback of 15 Nov);
// campaign rules are the ones that name world things.
// Design: design/rules-overlay.md §17 (conditions), §5 (hooks); build/yaml-guide.md §3, §6.

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { contentForSandbox } from "../../src/store/store";
import { acceptedEntries } from "../../src/log/log";
import { OWNER } from "../../src/log/unseal";
import { buildWorld } from "../../src/world/world";
import { readContext } from "../../src/overlay/context";
import { vocabulary } from "../../src/import/vocabulary";
import { readBackCondition } from "../../src/import/read-back";
import { parseExpression } from "../../src/import/expression-text";
import { fixtureText, importToDraft, loadFixture, loadSet, testDeps } from "../helpers";

async function contextWarnings(store: MemoryStore, sandbox: string): Promise<string[]> {
  const content = contentForSandbox(await store.listContent(), sandbox);
  const world = buildWorld(content, acceptedEntries(await store.listEntries(sandbox), OWNER));
  return readContext(world, world.contexts.get("wfb6") ?? null).warnings;
}

describe("what can I write", () => {
  it("lists this world's things, link kinds (with an example), kinds, hooks and scopes", async () => {
    const store = new MemoryStore();
    await loadSet(store, testDeps(), "E1");
    const words = vocabulary(await store.listContent(), "e1");
    expect(words.linkKinds.map((l) => l.kind)).toEqual(["in", "member_of", "paid_by", "raised_at", "serves", "stationed_at"]);
    expect(words.linkKinds.find((l) => l.kind === "paid_by")?.example).toBe("Handgunners' commission → paid_by → Wissenland treasury");
    expect(words.thingKinds).toEqual(["commission", "organisation", "polity", "settlement", "unit"]);
    expect(words.hooks.map((h) => h.key)).toEqual(["treasury_not_paying"]);
    expect(words.scopes.map((s) => s.key)).toEqual(["commissioned_by_the_treasury"]);
    expect(words.things.map((t) => t.key)).toContain("gunnery_school");
    // E1's event is recorded in the log, not the world's history: it counts, with its parts.
    expect(words.eventTypes).toEqual([]);
    const logged = { key: "wages", label: "Wages withheld", kind: "wages_withheld", roles: { withholder: "wissenland_treasury" }, start: 2524, end: null };
    expect(vocabulary(await store.listContent(), "e1", [logged]).eventTypes).toEqual([{ type: "wages_withheld", parts: ["withholder"] }]);
  });

  it("reads a hook in plain words: an event type, its parts, in force", () => {
    const labelOf = (key: string) => ({ wissenland_treasury: "Wissenland treasury", siege: "Siege of Nuln" })[key] ?? key;
    expect(readBackCondition(parseExpression("in_force(wages_withheld, withholder = wissenland_treasury)", "hook"), labelOf)).toBe(
      "an event of type “wages withheld”, with Wissenland treasury as the withholder, is in force",
    );
    expect(readBackCondition(parseExpression("in_force(siege)", "hook"), labelOf)).toBe("the event “Siege of Nuln” is in force");
  });
});

describe("warnings for words nothing uses", () => {
  it("warns in a sandbox file when a route follows a link kind no link uses, or looks for a kind no thing has", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    const text = "sandbox: [E1 Nuln, e1]\nscopes:\n  - scope: [Paid, paid]\n    query: reaches(any treasury, serves > payed_by)\n";
    const draft = await importToDraft(store, deps, text);
    expect(draft.problems.map((p) => [p.line, p.message])).toEqual([
      [3, "link kind “payed_by” in scope paid isn't used by any link in this world, so the route reaches nothing (link kinds in use: in, member_of, paid_by, raised_at, serves, stationed_at)"],
      [3, "no thing in this world is a “treasury” (scope paid; kinds in use: commission, organisation, polity, settlement, unit)"],
    ]);
  });

  it("doesn't warn on a library rule at import, but on the Sandbox tab of a world it reaches nothing in", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    const rules = "package: [Odd, odd]\nedition: wfb6\nlayer: campaign\nrules:\n  - rule: [Odd rule, odd_rule]\n    effect: [Ld, 1]\n    scope: reaches(any settlement, garrisoned_at)\n    nature: environment\n    category: place\n";
    expect((await importToDraft(store, deps, rules)).problems).toEqual([]);
    await loadFixture(store, deps, "odd", rules);
    await loadFixture(store, deps, "w", fixtureText("e1-world.yaml").replace("campaign: [e1_rules, wissenland_campaign_rules]", "campaign: [e1_rules, wissenland_campaign_rules, odd]"));
    expect(await contextWarnings(store, "e1")).toEqual(["Odd rule follows the link kind “garrisoned_at”, which no link in this world uses: it reaches nothing here"]);
  });

  it("warns when a book package's rule names world things: it belongs in campaign", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    const book = "package: [A book, a_book]\nedition: wfb6\nlayer: book\nrules:\n  - rule: [Pride, pride]\n    effect: [Ld, 1]\n    scope: reaches(nuln, raised_at)\n    nature: origin\n    category: place\n  - rule: [Garrison, garrison]\n    effect: [Ld, 1]\n    scope: reaches(any settlement, stationed_at)\n    nature: environment\n    category: place\n";
    expect((await importToDraft(store, deps, book)).problems.map((p) => [p.line, p.message])).toEqual([
      [5, "rule pride names world things (nuln): a rule tied to a world belongs in a campaign package (layer: campaign), and this one is book"],
    ]);
  });
});
