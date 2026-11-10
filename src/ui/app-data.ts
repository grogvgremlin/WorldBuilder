// The app's operations over the store, so the screens stay thin.
// Design: build/slice-0-brief.md §3 "Screens"; design/infra.md §1–2 (log, content, drafts;
// withdrawal), §4 (device identity). Everything goes through the storage seam.

import type { ContentItem, DraftBatch, EventRecord, WholeCopy } from "../schema";
import { WholeCopy as WholeCopySchema } from "../schema";
import type { Store } from "../store/store";
import { askForPersistentStorage } from "../store/indexeddb-store";
import { acceptedEntries, appendEvent, readLog, withdraw, type LogDeps, type ReadEntry } from "../log/log";
import { OWNER } from "../log/unseal";
import { buildDraft, deployDraft, discardDraft, saveDraft } from "../import/draft";
import { resolveUnit, type UnitResolution } from "../overlay/resolve";

// Everything a screen shows, read in one go.
export interface Snapshot {
  content: ContentItem[];
  log: ReadEntry[]; // the audit view: includes withdrawn entries
  drafts: DraftBatch[];
  persistent: boolean | null;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

export class AppData {
  private constructor(
    private store: Store,
    private deps: LogDeps,
  ) {}

  // Opens the data. On first run: makes a device ID and asks for persistent storage.
  static async open(store: Store): Promise<AppData> {
    const meta = await store.getMeta();
    let device = typeof meta.device === "string" ? meta.device : null;
    if (!device) {
      device = "device-" + newId();
      await store.setMeta("device", device);
    }
    if (meta.persistent !== true) {
      await store.setMeta("persistent", await askForPersistentStorage());
    }
    const deps: LogDeps = { newId, now: () => new Date().toISOString(), device, person: OWNER.person };
    return new AppData(store, deps);
  }

  async snapshot(): Promise<Snapshot> {
    const meta = await this.store.getMeta();
    return {
      content: await this.store.listContent(),
      log: readLog(await this.store.listEntries(), OWNER),
      drafts: await this.store.listDrafts(),
      persistent: typeof meta.persistent === "boolean" ? meta.persistent : null,
    };
  }

  // --- Import -> draft -> deploy ---------------------------------------------------------

  async importText(text: string, fileLabel: string): Promise<DraftBatch> {
    const snapshot = await this.snapshot();
    const loggedEventKeys = new Set(
      snapshot.log
        .filter((e) => e.status === "accepted" && e.body.content.kind === "event")
        .map((e) => (e.body.content.values.event as EventRecord).key),
    );
    const draft = buildDraft(text, fileLabel, { content: snapshot.content, loggedEventKeys }, this.deps);
    await saveDraft(this.store, draft);
    return draft;
  }

  async deploy(draft: DraftBatch): Promise<void> {
    await deployDraft(this.store, this.deps, draft);
  }

  async discard(draftId: string): Promise<void> {
    await discardDraft(this.store, draftId);
  }

  // --- Log ------------------------------------------------------------------------------------

  async addEvent(event: EventRecord): Promise<void> {
    await appendEvent(this.store, this.deps, event, event.start);
  }

  async withdrawEntry(entryId: string, reason: string): Promise<void> {
    await withdraw(this.store, this.deps, entryId, reason);
  }

  // --- Resolving --------------------------------------------------------------------------------

  async resolveUnit(unitKey: string, readDate: number): Promise<UnitResolution | null> {
    const entries = acceptedEntries(await this.store.listEntries(), OWNER);
    return resolveUnit(await this.store.listContent(), entries, unitKey, readDate, OWNER);
  }

  // --- Whole copy -------------------------------------------------------------------------------

  async exportCopy(): Promise<WholeCopy> {
    return this.store.exportCopy(new Date().toISOString());
  }

  // Replaces everything with an exported copy. Throws with a plain message if the file is wrong.
  async importCopy(json: string): Promise<void> {
    const parsed = WholeCopySchema.safeParse(JSON.parse(json));
    if (!parsed.success) throw new Error("This file isn't a WorldBuilder copy: " + parsed.error.issues[0]?.message);
    await this.store.replaceWithCopy(parsed.data);
  }

  async wipe(): Promise<void> {
    await this.store.wipe();
    await this.store.setMeta("device", this.deps.device);
  }
}
