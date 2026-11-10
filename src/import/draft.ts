// An import lands in a draft batch; the draft is then deployed or discarded.
// Design: design/text-format-and-csv.md §1 (imports land in the draft, never deployed
// automatically; importing never blocks), §3 (keys: a written key wins; otherwise match the
// label once; written back), §8 (import review: new / edit / unchanged, problems per line,
// missing references); design/infra.md §1 (draft batches are stored outside the log until
// commit), §2 (discarding is the only real delete).

import type { ContentItem, DraftBatch, EventRecord, Problem } from "../schema";
import type { Store } from "../store/store";
import { appendEvent, type LogDeps } from "../log/log";
import { referencedKeys } from "./expression-text";
import { readText, slugify, type HeaderNeedingKey, type ParsedText } from "./text-format";

// What is already deployed, for matching labels and spotting edits.
export interface Existing {
  content: ContentItem[];
  loggedEventKeys: Set<string>; // event keys already in accepted log entries
}

export function buildDraft(
  text: string,
  fileLabel: string,
  existing: Existing,
  deps: { newId(): string; now(): string },
): DraftBatch {
  const parsed = readText(text, fileLabel);
  const problems: Problem[] = [...parsed.problems];

  const packageKey = parsed.packageKey ?? slugify(parsed.packageLabel);
  assignKeys(parsed, existing, problems);
  resolveUnitLinkPlaceholders(parsed);
  for (const { item } of parsed.items) item.package = packageKey;

  checkDuplicateKeys(parsed, problems);
  checkReferences(parsed, existing, problems);

  const byKey = new Map(existing.content.map((item) => [item.key, item]));
  const packageItem: ContentItem = {
    class: "package",
    key: packageKey,
    label: parsed.packageLabel,
    package: packageKey,
    sourceLayer: parsed.sourceLayer,
    members: mergedMembers(byKey.get(packageKey), parsed.items.map(({ item }) => item.key)),
  };
  const allItems = [{ line: 1, item: packageItem }, ...parsed.items];

  const logItems = parsed.logEvents
    .filter(({ line, event }) => {
      if (!existing.loggedEventKeys.has(event.key)) return true;
      problems.push({ line, severity: "warning", message: "event “" + event.label + "” is already in the log: not added again" });
      return false;
    })
    .map(({ line, event }) => ({ line, kind: "event" as const, inWorldDate: event.start, event }));

  return {
    id: deps.newId(),
    label: parsed.packageLabel,
    createdTime: deps.now(),
    sourceText: text,
    rewrittenText: writeKeysBack(text, parsed, packageKey),
    content: allItems.map(({ line, item }) => ({ line, item, status: compareWithDeployed(item, byKey.get(item.key)) })),
    logItems,
    problems: problems.sort((a, b) => (a.line ?? 0) - (b.line ?? 0)),
  };
}

// A file may hold only part of a package (text-format §6: edit some entries, re-import, only
// the changed ones show as edits). So the package keeps its deployed members, in their order,
// and gains any new ones at the end.
function mergedMembers(deployed: ContentItem | undefined, imported: string[]): string[] {
  const kept = deployed?.class === "package" ? deployed.members : [];
  return [...kept, ...imported.filter((key) => !kept.includes(key))];
}

// --- Keys ------------------------------------------------------------------------------------

// text-format §3: no key -> match the label once against deployed items of the same class;
// one match -> that key; several -> the user must pick (reported); none -> a new key.
function assignKeys(parsed: ParsedText, existing: Existing, problems: Problem[]): void {
  for (const header of parsed.headersNeedingKeys) {
    const matches = existing.content.filter((item) => item.class === header.className && item.label === header.label);
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
    setKey(parsed, header, key);
  }
}

function lineOfHeader(parsed: ParsedText, header: HeaderNeedingKey): number | null {
  return header.isLogEvent ? parsed.logEvents[header.itemIndex].line : parsed.items[header.itemIndex].line;
}

function setKey(parsed: ParsedText, header: HeaderNeedingKey, key: string): void {
  if (header.isLogEvent) parsed.logEvents[header.itemIndex].event.key = key;
  else parsed.items[header.itemIndex].item.key = key;
}

