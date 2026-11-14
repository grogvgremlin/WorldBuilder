// An import lands in a draft batch; the draft is then deployed or discarded.
// Design: design/text-format-and-csv.md §1 (imports land in the draft, never deployed
// automatically; importing never blocks), §3 (keys: a written key wins; otherwise match the
// label once; written back), §6 (a file may hold part of a package), §8 (import review: new /
// edit / unchanged, problems per line, missing references); design/infra.md §1–2 (draft
// batches are stored outside the log until commit; discarding is the only real delete);
// build/slice-1-brief.md §2.1 (a package file deploys to the library, a sandbox file to its
// sandbox), §2.3 (references by label: matched as headers are, written back).

import type { ContentItem, DraftBatch, DraftTarget, EventRecord, ManifestContext, Package, Problem, Sandbox } from "../schema";
import type { Store } from "../store/store";
import { appendEvent, type LogDeps } from "../log/log";
import { looksLikeKey } from "./expression-text";
import { DEFAULT_STAT_ORDER, readText, slugify, type HeaderNeedingKey, type ParsedText, type RefSite } from "./text-format";

// What is already deployed, for matching labels and spotting edits.
export interface Existing {
  content: ContentItem[]; // every space
  loggedEventKeys: Record<string, string[]>; // sandbox -> event keys already in its log
  pending?: ContentItem[]; // items in other drafts waiting: references to them aren't missing
}

export function buildDraft(text: string, fileLabel: string, existing: Existing, deps: { newId(): string; now(): string }): DraftBatch {
  const parsed = readText(text, fileLabel, statOrderFinder(existing.content));
  const problems: Problem[] = [...parsed.problems];

  const space = spaceOf(parsed, existing.content);
  assignKeys(parsed, existing.content, space, problems);
  // A manifest file's one item is its header; a package or sandbox has a container item.
  const headerKey =
    parsed.fileKind === "manifest" && parsed.items[0]
      ? parsed.items[0].item.key
      : (parsed.headerKey ?? matchContainer(parsed, existing.content) ?? slugify(parsed.headerLabel));
  const finalSpace = parsed.fileKind === "sandbox" ? headerKey : space;
  const target: DraftTarget = finalSpace === "library" ? { kind: "library" } : { kind: "sandbox", sandbox: finalSpace };

  for (const { item } of parsed.items) {
    item.space = finalSpace;
    item.package = headerKey;
  }
  resolveUnitLinkPlaceholders(parsed);
  const others = [...existing.content, ...(existing.pending ?? [])];
  const labelMatches = matchReferences(parsed, others, finalSpace, problems);
  setLinkKeys(parsed);
  checkDuplicateKeys(parsed, problems);

  const deployed = new Map(existing.content.filter((i) => i.space === finalSpace).map((i) => [i.key, i]));
  warnAboutMoves(parsed, deployed, existing.content, problems);
  const allItems = parsed.fileKind === "manifest" ? parsed.items : [{ line: 1, item: containerItem(parsed, existing.content, finalSpace, headerKey) }, ...parsed.items];

  const logged = new Set(existing.loggedEventKeys[headerKey] ?? []);
  const logItems = parsed.logEvents
    .filter(({ line, event }) => {
      if (!logged.has(event.key)) return true;
      problems.push({ line, severity: "warning", message: "event “" + event.label + "” is already in the log: not added again" });
      return false;
    })
    .map(({ line, event }) => ({ line, kind: "event" as const, inWorldDate: event.start, event }));

  return {
    id: deps.newId(),
    target,
    label: parsed.headerLabel,
    createdTime: deps.now(),
    sourceText: text,
    rewrittenText: writeBack(text, parsed, headerKey, labelMatches),
    content: allItems.map(({ line, item }) => ({ line, item, status: compareWithDeployed(item, deployed.get(item.key)) })),
    logItems,
    problems: problems.sort((a, b) => (a.line ?? 0) - (b.line ?? 0)),
  };
}

