// IndexedDB implementation of the storage seam, used by the app.
// Design: see store.ts. Technical choices (plain IndexedDB, no wrapper library) are in
// build/build-log.md.
//
// Object stores:
//   log     - entries, keyed by an auto-increment number so they come back in append order.
//             The entry ID has a unique index, so the same entry can't be appended twice.
//             Nothing inside the seal is indexed.
//   content - content items, keyed by `key`.
//   drafts  - draft batches, keyed by `id`.
//   meta    - small settings, keyed by name.

import type { LogEnvelope, ContentItem, DraftBatch, Meta, WholeCopy } from "../schema";
import type { Store } from "./store";

const DB_VERSION = 1;

// Turns an IndexedDB request into a promise.
function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Resolves when a transaction has finished writing.
function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("storage write failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("storage write aborted"));
  });
}

function openDatabase(name: string, factory: IDBFactory): Promise<IDBDatabase> {
  const request = factory.open(name, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    const log = db.createObjectStore("log", { autoIncrement: true });
    log.createIndex("id", "id", { unique: true });
    db.createObjectStore("content", { keyPath: "key" });
    db.createObjectStore("drafts", { keyPath: "id" });
    db.createObjectStore("meta");
  };
  return done(request);
}

export class IndexedDbStore implements Store {
  private constructor(private db: IDBDatabase) {}

  static async open(name = "worldbuilder", factory: IDBFactory = indexedDB): Promise<IndexedDbStore> {
    return new IndexedDbStore(await openDatabase(name, factory));
  }

  async appendEntry(entry: LogEnvelope): Promise<void> {
    const tx = this.db.transaction("log", "readwrite");
    tx.objectStore("log").add(entry);
    await finished(tx);
  }

  async listEntries(): Promise<LogEnvelope[]> {
    const tx = this.db.transaction("log", "readonly");
    return done(tx.objectStore("log").getAll() as IDBRequest<LogEnvelope[]>);
  }

  async putContent(items: ContentItem[]): Promise<void> {
    const tx = this.db.transaction("content", "readwrite");
    for (const item of items) tx.objectStore("content").put(item);
    await finished(tx);
  }

  async listContent(): Promise<ContentItem[]> {
    const tx = this.db.transaction("content", "readonly");
    return done(tx.objectStore("content").getAll() as IDBRequest<ContentItem[]>);
  }

  async putDraft(draft: DraftBatch): Promise<void> {
    const tx = this.db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").put(draft);
    await finished(tx);
  }

  async listDrafts(): Promise<DraftBatch[]> {
    const tx = this.db.transaction("drafts", "readonly");
    return done(tx.objectStore("drafts").getAll() as IDBRequest<DraftBatch[]>);
  }

  async deleteDraft(id: string): Promise<void> {
    const tx = this.db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").delete(id);
    await finished(tx);
  }

  async getMeta(): Promise<Meta> {
    const tx = this.db.transaction("meta", "readonly");
    const store = tx.objectStore("meta");
    const names = await done(store.getAllKeys());
    const values = await done(store.getAll());
    const meta: Meta = {};
    names.forEach((name, i) => (meta[String(name)] = values[i]));
    return meta;
  }

  async setMeta(name: string, value: string | number | boolean): Promise<void> {
    const tx = this.db.transaction("meta", "readwrite");
    tx.objectStore("meta").put(value, name);
    await finished(tx);
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

  // Wipe and load in one transaction, so a failed import leaves the old copy in place.
  async replaceWithCopy(copy: WholeCopy): Promise<void> {
    const tx = this.db.transaction(["log", "content", "drafts", "meta"], "readwrite");
    for (const name of ["log", "content", "drafts", "meta"]) tx.objectStore(name).clear();
    for (const entry of copy.entries) tx.objectStore("log").add(entry);
    for (const item of copy.content) tx.objectStore("content").put(item);
    for (const draft of copy.drafts) tx.objectStore("drafts").put(draft);
    for (const [name, value] of Object.entries(copy.meta)) tx.objectStore("meta").put(value, name);
    await finished(tx);
  }

  async wipe(): Promise<void> {
    const tx = this.db.transaction(["log", "content", "drafts", "meta"], "readwrite");
    for (const name of ["log", "content", "drafts", "meta"]) tx.objectStore(name).clear();
    await finished(tx);
  }
}

// Asks the browser to keep this site's data (not evict it under storage pressure).
// Returns true if storage is persistent. Safe to call more than once.
export async function askForPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
