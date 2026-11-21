// Packages that need other packages (owner, 21 Nov: "like a python script"): what an army
// package requires is worked out on import from what its cards drew on; switching it on in a
// context brings those with it; a practice roster reads only its army and what that needs.
// Design: design/items-packages-and-library.md §4 (requires, conflicts; the base package is
// always applied); build-log Part B owner decisions 21–24.

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { contentForSandbox } from "../../src/store/store";
import { acceptedEntries, switchPackage } from "../../src/log/log";
import { OWNER } from "../../src/log/unseal";
import { buildWorld } from "../../src/world/world";
import { readContext } from "../../src/overlay/context";
import { buildArmyLibrary } from "../../src/army/library";
import { resolveCard } from "../../src/army/card";
import { armyContentFor, offerAt, viewRoster } from "../../src/army/roster";
import { buildSheetsDraft } from "../../src/army/import-sheets";
import { readInputFile } from "../../src/army/sheets";
import { deployDraft, saveDraft } from "../../src/import/draft";
import type { Package } from "../../src/schema";
import { EMPIRE_SHEETS, l1Roster, loadSet, loadSheets, loadTowEmpire, loadTowSheets, testDeps } from "../helpers";

async function packages(store: MemoryStore): Promise<Map<string, Package>> {
  return new Map((await store.listContent()).filter((i): i is Package => i.class === "package").map((p) => [p.key, p]));
}

describe("what a package requires, worked out on import", () => {
  it("the Empire needs the TOW races, the TOW rules, its book's common package and its stubs", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const pkgs = await packages(store);
    expect(pkgs.get("the_empire_of_man")?.requires).toEqual(["forces_of_fantasy", "the_empire_of_man_stubs", "tow_races", "tow_rules"]);
    expect(pkgs.get("forces_of_fantasy")?.label).toBe("Forces of Fantasy");
  });

  it("names each package as written, and keeps the name of one already in the library", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const pkgs = await packages(store);
    expect(pkgs.get("tow_races")?.label).toBe("TOW races");
    expect(pkgs.get("tow_rules")?.label).toBe("TOW rules"); // from tow-rules.yaml, the manifest's core
    expect(pkgs.get("tow_rules")?.members).toContain("tow_rules.kit.hand_weapon");
  });

  it("puts a row in the package its Package column names, and adds its Requires", async () => {
    const csv = "Rule,Rules 2,Reference,Package,Requires\nClose Order,Ranks fight well.,TOW;1,TOW rules,\nOddity,Strange.,X;1,House odds,TOW rules\n";
    const sheets = await readInputFile({ name: "rules.csv", text: csv });
    if ("error" in sheets) throw new Error(sheets.error);
    const draft = buildSheetsDraft(sheets, "x", { manifest: "tow", defaultPackage: "Somewhere" }, { content: [], loggedEventKeys: {} }, { newId: () => "d", now: () => "t" });
    const items = draft.content.map((c) => c.item);
    expect(items.filter((i) => i.class === "special_rule").map((i) => [i.key, i.package])).toEqual([
      ["tow_rules.rule.close_order", "tow_rules"],
      ["house_odds.rule.oddity", "house_odds"],
    ]);
    expect(items.find((i): i is Package => i.class === "package" && i.key === "house_odds")).toMatchObject({ label: "House odds", requires: ["tow_rules"] });
  });

  it("makes rules named but not entered into stubs; a real rule of that name, loaded later, wins", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadTowEmpire(store, deps);
    let lib = buildArmyLibrary(await store.listContent());
    expect(lib.rules.get("close order")).toMatchObject({ package: "the_empire_of_man_stubs", cells: { Status: "Stub" } });
    expect(resolveCard(lib, lib.cardsByKey.get("the_empire_of_man.state_troops")!).stubs).toContain("Close Order");

    const sheets = await readInputFile({ name: "rules.csv", text: "Rule,Rules 2,Reference\nClose Order,Fights in ranks.,TOW rulebook\n" });
    if ("error" in sheets) throw new Error(sheets.error);
    const draft = buildSheetsDraft(sheets, "TOW rules", { manifest: "tow", defaultPackage: "TOW rules" }, { content: await store.listContent(), loggedEventKeys: {} }, deps);
    await saveDraft(store, draft);
    await deployDraft(store, deps, draft);
    lib = buildArmyLibrary(await store.listContent());
    expect(lib.rules.get("close order")?.package).toBe("tow_rules");
    expect(resolveCard(lib, lib.cardsByKey.get("the_empire_of_man.state_troops")!).stubs).not.toContain("Close Order");
  });
});

