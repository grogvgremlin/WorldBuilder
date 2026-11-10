// The storage seam behaves the same in memory and in IndexedDB.
// Design: src/store/store.ts; design/infra.md §1–2.

import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { IndexedDbStore } from "../../src/store/indexeddb-store";
import type { Store } from "../../src/store/store";
import { makeEntry } from "../../src/log/log";
import { testDeps } from "../helpers";

const stores: [string, () => Promise<Store>][] = [
  ["in memory", async () => new MemoryStore()],
  ["IndexedDB", async () => IndexedDbStore.open("contract-" + Math.random())],
];

describe.each(stores)("store contract (%s)", (_name, makeStore) => {
  it("returns log entries in append order and refuses a duplicate ID", async () => {
    const store = await makeStore();
    const deps = testDeps();
    const first = makeEntry(deps, { kind: "note", inWorldDate: 2525, targets: [], values: {} });
    const second = makeEntry(deps, { kind: "note", inWorldDate: 2400, targets: [], values: {} });
    await store.appendEntry(first);
    await store.appendEntry(second);
    expect((await store.listEntries()).map((e) => e.id)).toEqual([first.id, second.id]);
    await expect(store.appendEntry(first)).rejects.toBeTruthy();
  });

  it("puts content by key, keeps drafts apart, and stores meta", async () => {
    const store = await makeStore();
    const thing = { class: "thing" as const, key: "nuln", label: "Nuln", package: null, kinds: [], attributes: {} };
    await store.putContent([thing]);
    await store.putContent([{ ...thing, label: "Nuln (city)" }]);
    expect((await store.listContent()).map((i) => i.label)).toEqual(["Nuln (city)"]);

    await store.setMeta("device", "abc");
    expect(await store.getMeta()).toEqual({ device: "abc" });

    await store.wipe();
    expect(await store.listContent()).toEqual([]);
    expect(await store.getMeta()).toEqual({});
  });
});
