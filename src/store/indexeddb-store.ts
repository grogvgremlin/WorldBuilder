// IndexedDB implementation of the storage seam, used by the app.
// Design: see store.ts. Technical choices (plain IndexedDB, no wrapper library) are in
// build/build-log.md.
//
// Object stores (database version 3; the stores are the same as version 2's):
//   logs     - { sandbox, entry } records, keyed by an auto-increment number so entries come
//              back in append order. Indexed by sandbox, and by entry ID (unique) so the same
//              entry can't be appended twice. Nothing inside the seal is indexed.
//   items    - content items, keyed by [space, key].
//   drafts   - draft batches, keyed by `id`.
//   meta     - small settings, keyed by name.
// Version 1 (slice 0) had `log` and `content`; version 2 (slice 1 Part A) had today's stores
// with older item shapes. Opening an old database brings it forward through store/migrate.ts.

import type { LogEnvelope, ContentItem, DraftBatch, Meta, WholeCopy, WholeCopyV1 } from "../schema";
import type { Store } from "./store";
import { migrateCopyV1, migrateItemsV2 } from "./migrate";

const DB_VERSION = 3;
const ALL_STORES = ["logs", "items", "drafts", "meta"];

interface LogRecord {
  sandbox: string;
  entry: LogEnvelope;
}

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

function createVersion2Stores(db: IDBDatabase): void {
  const logs = db.createObjectStore("logs", { autoIncrement: true });
  logs.createIndex("sandbox", "sandbox", { unique: false });
  logs.createIndex("entryId", "entry.id", { unique: true });
  db.createObjectStore("items", { keyPath: ["space", "key"] });
  if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts", { keyPath: "id" });
  if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
}

// Moves slice 0's `log` and `content` into the version 2 stores, inside the upgrade.
function migrateFromVersion1(db: IDBDatabase, tx: IDBTransaction): void {
  const oldLog = tx.objectStore("log").getAll();
  const oldContent = tx.objectStore("content").getAll();
  oldContent.onsuccess = () => {
    const v1: WholeCopyV1 = {
      format: "worldbuilder-copy",
      version: 1,
      exportedTime: new Date().toISOString(),
      meta: {},
      entries: oldLog.result as LogEnvelope[],
      content: oldContent.result as Record<string, unknown>[],
      drafts: [],
    };
    const v2 = migrateCopyV1(v1);
    for (const [sandbox, entries] of Object.entries(v2.logs)) {
      for (const entry of entries) tx.objectStore("logs").add({ sandbox, entry } satisfies LogRecord);
    }
    for (const item of v2.content) tx.objectStore("items").put(item);
    tx.objectStore("drafts").clear(); // slice 0 drafts have the old shape
    db.deleteObjectStore("log");
    db.deleteObjectStore("content");
  };
}

// Version 2's items take version 3's shapes, in place, inside the upgrade.
function migrateFromVersion2(tx: IDBTransaction): void {
  const items = tx.objectStore("items").getAll();
  items.onsuccess = () => {
    for (const item of migrateItemsV2(items.result as Record<string, unknown>[])) tx.objectStore("items").put(item);
    tx.objectStore("drafts").clear(); // drafts hold items in the old shape
  };
}

function openDatabase(name: string, factory: IDBFactory): Promise<IDBDatabase> {
  const request = factory.open(name, DB_VERSION);
  request.onupgradeneeded = (event) => {
    const db = request.result;
    if (event.oldVersion < 2) createVersion2Stores(db);
    if (event.oldVersion === 1) migrateFromVersion1(db, request.transaction!);
    if (event.oldVersion === 2) migrateFromVersion2(request.transaction!);
  };
  return done(request);
}

export class IndexedDbStore implements Store {
  private constructor(private db: IDBDatabase) {}

  static async open(name = "worldbuilder", factory: IDBFactory = indexedDB): Promise<IndexedDbStore> {
    return new IndexedDbStore(await openDatabase(name, factory));
  }

  async appendEntry(sandbox: string, entry: LogEnvelope): Promise<void> {
    const tx = this.db.transaction("logs", "readwrite");
    tx.objectStore("logs").add({ sandbox, entry } satisfies LogRecord);
    await finished(tx);
  }

  async listEntries(sandbox: string): Promise<LogEnvelope[]> {
    const tx = this.db.transaction("logs", "readonly");
    const index = tx.objectStore("logs").index("sandbox");
    // getAll on an index returns records in primary-key (append) order within the sandbox.
    const records = (await done(index.getAll(sandbox))) as LogRecord[];
    return records.map((record) => record.entry);
  }

  private async allLogs(): Promise<Record<string, LogEnvelope[]>> {
    const tx = this.db.transaction("logs", "readonly");
    const records = (await done(tx.objectStore("logs").getAll())) as LogRecord[];
    const logs: Record<string, LogEnvelope[]> = {};
    for (const record of records) (logs[record.sandbox] ??= []).push(record.entry);
    return logs;
  }

  async putContent(items: ContentItem[]): Promise<void> {
    const tx = this.db.transaction("items", "readwrite");
    for (const item of items) tx.objectStore("items").put(item);
    await finished(tx);
  }

  async listContent(): Promise<ContentItem[]> {
    const tx = this.db.transaction("items", "readonly");
    return done(tx.objectStore("items").getAll() as IDBRequest<ContentItem[]>);
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
      version: 3,
      exportedTime,
      meta: await this.getMeta(),
      logs: await this.allLogs(),
      content: await this.listContent(),
      drafts: await this.listDrafts(),
    };
  }

  // Wipe and load in one transaction, so a failed import leaves the old copy in place.
  async replaceWithCopy(copy: WholeCopy): Promise<void> {
    const tx = this.db.transaction(ALL_STORES, "readwrite");
    for (const name of ALL_STORES) tx.objectStore(name).clear();
    for (const [sandbox, entries] of Object.entries(copy.logs)) {
      for (const entry of entries) tx.objectStore("logs").add({ sandbox, entry } satisfies LogRecord);
    }
    for (const item of copy.content) tx.objectStore("items").put(item);
    for (const draft of copy.drafts) tx.objectStore("drafts").put(draft);
    for (const [name, value] of Object.entries(copy.meta)) tx.objectStore("meta").put(value, name);
    await finished(tx);
  }

  async wipe(): Promise<void> {
    const tx = this.db.transaction(ALL_STORES, "readwrite");
    for (const name of ALL_STORES) tx.objectStore(name).clear();
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
