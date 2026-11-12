// Slice 0's data comes forward into slice 1's containers, both from an old IndexedDB database
// and from an old exported copy. Design: build/slice-1-brief.md §2.1; src/store/migrate.ts.

import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbStore } from "../../src/store/indexeddb-store";
import { migrateCopyV1 } from "../../src/store/migrate";
import { makeEntry } from "../../src/log/log";
import type { WholeCopyV1 } from "../../src/schema";
import { MemoryStore } from "../../src/store/memory-store";
import { resolveStored, testDeps } from "../helpers";

// A slice 0 copy of E1, in slice 0's shape: one flat list, no spaces.
function slice0Copy(): WholeCopyV1 {
  const deps = testDeps();
  const wages = makeEntry(deps, {
    kind: "event",
    inWorldDate: 2524,
    targets: ["t"],
    values: { event: { key: "w", label: "Wages withheld", kind: "wages_withheld", roles: { withholder: "t" }, start: 2524, end: null } },
  });
  const pkg = { class: "package", key: "p", label: "E1", package: "p", sourceLayer: "book", members: ["n", "u", "r", "u~raised_at~n~2520"] };
  return {
    format: "worldbuilder-copy",
    version: 1,
    exportedTime: "2026-11-10T00:00:00.000Z",
    meta: { device: "phone" },
    entries: [wages],
    content: [
      pkg,
      { class: "thing", key: "n", label: "Nuln", package: "p", kinds: ["settlement"], attributes: {} },
      { class: "thing", key: "t", label: "Treasury", package: "p", kinds: ["organisation"], attributes: {} },
      { class: "unit", key: "u", label: "Handgunners", package: "p", profile: { Ld: 7 }, raised: 2520 },
      { class: "link", key: "u~raised_at~n~2520", label: "raised at", package: "p", kind: "raised_at", from: "u", to: "n", start: 2520, end: null },
      {
        class: "rule", key: "r", label: "Pride", package: "p",
        effect: { stat: "Ld", kind: "add", value: 1, targetPoint: "inline" },
        scope: { node: "reaches", target: { by: "thing", key: "n" }, via: [{ link: "raised_at", repeat: false }], when: "as_of" },
        trigger: { node: "in_force", what: "wages_withheld", roles: {} },
        nature: "environment", category: "place", sourceLayer: "book", base: null, reason: null,
      },
    ],
    drafts: [],
  };
}

describe("migration from slice 0", () => {
  it("puts the world in a sandbox, rules in the library, and switches the old package on", async () => {
    const copy = migrateCopyV1(slice0Copy());
    const store = new MemoryStore();
    await store.replaceWithCopy(copy);
    const spaces = Object.fromEntries((await store.listContent()).map((i) => [i.class + ":" + i.key, i.space]));
    expect(spaces["thing:n"]).toBe("slice0");
    expect(spaces["rule:r"]).toBe("library");
    expect(spaces["manifest:wfb6"]).toBe("library");
    expect(spaces["context:wfb6"]).toBe("slice0");
    // The rule still lands, through the old package switched on in the new context.
    expect((await resolveStored(store, "slice0", "u", 2525)).values.Ld).toBe(8);
  });

  it("upgrades an old IndexedDB database in place", async () => {
    const name = "old-" + Math.random();
    // Make a version 1 database the way slice 0 did.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("log", { autoIncrement: true }).createIndex("id", "id", { unique: true });
        db.createObjectStore("content", { keyPath: "key" });
        db.createObjectStore("drafts", { keyPath: "id" });
        db.createObjectStore("meta");
        const old = slice0Copy();
        for (const entry of old.entries) request.transaction!.objectStore("log").add(entry);
        for (const item of old.content) request.transaction!.objectStore("content").put(item);
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    const store = await IndexedDbStore.open(name);
    expect((await store.listEntries("slice0")).length).toBe(1);
    expect((await resolveStored(store, "slice0", "u", 2525)).values.Ld).toBe(8);
  });
});
