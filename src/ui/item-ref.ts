// How screens point at one content item: its space and key together, since a key is unique
// only within its space (the manifest `wfb6` in the library, a context `wfb6` in a sandbox).
// Design: build/slice-1-brief.md §2.1.

import type { ContentItem } from "../schema";

export type ItemRef = string; // "space|key"

export function itemRef(item: { space: string; key: string }): ItemRef {
  return item.space + "|" + item.key;
}

export function refOf(space: string, key: string): ItemRef {
  return space + "|" + key;
}

// The item a key names, as seen from a sandbox: the sandbox's own item first, then the library's.
export function findByKey(content: ContentItem[], key: string, sandbox: string | null): ContentItem | undefined {
  return content.find((i) => i.key === key && i.space === sandbox) ?? content.find((i) => i.key === key && i.space === "library");
}