// Unit links were read before the unit's key was known.
function resolveUnitLinkPlaceholders(parsed: ParsedText): void {
  for (const { item } of parsed.items) {
    if (item.class !== "link" || !item.from.startsWith("@unit:")) continue;
    const unitIndex = Number(item.from.slice("@unit:".length));
    item.from = parsed.items[unitIndex].item.key;
    item.key = [item.from, item.kind, item.to, item.start].join("~");
  }
}

// Writes `[label, key]` in place of every header that had no key. Edits run from the end of
// the text back, so earlier character positions stay right.
function writeKeysBack(text: string, parsed: ParsedText, packageKey: string): string {
  const edits: { range: [number, number]; replacement: string }[] = [];
  for (const header of parsed.headersNeedingKeys) {
    const key = header.isLogEvent ? parsed.logEvents[header.itemIndex].event.key : parsed.items[header.itemIndex].item.key;
    const rest = header.restRange ? text.slice(header.restRange[0], header.restRange[1]) : null;
    edits.push({ range: header.range, replacement: headerText(header.label, key, rest) });
  }
  if (parsed.packageHeaderRange) edits.push({ range: parsed.packageHeaderRange, replacement: headerText(parsed.packageLabel, packageKey, null) });
  edits.sort((a, b) => b.range[0] - a.range[0]);
  let result = text;
  for (const edit of edits) result = result.slice(0, edit.range[0]) + edit.replacement + result.slice(edit.range[1]);
  return result;
}

function headerText(label: string, key: string, rest: string | null = null): string {
  const safeLabel = /^[A-Za-z0-9 _'-]+$/.test(label) ? label : JSON.stringify(label);
  return "[" + safeLabel + ", " + key + (rest ? ", " + rest : "") + "]";
}

// --- Checks -------------------------------------------------------------------------------------

function checkDuplicateKeys(parsed: ParsedText, problems: Problem[]): void {
  const seen = new Map<string, number | null>();
  for (const { line, item } of parsed.items) {
    if (seen.has(item.key)) {
      problems.push({ line, severity: "error", message: "key " + item.key + " is used twice in this import (first on line " + seen.get(item.key) + ")" });
    }
    seen.set(item.key, line);
  }
}

// Missing references warn and never block (text-format §8 offers stubs; slice 0 only reports).
function checkReferences(parsed: ParsedText, existing: Existing, problems: Problem[]): void {
  const known = new Set<string>([...existing.content.map((i) => i.key), ...parsed.items.map(({ item }) => item.key)]);
  const warn = (line: number | null, key: string, where: string): void => {
    if (!known.has(key)) problems.push({ line, severity: "warning", message: "missing reference " + key + " in " + where });
  };
  for (const { line, item } of parsed.items) {
    if (item.class === "link") {
      warn(line, item.from, "link");
      warn(line, item.to, "link");
    }
    if (item.class === "rule") {
      for (const key of [...referencedKeys(item.scope).things, ...referencedKeys(item.scope).scopes]) warn(line, key, "scope");
      if (item.trigger) for (const key of referencedKeys(item.trigger).things) warn(line, key, "trigger");
    }
    if (item.class === "scope") for (const key of referencedKeys(item.query).things) warn(line, key, "query");
    if (item.class === "event") for (const key of Object.values(item.roles)) warn(line, key, "roles");
  }
  for (const { line, event } of parsed.logEvents) {
    for (const key of Object.values(event.roles)) warn(line, key, "roles");
  }
}

function compareWithDeployed(item: ContentItem, deployed: ContentItem | undefined): "new" | "edit" | "unchanged" {
  if (!deployed) return "new";
  return JSON.stringify(item) === JSON.stringify(deployed) ? "unchanged" : "edit";
}

// --- Saving, deploying, discarding ------------------------------------------------------------------

export async function saveDraft(store: Store, draft: DraftBatch): Promise<void> {
  await store.putDraft(draft);
}

// Deploy: content goes in by key; draft log items are appended to the log as accepted entries,
// all stamped with the draft's ID as their commit batch. Then the draft is removed.
export async function deployDraft(store: Store, deps: LogDeps, draft: DraftBatch): Promise<void> {
  const items = draft.content.filter(({ status }) => status !== "unchanged").map(({ item }) => item);
  await store.putContent(items);
  for (const logItem of draft.logItems) {
    await appendEvent(store, deps, logItem.event as EventRecord, logItem.inWorldDate, draft.id);
  }
  await store.deleteDraft(draft.id);
}

export async function discardDraft(store: Store, draftId: string): Promise<void> {
  await store.deleteDraft(draftId);
}
