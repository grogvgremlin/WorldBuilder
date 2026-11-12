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
