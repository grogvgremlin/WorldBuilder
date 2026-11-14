// Brings older stored data forward into the current containers.
// Design: build/slice-1-brief.md §2.1 (world content belongs to a sandbox, rules to library
// packages; the manifest is content); owner decisions of 14 Nov (build log): the manifest holds
// the statline, bag order and core packages; the category order belongs to the sandbox; a
// context lists books, FAQs, house rules and campaign packages.
// Used by the IndexedDB upgrade and by importing an old exported copy.
//
// Version 1 (slice 0): one flat world. It becomes a sandbox "slice0" holding every thing, link,
// event and unit and the one log; the library holds every package, rule and named scope, plus a
// WFB 6th manifest; one context with every old package switched on.
// Version 2 (slice 1 Part A, 12 Nov): manifests carried the category order and contexts one
// package list. The order moves to each sandbox using that manifest; the list is split by each
// package's source layer; the package holding a manifest becomes its core.
// Old drafts are dropped (their shape changed).

import type { ContentItem, LogEnvelope, Manifest, ManifestContext, Package, Sandbox, StepOrders, WholeCopy, WholeCopyV1, WholeCopyV2 } from "../schema";

export const SLICE0_SANDBOX = "slice0";

// rules-overlay §12 default, with the owner's three ranks (Q3).
export function defaultCategoryOrder(): StepOrders {
  return {
    origin: [["place"], ["organisation"], ["title"]],
    stationed: [["place"], ["organisation"], ["title"]],
  };
}

// The WFB model statline and bag order (Q5), with its core package.
export function defaultWfbManifest(): Manifest {
  return {
    class: "manifest",
    key: "wfb6",
    label: "Warhammer Fantasy Battles, 6th edition",
    space: "library",
    package: "wfb6",
    statOrder: ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"],
    bagOrder: ["set", "add", "multiply", "cap", "floor"],
    core: ["wfb6_base"],
  };
}

function emptyBase(): Package {
  return {
    class: "package",
    key: "wfb6_base",
    label: "WFB 6th edition base package",
    space: "library",
    package: "wfb6_base",
    sourceLayer: "book",
    edition: "wfb6",
    requires: [],
    conflicts: [],
    members: [],
  };
}

const WORLD_CLASSES = new Set(["thing", "link", "event", "unit"]);

// --- Version 1 -> 2 -> 3 ----------------------------------------------------------------------

export function migrateCopyV1(old: WholeCopyV1): WholeCopy {
  const world: Record<string, unknown>[] = [];
  const library: Record<string, unknown>[] = [];
  for (const raw of old.content) {
    const item = { ...raw } as Record<string, unknown>;
    if (WORLD_CLASSES.has(String(item.class))) {
      item.space = SLICE0_SANDBOX;
      item.package = SLICE0_SANDBOX;
      if (item.class === "unit") item.context = null;
      world.push(item);
    } else {
      item.space = "library";
      if (item.class === "package") Object.assign(item, { edition: "wfb6", requires: [], conflicts: [] });
      library.push(item);
    }
  }
  const libraryKeys = new Set(library.map((i) => i.key as string));
  for (const item of library) {
    if (item.class === "package") item.members = (item.members as string[]).filter((key) => libraryKeys.has(key));
  }
  if (world.length === 0 && library.length === 0) {
    return { format: "worldbuilder-copy", version: 3, exportedTime: old.exportedTime, meta: old.meta, logs: {}, content: [], drafts: [] };
  }

  const packages = library.filter((i) => i.class === "package") as unknown as Package[];
  const context: ManifestContext = {
    class: "context",
    key: "wfb6",
    label: "WFB 6th",
    space: SLICE0_SANDBOX,
    package: SLICE0_SANDBOX,
    manifest: "wfb6",
    ...groupByLayer(packages.map((p) => p.key), packages),
    categoryOrder: null,
  };
  const sandbox: Sandbox = {
    class: "sandbox",
    key: SLICE0_SANDBOX,
    label: "Slice 0 world",
    space: SLICE0_SANDBOX,
    package: SLICE0_SANDBOX,
    categoryOrder: defaultCategoryOrder(),
    members: [context.key, ...world.map((i) => i.key as string)],
  };
  const content = [defaultWfbManifest(), emptyBase(), ...library, sandbox, context, ...world] as ContentItem[];
  const logs: Record<string, LogEnvelope[]> = { [SLICE0_SANDBOX]: old.entries };
  return { format: "worldbuilder-copy", version: 3, exportedTime: old.exportedTime, meta: old.meta, logs, content, drafts: [] };
}

export function migrateCopyV2(old: WholeCopyV2): WholeCopy {
  return {
    format: "worldbuilder-copy",
    version: 3,
    exportedTime: old.exportedTime,
    meta: old.meta,
    logs: old.logs,
    content: migrateItemsV2(old.content),
    drafts: [],
  };
}

// Version 2 items -> version 3 items. Items already in version 3's shape pass through.
export function migrateItemsV2(items: Record<string, unknown>[]): ContentItem[] {
  const manifests = items.filter((i) => i.class === "manifest" && "categoryOrder" in i);
  const packages = items.filter((i) => i.class === "package") as unknown as Package[];
  const orderOf = (manifestKey: unknown): StepOrders => {
    const m = manifests.find((i) => i.key === manifestKey);
    return (m?.categoryOrder as StepOrders) ?? defaultCategoryOrder();
  };
  // The package each version 2 manifest sat in becomes that manifest's core.
  const coreOf = (manifest: Record<string, unknown>): string[] => (typeof manifest.package === "string" ? [manifest.package] : []);

  return items.map((raw) => {
    const item = { ...raw };
    if (item.class === "manifest" && "categoryOrder" in item) {
      delete item.categoryOrder;
      item.core = coreOf(item);
    }
    if (item.class === "context" && "packages" in item) {
      const manifest = manifests.find((m) => m.key === item.manifest);
      const core = manifest ? coreOf(manifest) : [];
      const listed = (item.packages as string[]).filter((key) => !core.includes(key));
      Object.assign(item, groupByLayer(listed, packages), { categoryOrder: null });
      delete item.packages;
    }
    if (item.class === "sandbox" && !("categoryOrder" in item)) {
      const context = items.find((i) => i.class === "context" && i.space === item.key);
      item.categoryOrder = orderOf(context?.manifest);
    }
    return item as unknown as ContentItem;
  });
}

// Splits a package list into a context's groups by each package's source layer.
function groupByLayer(keys: string[], packages: Package[]): Pick<ManifestContext, "books" | "faqs" | "house" | "campaign"> {
  const groups = { books: [] as string[], faqs: [] as string[], house: [] as string[], campaign: [] as string[] };
  for (const key of keys) {
    const layer = packages.find((p) => p.key === key)?.sourceLayer ?? "book";
    const field = layer === "faq" ? "faqs" : layer === "house" ? "house" : layer === "campaign" ? "campaign" : "books";
    groups[field].push(key);
  }
  return groups;
}
