// The acceptance-case worlds from test/fixtures/, bundled so the app can load them.
// Each test world is a set of files (base package, rules, world, log), imported in order.
// Design: build/slice-1-brief.md §7 ("fixtures in test/fixtures/, split by container, loadable
// from the app").

import sets from "../../test/fixtures/sets.json";

const files = import.meta.glob("../../test/fixtures/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export interface Fixture {
  name: string; // file name, e.g. e1-world.yaml
  text: string;
}

const byName = new Map(Object.entries(files).map(([path, text]) => [path.split("/").pop()!, text]));

export const FIXTURE_SETS: { name: string; files: Fixture[] }[] = Object.entries(sets as Record<string, unknown>)
  .filter(([name]) => !name.startsWith("_"))
  .map(([name, list]) => ({ name, files: (list as string[]).map((file) => ({ name: file, text: byName.get(file) ?? "" })) }));

// The fixture army (TOW Empire, a handful of units) as sheets: the rulebook's, then the army's.
// Build-log Part B: the cases as built. Loaded through the same sheets import as a user's files.
const towFiles = import.meta.glob("../../test/fixtures/tow/*.csv", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const towByName = new Map(Object.entries(towFiles).map(([path, text]) => [path.split("/").pop()!, text]));

// Each names the package it makes and the bundled pieces it needs first ("like a python script",
// owner 21 Nov): loading the Empire loads the TOW game, its races and its rules, unless they're
// already in the library.
export interface ArmyFixture {
  name: string;
  package: string; // the package key it makes
  manifest: string;
  defaultPackage: string;
  files: Fixture[];
  needs: string[]; // package keys (or "set:<name>" for a YAML fixture set) loaded first if missing
}

const tow = (names: string[]) => names.map((f) => ({ name: f, text: towByName.get(f) ?? "" }));

export const ARMY_FIXTURES: ArmyFixture[] = [
  { name: "TOW races (sheets)", package: "tow_races", manifest: "tow", defaultPackage: "TOW races", files: tow(["races.csv"]), needs: ["set:TOW"] },
  { name: "TOW rules (sheets)", package: "tow_rules", manifest: "tow", defaultPackage: "TOW rules", files: tow(["core-common-links.csv", "equipment-core.csv"]), needs: ["set:TOW"] },
  { name: "TOW Empire (sheets)", package: "the_empire_of_man", manifest: "tow", defaultPackage: "The Empire of Man", files: tow(["army-entry.csv", "equipment.csv", "rules.csv"]), needs: ["set:TOW", "tow_races", "tow_rules"] },
];
