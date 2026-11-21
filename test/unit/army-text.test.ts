// Rosters and army packages as text: a roster's YAML re-imports to the same roster; an army
// package's CSV and YAML exports re-import to the same content.
// Design: build/slice-1-brief.md §3.1; design/text-format-and-csv.md §1, §6.

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { readRosterText, writeRosterText, exportPackageCsv, exportPackageYaml } from "../../src/army/roster-text";
import { buildSheetsDraft } from "../../src/army/import-sheets";
import { readInputFile } from "../../src/army/sheets";
import { l1Roster, loadTowEmpire, testDeps } from "../helpers";

describe("a roster as text", () => {
  it("writes YAML naming each unit's entry, and reads it back to the same roster", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const content = await store.listContent();
    const text = writeRosterText(l1Roster(), content);
    expect(text).toContain("unit: [State Missile Troops, the_empire_of_man.state_missile_troops]");
    expect(text).toContain("army_list: [The Empire of Man, forces_of_fantasy_the_empire_of_man]");
    const back = readRosterText(text, content);
    expect(back.problems).toEqual([]);
    expect(back.roster).toEqual(l1Roster());
  });

  it("matches units by name when no key is written, and reports one it can't find", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const text = "roster: Quick list\narmy_list: The Empire of Man\ntarget: 500\nunits:\n  - unit: State Troops\n    size: 20\n  - unit: Empire Halberdiers\n";
    const back = readRosterText(text, await store.listContent());
    expect(back.roster?.units.map((u) => [u.card, u.size])).toEqual([["the_empire_of_man.state_troops", 20]]);
    expect(back.problems.map((p) => p.message)).toEqual(["unit 2: no entry “Empire Halberdiers” in The Empire of Man"]);
  });
});

describe("an army package as text", () => {
  async function reimport(files: Record<string, string>) {
    const sheets = [];
    for (const [name, text] of Object.entries(files)) {
      const got = await readInputFile({ name, text });
      if ("error" in got) throw new Error(got.error);
      sheets.push(...got);
    }
    const draft = buildSheetsDraft(sheets, "x", { manifest: "tow", defaultPackage: "The Empire of Man" }, { content: [], loggedEventKeys: {} }, { newId: () => "d", now: () => "t" });
    // Only the package itself: re-imported alone, the rules it names from the game come back as stubs.
    return draft.content.map((c) => c.item).filter((i) => i.class !== "package" && i.package === "the_empire_of_man");
  }

  it("exports CSV that re-imports to the same content", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const content = await store.listContent();
    const mine = content.filter((i) => i.package === "the_empire_of_man" && i.class !== "package");
    const back = await reimport(exportPackageCsv(content, "the_empire_of_man"));
    expect(back.sort((a, b) => a.key.localeCompare(b.key))).toEqual(mine.sort((a, b) => a.key.localeCompare(b.key)));
  });

  it("exports YAML that re-imports to the same content", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const content = await store.listContent();
    const mine = content.filter((i) => i.package === "the_empire_of_man" && i.class !== "package");
    const back = await reimport({ "the-empire.yaml": exportPackageYaml(content, "the_empire_of_man") });
    expect(back.sort((a, b) => a.key.localeCompare(b.key))).toEqual(mine.sort((a, b) => a.key.localeCompare(b.key)));
  });
});
