// The log entry, in its full shape.
// Design: design/infra.md §8 (the log entry, final shape), §5.1 (the sealed envelope),
// §2 (withdrawal). Glossary: design/glossary-v2.md "Infra".
//
// Only four fields sit outside the seal: id, recordedTime, device, hostSeq.
// Everything else is inside `seal` and is read only through log/unseal.ts.
// Never sort, index or sync on anything inside the seal.

import { z } from "zod";

// Status runs draft -> awaiting_host -> accepted / declined.
// "withdrawn" is shown when a later entry withdraws this one; "purged" is the privacy stub.
export const EntryStatus = z.enum([
  "draft",
  "awaiting_host",
  "accepted",
  "declined",
  "withdrawn",
  "purged",
]);
export type EntryStatus = z.infer<typeof EntryStatus>;

export const SignOff = z.object({
  person: z.string(),
  role: z.string().nullable(),
  at: z.string(), // real-world time, ISO 8601
  how: z.enum(["by_hand", "auto", "host"]),
});
export type SignOff = z.infer<typeof SignOff>;

export const EntryIdentity = z.object({
  actor: z.string(),
  enteredBy: z.string(),
  signOffs: z.array(SignOff),
});

export const EntryStatusField = z.object({
  value: EntryStatus,
  reason: z.string().nullable(), // reason for a decline
});

export const EntryOrder = z.object({
  inWorldDate: z.number().nullable(), // a plain year or day count in slice 0
  iteration: z.number().int(),
  orderKey: z.string().nullable(),
  timeOfDay: z.string().nullable(),
  effectiveTime: z.string().nullable(), // blank = recorded time
});

export const EntrySource = z.object({
  proposed: z.unknown().nullable(),
  committed: z.unknown().nullable(),
  reason: z.string().nullable(),
});

export const EntryLinks = z.object({
  commitBatch: z.string().nullable(),
  causedBy: z.string().nullable(),
  dependsOn: z.array(z.string()),
  withdraws: z.string().nullable(), // set on a withdrawal entry: the ID it withdraws
});

export const EntryContent = z.object({
  kind: z.string(), // "event", "withdrawal", ...
  source: EntrySource,
  targets: z.array(z.string()),
  values: z.record(z.string(), z.unknown()),
  links: EntryLinks,
  originatingCalendar: z.string().nullable(),
});

export const EntryVisibility = z.object({
  // field name -> people the field's key is wrapped for. Empty in slice 0.
  grants: z.record(z.string(), z.array(z.string())),
});

// Everything inside the seal.
export const EntryBody = z.object({
  identity: EntryIdentity,
  status: EntryStatusField,
  order: EntryOrder,
  content: EntryContent,
  visibility: EntryVisibility,
});
export type EntryBody = z.infer<typeof EntryBody>;

// The seal. Slice 0 only writes the "plain" form; "sealed" exists so the shape is real.
export const Seal = z.discriminatedUnion("form", [
  z.object({ form: z.literal("plain"), body: EntryBody }),
  z.object({ form: z.literal("sealed"), ciphertext: z.string() }),
]);
export type Seal = z.infer<typeof Seal>;

// What is stored: the envelope.
export const LogEnvelope = z.object({
  id: z.string(),
  recordedTime: z.string(), // ISO 8601, real-world, always forward
  device: z.string(),
  hostSeq: z.number().int().nullable(), // set by the host; null in slice 0 (no host)
  seal: Seal,
});
export type LogEnvelope = z.infer<typeof LogEnvelope>;
