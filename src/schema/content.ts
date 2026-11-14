// Content items: things, dated links, events, rules, named scopes, packages, units, and the
// containers (manifest, sandbox, manifest context).
// Design: design/world-structure.md §1–3 (things, kinds, links), §7 (events are dated things),
// §12 (units registered in the world); design/rules-overlay.md §6–8, §12 (rules as scope +
// trigger, nature, category, source layer; category order per step); design/resolver.md §5.2
// (number edits and target points); design/infra.md §1 (content is stored truth beside the log);
// design/manifest.md §1–2, §9 (the manifest is content, one per edition);
// design/items-packages-and-library.md §4 (packages); build/slice-1-brief.md §2.1 (containers).
//
// Every item has a `key` (author-defined, never regenerated), a `class`, and a `space`: where it
// lives. Space "library" holds what isn't tied to any world (manifests, rules packages, army
// lists); a sandbox's key is the space of that sandbox's world and of any packages local to it.
// Keys are unique within a space.
// Dates are plain numbers (years or day counts): no calendars.

import { z } from "zod";
import { Expression } from "./expression";

export const InWorldDate = z.number();

export const LIBRARY = "library";

// Fields every content item carries.
const itemBase = {
  key: z.string().min(1),
  label: z.string(),
  space: z.string().min(1), // "library", or the key of the sandbox it belongs to
  package: z.string().nullable(), // the package (or sandbox) it was deployed in
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
  context: z.string().nullable(), // the manifest context it's registered in; null = the sandbox's first
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
  edition: z.string().nullable(), // the manifest it belongs to
  requires: z.array(z.string()), // other packages it needs (a warning only)
  conflicts: z.array(z.string()), // packages it can't be used with (a warning only)
  members: z.array(z.string()), // keys of the items deployed with it, in written order
});
export type Package = z.infer<typeof Package>;

// --- Containers -----------------------------------------------------------------

// The order rules run in within a step, by category. Categories on one rank share it.
export const CategoryRanks = z.array(z.array(z.string()));
export type CategoryRanks = z.infer<typeof CategoryRanks>;

export const StepOrders = z.object({
  origin: CategoryRanks,
  stationed: CategoryRanks,
});
export type StepOrders = z.infer<typeof StepOrders>;

// The game: one per edition, in the library. Its statline and how it combines numbers, and its
// core rules packages, always applied wherever the game is played (items-packages §4: the base
// package can't be removed as a whole). Owner decision, 14 Nov: no category order here; that
// belongs to the world (rules-overlay §12: "shipped in the default setting package").
export const Manifest = z.object({
  class: z.literal("manifest"),
  ...itemBase,
  statOrder: z.array(z.string()), // the model statline, in card order
  bagOrder: z.array(EditKind), // resolver §5.3: kinds within a bag
  core: z.array(z.string()), // the core rules packages, in order
});
export type Manifest = z.infer<typeof Manifest>;

// A sandbox: one world with its own log. The item lives in its own space. Its category order
// says how places, organisations and titles stack for the world's rules (rules-overlay §12);
// null = the built-in default.
export const Sandbox = z.object({
  class: z.literal("sandbox"),
  ...itemBase,
  categoryOrder: StepOrders.nullable(),
  members: z.array(z.string()), // world items deployed into it, in written order
});
export type Sandbox = z.infer<typeof Sandbox>;

// A manifest context: one game's part of a sandbox. The manifest brings its core; on top,
// packages grouped as the owner set out (14 Nov), each list in order: books, FAQs, house
// rules, campaign. The GM can switch any of them (not the core) by log entry. Its own
// category order, if set, overrides the sandbox's for this game.
export const ManifestContext = z.object({
  class: z.literal("context"),
  ...itemBase,
  manifest: z.string(),
  books: z.array(z.string()),
  faqs: z.array(z.string()),
  house: z.array(z.string()),
  campaign: z.array(z.string()),
  categoryOrder: StepOrders.nullable(),
});
export type ManifestContext = z.infer<typeof ManifestContext>;

// The four groups a context lists, with the source layer each expects.
export const CONTEXT_GROUPS = [
  { field: "books", layer: "book" },
  { field: "faqs", layer: "faq" },
  { field: "house", layer: "house" },
  { field: "campaign", layer: "campaign" },
] as const;
export type ContextGroup = (typeof CONTEXT_GROUPS)[number]["field"];

export const ContentItem = z.discriminatedUnion("class", [
  Thing,
  Link,
  WorldEvent,
  Unit,
  Rule,
  NamedScope,
  Package,
  Manifest,
  Sandbox,
  ManifestContext,
]);
export type ContentItem = z.infer<typeof ContentItem>;
