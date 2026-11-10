// The storage seam: the one interface every read and write of stored data goes through.
// Design: design/infra.md §1 (stored vs derived: log entries, content, draft batches),
// §2 (no hard delete of committed entries; discarding draft items is the only real delete).
// CLAUDE.md "Storage": IndexedDB behind this seam; an in-memory version for tests.
//
// What the seam does NOT offer, on purpose:
//   - no way to change or delete a log entry (the log is append-only);
//   - no query on fields inside a sealed entry (only the envelope is visible here).

import type { LogEnvelope, ContentItem, DraftBatch, Meta, WholeCopy } from "../schema";

export interface Store {
  // Log: append-only. Entries come back in the order they were appended.
  appendEntry(entry: LogEnvelope): Promise<void>;
  listEntries(): Promise<LogEnvelope[]>;

  // Content: put by key (a deploy replaces the item with the same key).
  putContent(items: ContentItem[]): Promise<void>;
  listContent(): Promise<ContentItem[]>;

  // Draft batches: outside the log until deployed; discarding deletes.
  putDraft(draft: DraftBatch): Promise<void>;
  listDrafts(): Promise<DraftBatch[]>;
  deleteDraft(id: string): Promise<void>;

  // Small settings: device ID, persistent-storage answer.
  getMeta(): Promise<Meta>;
  setMeta(name: string, value: string | number | boolean): Promise<void>;

  // Whole copy: used by export / import and by "wipe".
  exportCopy(exportedTime: string): Promise<WholeCopy>;
  replaceWithCopy(copy: WholeCopy): Promise<void>;
  wipe(): Promise<void>;
}
