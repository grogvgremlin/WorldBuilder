// The app's operations over the store, so the screens stay thin.
// Design: build/slice-1-brief.md §1.2 (GM fixes: package switches, category order, pins),
// §2.1 (containers: library, sandboxes, contexts; one sandbox open at a time), §2.3 (display);
// design/infra.md §1–2 (log, content, drafts; withdrawal), §4 (device identity).
// Everything goes through the storage seam.

import type { CategoryOrderValues, ContentItem, DraftBatch, EventRecord, PackageSwitchValues, PinValues, WholeCopy } from "../schema";
import { WholeCopy as WholeCopySchema, WholeCopyV1 } from "../schema";
import { contentForSandbox, type Store } from "../store/store";
import { askForPersistentStorage } from "../store/indexeddb-store";
import { migrateCopyV1 } from "../store/migrate";
import { acceptedEntries, appendEvent, pinOrder, readLog, setCategoryOrder, switchPackage, withdraw, type LogDeps, type ReadEntry } from "../log/log";
import { OWNER } from "../log/unseal";
import { buildDraft, deployDraft, discardDraft, refreshDraft, saveDraft, type Existing } from "../import/draft";
import { resolveUnit, type UnitResolution } from "../overlay/resolve";
import { contextFor, readContext, type ContextView } from "../overlay/context";
import { filterUnits, ruleCheckFor, unitsRuleAppliesTo, type Landing, type UnitFilter } from "../overlay/landing";
import type { RuleCheck } from "../overlay/derivation";
import { buildWorld } from "../world/world";
import { thingTree, type ThingTree } from "../world/tree";

