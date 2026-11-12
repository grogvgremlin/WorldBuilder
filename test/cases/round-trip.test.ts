// Round trip: export the whole copy, wipe, import it again: same values and derivations.
// Design: build/slice-0-brief.md §2; slice-1-brief.md §7 (still passes with sandboxes,
// contexts and GM fixes in the copy); design/infra.md §1. Run against both stores.

import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { IndexedDbStore } from "../../src/store/indexeddb-store";
import type { Store } from "../../src/store/store";
import { pinOrder, switchPackage, withdraw } from "../../src/log/log";
import { WholeCopy } from "../../src/schema";
import { eventEntryId, importToDraft, loadSet, resolveStored, testDeps } from "../helpers";

async function everything(store: Store) {
  return {
    handgunners2525: await resolveStored(store, "e1", "nuln_handgunners", 2525),
    handgunners2523: await resolveStored(store, "e1", "nuln_handgunners", 2523),
    spearmen2525: await resolveStored(store, "e4", "grenzstadt_spearmen", 2525),
  };
}

const stores: [string, () => Promise<Store>][] = [
  ["in memory", async () => new MemoryStore()],
  ["IndexedDB", async () => IndexedDbStore.open("round-trip-" + Math.random())],
];

describe.each(stores)("round trip (%s)", (_name, makeStore) => {
  it("gives the same values and derivations after export, wipe and import", async () => {
    const store = await makeStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    await loadSet(store, deps, "E4");
    // A withdrawal, GM fixes and an undeployed draft must survive the trip too.
    await withdraw(store, deps, "e1", await eventEntryId(store, "e1", "wages_withheld_2524"), "test");
    await switchPackage(store, deps, "e4", { context: "wfb6", package: "e4_rules", on: false, note: "" });
    await pinOrder(store, deps, "e1", { context: "wfb6", unit: null, stat: "Ld", first: "gunnery_school_pride", then: "nuln_civic_pride" });
    await importToDraft(store, deps, "sandbox: [Pending, pending]\nthings:\n  - [Talabheim, talabheim, [settlement]]\n");

    const before = await everything(store);
    const exported = JSON.parse(JSON.stringify(await store.exportCopy("2026-11-12T10:00:00.000Z")));
    expect(WholeCopy.safeParse(exported).success).toBe(true);

    await store.wipe();
    expect(await store.listEntries("e1")).toEqual([]);
    expect(await store.listContent()).toEqual([]);

    await store.replaceWithCopy(WholeCopy.parse(exported));
    expect(await everything(store)).toEqual(before);
    expect(await store.exportCopy("2026-11-12T10:00:00.000Z")).toEqual(exported);
    expect(before.handgunners2525.values.Ld).toBe(9); // wages withdrawn; School pinned before Nuln
    expect(before.spearmen2525.values.S).toBe(3); // E4's rules switched off
  });
});
