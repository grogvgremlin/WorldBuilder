// All data shapes, defined once with zod. JSON Schema is emitted to schema/ by
// scripts/emit-schema.ts so the data can be read from Python.
// Design: design/infra.md §1, §8; build/slice-0-brief.md §3.

export * from "./log-entry";
export * from "./expression";
export * from "./content";
export * from "./draft-and-copy";
export * from "./log-values";

import { LogEnvelope } from "./log-entry";
import { ContentItem } from "./content";
import { DraftBatch, WholeCopy } from "./draft-and-copy";
import { Expression } from "./expression";

// The shapes written out as JSON Schema files, by file name.
export const SCHEMAS_TO_EMIT = {
  "log-entry": LogEnvelope,
  "content-item": ContentItem,
  "draft-batch": DraftBatch,
  "whole-copy": WholeCopy,
  expression: Expression,
} as const;
