// The owner's container model (decisions of 14 Nov, build log) and the import fixes.
// Design: design/manifest.md §1 (the game; editions are exclusive); rules-overlay.md §12 (the
// category order is the world's, editable per context); items-packages-and-library.md §4 (the
// core is always applied; requires); text-format-and-csv.md §1, §3 (imports land as drafts).

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { contentForSandbox } from "../../src/store/store";
import { acceptedEntries } from "../../src/log/log";
import { OWNER } from "../../src/log/unseal";
import { buildWorld } from "../../src/world/world";
import { readContext } from "../../src/overlay/context";
import { buildDraft, deployDraft, refreshDraft } from "../../src/import/draft";
import { switchPackage } from "../../src/log/log";
import type { ManifestContext } from "../../src/schema";
import { FIXTURE_SETS, fixtureText, importToDraft, loadFixture, loadSet, resolveStored, testDeps } from "../helpers";

async function contextView(store: MemoryStore, sandbox: string) {
  const content = contentForSandbox(await store.listContent(), sandbox);
  const world = buildWorld(content, acceptedEntries(await store.listEntries(sandbox), OWNER));
  return readContext(world, [...world.contexts.values()][0] as ManifestContext);
}

describe("the manifest, the core and the context's groups", () => {
  it("brings the manifest's core first, locked, then books and campaign in order", async () => {
    const store = new MemoryStore();
    await loadSet(store, testDeps(), "E1");
    const view = await contextView(store, "e1");
    expect(view.packages.map((p) => [p.key, p.group, p.locked])).toEqual([
      ["wfb6_base", "core", true],
      ["e1_rules", "books", false],
      ["wissenland_campaign_rules", "campaign", false],
    ]);
    expect(view.warnings).toEqual([]);
  });

  it("won't switch the core off", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    await switchPackage(store, deps, "e1", { context: "wfb6", package: "wfb6_base", on: false, note: "" });
    const view = await contextView(store, "e1");
    expect(view.packages[0].on).toBe(true);
    expect(view.warnings).toEqual(["wfb6_base is core: it can't be switched off as a whole"]);
  });

  it("reads the category order from the context, else the sandbox, else built-in", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    expect((await contextView(store, "e1")).categoryOrder.origin.note).toBe("E1 Nuln default");

    const world = fixtureText("e1-world.yaml").replace(
      "    campaign: [wissenland_campaign_rules]\n",
      "    campaign: [wissenland_campaign_rules]\n    category_order:\n      origin: [organisation, place, title]\n      stationed: [place, organisation, title]\n",
    );
    await loadFixture(store, deps, "e1-world.yaml", world);
    const view = await contextView(store, "e1");
    expect([view.categoryOrder.origin.note, view.categoryOrder.origin.ranks]).toEqual(["WFB 6th order", [["organisation"], ["place"], ["title"]]]);
    expect((await resolveStored(store, "e1", "nuln_handgunners", 2525)).values.Ld).toBe(8); // as C2

    const bare = new MemoryStore();
    await loadFixture(bare, deps, "w", "sandbox: [Bare, bare]\ncontexts:\n  - context: [WFB 6th, wfb6]\n    manifest: wfb6\n");
    expect((await contextView(bare, "bare")).categoryOrder.origin.note).toBe("built-in default");
  });

  it("warns about a package from another edition, or listed in the wrong group", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    await loadFixture(store, deps, "x", "package: [Old FAQ, old_faq]\nedition: wfb5\nlayer: faq\n");
    await loadFixture(store, deps, "y", "package: [Misfiled, misfiled]\nedition: wfb6\nlayer: house\n");
    await loadFixture(store, deps, "w", fixtureText("e1-world.yaml").replace("    books: [e1_rules]\n", "    books: [e1_rules, misfiled]\n    faqs: [old_faq]\n"));
    expect((await contextView(store, "e1")).warnings).toEqual([
      "Misfiled is listed under books but its layer is house",
      "Old FAQ is for edition wfb5, not wfb6",
    ]);
  });

  it("keeps a package local to a sandbox out of the library, and lets that sandbox switch it on", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    const local = "package: [Nuln garrison rules, garrison]\nsandbox: e1\nedition: wfb6\nlayer: campaign\nrules:\n  - rule: [Garrison, garrison_pride]\n    effect: [Ld, 1]\n    scope: reaches(Nuln, stationed_at)\n    nature: environment\n    category: place\n";
    const draft = await importToDraft(store, deps, local);
    expect(draft.target).toEqual({ kind: "sandbox", sandbox: "e1" });
    expect(draft.problems).toEqual([]);
    expect(draft.rewrittenText).toContain("scope: reaches(nuln, stationed_at)"); // matched in e1's world
    await deployDraft(store, deps, draft);
    expect((await store.listContent()).filter((i) => i.key === "garrison").map((i) => i.space)).toEqual(["e1"]);

    await loadFixture(store, deps, "w", fixtureText("e1-world.yaml").replace("campaign: [wissenland_campaign_rules]", "campaign: [wissenland_campaign_rules, garrison]"));
    expect((await resolveStored(store, "e1", "nuln_handgunners", 2525)).values.Ld).toBe(8);
  });

  it("reads a manifest file as one item with its core", () => {
    const draft = buildDraft(fixtureText("wfb6.yaml"), "wfb6.yaml", { content: [], loggedEventKeys: {} }, testDeps());
    expect(draft.target).toEqual({ kind: "library" });
    expect(draft.content.map((c) => [c.item.class, c.item.key, c.item.package])).toEqual([["manifest", "wfb6", "wfb6"]]);
    expect(draft.problems.map((p) => p.message)).toEqual(["missing reference wfb6_base in core"]);
  });

  it("points an old package-with-manifest file to the new shape", () => {
    const old = "package: [Base, wfb6_base]\nmanifest: [WFB, wfb6]\nstats: [M]\n";
    const draft = buildDraft(old, "x", { content: [], loggedEventKeys: {} }, testDeps());
    expect(draft.problems[0].message).toBe("a manifest is a file of its own: start it `manifest: [label, key]`, with stats, bag_order and core");
  });
});

