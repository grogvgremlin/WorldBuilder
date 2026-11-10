// The text import: drafts, per-line problems that never block, keys written back.
// Design: design/text-format-and-csv.md §1–3, §8.

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { buildDraft, deployDraft, discardDraft } from "../../src/import/draft";
import { parseExpression, expressionToText } from "../../src/import/expression-text";
import { importToDraft, testDeps } from "../helpers";

const none = { content: [], loggedEventKeys: new Set<string>() };

describe("text import", () => {
  it("writes keys back for headers typed without one", () => {
    const text = "package: Region notes\nthings:\n  - [Nuln, nuln, [settlement]]\n  - [Wissenland, ~, [polity]]\n  - Talabheim\n";
    const draft = buildDraft(text, "notes.yaml", none, testDeps());
    expect(draft.rewrittenText).toBe(
      "package: [Region notes, region_notes]\nthings:\n  - [Nuln, nuln, [settlement]]\n  - [Wissenland, wissenland, [polity]]\n  - [Talabheim, talabheim]\n",
    );
    // A key slot left as ~ is filled too:
    expect(draft.content.map((c) => c.item.key)).toEqual(["region_notes", "nuln", "wissenland", "talabheim"]);
  });

  it("matches a label once against deployed items", () => {
    const deployed = [{ class: "thing" as const, key: "nuln_city", label: "Nuln", package: null, kinds: [], attributes: {} }];
    const draft = buildDraft("things:\n  - Nuln\n", "x", { content: deployed, loggedEventKeys: new Set() }, testDeps());
    expect(draft.content[1].item.key).toBe("nuln_city");
    expect(draft.rewrittenText).toContain("[Nuln, nuln_city]");
  });

  it("reports problems per line and still imports the good items", () => {
    const text = [
      "things:",
      "  - [Nuln, nuln, [settlement]]",
      "rules:",
      "  - rule: [Curse, curse]",
      "    effect: [WS, =3]",
      "    scope: reaches(nuln, raised_at)",
      "    nature: origin",
      "  - rule: [Pride, pride]",
      "    effect: [Ld, +1]",
      "    scope: reaches(nuln, raised_at > in*",
      "    nature: origin",
      "  - rule: [Fine, fine]",
      "    effect: [Ld, +1]",
      "    scope: reaches(nowhere, raised_at)",
      "    nature: origin",
      "    category: place",
    ].join("\n");
    const draft = buildDraft(text, "x", none, testDeps());
    expect(draft.content.map((c) => c.item.key)).toEqual(["x", "nuln", "fine"]);
    expect(draft.problems.map((p) => [p.line, p.severity, p.message])).toEqual([
      [4, "warning", "no category: it runs after the known categories"],
      [5, "error", "set needs a target point: statline, inline or end"],
      [8, "warning", "no category: it runs after the known categories"],
      [10, "error", "scope: the condition ends too early"],
      [12, "warning", "missing reference nowhere in scope"],
    ]);
  });

  it("keeps the draft out of the log and content until deployed; discard deletes it", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    const text = "things:\n  - [Nuln, nuln, [settlement]]\nlog:\n  - event: [Riot, riot]\n    kind: riot\n    period: [2525]\n";
    const draft = await importToDraft(store, deps, text);
    expect(await store.listContent()).toEqual([]);
    expect(await store.listEntries()).toEqual([]);
    expect((await store.listDrafts()).length).toBe(1);

    await discardDraft(store, draft.id);
    expect(await store.listDrafts()).toEqual([]);

    const again = await importToDraft(store, deps, text);
    await deployDraft(store, deps, again);
    expect((await store.listContent()).map((i) => i.key).sort()).toEqual(["nuln", "test"]);
    expect((await store.listEntries()).length).toBe(1);
    expect(await store.listDrafts()).toEqual([]);

    // Importing the same text again: unchanged content, and the event isn't logged twice.
    const third = await importToDraft(store, deps, text);
    expect(third.content.map((c) => c.status)).toEqual(["unchanged", "unchanged"]);
    expect(third.logItems).toEqual([]);
  });

  it("reads conditions and writes them back in one canonical form", () => {
    const texts = [
      "reaches(nuln, raised_at > in*)",
      "reaches(any title, serves > under*, ever)",
      "in_force(wages_withheld, withholder = wissenland_treasury)",
      "all(commissioned_by_the_treasury, not(reaches(steady, holds)))",
    ];
    for (const text of texts) expect(expressionToText(parseExpression(text))).toBe(text);
    expect(expressionToText(parseExpression("reaches(nuln,raised_at→in*)"))).toBe("reaches(nuln, raised_at > in*)");
  });
});
