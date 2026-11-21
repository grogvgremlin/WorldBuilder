// Round trip with army lists and rosters: export the whole copy, wipe, import it again: the same
// cards, roster points and registered values. Design: build/slice-1-brief.md §7 (round trip still
// passes with sandboxes, contexts, rosters …); design/infra.md §1. Run against both stores.

import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { IndexedDbStore } from "../../src/store/indexeddb-store";
import type { Store } from "../../src/store/store";
import { registerRoster, savePracticeRoster } from "../../src/army/register";
import { viewRoster } from "../../src/army/roster";
import { WholeCopy, type Roster } from "../../src/schema";
import { EMPIRE_SHEETS, l1Roster, loadSet, loadSheets, resolveStored, testDeps, loadTowSheets } from "../helpers";

async function everything(store: Store) {
  const content = await store.listContent();
  const practice = content.find((i) => i.class === "roster" && i.key === "pick_up_1000") as Roster;
  const view = viewRoster(practice, content);
  return {
    total: view.total,
    issues: view.issues,
    handgunners2525: await resolveStored(store, "e1", "nuln_handgunners_tow", 2525),
  };
}

const stores: [string, () => Promise<Store>][] = [
  ["in memory", async () => new MemoryStore()],
  ["IndexedDB", async () => IndexedDbStore.open("army-round-trip-" + Math.random())],
];

describe.each(stores)("round trip with army lists and rosters (%s)", (_name, makeStore) => {
  it("gives the same rosters, points and values after export, wipe and import", async () => {
    const store = await makeStore();
    const deps = testDeps();
    await loadSet(store, deps, "L2");
    await loadTowSheets(store, deps);
    await loadSheets(store, deps, "tow", EMPIRE_SHEETS, { manifest: "tow", defaultPackage: "The Empire of Man" });
    await savePracticeRoster(store, l1Roster());
    await registerRoster(store, { ...l1Roster(), key: "nuln_garrison" }, "e1", "tow", [
      { unit: "u2", key: "nuln_handgunners_tow", label: "Nuln Handgunners", raised: 2520, links: [["raised_at", "nuln"], ["member_of", "gunnery_school"], ["serves", "handgunner_commission"], ["stationed_at", "nuln"]] },
    ]);

    const before = await everything(store);
    const exported = JSON.parse(JSON.stringify(await store.exportCopy("2026-11-21T10:00:00.000Z")));
    expect(WholeCopy.safeParse(exported).success).toBe(true);
    await store.wipe();
    await store.replaceWithCopy(WholeCopy.parse(exported));

    expect(await everything(store)).toEqual(before);
    expect(await store.exportCopy("2026-11-21T10:00:00.000Z")).toEqual(exported);
    expect(before.total).toBe(650);
    expect(before.handgunners2525.values.Ld).toBe(7);
  });
});
