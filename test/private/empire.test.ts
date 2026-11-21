// The whole TOW Empire (private data, not in this repo): imported through the real path and
// every card read back. Runs only where the private data repo is checked out beside this one
// (../worldbuilder-data) or named by WORLDBUILDER_DATA; skipped everywhere else (CI, Pages).
// Design: build-log, Part B (the whole Empire sheet is the importer's larger test).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { buildSheetsDraft } from "../../src/army/import-sheets";
import { readInputFile, type Sheet } from "../../src/army/sheets";
import { saveDraft, deployDraft } from "../../src/import/draft";
import { buildArmyLibrary } from "../../src/army/library";
import { resolveCard } from "../../src/army/card";
import { cardPlainText, cardText } from "../../src/army/read-back";
import { loadSet, testDeps } from "../helpers";

const DATA = process.env.WORLDBUILDER_DATA ?? join(__dirname, "..", "..", "..", "worldbuilder-data");
const GAME = join(DATA, "working", "tow", "input");
const ARMY = join(DATA, "working", "tow", "forces-of-fantasy", "the-empire", "input");
const present = existsSync(join(ARMY, "army-entry.csv"));

async function read(dir: string, names: string[]): Promise<{ sheets: Sheet[]; files: { name: string; text: string }[] }> {
  const sheets: Sheet[] = [];
  const files: { name: string; text: string }[] = [];
  for (const name of names) {
    const text = readFileSync(join(dir, name), "utf8");
    const got = await readInputFile({ name, text });
    if ("error" in got) throw new Error(got.error);
    sheets.push(...got);
    files.push({ name, text });
  }
  return { sheets, files };
}

describe.skipIf(!present)("the whole TOW Empire (private data)", () => {
  it("imports with no errors, and reads every card back", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "TOW");
    for (const [dir, names, pkg] of [
      [GAME, ["races.csv", "core-common-links.csv", "equipment-core.csv"], "TOW rulebook"],
      [ARMY, ["army-entry.csv", "equipment.csv", "rules.csv"], "The Empire of Man"],
    ] as const) {
      const { sheets, files } = await read(dir, [...names]);
      const draft = buildSheetsDraft(sheets, files, pkg, { manifest: "tow", defaultPackage: pkg }, { content: await store.listContent(), loggedEventKeys: {} }, deps);
      expect(draft.problems.filter((p) => p.severity === "error")).toEqual([]);
      await saveDraft(store, draft);
      await deployDraft(store, deps, draft);
    }
    const lib = buildArmyLibrary(await store.listContent());
    const cards = [...lib.cardsByKey.values()].map((c) => resolveCard(lib, c));
    expect(cards.length).toBeGreaterThan(30);
    // Every card's warnings, apart from rulebook rules not entered yet (stubs).
    const warnings = cards.flatMap((c) => c.warnings.map((w) => c.unit + ": " + w));
    expect(warnings).toEqual([]);
    const knights = cards.find((c) => c.unit === "Empire Knights")!;
    expect(knights.rows.map((r) => [r.name, r.storedDelta])).toEqual([
      ["Empire Knight", ["M = -"]],
      ["Preceptor", ["A +1"]],
      ["Barded Warhorse", []],
    ]);
    for (const c of cards) expect(cardPlainText(cardText(c)).length).toBeGreaterThan(0);
  });
});
