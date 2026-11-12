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
