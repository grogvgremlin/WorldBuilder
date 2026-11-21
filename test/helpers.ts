// Shared helpers for the tests: repeatable IDs and times, loading fixtures through the real
// import path (text -> draft -> deploy), and resolving a unit from what is stored.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Store } from "../src/store/store";
import { contentForSandbox } from "../src/store/store";
import { acceptedEntries, readLog, type LogDeps } from "../src/log/log";
import { OWNER } from "../src/log/unseal";
import { buildDraft, deployDraft, saveDraft } from "../src/import/draft";
import { resolveUnit, type UnitResolution } from "../src/overlay/resolve";
import type { DraftBatch, EventRecord } from "../src/schema";
import sets from "./fixtures/sets.json";
import { buildSheetsDraft, type SheetsOptions } from "../src/army/import-sheets";
import { readInputFile, type Sheet } from "../src/army/sheets";
import { PRACTICE, type Roster } from "../src/schema";

export const FIXTURE_SETS = sets as unknown as Record<string, string[]>;

// IDs e-1, e-2 ...; times one second apart from a fixed start.
export function testDeps(): LogDeps {
  let counter = 0;
  let seconds = 0;
  return {
    newId: () => "e-" + ++counter,
    now: () => new Date(Date.UTC(2026, 10, 12, 9, 0, seconds++)).toISOString(),
    device: "test-device",
    person: "owner",
  };
}

