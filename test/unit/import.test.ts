// The text import: package and sandbox files, drafts, per-line problems that never block,
// keys written back, references by label.
// Design: design/text-format-and-csv.md §1–3, §8; build/slice-1-brief.md §2.1, §2.3.

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { buildDraft, deployDraft, discardDraft } from "../../src/import/draft";
import { parseExpression, expressionToText } from "../../src/import/expression-text";
import type { ContentItem } from "../../src/schema";
import { importToDraft, loadFixture, loadSet, testDeps } from "../helpers";

const none = { content: [] as ContentItem[], loggedEventKeys: {} };

describe("text import", () => {
  it("writes keys back for headers typed without one", () => {
    const text = "sandbox: Region notes\nthings:\n  - [Nuln, nuln, [settlement]]\n  - [Wissenland, ~, [polity]]\n  - Talabheim\n";
    const draft = buildDraft(text, "notes.yaml", none, testDeps());
    expect(draft.rewrittenText).toBe(
      "sandbox: [Region notes, region_notes]\nthings:\n  - [Nuln, nuln, [settlement]]\n  - [Wissenland, wissenland, [polity]]\n  - [Talabheim, talabheim]\n",
    );
    expect(draft.target).toEqual({ kind: "sandbox", sandbox: "region_notes" });
    expect(draft.content.map((c) => c.item.space + ":" + c.item.key)).toEqual([
      "region_notes:region_notes",
      "region_notes:nuln",
      "region_notes:wissenland",
      "region_notes:talabheim",
    ]);
  });

  it("matches a header's label once against items in the same sandbox", () => {
    const deployed: ContentItem[] = [
      { class: "thing", key: "nuln_city", label: "Nuln", space: "e1", package: "e1", kinds: [], attributes: {} },
      { class: "thing", key: "nuln_other", label: "Nuln", space: "e2", package: "e2", kinds: [], attributes: {} },
    ];
    const draft = buildDraft("sandbox: [E1, e1]\nthings:\n  - Nuln\n", "x", { content: deployed, loggedEventKeys: {} }, testDeps());
    expect(draft.content[1].item.key).toBe("nuln_city");
    expect(draft.rewrittenText).toContain("[Nuln, nuln_city]");
  });

  it("puts world content in sandbox files and rules in package files", () => {
    const text = "package: [Mixed, mixed]\nthings:\n  - [Nuln, nuln, [settlement]]\nrules: []\n";
    const draft = buildDraft(text, "x", none, testDeps());
    expect(draft.target).toEqual({ kind: "library" });
    expect(draft.problems.map((p) => [p.line, p.message])).toEqual([
      [2, "“things” is world content: it belongs in a sandbox file (start it `sandbox: [label, key]`)"],
    ]);
    const other = buildDraft("sandbox: [W, w]\nrules: []\n", "x", none, testDeps());
    expect(other.problems[0].message).toBe("“rules” belongs in a rules package file (start it `package: [label, key]`), switched on in a context");
  });

  it("reports problems per line and still imports the good items", () => {
    const text = [
      "package: [Rules, x]",
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
      "    scope: reaches(\"Nowhere at all\", raised_at)",
      "    nature: origin",
      "    category: place",
    ].join("\n");
    const draft = buildDraft(text, "x", none, testDeps());
    expect(draft.content.map((c) => c.item.key)).toEqual(["x", "fine"]);
    expect(draft.problems.map((p) => [p.line, p.severity, p.message])).toEqual([
      [3, "warning", "no category: it runs after the known categories"],
      [4, "error", "set needs a target point: statline, inline or end"],
      [7, "warning", "no category: it runs after the known categories"],
      [9, "error", "scope: the condition ends too early"],
      [13, "warning", "missing reference Nowhere at all in scope"],
    ]);
  });

  it("keeps the draft out of the log and content until deployed; discard deletes it", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    const text = "sandbox: [World, w]\nthings:\n  - [Nuln, nuln, [settlement]]\nlog:\n  - event: [Riot, riot]\n    kind: riot\n    period: [2525]\n";
    const draft = await importToDraft(store, deps, text);
    expect(await store.listContent()).toEqual([]);
    expect(await store.listEntries("w")).toEqual([]);
    expect((await store.listDrafts()).length).toBe(1);

    await discardDraft(store, draft.id);
    expect(await store.listDrafts()).toEqual([]);

    const again = await importToDraft(store, deps, text);
    await deployDraft(store, deps, again);
    expect((await store.listContent()).map((i) => i.key).sort()).toEqual(["nuln", "w"]);
    expect((await store.listEntries("w")).length).toBe(1);
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
      'reaches("Gunnery School", member_of)',
    ];
    for (const text of texts) expect(expressionToText(parseExpression(text))).toBe(text);
    expect(expressionToText(parseExpression("reaches(nuln,raised_at→in*)"))).toBe("reaches(nuln, raised_at > in*)");
  });
});

describe("references by label (slice 1 brief §2.3)", () => {
  it("matches link ends and roles by label in a sandbox file, and writes the keys back", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    const text = [
      "sandbox: [E1 Nuln, e1]",
      "things:",
      "  - [Altdorf, altdorf, [settlement]]",
      "links:",
      "  - [Altdorf, in, Wissenland, 2000]",
      "log:",
      "  - event: [Riot, riot]",
      "    kind: riot",
      "    roles: {where: Gunnery School}",
      "    period: [2525]",
    ].join("\n");
    const draft = await importToDraft(store, deps, text);
    expect(draft.problems).toEqual([]);
    expect(draft.rewrittenText).toContain("  - [altdorf, in, wissenland, 2000]");
    expect(draft.rewrittenText).toContain("roles: {where: gunnery_school}");
    expect(draft.content.find((c) => c.item.class === "link")?.item.key).toBe("altdorf~in~wissenland~2000");
    expect(draft.logItems[0].event.roles).toEqual({ where: "gunnery_school" });
  });

  it("matches a quoted label in a library rule against any sandbox's things", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadSet(store, deps, "E1");
    const text = [
      "package: [School rules, school_rules]",
      "rules:",
      "  - rule: [Drill, drill]",
      "    effect: [Ld, +1]",
      '    scope: reaches("Gunnery School", member_of)',
      "    nature: origin",
      "    category: organisation",
    ].join("\n");
    const draft = await importToDraft(store, deps, text);
    expect(draft.problems).toEqual([]);
    expect(draft.rewrittenText).toContain("    scope: reaches(gunnery_school, member_of)");
  });

  it("warns when a label matches several things with different keys", async () => {
    const store = new MemoryStore();
    const deps = testDeps();
    await loadFixture(store, deps, "a", "sandbox: [A, a]\nthings:\n  - [Nuln, nuln_a, [settlement]]\n");
    await loadFixture(store, deps, "b", "sandbox: [B, b]\nthings:\n  - [Nuln, nuln_b, [settlement]]\n");
    const draft = await importToDraft(store, deps, "package: [P, p]\nrules:\n  - rule: [R, r]\n    effect: [Ld, 1]\n    scope: reaches(Nuln, raised_at)\n    nature: origin\n    category: place\n");
    expect(draft.problems.map((p) => p.message)).toEqual(["“Nuln” in scope matches 2 items (nuln_a, nuln_b): write the key"]);
  });

  it("accepts a key-like name in a library rule with no sandbox loaded yet", () => {
    const draft = buildDraft("package: [P, p]\nrules:\n  - rule: [R, r]\n    effect: [Ld, 1]\n    scope: reaches(nuln, raised_at)\n    nature: origin\n    category: place\n", "x", none, testDeps());
    expect(draft.problems).toEqual([]);
  });
});
