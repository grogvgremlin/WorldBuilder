// Exported text re-imports exactly. Design: design/text-format-and-csv.md §1, §6;
// build/slice-1-brief.md §2.1 (package files and sandbox files).

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { containerToText, itemToText, ruleToText, type Container } from "../../src/import/export-text";
import type { Manifest } from "../../src/schema";
import { readBackRule } from "../../src/import/read-back";
import type { ContentItem, Package, Rule } from "../../src/schema";
import { importToDraft, loadFixture, loadSet, testDeps } from "../helpers";

const sets = ["E1", "E2", "E4"];

function sorted(items: ContentItem[]) {
  return [...items].sort((a, b) => (a.space + a.key).localeCompare(b.space + b.key));
}

function containers(content: ContentItem[]): Container[] {
  return content.filter((i): i is Container => i.class === "package" || i.class === "sandbox");
}

describe.each(sets)("export text (%s)", (set) => {
  it("re-imports every package and sandbox as unchanged, and rebuilds the same content elsewhere", async () => {
    const store = new MemoryStore();
    await loadSet(store, testDeps(), set);
    const content = await store.listContent();
    // Packages, then manifests (which name their core), then the sandboxes that use them.
    const rank = (i: ContentItem) => (i.class === "package" ? 0 : i.class === "manifest" ? 1 : 2);
    const files: (Container | Manifest)[] = [...containers(content), ...content.filter((i): i is Manifest => i.class === "manifest")];
    const all = files.sort((a, b) => rank(a) - rank(b));

    const fresh = new MemoryStore();
    for (const container of all) {
      const text = container.class === "manifest" ? itemToText(container, undefined, content) : containerToText(container, content);
      const again = await importToDraft(store, testDeps(), text);
      expect(again.problems, container.key).toEqual([]);
      expect(again.content.filter((c) => c.status !== "unchanged").map((c) => c.item.key), container.key).toEqual([]);
      expect(again.rewrittenText, container.key).toBe(text); // nothing to write back: every key is there
      await loadFixture(fresh, testDeps(), container.key, text);
    }
    expect(sorted(await fresh.listContent())).toEqual(sorted(content));
  });

  it("re-imports every item on its own as unchanged", async () => {
    const store = new MemoryStore();
    await loadSet(store, testDeps(), set);
    const content = await store.listContent();
    for (const item of content) {
      const container = containers(content).find((c) => c.key === item.package && c.space === item.space && item.class !== "manifest");
      const draft = await importToDraft(store, testDeps(), itemToText(item, container, content));
      expect(draft.problems, item.key).toEqual([]);
      expect(draft.content.filter((c) => c.status !== "unchanged").map((c) => c.item.key), item.key).toEqual([]);
    }
  });
});

describe("read-back", () => {
  it("says what each E1 rule does in words", async () => {
    const store = new MemoryStore();
    await loadSet(store, testDeps(), "E1");
    const content = (await store.listContent()).filter((i) => i.space === "library" || i.space === "e1");
    const labelOf = (key: string) => content.find((i) => i.key === key)?.label ?? key;
    const rule = (key: string) => readBackRule(content.find((i) => i.key === key) as Rule, labelOf);
    expect(rule("nuln_civic_pride").slice(0, 3)).toEqual([
      "Effect: Ld +1.",
      "Applies to units that reach Nuln by raised at, then in (any number of times).",
      "No trigger: on whenever the scope matches.",
    ]);
    expect(rule("gunnery_school_pride")[0]).toBe("Effect: sets Ld 8 at this point.");
    expect(rule("unpaid_wages")).toEqual([
      "Effect: Ld −1.",
      "Applies to units that are in the named scope “commissioned by the treasury”.",
      "Triggered by the hook “Treasury not paying”.",
      "Environment rule: reads the world at the date you're viewing, in the stationed step.",
      "Category title · campaign layer.",
    ]);
  });
});

describe("rule text", () => {
  it("reads like the guide", async () => {
    const store = new MemoryStore();
    await loadSet(store, testDeps(), "E1");
    const content = await store.listContent();
    const rule = content.find((i) => i.key === "unpaid_wages") as Rule;
    expect(ruleToText(rule, content.find((i) => i.key === "wissenland_campaign_rules") as Package)).toBe(
      [
        "package: [Wissenland campaign rules, wissenland_campaign_rules]",
        "edition: wfb6",
        "layer: campaign",
        "requires: [e1_rules]",
        "",
        "rules:",
        "  - rule: [Unpaid wages, unpaid_wages]",
        "    effect: [Ld, -1]",
        "    scope: commissioned_by_the_treasury",
        "    trigger: treasury_not_paying",
        "    nature: environment",
        "    category: title",
        "    layer: campaign",
        "",
      ].join("\n"),
    );
  });
});
