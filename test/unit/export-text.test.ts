// Exported text re-imports exactly. Design: design/text-format-and-csv.md §1, §6.

import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../src/store/memory-store";
import { itemToText, packageToText, ruleToText } from "../../src/import/export-text";
import { readBackRule } from "../../src/import/read-back";
import type { ContentItem, Package, Rule } from "../../src/schema";
import { importToDraft, loadFixture, testDeps } from "../helpers";

const fixtures = [
  ["e1-handgunners.yaml", "e1_handgunners"],
  ["e2-depth.yaml", "e2_depth"],
  ["e4-grenzstadt.yaml", "e4_grenzstadt"],
];

function byKey(items: ContentItem[]) {
  return [...items].sort((a, b) => a.key.localeCompare(b.key));
}

describe.each(fixtures)("export text (%s)", (fixture, packageKey) => {
  it("re-imports a whole package as unchanged, and rebuilds the same content elsewhere", async () => {
    const store = new MemoryStore();
    await loadFixture(store, testDeps(), fixture);
    const content = await store.listContent();
    const pkg = content.find((i) => i.key === packageKey) as Package;
    const text = packageToText(pkg, content);

    const again = await importToDraft(store, testDeps(), text);
    expect(again.problems).toEqual([]);
    expect(again.content.every((c) => c.status === "unchanged")).toBe(true);
    expect(again.rewrittenText).toBe(text); // nothing to write back: every key is there

    const fresh = new MemoryStore();
    await loadFixture(fresh, testDeps(), "export", text);
    expect(byKey(await fresh.listContent())).toEqual(byKey(content));
  });

  it("re-imports each rule on its own as unchanged, without touching the rest of the package", async () => {
    const store = new MemoryStore();
    await loadFixture(store, testDeps(), fixture);
    const content = await store.listContent();
    const pkg = content.find((i) => i.key === packageKey) as Package;
    for (const rule of content.filter((i): i is Rule => i.class === "rule")) {
      const draft = await importToDraft(store, testDeps(), ruleToText(rule, pkg));
      expect(draft.problems).toEqual([]);
      expect(draft.content.map((c) => [c.item.key, c.status])).toEqual([
        [packageKey, "unchanged"],
        [rule.key, "unchanged"],
      ]);
    }
  });
});

describe.each(fixtures)("any item's text (%s)", (fixture, packageKey) => {
  it("re-imports every item on its own as unchanged", async () => {
    const store = new MemoryStore();
    await loadFixture(store, testDeps(), fixture);
    const content = await store.listContent();
    const pkg = content.find((i) => i.key === packageKey) as Package;
    for (const item of content) {
      const draft = await importToDraft(store, testDeps(), itemToText(item, pkg, content));
      expect(draft.problems, item.key).toEqual([]);
      expect(draft.content.filter((c) => c.status !== "unchanged").map((c) => c.item.key), item.key).toEqual([]);
    }
  });
});

describe("read-back", () => {
  it("says what each E1 rule does in words", async () => {
    const store = new MemoryStore();
    await loadFixture(store, testDeps(), "e1-handgunners.yaml");
    const content = await store.listContent();
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
      "Only while wages withheld is in force (withholder: Wissenland treasury).",
      "Environment rule: reads the world at the date you're viewing, in the stationed step.",
      "Category title · book layer.",
    ]);
  });
});

describe("rule text", () => {
  it("reads like the guide", async () => {
    const store = new MemoryStore();
    await loadFixture(store, testDeps(), "e1-handgunners.yaml");
    const content = await store.listContent();
    const rule = content.find((i) => i.key === "unpaid_wages") as Rule;
    expect(ruleToText(rule, content.find((i) => i.key === "e1_handgunners") as Package)).toBe(
      [
        "package: [E1 Handgunners' Ld, e1_handgunners]",
        "layer: book",
        "",
        "rules:",
        "  - rule: [Unpaid wages, unpaid_wages]",
        "    effect: [Ld, -1]",
        "    scope: commissioned_by_the_treasury",
        "    trigger: in_force(wages_withheld, withholder = wissenland_treasury)",
        "    nature: environment",
        "    category: title",
        "    layer: book",
        "",
      ].join("\n"),
    );
  });
});
