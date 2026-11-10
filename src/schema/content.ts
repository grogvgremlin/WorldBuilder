// Content items: things, dated links, events, rules, named scopes, packages and units.
// Design: design/world-structure.md §1–3 (things, kinds, links), §7 (events are dated things),
// §12 (units registered in the world); design/rules-overlay.md §6–8, §12 (rules as scope +
// trigger, nature, category, source layer); design/resolver.md §5.2 (number edits and target
// points); design/infra.md §1 (content is stored truth beside the log).
//
// Every item has a `key` (author-defined, never regenerated) and a `class`.
// Dates are plain numbers (years or day counts) in slice 0: no calendars.

import { z } from "zod";
import { Expression } from "./expression";

export const InWorldDate = z.number();

// Fields every content item carries.
const itemBase = {
  key: z.string().min(1),
  label: z.string(),
  package: z.string().nullable(), // the package it was deployed in
};

// --- World ---------------------------------------------------------------

export const Thing = z.object({
  class: z.literal("thing"),
  ...itemBase,
  kinds: z.array(z.string()), // several kinds per thing (Nuln: settlement + polity)
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});
export type Thing = z.infer<typeof Thing>;

// A dated link: on from `start` (inclusive) until `end` (exclusive); end null = still on.
export const Link = z.object({
  class: z.literal("link"),
  ...itemBase,
  kind: z.string(), // raised_at, in, member_of, serves, paid_by, ruled_by, stationed_at ...
  from: z.string(),
  to: z.string(),
  start: InWorldDate,
  end: InWorldDate.nullable(),
});
export type Link = z.infer<typeof Link>;

// An event: a dated thing with a kind and participants in roles.
// The same record is used for world history (content) and for event entries in the log.
export const EventRecord = z.object({
  key: z.string().min(1),
  label: z.string(),
  kind: z.string(), // e.g. wages_withheld
  roles: z.record(z.string(), z.string()), // role -> thing key
  start: InWorldDate,
  end: InWorldDate.nullable(),
});
export type EventRecord = z.infer<typeof EventRecord>;

export const WorldEvent = z.object({
  class: z.literal("event"),
  ...itemBase,
  kind: z.string(),
  roles: z.record(z.string(), z.string()),
  start: InWorldDate,
  end: InWorldDate.nullable(),
});
export type WorldEvent = z.infer<typeof WorldEvent>;

// A unit: a protagonist registered in the world, with a profile and a raising date.
// Its links (raised at, member of, serves, stationed at) are ordinary Link items.
export const Unit = z.object({
  class: z.literal("unit"),
  ...itemBase,
  profile: z.record(z.string(), z.number()), // stat name -> value, e.g. { Ld: 7 }
  raised: InWorldDate,
});
export type Unit = z.infer<typeof Unit>;

// --- Rules ----------------------------------------------------------------

export const SourceLayer = z.enum(["book", "faq", "house", "campaign"]);
export type SourceLayer = z.infer<typeof SourceLayer>;
export const SOURCE_LAYER_ORDER: SourceLayer[] = ["book", "faq", "house", "campaign"];

export const TargetPoint = z.enum(["statline", "inline", "end"]);
export type TargetPoint = z.infer<typeof TargetPoint>;

export const EditKind = z.enum(["set", "add", "multiply", "cap", "floor"]);
export type EditKind = z.infer<typeof EditKind>;

// A number edit: (target stat, kind and value, target point).
export const NumberEdit = z.object({
  stat: z.string(),
  kind: EditKind,
  value: z.number(),
  targetPoint: TargetPoint,
});
export type NumberEdit = z.infer<typeof NumberEdit>;

// Origin rules read the world as of the unit's raising date; environment rules read it now.
export const Nature = z.enum(["origin", "environment"]);
export type Nature = z.infer<typeof Nature>;

export const Rule = z.object({
  class: z.literal("rule"),
  ...itemBase,
  effect: NumberEdit,
  scope: Expression,
  trigger: Expression.nullable(), // null = always on while in scope
  nature: Nature,
  category: z.string(), // place, organisation, title ...
  sourceLayer: SourceLayer,
  base: z.string().nullable(), // whose rule it is (rules-overlay §15); unused in slice 0
  reason: z.string().nullable(), // the world thing it hangs on (rules-overlay §3); optional
});
export type Rule = z.infer<typeof Rule>;

// A named scope: a saved query that follows the world.
export const NamedScope = z.object({
  class: z.literal("scope"),
  ...itemBase,
  query: Expression,
});
export type NamedScope = z.infer<typeof NamedScope>;

export const Package = z.object({
  class: z.literal("package"),
  ...itemBase,
  sourceLayer: SourceLayer,
  members: z.array(z.string()), // keys of the items deployed with it, in written order
});
export type Package = z.infer<typeof Package>;

export const ContentItem = z.discriminatedUnion("class", [
  Thing,
  Link,
  WorldEvent,
  Unit,
  Rule,
  NamedScope,
  Package,
]);
export type ContentItem = z.infer<typeof ContentItem>;