describe("switching a package on brings what it needs", () => {
  async function towContext(store: MemoryStore) {
    const content = contentForSandbox(await store.listContent(), "e1");
    const world = buildWorld(content, acceptedEntries(await store.listEntries("e1"), OWNER));
    return readContext(world, world.contexts.get("tow") ?? null);
  }

  it("switches on the races, the book and the stubs with the Empire, noting why", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "L2");
    await loadTowSheets(store, deps);
    await loadSheets(store, deps, "tow", EMPIRE_SHEETS, { manifest: "tow", defaultPackage: "The Empire of Man" });
    await switchPackage(store, deps, "e1", { context: "tow", package: "the_empire_of_man", on: true, note: "" });
    const view = await towContext(store);
    expect(view.packages.map((p) => [p.key, p.on, p.note.replace(/, 2026.*/, "")])).toEqual([
      ["tow_rules", true, "core of Warhammer: the Old World"],
      ["e1_tow_rules", true, "on by default in The Old World"],
      ["the_empire_of_man", true, "switched on by owner"],
      ["forces_of_fantasy", true, "needed by The Empire of Man"],
      ["the_empire_of_man_stubs", true, "needed by The Empire of Man"],
      ["tow_races", true, "needed by The Empire of Man"],
    ]);
    expect(view.warnings).toEqual([]);
  });

  it("keeps a needed package off when the GM switched it off, and warns", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "L2");
    await loadTowSheets(store, deps);
    await loadSheets(store, deps, "tow", EMPIRE_SHEETS, { manifest: "tow", defaultPackage: "The Empire of Man" });
    await switchPackage(store, deps, "e1", { context: "tow", package: "the_empire_of_man", on: true, note: "" });
    await switchPackage(store, deps, "e1", { context: "tow", package: "tow_races", on: false, note: "" });
    const view = await towContext(store);
    expect(view.packages.find((p) => p.key === "tow_races")?.on).toBe(false);
    expect(view.warnings).toEqual(["The Empire of Man needs TOW races, which is switched off"]);
  });
});

describe("a practice roster reads its army and what that needs, no more", () => {
  it("leaves out an army package the list doesn't need", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadTowEmpire(store, deps);
    const other = await readInputFile({ name: "equipment.csv", text: "Equipment,Match Key,Reference\nHalberd,,Elsewhere;1\n" });
    if ("error" in other) throw new Error(other.error);
    const draft = buildSheetsDraft(other, "Elsewhere", { manifest: "tow", defaultPackage: "Elsewhere" }, { content: await store.listContent(), loggedEventKeys: {} }, deps);
    await saveDraft(store, draft);
    await deployDraft(store, deps, draft);
    const content = await store.listContent();
    const read = armyContentFor(l1Roster(), content);
    expect(read.some((i) => i.class === "equipment" && i.package === "elsewhere")).toBe(false);
    expect(read.some((i) => i.package === "tow_races")).toBe(true);
    expect(viewRoster(l1Roster(), content).total).toBe(650);
  });
});

describe("show options for: what a points value offers", () => {
  it("at 500 points, hides the 0-1 per 1,000 entries and options; at 1,000 or wider, shows them", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const content = await store.listContent();
    const lib = buildArmyLibrary(content);
    const helblaster = resolveCard(lib, lib.cardsByKey.get("the_empire_of_man.helblaster_volley_gun")!);
    const troops = resolveCard(lib, lib.cardsByKey.get("the_empire_of_man.state_troops")!);
    const roster = { ...l1Roster(), target: 500 };
    const at500 = offerAt(roster, content, 500);
    expect(at500.cardOffered(helblaster)).toBe(false);
    expect(at500.cardOffered(troops)).toBe(true);
    const ruleOption = troops.options.find((o) => o.section === "rules");
    if (ruleOption) expect(at500.optionOffered(troops, ruleOption, ruleOption.group.members[0])).toBe(false);
    expect(offerAt(roster, content, 1000).cardOffered(helblaster)).toBe(true);
    expect(offerAt(roster, content, null).cardOffered(helblaster)).toBe(true);
    // Hiding is only what's offered: the issues are worked out the same.
    expect(viewRoster(roster, content).issues.map((i) => i.message)).toContain("Rare war machines: 2 taken, 0-1 per 1,000 points (Helblaster Volley Gun or Helstorm Rocket Battery)");
  });

  it("marks every unit an issue concerns, for highlighting", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const view = viewRoster(l1Roster(), await store.listContent());
    expect(view.issues.find((i) => i.message.startsWith("Rare war machines"))?.affects).toEqual(["u5", "u6"]);
  });
});
