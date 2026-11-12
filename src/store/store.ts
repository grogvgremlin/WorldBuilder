// The storage seam: the one interface every read and write of stored data goes through.
// Design: design/infra.md §1 (stored vs derived: log entries, content, draft batches),
// §2 (no hard delete of committed entries; discarding draft items is the only real delete);
// build/slice-1-brief.md §2.1 (containers: one log per sandbox; content lives in the library
// or in a sandbox). CLAUDE.md "Storage": IndexedDB behind this seam; an in-memory version for tests.
//
// What the seam does NOT offer, on purpose:
//   - no way to change or delete a log entry (each sandbox's log is append-only);
//   - no query on fields inside a sealed entry (only the envelope is visible here).
// The sandbox a log belongs to is the log's partition, like a file name: not a field inside
// the seal.

import type { LogEnvelope, ContentItem, DraftBatch, Meta, WholeCopy } from "../schema";

export interface Store {
  // Logs: one per sandbox, append-only. Entries come back in the order they were appended.
  appendEntry(sandbox: string, entry: LogEnvelope): Promise<void>;
  listEntries(sandbox: string): Promise<LogEnvelope[]>;

  // Content: put by (space, key). A deploy replaces the item with the same space and key.
  putContent(items: ContentItem[]): Promise<void>;
  listContent(): Promise<ContentItem[]>;

  // Draft batches: outside the log until deployed; discarding deletes.
  putDraft(draft: DraftBatch): Promise<void>;
  listDrafts(): Promise<DraftBatch[]>;
  deleteDraft(id: string): Promise<void>;

  // Small settings: device ID, persistent-storage answer, which sandbox is open.
  getMeta(): Promise<Meta>;
  setMeta(name: string, value: string | number | boolean): Promise<void>;

  // Whole copy: used by export / import and by "wipe".
  exportCopy(exportedTime: string): Promise<WholeCopy>;
  replaceWithCopy(copy: WholeCopy): Promise<void>;
  wipe(): Promise<void>;
}

// Library items plus one sandbox's world: everything a resolve in that sandbox can see.
export function contentForSandbox(all: ContentItem[], sandbox: string | null): ContentItem[] {
  return all.filter((item) => item.space === "library" || item.space === sandbox);
}