// Rebuilds a draft from its own text against what's deployed now (and the other drafts waiting),
// keeping its ID. Run before deploying: a draft made before others were deployed would otherwise
// carry stale warnings, stale new / edit statuses, or log an event that's already logged.
export function refreshDraft(draft: DraftBatch, existing: Existing): DraftBatch {
  const fresh = buildDraft(draft.sourceText, draft.label, existing, { newId: () => draft.id, now: () => draft.createdTime });
  return { ...fresh, label: draft.label };
}

// --- Stat order for profiles written as lists ------------------------------------------------

function statOrderFinder(content: ContentItem[]) {
  return (contextKey: string | null, contextsInFile: ManifestContext[]): string[] => {
    const contexts = [...contextsInFile, ...content.filter((i): i is ManifestContext => i.class === "context")];
    const context = contexts.find((c) => c.key === contextKey) ?? contextsInFile[0];
    const manifest = content.find((i) => i.class === "manifest" && i.key === context?.manifest);
    return manifest?.class === "manifest" ? manifest.statOrder : DEFAULT_STAT_ORDER;
  };
}

// --- Keys ------------------------------------------------------------------------------------

// Where the file's items will live: the library, or a sandbox (its world, or a package local
// to it). A sandbox file's key isn't known until its header is matched, so that comes later.
function spaceOf(parsed: ParsedText, content: ContentItem[]): string {
  if (parsed.fileKind === "manifest") return "library";
  if (parsed.fileKind === "package") return parsed.homeSandbox ?? "library";
  return parsed.headerKey ?? matchContainer(parsed, content) ?? slugify(parsed.headerLabel);
}

// text-format §3: re-importing an item edits it. Say so loudly when that moves it out of the
// package it was in (reusing a manifest's or rule's key by accident, for instance).
function warnAboutMoves(parsed: ParsedText, deployed: Map<string, ContentItem>, content: ContentItem[], problems: Problem[]): void {
  for (const { line, item } of parsed.items) {
    const before = deployed.get(item.key);
    if (!before || before.package === null || before.package === item.package || before.class === "link") continue;
    const from = content.find((i) => i.key === before.package && i.space === before.space && (i.class === "package" || i.class === "sandbox"));
    problems.push({
      line,
      severity: "warning",
      message: "this replaces the " + item.class + " " + item.key + " in " + (from?.label ?? before.package) + ", moving it here: use a new key to add a separate one",
    });
  }
}

// The package or sandbox written without a key: match it by label once.
function matchContainer(parsed: ParsedText, content: ContentItem[]): string | null {
  const className = parsed.fileKind === "sandbox" ? "sandbox" : "package";
  const matches = content.filter((i) => i.class === className && i.label === parsed.headerLabel);
  return matches.length === 1 ? matches[0].key : null;
}

// text-format §3: no key -> match the label once against deployed items of the same class in
// the same space; one match -> that key; several -> warned, a new key; none -> a new key.
function assignKeys(parsed: ParsedText, content: ContentItem[], space: string, problems: Problem[]): void {
  for (const header of parsed.headersNeedingKeys) {
    const matches = content.filter((item) => item.space === space && item.class === header.className && item.label === header.label);
    let key: string;
    if (matches.length === 1) {
      key = matches[0].key;
    } else {
      key = slugify(header.label);
      if (matches.length > 1) {
        problems.push({
          line: lineOfHeader(parsed, header),
          severity: "warning",
          message: "“" + header.label + "” matches " + matches.length + " items; using a new key " + key + ": write the key to pick one",
        });
      }
    }
    if (header.isLogEvent) parsed.logEvents[header.itemIndex].event.key = key;
    else parsed.items[header.itemIndex].item.key = key;
  }
}

function lineOfHeader(parsed: ParsedText, header: HeaderNeedingKey): number | null {
  return header.isLogEvent ? parsed.logEvents[header.itemIndex].line : parsed.items[header.itemIndex].line;
}

