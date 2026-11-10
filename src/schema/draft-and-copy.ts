// Draft batches and the whole-copy export.
// Design: design/infra.md §1 (draft batches are stored outside the log until commit),
// §2 (discarding a draft item is the only real delete);
// design/text-format-and-csv.md §1, §8 (imports land in the draft; problems per line).

import { z } from "zod";
import { ContentItem, EventRecord } from "./content";
import { LogEnvelope } from "./log-entry";

export const Problem = z.object({
  line: z.number().int().nullable(), // 1-based line in the imported text
  severity: z.enum(["error", "warning"]),
  message: z.string(),
});
export type Problem = z.infer<typeof Problem>;

// How an imported item compares with what is already deployed.
export const DraftItemStatus = z.enum(["new", "edit", "unchanged"]);

export const DraftContentItem = z.object({
  status: DraftItemStatus,
  line: z.number().int().nullable(),
  item: ContentItem,
});

// A log entry waiting in the draft: appended to the log on deploy.
export const DraftLogItem = z.object({
  line: z.number().int().nullable(),
  kind: z.literal("event"),
  inWorldDate: z.number(),
  event: EventRecord,
});

export const DraftBatch = z.object({
  id: z.string(),
  label: z.string(),
  createdTime: z.string(),
  sourceText: z.string(), // the text as typed
  rewrittenText: z.string(), // the text with keys written back
  content: z.array(DraftContentItem),
  logItems: z.array(DraftLogItem),
  problems: z.array(Problem),
});
export type DraftBatch = z.infer<typeof DraftBatch>;

// Small settings kept beside the data (device ID, persistent-storage answer).
export const Meta = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
export type Meta = z.infer<typeof Meta>;

// The whole copy, as exported and re-imported.
export const WholeCopy = z.object({
  format: z.literal("worldbuilder-copy"),
  version: z.literal(1),
  exportedTime: z.string(),
  meta: Meta,
  entries: z.array(LogEnvelope),
  content: z.array(ContentItem),
  drafts: z.array(DraftBatch),
});
export type WholeCopy = z.infer<typeof WholeCopy>;