// Everything a screen shows, read in one go.
export interface Snapshot {
  all: ContentItem[]; // every space
  sandboxes: { key: string; label: string }[];
  openSandbox: string | null;
  content: ContentItem[]; // the library plus the open sandbox
  log: ReadEntry[]; // the open sandbox's audit view: includes withdrawn entries
  contexts: ContextView[]; // the open sandbox's manifest contexts, as the resolver reads them
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
    const all = await this.store.listContent();
    const sandboxes = all
      .filter((i) => i.class === "sandbox")
      .map((i) => ({ key: i.key, label: i.label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const wanted = typeof meta.openSandbox === "string" ? meta.openSandbox : null;
    const openSandbox = sandboxes.some((s) => s.key === wanted) ? wanted : (sandboxes[0]?.key ?? null);
    const content = contentForSandbox(all, openSandbox);
    const entries = openSandbox ? await this.store.listEntries(openSandbox) : [];
    const world = buildWorld(content, acceptedEntries(entries, OWNER));
    return {
      all,
      sandboxes,
      openSandbox,
      content,
      log: readLog(entries, OWNER),
      contexts: [...world.contexts.values()].map((context) => readContext(world, context)),
      drafts: await this.store.listDrafts(),
      persistent: typeof meta.persistent === "boolean" ? meta.persistent : null,
    };
  }

  async openSandbox(key: string): Promise<void> {
    await this.store.setMeta("openSandbox", key);
  }

  // --- Import -> draft -> deploy ---------------------------------------------------------

  // What a draft is checked against: everything deployed, events already logged, and the items
  // in the other drafts waiting (so a set of files loaded together doesn't warn about itself).
  private async existing(exceptDraft: string | null): Promise<Existing> {
    const all = await this.store.listContent();
    const loggedEventKeys: Record<string, string[]> = {};
    for (const sandbox of all.filter((i) => i.class === "sandbox")) {
      loggedEventKeys[sandbox.key] = readLog(await this.store.listEntries(sandbox.key), OWNER)
        .filter((e) => e.status === "accepted" && e.body.content.kind === "event")
        .map((e) => (e.body.content.values.event as EventRecord).key);
    }
    const pending = (await this.store.listDrafts()).filter((d) => d.id !== exceptDraft).flatMap((d) => d.content.map((c) => c.item));
    return { content: all, loggedEventKeys, pending };
  }

  async importText(text: string, fileLabel: string): Promise<DraftBatch> {
    const draft = buildDraft(text, fileLabel, await this.existing(null), this.deps);
    await saveDraft(this.store, draft);
    return draft;
  }

  // A test world: one draft per file. Files with an identical draft already waiting are skipped,
  // so tapping a test world twice doesn't queue it twice. Returns how many were skipped.
  async importSet(files: { name: string; text: string }[]): Promise<number> {
    const waiting = new Set((await this.store.listDrafts()).map((d) => d.sourceText));
    let skipped = 0;
    for (const file of files) {
      if (waiting.has(file.text)) skipped++;
      else await this.importText(file.text, file.name);
    }
    return skipped;
  }

  // Deploys a draft after rebuilding it against what's there now: stale warnings and statuses go,
  // and an event already logged isn't logged again.
  async deploy(draft: DraftBatch): Promise<void> {
    const fresh = refreshDraft(draft, await this.existing(draft.id));
    await deployDraft(this.store, this.deps, fresh);
    if (fresh.target.kind === "sandbox") await this.openSandbox(fresh.target.sandbox);
  }

  // Rebuilds every draft waiting against the current state, for the review screen.
  async refreshDrafts(): Promise<void> {
    for (const draft of await this.store.listDrafts()) await this.store.putDraft(refreshDraft(draft, await this.existing(draft.id)));
  }

  // Deploys drafts one by one, oldest first, so later files see what earlier ones deployed.
  async deployAll(drafts: DraftBatch[]): Promise<void> {
    const ordered = [...drafts].sort((a, b) => a.createdTime.localeCompare(b.createdTime));
    for (const draft of ordered) await this.deploy(draft);
  }

  async discard(draftId: string): Promise<void> {
    await discardDraft(this.store, draftId);
  }

  // --- The open sandbox's log -------------------------------------------------------------------

  async addEvent(sandbox: string, event: EventRecord): Promise<void> {
    await appendEvent(this.store, this.deps, sandbox, event, event.start);
  }

  async withdrawEntry(sandbox: string, entryId: string, reason: string): Promise<void> {
    await withdraw(this.store, this.deps, sandbox, entryId, reason);
  }

  async switchPackage(sandbox: string, values: PackageSwitchValues): Promise<void> {
    await switchPackage(this.store, this.deps, sandbox, values);
  }

  async setCategoryOrder(sandbox: string, values: CategoryOrderValues): Promise<void> {
    await setCategoryOrder(this.store, this.deps, sandbox, values);
  }

  async pin(sandbox: string, values: PinValues): Promise<void> {
    await pinOrder(this.store, this.deps, sandbox, values);
  }

  // --- Reading the open sandbox ------------------------------------------------------------------

  private async inputs(sandbox: string) {
    const content = contentForSandbox(await this.store.listContent(), sandbox);
    const entries = acceptedEntries(await this.store.listEntries(sandbox), OWNER);
    return { content, entries };
  }

  async resolveUnit(sandbox: string, unitKey: string, readDate: number): Promise<UnitResolution | null> {
    const { content, entries } = await this.inputs(sandbox);
    return resolveUnit(content, entries, unitKey, readDate, OWNER);
  }

  async thingTree(sandbox: string, thingKey: string, readDate: number): Promise<ThingTree> {
    const { content, entries } = await this.inputs(sandbox);
    return thingTree(buildWorld(content, entries), thingKey, readDate);
  }

  async ruleLandings(sandbox: string, ruleKey: string, readDate: number): Promise<Landing[]> {
    const { content, entries } = await this.inputs(sandbox);
    return unitsRuleAppliesTo(content, entries, ruleKey, readDate, OWNER);
  }

  async filterUnits(sandbox: string, filter: UnitFilter, readDate: number) {
    const { content, entries } = await this.inputs(sandbox);
    return filterUnits(content, entries, filter, readDate);
  }

  async ruleCheck(sandbox: string, ruleKey: string, unitKey: string, readDate: number): Promise<RuleCheck | null> {
    const { content, entries } = await this.inputs(sandbox);
    return ruleCheckFor(content, entries, ruleKey, unitKey, readDate, OWNER);
  }

  // The context a unit is read in, as the resolver sees it (for the unit card's GM fixes).
  async contextOfUnit(sandbox: string, unitKey: string): Promise<ContextView | null> {
    const { content, entries } = await this.inputs(sandbox);
    const world = buildWorld(content, entries);
    const unit = world.units.get(unitKey);
    return unit ? readContext(world, contextFor(world, unit.context)) : null;
  }

  // --- Whole copy -------------------------------------------------------------------------------

  async exportCopy(): Promise<WholeCopy> {
    return this.store.exportCopy(new Date().toISOString());
  }

  // Replaces everything with an exported copy; a slice 0 copy is brought forward first.
  // Throws with a plain message if the file is wrong.
  async importCopy(json: string): Promise<void> {
    const raw = JSON.parse(json);
    const old = WholeCopyV1.safeParse(raw);
    const parsed = old.success ? { success: true as const, data: migrateCopyV1(old.data) } : WholeCopySchema.safeParse(raw);
    if (!parsed.success) throw new Error("This file isn't a WorldBuilder copy: " + parsed.error.issues[0]?.message);
    await this.store.replaceWithCopy(parsed.data);
  }

  async wipe(): Promise<void> {
    await this.store.wipe();
    await this.store.setMeta("device", this.deps.device);
  }
}
