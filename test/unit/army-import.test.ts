// The army sheets importer: cells, the owner's expressions, CSV / workbook / YAML giving the same
// content, the read-back for sign-off, and the problems an import reports.
// Design: design/text-format-and-csv.md §1–3, §7–8; build-log Part B owner decisions 5–16.

import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { MemoryStore } from "../../src/store/memory-store";
import { readCost, readRange, readStat, splitTop } from "../../src/army/cells";
import { readLimits, readOptions, readSlots } from "../../src/army/options";
import { buildSheetsDraft } from "../../src/army/import-sheets";
import { cardsToYamlObjects, parseCsv, sheetFromTable, sheetsFromYaml, writeCsv } from "../../src/army/sheets";
import { buildArmyLibrary } from "../../src/army/library";
import { resolveCard } from "../../src/army/card";
import { cardPlainText, cardText } from "../../src/army/read-back";
import { fitLine } from "../../src/army/fit";
import { refreshDraft } from "../../src/import/draft";
import { EMPIRE_SHEETS, loadTowEmpire, readSheets, testDeps } from "../helpers";

describe("cells", () => {
  it("splits only at the top level", () => {
    expect(splitTop("A(x;y);[B OR C;Mandatory];D", ";")).toEqual(["A(x;y)", "[B OR C;Mandatory]", "D"]);
  });

  it("reads stats: absolute, delta, none, a rider's bonus", () => {
    expect(readStat("4")).toEqual({ kind: "absolute", value: 4 });
    expect(readStat("+1")).toEqual({ kind: "delta", value: 1 });
    expect(readStat("-")).toEqual({ kind: "none" });
    expect(readStat("(+1)")).toEqual({ kind: "rider", value: 1 });
    expect(readStat("")).toEqual({ kind: "blank" });
  });

  it("reads costs: per model (~pi), a delta, flat", () => {
    expect(readCost("21~pi")).toEqual({ amount: 21, perModel: true });
    expect(readCost("+6")).toEqual({ amount: 6, perModel: false });
    expect(readCost("0~pi")).toEqual({ amount: 0, perModel: true });
  });

  it("reads sizes in the owner's and the book's forms, and >= / <=", () => {
    expect(readRange("10-")).toEqual({ min: 10, max: null, perModelOf: null });
    expect(readRange("10+")).toEqual({ min: 10, max: null, perModelOf: null });
    expect(readRange(">=10")).toEqual({ min: 10, max: null, perModelOf: null });
    expect(readRange("-1")).toEqual({ min: 0, max: 1, perModelOf: null });
    expect(readRange("0-1")).toEqual({ min: 0, max: 1, perModelOf: null });
    expect(readRange("2-12")).toEqual({ min: 2, max: 12, perModelOf: null });
    expect(readRange("1 per (Empire Knights)")).toEqual({ min: 1, max: 1, perModelOf: "Empire Knights" });
  });
});

