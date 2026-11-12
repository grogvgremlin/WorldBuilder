// The storage seam behaves the same in memory and in IndexedDB.
// Design: src/store/store.ts; design/infra.md §1–2; slice-1-brief.md §2.1.

import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { IndexedDbStore } from "../../src/store/indexeddb-store";
import type { Store } from "../../src/store/store";
import { makeEntry } from "../../src/log/log";
import type { ContentItem } from "../../src/schema";
import { testDeps } from "../helpers";

const stores: [string, () => Promise<Store>][] = [
  ["in memory", async () => new MemoryStore()],
  ["IndexedDB", async () => IndexedDbStore.open("contract-" + Math.random())],
];

const nuln = (space: string, label = "Nuln"): ContentItem => ({ class: "thing", key: "nuln", label, space, package: null, kinds: [], attributes: {} });

describe.each(stores)("store contract (%s)", (_name, makeStore) => {
  it("keeps one log per sandbox, in append order, and refuses a duplicate ID", async () => {
    const store = await makeStore();
    const deps = testDeps();
    const first = makeEntry(deps, { kind: "note", inWorldDate: 2525, targets: [], values: {} });
    const second = makeEntry(deps, { kind: "note", inWorldDate: 2400, targets: [], values: {} });
    const other = makeEntry(deps, { kind: "note", inWorldDate: 1, targets: [], values: {} });
    await store.appendEntry("a", first);
    await store.appendEntry("b", other);
    await store.appendEntry("a", second);
    expect((await store.listEntries("a")).map((e) => e.id)).toEqual([first.id, second.id]);
    expect((await store.listEntries("b")).map((e) => e.id)).toEqual([other.id]);
    expect(await store.listEntries("none")).toEqual([]);
    await expect(store.appendEntry("a", first)).rejects.toBeTruthy();
  });

  it("puts content by space and key, keeps drafts apart, and stores meta", async () => {
    const store = await makeStore();
    await store.putContent([nuln("e1"), nuln("e2")]);
    await store.putContent([nuln("e1", "Nuln (city)")]);
    const labels = (await store.listContent()).map((i) => i.space + ":" + i.label).sort();
    expect(labels).toEqual(["e1:Nuln (city)", "e2:Nuln"]);

    await store.setMeta("device", "abc");
    expect(await store.getMeta()).toEqual({ device: "abc" });

    await store.wipe();
    expect(await store.listContent()).toEqual([]);
    expect(await store.getMeta()).toEqual({});
  });
});
