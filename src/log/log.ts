// Appending entries, entry status, withdrawal, and reading the log.
// Design: design/infra.md §1–2 (append-only; withdrawal is a new entry, the original stays and
// is skipped by derivations), §6 (status: awaiting host -> accepted / declined), §8 (shape).
//
// Slice 0: one user and no host, so every entry is appended as "accepted".
// "Withdrawn" is never written onto the original: it is read from the withdrawal entry.

import type { EntryBody, EntryStatus, EventRecord, LogEnvelope } from "../schema";
import type { Store } from "../store/store";
import { unseal, type Viewer } from "./unseal";

// Where IDs, times and the device come from. Injected so tests are repeatable.
export interface LogDeps {
  now(): string;
  newId(): string;
  device: string;
  person: string;
}

// What a caller says when appending an entry.
export interface NewEntry {
  kind: string;
  inWorldDate: number | null;
  targets: string[];
  values: Record<string, unknown>;
  withdraws?: string;
  commitBatch?: string | null;
}

// Builds a complete entry in its full shape. Unused fields are present but empty.
export function makeEntry(deps: LogDeps, input: NewEntry): LogEnvelope {
  const body: EntryBody = {
    identity: { actor: deps.person, enteredBy: deps.person, signOffs: [] },
    status: { value: "accepted", reason: null },
    order: {
      inWorldDate: input.inWorldDate,
      iteration: 0,
      orderKey: null,
      timeOfDay: null,
      effectiveTime: null,
    },
    content: {
      kind: input.kind,
      source: { proposed: null, committed: null, reason: null },
      targets: input.targets,
      values: input.values,
      links: {
        commitBatch: input.commitBatch ?? null,
        causedBy: null,
        dependsOn: [],
        withdraws: input.withdraws ?? null,
      },
      originatingCalendar: null,
    },
    visibility: { grants: {} },
  };
  return {
    id: deps.newId(),
    recordedTime: deps.now(),
    device: deps.device,
    hostSeq: null,
    seal: { form: "plain", body },
  };
}

// Appends an event entry ("wages withheld"). Returns the new entry's ID.
export async function appendEvent(
  store: Store,
  deps: LogDeps,
  event: EventRecord,
  inWorldDate: number,
  commitBatch: string | null = null,
): Promise<string> {
  const entry = makeEntry(deps, {
    kind: "event",
    inWorldDate,
    targets: Object.values(event.roles),
    values: { event },
    commitBatch,
  });
  await store.appendEntry(entry);
  return entry.id;
}

// Withdraws an entry ("it never happened") by appending a withdrawal entry.
// The original stays in the log and shows in the audit view.
export async function withdraw(store: Store, deps: LogDeps, entryId: string, reason: string): Promise<string> {
  const entry = makeEntry(deps, {
    kind: "withdrawal",
    inWorldDate: null,
    targets: [entryId],
    values: { reason },
    withdraws: entryId,
  });
  await store.appendEntry(entry);
  return entry.id;
}

// One entry as a viewer reads it: envelope fields, the unsealed body and its current status.
export interface ReadEntry {
  id: string;
  recordedTime: string;
  device: string;
  hostSeq: number | null;
  body: EntryBody;
  status: EntryStatus; // the stored status, or "withdrawn" if a withdrawal entry applies
  withdrawnBy: string | null;
}

// Reads every entry the viewer can see, in log order, with withdrawals applied.
// This is the audit view: withdrawn entries are included and marked.
export function readLog(entries: LogEnvelope[], viewer: Viewer): ReadEntry[] {
  const readable: ReadEntry[] = [];
  for (const entry of entries) {
    const body = unseal(entry, viewer);
    if (body === null) continue;
    readable.push({
      id: entry.id,
      recordedTime: entry.recordedTime,
      device: entry.device,
      hostSeq: entry.hostSeq,
      body,
      status: body.status.value,
      withdrawnBy: null,
    });
  }
  markWithdrawals(readable);
  return readable;
}

// Marks entries withdrawn by an accepted withdrawal entry that is not itself withdrawn.
// Walks the log from the newest entry back, so withdrawing a withdrawal reinstates the original.
function markWithdrawals(entries: ReadEntry[]): void {
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const target = entry.body.content.links.withdraws;
    if (target === null || entry.status !== "accepted") continue;
    const original = byId.get(target);
    if (original && original.status !== "withdrawn") {
      original.status = "withdrawn";
      original.withdrawnBy = entry.id;
    }
  }
}

// The entries derivations read: accepted, and not withdrawn.
export interface AcceptedEntry {
  id: string;
  body: EntryBody;
}

export function acceptedEntries(entries: LogEnvelope[], viewer: Viewer): AcceptedEntry[] {
  return readLog(entries, viewer)
    .filter((entry) => entry.status === "accepted")
    .map((entry) => ({ id: entry.id, body: entry.body }));
}