describe("the owner's expressions", () => {
  it("reads a must-take-one group with a swap (the Empire Knights' weapons)", () => {
    const cell = readOptions("[Great Weapons(add;+1~pi) OR Lances(add;+1~pi) OR Great Weapons(replace~Shield;0~pi);Mandatory]");
    expect(cell.problems).toEqual([]);
    const [group] = cell.groups;
    expect(group.mandatory).toBe(true);
    expect(group.members.map((m) => [m.name, m.cost?.amount, m.replaces])).toEqual([
      ["Great Weapons", 1, []],
      ["Lances", 1, []],
      ["Great Weapons", 0, ["Shield"]],
    ]);
  });

  it("reads a mount option that grants the mounted unit's troop type and rules", () => {
    const [group] = readOptions("[Barded Warhorse~Mount(add;+16)[Troop Type(Heavy Cavalry);Counter Charge] OR Pegasus~Mount(add;+30)]").groups;
    expect(group.members[0]).toMatchObject({ name: "Barded Warhorse", isMount: true, grants: ["Troop Type(Heavy Cavalry)", "Counter Charge"] });
  });

  it("reads budgets, swaps of the standard, inheritance words", () => {
    const cell = readOptions("+Magic Standard (replace~Standard;0-50 total;0-1);-War Altar of Sigmar~Mount;None");
    expect(cell.groups[0].members[0]).toMatchObject({ name: "Magic Standard", additive: true, replaces: ["Standard"], budget: { min: 0, max: 50 } });
    expect(cell.removals).toEqual(["War Altar of Sigmar"]);
    expect(cell.removeAll).toBe(true);
  });

  it("reads a parameter change on a rule (Wizard level)", () => {
    const [group] = readOptions("Wizard(4)(replace~Wizard(3);30)").groups;
    expect(group.members[0]).toMatchObject({ name: "Wizard(4)", replaces: ["Wizard(3)"], cost: { amount: 30 } });
  });

  it("reads slots: from rows, inline, crew", () => {
    const cell = readSlots("C(slots);M(0-1;upgrade;+6);Crew(3;crew;0)");
    expect(cell.slots.map((s) => [s.link, s.fromRows, s.count?.max ?? null, s.type, s.cost?.amount ?? null])).toEqual([
      ["C", true, null, null, null],
      ["M", false, 1, "upgrade", 6],
      ["Crew", false, 3, "crew", 0],
    ]);
  });

  it("reads limits: a set, a sub-item, cross-entry, percent", () => {
    const cell = readLimits("rules options~0-1~1000 roster target;SB(Magic Standard)~0-1~1000 roster target");
    expect(cell.limits.map((l) => [l.what, l.range.max, l.perPoints, l.basis])).toEqual([
      ["rules options", 1, 1000, "roster target"],
      ["SB(Magic Standard)", 1, 1000, "roster target"],
    ]);
    expect(readLimits("unit(Great Cannon,Mortar)~0-3~1000 roster target").limits[0].units).toEqual(["Great Cannon", "Mortar"]);
    expect(readLimits("points~25%-~roster target").limits[0]).toMatchObject({ percent: true, range: { min: 25, max: null } });
  });
});

describe("importing the fixture Empire", () => {
  it("has no errors; warns of the rulebook rules not entered yet, as stubs", async () => {
    const store = new MemoryStore();
    const [core, empire] = await loadTowEmpire(store, testDeps());
    expect(core.problems).toEqual([]);
    expect(empire.problems.filter((p) => p.severity === "error")).toEqual([]);
    expect(empire.problems.map((p) => p.message)).toContain("State Troops: not entered yet (stubs, incomplete): Close Order, Detachment, Regimental Unit");
  });

  it("matches plurals to their item, and says so in the derivation", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const lib = buildArmyLibrary(await store.listContent());
    const troops = resolveCard(lib, lib.cardsByKey.get("the_empire_of_man.state_troops")!);
    expect(troops.matches).toEqual(["Halberds → Halberd (plural)", "Thrusting Spears → Spear (alias, plural)", "Shields → Shield (plural)"]);
    expect(troops.stubs).toEqual(["Close Order", "Detachment", "Regimental Unit"]);
  });

  it("reads a workbook (.xlsx) into the same content as the CSVs", async () => {
    const csv = await readSheets("tow", EMPIRE_SHEETS);
    const xlsx = await readSheets("tow", ["empire.xlsx"]);
    const opts = { manifest: "tow", defaultPackage: "The Empire of Man" };
    const deps = { newId: () => "d", now: () => "t" };
    const a = buildSheetsDraft(csv.sheets, "x", opts, { content: [], loggedEventKeys: {} }, deps);
    const b = buildSheetsDraft(xlsx.sheets, "x", opts, { content: [], loggedEventKeys: {} }, deps);
    expect(b.content.map((c) => c.item)).toEqual(a.content.map((c) => c.item));
  });

  it("keeps a workbook's sheets as CSV, so its draft rebuilds to the same content", async () => {
    const xlsx = await readSheets("tow", ["empire.xlsx"]);
    const opts = { manifest: "tow", defaultPackage: "The Empire of Man" };
    const deps = { newId: () => "d", now: () => "t" };
    const draft = buildSheetsDraft(xlsx.sheets, "x", opts, { content: [], loggedEventKeys: {} }, deps);
    expect(draft.files?.map((f) => f.name)).toEqual(["empire.xlsx › Army Entry", "empire.xlsx › Equipment", "empire.xlsx › Rules"]);
    const rebuilt = refreshDraft(draft, { content: [], loggedEventKeys: {} });
    expect(rebuilt.content).toEqual(draft.content);
    expect(rebuilt.problems).toEqual(draft.problems);
  });

  it("reads the YAML form (one block per card, rows nested) into the same content", async () => {
    const csv = await readSheets("tow", ["army-entry.csv"]);
    const yaml = stringify(cardsToYamlObjects(csv.sheets[0].rows.map((r) => r.cells)));
    const fromYaml = sheetsFromYaml("army-entry.yaml", yaml);
    if ("error" in fromYaml) throw new Error(fromYaml.error);
    expect(fromYaml[0].rows.map((r) => r.cells)).toEqual(csv.sheets[0].rows.map((r) => r.cells));
  });

  it("writes CSV that reads back unchanged", async () => {
    const table = parseCsv('Unit,Equipment Options\nState Troops,"[Halberds(add;+1~pi) OR Thrusting Spears(add;+1~pi)];Shields(add;+1~pi)"\n');
    expect(parseCsv(writeCsv(table))).toEqual(table);
    expect(sheetFromTable("data.csv", table).kind).toBe(null); // no Type / Name columns, no telling file name: not recognised
    expect(sheetFromTable("army-entry.csv", table).kind).toBe("army entry"); // the file name says which
  });
});

