// Round trip: export the whole copy, wipe, import it again: same values, same derivations.
// Design: build/slice-0-brief.md §2; design/infra.md §1 (derived values are recomputed from
// what is stored). Required for slice 0. Run against both store implementations.

import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { IndexedDbStore } from "../../src/store/indexeddb-store";
import type { Store } from "../../src/store/store";
import { withdraw } from "../../src/log/log";
import { WholeCopy } from "../../src/schema";
import { eventEntryId, importToDraft, loadFixture, resolveStored, testDeps } from "../helpers";

async function everything(store: Store) {
  return {
    handgunners2525: await resolveStored(store, "nuln_handgunners", 2525),
    handgunners2523: await resolveStored(store, "nuln_handgunners", 2523),
    spearmen2525: await resolveStored(store, "grenzstadt_spearmen", 2525),
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
    await loadFixture(store, deps, "e1-handgunners.yaml");
    await loadFixture(store, deps, "e4-grenzstadt.yaml");
    // A withdrawal and an undeployed draft must survive the trip too.
    await withdraw(store, deps, await eventEntryId(store, "wages_withheld_2524"), "test");
    await importToDraft(store, deps, "package: [Pending, pending]\nthings:\n  - [Talabheim, talabheim, [settlement]]\n");

    const before = await everything(store);
    const exported = JSON.parse(JSON.stringify(await store.exportCopy("2026-11-10T10:00:00.000Z")));
    expect(WholeCopy.safeParse(exported).success).toBe(true);

    await store.wipe();
    expect(await store.listEntries()).toEqual([]);
    expect(await store.listContent()).toEqual([]);

    await store.replaceWithCopy(WholeCopy.parse(exported));
    expect(await everything(store)).toEqual(before);
    expect(await store.exportCopy("2026-11-10T10:00:00.000Z")).toEqual(exported);
    expect(before.handgunners2525.values.Ld).toBe(8); // withdrawn wages
  });
});