// Unit links were read before the unit's key was known.
function resolveUnitLinkPlaceholders(parsed: ParsedText): void {
  for (const { item } of parsed.items) {
    if (item.class !== "link" || !item.from.startsWith("@unit:")) continue;
    item.from = parsed.items[Number(item.from.slice("@unit:".length))].item.key;
  }
}

function setLinkKeys(parsed: ParsedText): void {
  for (const { item } of parsed.items) {
    if (item.class === "link") item.key = [item.from, item.kind, item.to, item.start].join("~");
  }
}

// --- References: keys, or labels matched to keys (slice 1 brief §2.3) -----------------------------

// The items a reference of each kind can name, from what's deployed and from this file.
function pool(kind: RefSite["kind"], parsed: ParsedText, content: ContentItem[], space: string): ContentItem[] {
  const all = [...content.filter((i) => !(i.space === space && parsed.items.some((p) => p.item.key === i.key))), ...parsed.items.map((p) => p.item)];
  switch (kind) {
    case "thing":
      // A sandbox file, or a package local to a sandbox, names its own world. A library package
      // is world-agnostic: it may name things in any sandbox.
      return all.filter((i) => (i.class === "thing" || i.class === "unit") && (space === "library" ? i.space !== "library" : i.space === space));
    case "scope":
      return all.filter((i) => i.class === "scope" && (i.space === "library" || i.space === space));
    case "hook":
      // Hooks are world items: a sandbox's own; a library rule may name one in any sandbox.
      return all.filter((i) => i.class === "hook" && (space === "library" ? i.space !== "library" : i.space === space));
    case "package":
      // The library's packages, and packages local to this sandbox.
      return all.filter((i) => i.class === "package" && (i.space === "library" || i.space === space));
    case "manifest":
      return all.filter((i) => i.class === "manifest" && i.space === "library");
  }
}

// Returns each reference matched by label, with the key it was matched to.
function matchReferences(parsed: ParsedText, content: ContentItem[], space: string, problems: Problem[]): Map<RefSite, string> {
  const matchedByLabel = new Map<RefSite, string>();
  for (const ref of parsed.refs) {
    const candidates = pool(ref.kind, parsed, content, space);
    if (candidates.some((c) => c.key === ref.written)) continue; // a key: fine as written

    const wanted = ref.written.trim().toLowerCase();
    const keys = [...new Set(candidates.filter((c) => c.label.trim().toLowerCase() === wanted).map((c) => c.key))];
    if (keys.length === 1) {
      ref.set(keys[0]);
      matchedByLabel.set(ref, keys[0]);
    } else if (keys.length > 1) {
      problems.push({ line: ref.line, severity: "warning", message: "“" + ref.written + "” in " + ref.where + " matches " + keys.length + " items (" + keys.join(", ") + "): write the key" });
    } else if (!(space === "library" && (ref.kind === "thing" || ref.kind === "hook") && looksLikeKey(ref.written))) {
      // A key-like name in a library rule may belong to a sandbox not loaded yet: no warning.
      problems.push({ line: ref.line, severity: "warning", message: "missing reference " + ref.written + " in " + ref.where });
    }
  }
  return matchedByLabel;
}

// --- Write-back ---------------------------------------------------------------------------------

// Writes keys in place of: headers that had none, and labels matched to keys. Edits run from
// the end of the text back, so earlier character positions stay right.
function writeBack(text: string, parsed: ParsedText, headerKey: string, labelMatches: Map<RefSite, string>): string {
  const edits: { range: [number, number]; replacement: string }[] = [];
  for (const header of parsed.headersNeedingKeys) {
    const key = header.isLogEvent ? parsed.logEvents[header.itemIndex].event.key : parsed.items[header.itemIndex].item.key;
    const rest = header.restRange ? text.slice(header.restRange[0], header.restRange[1]) : null;
    edits.push({ range: header.range, replacement: headerText(header.label, key, rest) });
  }
  if (parsed.headerRange) edits.push({ range: parsed.headerRange, replacement: headerText(parsed.headerLabel, headerKey, null) });

  const conditionsDone = new Set<string>();
  for (const [ref, key] of labelMatches) {
    if (ref.range) {
      edits.push({ range: ref.range, replacement: key });
    } else if (ref.condition && !conditionsDone.has(ref.condition.range.join())) {
      conditionsDone.add(ref.condition.range.join());
      edits.push({ range: ref.condition.range, replacement: ref.condition.render() });
    }
  }
  edits.sort((a, b) => b.range[0] - a.range[0]);
  let result = text;
  for (const edit of edits) result = result.slice(0, edit.range[0]) + edit.replacement + result.slice(edit.range[1]);
  return result;
}