describe("the read-back for sign-off", () => {
  it("reads the Handgunners' card like the book, then the derivation", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const lib = buildArmyLibrary(await store.listContent());
    const text = cardText(resolveCard(lib, lib.cardsByKey.get("the_empire_of_man.state_missile_troops")!));
    expect(text.title).toBe("State Missile Troops");
    expect(text.subtitle).toBe("Forces of Fantasy, p. 58 · Core");
    expect(text.table.rows).toEqual([
      ["State Missile Trooper", "4", "3", "3", "3", "3", "1", "3", "1", "7", "7"],
      ["Sergeant", "4", "3", "4", "3", "3", "1", "3", "1", "7", "+5"],
    ]);
    expect(text.facts).toEqual([
      ["Troop Type", "Regular Infantry"],
      ["Base Size", "25*25(mm)"],
      ["Unit Size", "10+"],
      ["Equipment", "Hand Weapon, Crossbow"],
    ]);
    expect(text.options).toEqual([
      "• The entire unit may take Handguns instead of Crossbow … +1 point per model",
      "• The entire unit may take Light Armour … +1 point per model",
      "• Upgrade one model to a Sergeant (champion) … +5 points per unit",
      "  • A Sergeant may take one of the following:",
      "    - Brace of Pistols instead of Crossbow or Handgun … +5 points",
      "    - Hochland Long Rifle instead of Crossbow or Handgun … +8 points",
      "    - Repeater Handgun instead of Crossbow or Handgun … +5 points",
      "• Upgrade one model to a standard bearer … +5 points per unit",
      "  • A standard bearer may take Magic Standard instead of Standard (up to 25 points in total)",
      "• Upgrade one model to a musician … +5 points per unit",
      "• 0-1 unit per 1,000 points may:",
      "  • May have the Drilled special rule … +1 point per model",
      "• Limit: SB(Magic Standard) 0-1 per 1,000 points of the roster target",
    ]);
    expect(text.derivation).toEqual([
      "State Missile Trooper (Human · Core · Base):",
      "  Human · Core · Base: 4 3 3 3 3 1 3 1 7",
      "  matches the printed line: no delta stored",
      "Sergeant (unit line + slot):",
      "  State Missile Trooper's line: 4 3 3 3 3 1 3 1 7",
      "  the slot: BS +1",
      "Matched: Handguns → Handgun (plural)",
    ]);
    expect(cardPlainText(text)).toContain("Special Rules: Close Order, Detachment, Regimental Unit");
  });
});

describe("fit on import", () => {
  it("suggests the closest race cell, and the delta it would store", async () => {
    const store = new MemoryStore();
    await loadTowEmpire(store, testDeps());
    const lib = buildArmyLibrary(await store.listContent());
    const fits = fitLine(lib.races, { M: 4, WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 8 }, 2);
    expect(fits[0]).toEqual({ race: "Human", tree: "Professional", rank: "Veteran", changes: [] });
    expect(fits[1].changes.length).toBeGreaterThan(0);
  });
});