describe("import fixes", () => {
  it("doesn't warn about references to things in other drafts waiting", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    const pending = [];
    for (const name of FIXTURE_SETS.E1) {
      const content = await store.listContent();
      const draft = buildDraft(fixtureText(name), name, { content, loggedEventKeys: {}, pending: pending.flatMap((d) => d.content.map((c) => c.item)) }, deps);
      expect(draft.problems, name).toEqual([]);
      pending.push(draft);
    }
  });

  it("logs an event once when a test world is loaded twice, by refreshing drafts at deploy", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    const drafts = [];
    for (let round = 0; round < 2; round++) {
      for (const name of FIXTURE_SETS.E1) drafts.push(await importToDraft(store, deps, fixtureText(name), name));
    }
    for (const draft of drafts) {
      const loggedEventKeys = { e1: (await store.listEntries("e1")).map(() => "wages_withheld_2524") };
      await deployDraft(store, deps, refreshDraft(draft, { content: await store.listContent(), loggedEventKeys }));
    }
    expect((await store.listEntries("e1")).length).toBe(1);
  });

  it("warns when an import would move an item out of its package", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    const copy = "package: [My copy, my_copy]\nedition: wfb6\nrules:\n  - rule: [Nuln civic pride, nuln_civic_pride]\n    effect: [Ld, 1]\n    scope: reaches(nuln, raised_at)\n    nature: origin\n    category: place\n";
    const draft = await importToDraft(store, deps, copy);
    expect(draft.problems.map((p) => p.message)).toEqual([
      "this replaces the rule nuln_civic_pride in E1 rules, moving it here: use a new key to add a separate one",
    ]);
  });
});
