// The log entry's full shape, withdrawal and the unseal() read path.
// Design: design/infra.md §2, §5.1, §8.

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { acceptedEntries, appendEvent, makeEntry, readLog, withdraw } from "../../src/log/log";
import { OWNER, unseal } from "../../src/log/unseal";
import { LogEnvelope } from "../../src/schema";
import { testDeps } from "../helpers";

const wages = { key: "w", label: "Wages withheld", kind: "wages_withheld", roles: { withholder: "t" }, start: 2524, end: null };

describe("log", () => {
  it("writes every entry in its full shape, with only four fields outside the seal", () => {
    const entry = makeEntry(testDeps(), { kind: "event", inWorldDate: 2524, targets: [], values: {} });
    expect(LogEnvelope.parse(entry)).toEqual(entry);
    expect(Object.keys(entry).sort()).toEqual(["device", "hostSeq", "id", "recordedTime", "seal"]);
    const body = unseal(entry, OWNER)!;
    expect(Object.keys(body).sort()).toEqual(["content", "identity", "order", "status", "visibility"]);
    expect(body.status.value).toBe("accepted");
  });

  it("withdraws by appending; the original stays, marked withdrawn, and derivations skip it", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    const id = await appendEvent(store, deps, "s", wages, 2524);
    const withdrawalId = await withdraw(store, deps, "s", id, "never happened");

    const audit = readLog(await store.listEntries("s"), OWNER);
    expect(audit.map((e) => [e.id, e.status])).toEqual([
      [id, "withdrawn"],
      [withdrawalId, "accepted"],
    ]);
    expect(audit[0].withdrawnBy).toBe(withdrawalId);
    expect(acceptedEntries(await store.listEntries("s"), OWNER).map((e) => e.id)).toEqual([withdrawalId]);
  });

  it("withdrawing the withdrawal brings the original back", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    const id = await appendEvent(store, deps, "s", wages, 2524);
    const withdrawalId = await withdraw(store, deps, "s", id, "mistake");
    await withdraw(store, deps, "s", withdrawalId, "it did happen");
    const statuses = readLog(await store.listEntries("s"), OWNER).map((e) => e.status);
    expect(statuses).toEqual(["accepted", "withdrawn", "accepted"]);
  });

  it("unseal() returns nothing for a sealed entry (no keys yet)", () => {
    const entry = makeEntry(testDeps(), { kind: "event", inWorldDate: 1, targets: [], values: {} });
    const sealed: LogEnvelope = { ...entry, seal: { form: "sealed", ciphertext: "xyz" } };
    expect(unseal(sealed, OWNER)).toBeNull();
    expect(readLog([sealed], OWNER)).toEqual([]);
  });
});