function headerText(label: string, key: string, rest: string | null = null): string {
  const safeLabel = /^[A-Za-z0-9 _'-]+$/.test(label) ? label : JSON.stringify(label);
  return "[" + safeLabel + ", " + key + (rest ? ", " + rest : "") + "]";
}

// --- Checks and the container item ---------------------------------------------------------------

function checkDuplicateKeys(parsed: ParsedText, problems: Problem[]): void {
  const seen = new Map<string, number | null>();
  for (const { line, item } of parsed.items) {
    if (seen.has(item.key)) {
      problems.push({ line, severity: "error", message: "key " + item.key + " is used twice in this import (first on line " + seen.get(item.key) + ")" });
    }
    seen.set(item.key, line);
  }
}

// The package (library) or sandbox item for this file. A file may hold only part of a
// package or sandbox (text-format §6), so deployed members are kept, and new ones added.
function containerItem(parsed: ParsedText, content: ContentItem[], space: string, key: string): ContentItem {
  const imported = parsed.items.map(({ item }) => item.key);
  if (parsed.fileKind === "package") {
    const deployed = content.find((i): i is Package => i.class === "package" && i.space === space && i.key === key);
    return {
      class: "package",
      key,
      label: parsed.headerLabel,
      space,
      package: key,
      sourceLayer: parsed.sourceLayer,
      edition: parsed.edition ?? deployed?.edition ?? null,
      requires: parsed.requires,
      conflicts: parsed.conflicts,
      members: mergedMembers(deployed?.members ?? [], imported),
    };
  }
  // A sandbox file that leaves out category_order (a log-only file, say) keeps the deployed one.
  const deployed = content.find((i): i is Sandbox => i.class === "sandbox" && i.space === space && i.key === key);
  return {
    class: "sandbox",
    key,
    label: parsed.headerLabel,
    space,
    package: key,
    categoryOrder: parsed.categoryOrder ?? deployed?.categoryOrder ?? null,
    members: mergedMembers(deployed?.members ?? [], imported),
  };
}

function mergedMembers(kept: string[], imported: string[]): string[] {
  return [...kept, ...imported.filter((key) => !kept.includes(key))];
}

function compareWithDeployed(item: ContentItem, deployed: ContentItem | undefined): "new" | "edit" | "unchanged" {
  if (!deployed) return "new";
  return JSON.stringify(item) === JSON.stringify(deployed) ? "unchanged" : "edit";
}

// --- Saving, deploying, discarding ------------------------------------------------------------------

export async function saveDraft(store: Store, draft: DraftBatch): Promise<void> {
  await store.putDraft(draft);
}

// Deploy: content goes in by (space, key); a sandbox draft's log items are appended to that
// sandbox's log as accepted entries, stamped with the draft's ID as their commit batch.
export async function deployDraft(store: Store, deps: LogDeps, draft: DraftBatch): Promise<void> {
  const items = draft.content.filter(({ status }) => status !== "unchanged").map(({ item }) => item);
  await store.putContent(items);
  if (draft.target.kind === "sandbox") {
    for (const logItem of draft.logItems) {
      await appendEvent(store, deps, draft.target.sandbox, logItem.event as EventRecord, logItem.inWorldDate, draft.id);
    }
  }
  await store.deleteDraft(draft.id);
}

export async function discardDraft(store: Store, draftId: string): Promise<void> {
  await store.deleteDraft(draftId);
}
