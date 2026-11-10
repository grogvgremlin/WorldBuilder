// In-memory implementation of the storage seam, used by the tests.
// Design: see store.ts.

import type { LogEnvelope, ContentItem, DraftBatch, Meta, WholeCopy } from "../schema";
import type { Store } from "./store";

// Deep copy, so callers can never change what is stored by holding a reference.
function copyOf<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class MemoryStore implements Store {
  private entries: LogEnvelope[] = [];
  private content = new Map<string, ContentItem>();
  private drafts = new Map<string, DraftBatch>();
  private meta: Meta = {};

  async appendEntry(entry: LogEnvelope): Promise<void> {
    if (this.entries.some((existing) => existing.id === entry.id)) {
      throw new Error("Log entry already exists: " + entry.id);
    }
    this.entries.push(copyOf(entry));
  }

  async listEntries(): Promise<LogEnvelope[]> {
    return copyOf(this.entries);
  }

  async putContent(items: ContentItem[]): Promise<void> {
    for (const item of items) this.content.set(item.key, copyOf(item));
  }

  async listContent(): Promise<ContentItem[]> {
    return copyOf([...this.content.values()]);
  }

  async putDraft(draft: DraftBatch): Promise<void> {
    this.drafts.set(draft.id, copyOf(draft));
  }

  async listDrafts(): Promise<DraftBatch[]> {
    return copyOf([...this.drafts.values()]);
  }

  async deleteDraft(id: string): Promise<void> {
    this.drafts.delete(id);
  }

  async getMeta(): Promise<Meta> {
    return copyOf(this.meta);
  }

  async setMeta(name: string, value: string | number | boolean): Promise<void> {
    this.meta[name] = value;
  }

  async exportCopy(exportedTime: string): Promise<WholeCopy> {
    return {
      format: "worldbuilder-copy",
      version: 1,
      exportedTime,
      meta: await this.getMeta(),
      entries: await this.listEntries(),
      content: await this.listContent(),
      drafts: await this.listDrafts(),
    };
  }

  async replaceWithCopy(copy: WholeCopy): Promise<void> {
    await this.wipe();
    this.meta = copyOf(copy.meta);
    for (const entry of copy.entries) await this.appendEntry(entry);
    await this.putContent(copy.content);
    for (const draft of copy.drafts) await this.putDraft(draft);
  }

  async wipe(): Promise<void> {
    this.entries = [];
    this.content.clear();
    this.drafts.clear();
    this.meta = {};
  }
}
