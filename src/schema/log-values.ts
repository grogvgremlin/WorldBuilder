// What the content of each kind of log entry holds (the entry's `content.values`).
// Design: design/infra.md §8 (content: kind, targets and values); design/rules-overlay.md §12
// (a category-order edit is the bulk GM fix, dated, shown in the derivation; pins for a single
// pair); design/items-packages-and-library.md §10 (switch-offs: target, state, note);
// build/slice-1-brief.md §1.2, §2.2 (C1, C2).

import { z } from "zod";
import { CategoryRanks, EventRecord } from "./content";

// kind "event": an event in the world (slice 0).
export const EventValues = z.object({ event: EventRecord });

// kind "withdrawal": says why (the withdrawn ID is in content.links.withdraws).
export const WithdrawalValues = z.object({ reason: z.string() });

// kind "package_switch": a package switched on or off in one manifest context.
export const PackageSwitchValues = z.object({
  context: z.string(),
  package: z.string(),
  on: z.boolean(),
  note: z.string(),
});
export type PackageSwitchValues = z.infer<typeof PackageSwitchValues>;

// kind "category_order": the run order of categories in one step, set for one context.
export const CategoryOrderValues = z.object({
  context: z.string(),
  step: z.enum(["origin", "stationed"]),
  order: CategoryRanks,
});
export type CategoryOrderValues = z.infer<typeof CategoryOrderValues>;

// kind "pin": one rule runs before another on one value, for one unit (or every unit).
export const PinValues = z.object({
  context: z.string(),
  unit: z.string().nullable(), // null = every unit in the context
  stat: z.string(),
  first: z.string(), // rule key that runs first
  then: z.string(), // rule key that runs after it
});
export type PinValues = z.infer<typeof PinValues>;
