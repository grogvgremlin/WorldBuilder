// In-memory implementation of the storage seam, used by the tests.
// Design: see store.ts.

import type { LogEnvelope, ContentItem, DraftBatch, Meta, WholeCopy } from "../schema";
import type { Store } from "./store";

// Deep copy, so callers can never change what is stored by holding a reference.
function copyOf<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function contentId(item: ContentItem): string {
  return item.space + "|" + item.key;
}

export class MemoryStore implements Store {
  private logs = new Map<string, LogEnvelope[]>();
  private content = new Map<string, ContentItem>();
  private drafts = new Map<string, DraftBatch>();
  private meta: Meta = {};

  async appendEntry(sandbox: string, entry: LogEnvelope): Promise<void> {
    for (const log of this.logs.values()) {
      if (log.some((existing) => existing.id === entry.id)) throw new Error("Log entry already exists: " + entry.id);
    }
    if (!this.logs.has(sandbox)) this.logs.set(sandbox, []);
    this.logs.get(sandbox)!.push(copyOf(entry));
  }

  async listEntries(sandbox: string): Promise<LogEnvelope[]> {
    return copyOf(this.logs.get(sandbox) ?? []);
  }

  async putContent(items: ContentItem[]): Promise<void> {
    for (const item of items) this.content.set(contentId(item), copyOf(item));
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
    const logs: Record<string, LogEnvelope[]> = {};
    for (const [sandbox, entries] of this.logs) logs[sandbox] = copyOf(entries);
    return {
      format: "worldbuilder-copy",
      version: 2,
      exportedTime,
      meta: await this.getMeta(),
      logs,
      content: await this.listContent(),
      drafts: await this.listDrafts(),
    };
  }

  async replaceWithCopy(copy: WholeCopy): Promise<void> {
    await this.wipe();
    this.meta = copyOf(copy.meta);
    for (const [sandbox, entries] of Object.entries(copy.logs)) {
      for (const entry of entries) await this.appendEntry(sandbox, entry);
    }
    await this.putContent(copy.content);
    for (const draft of copy.drafts) await this.putDraft(draft);
  }

  async wipe(): Promise<void> {
    this.logs.clear();
    this.content.clear();
    this.drafts.clear();
    this.meta = {};
  }
}