export function fixtureText(name: string): string {
  return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

// Event keys already in each sandbox's log, for the draft to skip.
async function loggedEventKeys(store: Store): Promise<Record<string, string[]>> {
  const sandboxes = (await store.listContent()).filter((i) => i.class === "sandbox").map((i) => i.key);
  const result: Record<string, string[]> = {};
  for (const sandbox of sandboxes) {
    result[sandbox] = readLog(await store.listEntries(sandbox), OWNER)
      .filter((e) => e.status === "accepted" && e.body.content.kind === "event")
      .map((e) => (e.body.content.values.event as EventRecord).key);
  }
  return result;
}

// Imports text into a draft, saves it, and returns it (not deployed).
export async function importToDraft(store: Store, deps: LogDeps, text: string, label = "test"): Promise<DraftBatch> {
  const draft = buildDraft(text, label, { content: await store.listContent(), loggedEventKeys: await loggedEventKeys(store) }, deps);
  await saveDraft(store, draft);
  return draft;
}

// Imports and deploys one fixture file (or the text given).
export async function loadFixture(store: Store, deps: LogDeps, name: string, text = fixtureText(name)): Promise<DraftBatch> {
  const draft = await importToDraft(store, deps, text, name);
  await deployDraft(store, deps, draft);
  return draft;
}

// Imports and deploys a whole test world (E1, E2, E4), file by file, in order.
// `replace` swaps one file's text for another (to test a variant).
export async function loadSet(store: Store, deps: LogDeps, set: string, replace: Record<string, string> = {}): Promise<DraftBatch[]> {
  const drafts: DraftBatch[] = [];
  for (const name of FIXTURE_SETS[set]) drafts.push(await loadFixture(store, deps, name, replace[name] ?? fixtureText(name)));
  return drafts;
}

export async function resolveStored(store: Store, sandbox: string, unitKey: string, readDate: number): Promise<UnitResolution> {
  const entries = acceptedEntries(await store.listEntries(sandbox), OWNER);
  const content = contentForSandbox(await store.listContent(), sandbox);
  const resolution = resolveUnit(content, entries, unitKey, readDate, OWNER);
  if (!resolution) throw new Error("no unit " + unitKey + " in " + sandbox);
  return resolution;
}

// The log entry ID of the event entry with this event key.
export async function eventEntryId(store: Store, sandbox: string, eventKey: string): Promise<string> {
  const entry = readLog(await store.listEntries(sandbox), OWNER).find(
    (e) => e.body.content.kind === "event" && (e.body.content.values.event as EventRecord).key === eventKey,
  );
  if (!entry) throw new Error("no event entry " + eventKey);
  return entry.id;
}

// --- Army sheets (Part B) -------------------------------------------------------------------


// Reads fixture files (CSV, YAML, JSON or .xlsx) from test/fixtures/<dir>.
export async function readSheets(dir: string, names: string[]): Promise<{ sheets: Sheet[]; files: { name: string; text: string }[] }> {
  const sheets: Sheet[] = [];
  const files: { name: string; text: string }[] = [];
  for (const name of names) {
    const path = join(__dirname, "fixtures", dir, name);
    const isBinary = name.toLowerCase().endsWith(".xlsx");
    const file = isBinary ? { name, bytes: new Uint8Array(readFileSync(path)) } : { name, text: readFileSync(path, "utf8") };
    const read = await readInputFile(file);
    if ("error" in read) throw new Error(read.error);
    sheets.push(...read);
    files.push({ name, text: isBinary ? "" : (file as { text: string }).text });
  }
  return { sheets, files };
}

// Imports army sheets through a draft and deploys it, like the Import screen does.
export async function loadSheets(store: Store, deps: LogDeps, dir: string, names: string[], options: SheetsOptions): Promise<DraftBatch> {
  const { sheets } = await readSheets(dir, names);
  const draft = buildSheetsDraft(sheets, options.defaultPackage, options, { content: await store.listContent(), loggedEventKeys: {} }, deps);
  await saveDraft(store, draft);
  await deployDraft(store, deps, draft);
  return draft;
}

export const TOW_RACE_SHEETS = ["races.csv"];
export const TOW_RULES_SHEETS = ["core-common-links.csv", "equipment-core.csv"];
export const EMPIRE_SHEETS = ["army-entry.csv", "equipment.csv", "rules.csv"];

// The TOW game's sheets: its races (a package of their own) and its rules (kit and command
// slots, into the manifest's core package). Owner, 21 Nov.
export async function loadTowSheets(store: Store, deps: LogDeps): Promise<DraftBatch[]> {
  const races = await loadSheets(store, deps, "tow", TOW_RACE_SHEETS, { manifest: "tow", defaultPackage: "TOW races" });
  const rules = await loadSheets(store, deps, "tow", TOW_RULES_SHEETS, { manifest: "tow", defaultPackage: "TOW rules" });
  return [races, rules];
}

// The TOW game (YAML), its sheets, then the fixture Empire (sheets).
export async function loadTowEmpire(store: Store, deps: LogDeps): Promise<DraftBatch[]> {
  await loadSet(store, deps, "TOW");
  const game = await loadTowSheets(store, deps);
  const empire = await loadSheets(store, deps, "tow", EMPIRE_SHEETS, { manifest: "tow", defaultPackage: "The Empire of Man" });
  return [...game, empire];
}

const EMPIRE = "the_empire_of_man.";

// L1's roster (as built for TOW): also registered in L2.
export function l1Roster(): Roster {
  return {
    class: "roster",
    key: "pick_up_1000",
    label: "Pick-up game, 1,000 points",
    space: PRACTICE,
    package: null,
    armyList: "forces_of_fantasy_the_empire_of_man",
    target: 1000,
    registration: null,
    units: [
      { id: "u1", card: EMPIRE + "captain_of_the_empire", size: 1, options: [], slots: [], general: true },
      { id: "u2", card: EMPIRE + "state_missile_troops", size: 10, options: ["Handguns"], slots: ["Sergeant", "Musician"], general: false },
      { id: "u3", card: EMPIRE + "state_troops", size: 25, options: ["Halberds"], slots: ["Sergeant", "Standard Bearer", "Musician"], general: false },
      { id: "u4", card: EMPIRE + "empire_greatswords", size: 10, options: [], slots: [], general: false },
      { id: "u5", card: EMPIRE + "helblaster_volley_gun", size: 1, options: [], slots: [], general: false },
      { id: "u6", card: EMPIRE + "helblaster_volley_gun", size: 1, options: [], slots: [], general: false },
    ],
  };
}
