// Shared helpers for the tests: repeatable IDs and times, loading a fixture through the real
// import path (text -> draft -> deploy), and resolving a unit from what is stored.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Store } from "../src/store/store";
import { acceptedEntries, readLog, type LogDeps } from "../src/log/log";
import { OWNER } from "../src/log/unseal";
import { buildDraft, deployDraft, saveDraft } from "../src/import/draft";
import { resolveUnit, type UnitResolution } from "../src/overlay/resolve";
import type { DraftBatch } from "../src/schema";

// IDs e-1, e-2 ...; times one second apart from a fixed start.
export function testDeps(): LogDeps {
  let counter = 0;
  let seconds = 0;
  return {
    newId: () => "e-" + ++counter,
    now: () => new Date(Date.UTC(2026, 10, 10, 9, 0, seconds++)).toISOString(),
    device: "test-device",
    person: "owner",
  };
}

export function fixtureText(name: string): string {
  return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

// Imports text into a draft, saves it, and returns it (not deployed).
export async function importToDraft(store: Store, deps: LogDeps, text: string, label = "test"): Promise<DraftBatch> {
  const content = await store.listContent();
  const loggedEventKeys = new Set(
    readLog(await store.listEntries(), OWNER)
      .filter((e) => e.status === "accepted" && e.body.content.kind === "event")
      .map((e) => (e.body.content.values.event as { key: string }).key),
  );
  const draft = buildDraft(text, label, { content, loggedEventKeys }, deps);
  await saveDraft(store, draft);
  return draft;
}

// Imports and deploys a fixture.
export async function loadFixture(store: Store, deps: LogDeps, name: string, text = fixtureText(name)): Promise<DraftBatch> {
  const draft = await importToDraft(store, deps, text, name);
  await deployDraft(store, deps, draft);
  return draft;
}

export async function resolveStored(store: Store, unitKey: string, readDate: number): Promise<UnitResolution> {
  const entries = acceptedEntries(await store.listEntries(), OWNER);
  const resolution = resolveUnit(await store.listContent(), entries, unitKey, readDate, OWNER);
  if (!resolution) throw new Error("no unit " + unitKey);
  return resolution;
}

// The log entry ID of the event entry with this event key.
export async function eventEntryId(store: Store, eventKey: string): Promise<string> {
  const entry = readLog(await store.listEntries(), OWNER).find(
    (e) => e.body.content.kind === "event" && (e.body.content.values.event as { key: string }).key === eventKey,
  );
  if (!entry) throw new Error("no event entry " + eventKey);
  return entry.id;
}
