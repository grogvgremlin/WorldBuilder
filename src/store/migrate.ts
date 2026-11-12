// Brings slice 0's stored data forward into slice 1's containers.
// Design: build/slice-1-brief.md §2.1 (world content belongs to a sandbox, rules to library
// packages; the manifest is content). Used by the IndexedDB upgrade and by importing an old copy.
//
// Slice 0 had one flat world. It becomes:
//   - a sandbox "slice0" holding every thing, link, event and unit, and the one log;
//   - the library holding every package, rule and named scope, plus a WFB 6th manifest;
//   - one manifest context in the sandbox, with every old package switched on.
// Old drafts are dropped (their shape changed); the build log says so.

import type { ContentItem, LogEnvelope, Manifest, ManifestContext, Package, Sandbox, WholeCopy, WholeCopyV1 } from "../schema";

export const SLICE0_SANDBOX = "slice0";

// The WFB model statline and default orders (rules-overlay §12, owner on Q3 and Q5).
export function defaultWfbManifest(): Manifest {
  return {
    class: "manifest",
    key: "wfb6",
    label: "Warhammer Fantasy Battles, 6th edition",
    space: "library",
    package: "wfb6_base",
    statOrder: ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"],
    categoryOrder: {
      origin: [["place"], ["organisation"], ["title"]],
      stationed: [["place"], ["organisation"], ["title"]],
    },
    bagOrder: ["set", "add", "multiply", "cap", "floor"],
  };
}

const WORLD_CLASSES = new Set(["thing", "link", "event", "unit"]);

export function migrateCopyV1(old: WholeCopyV1): WholeCopy {
  const world: ContentItem[] = [];
  const library: ContentItem[] = [];
  for (const raw of old.content) {
    const item = { ...raw } as Record<string, unknown>;
    if (WORLD_CLASSES.has(String(item.class))) {
      item.space = SLICE0_SANDBOX;
      item.package = SLICE0_SANDBOX;
      if (item.class === "unit") item.context = null;
      world.push(item as ContentItem);
    } else {
      item.space = "library";
      if (item.class === "package") {
        item.edition = "wfb6";
        item.requires = [];
        item.conflicts = [];
      }
      library.push(item as ContentItem);
    }
  }
  // Packages keep only the members that stayed in the library.
  const libraryKeys = new Set(library.map((i) => i.key));
  for (const item of library) {
    if (item.class === "package") item.members = item.members.filter((key) => libraryKeys.has(key));
  }

  const base: Package = {
    class: "package",
    key: "wfb6_base",
    label: "WFB 6th edition base package",
    space: "library",
    package: "wfb6_base",
    sourceLayer: "book",
    edition: "wfb6",
    requires: [],
    conflicts: [],
    members: ["wfb6"],
  };
  const oldPackages = library.filter((i): i is Package => i.class === "package").map((p) => p.key);
  const context: ManifestContext = {
    class: "context",
    key: "wfb6",
    label: "WFB 6th",
    space: SLICE0_SANDBOX,
    package: SLICE0_SANDBOX,
    manifest: "wfb6",
    packages: ["wfb6_base", ...oldPackages],
  };
  const sandbox: Sandbox = {
    class: "sandbox",
    key: SLICE0_SANDBOX,
    label: "Slice 0 world",
    space: SLICE0_SANDBOX,
    package: SLICE0_SANDBOX,
    members: [context.key, ...world.map((i) => i.key)],
  };
  const hasBase = library.some((i) => i.key === "wfb6_base" || i.key === "wfb6");
  const added: ContentItem[] = hasBase ? [] : [base, defaultWfbManifest()];

  const logs: Record<string, LogEnvelope[]> = {};
  if (old.entries.length > 0 || world.length > 0) logs[SLICE0_SANDBOX] = old.entries;
  const content = world.length > 0 || library.length > 0 ? [...added, ...library, sandbox, context, ...world] : [];
  return { format: "worldbuilder-copy", version: 2, exportedTime: old.exportedTime, meta: old.meta, logs, content, drafts: [] };
}
