// Conditions for scopes and triggers: a small expression tree plus the world-reading nodes.
// Design: design/rules-overlay.md §17 (reaches, in force; value() is out of scope for slice 0),
// §6 (scope + trigger, named scopes).
//
// Nodes:
//   reaches     - does the protagonist reach `target` along the route pattern `via`?
//   in_force    - is an event of this kind (or this event thing) in force, with these roles?
//   named_scope - a saved query, referred to by key
//   all / any / not - combine the above

import { z } from "zod";

// One step of a route pattern: a link kind, walked once, or any number of times (`in*`).
export const RouteStep = z.object({
  link: z.string(),
  repeat: z.boolean(),
});
export type RouteStep = z.infer<typeof RouteStep>;

// What `reaches` is looking for: one thing by key, or any thing of a kind.
export const ReachTarget = z.discriminatedUnion("by", [
  z.object({ by: z.literal("thing"), key: z.string() }),
  z.object({ by: z.literal("kind"), kind: z.string() }),
]);
export type ReachTarget = z.infer<typeof ReachTarget>;

// Plain TypeScript type first, so the recursive schema below is easy to read.
export type Expression =
  | { node: "reaches"; target: ReachTarget; via: RouteStep[]; when: "as_of" | "ever" }
  | { node: "in_force"; what: string; roles: Record<string, string> }
  | { node: "named_scope"; key: string }
  | { node: "all"; of: Expression[] }
  | { node: "any"; of: Expression[] }
  | { node: "not"; of: Expression };

export const Expression: z.ZodType<Expression> = z.lazy(() =>
  z.discriminatedUnion("node", [
    z.object({
      node: z.literal("reaches"),
      target: ReachTarget,
      via: z.array(RouteStep).min(1),
      when: z.enum(["as_of", "ever"]),
    }),
    z.object({
      node: z.literal("in_force"),
      what: z.string(),
      roles: z.record(z.string(), z.string()),
    }),
    z.object({ node: z.literal("named_scope"), key: z.string() }),
    z.object({ node: z.literal("all"), of: z.array(Expression) }),
    z.object({ node: z.literal("any"), of: z.array(Expression) }),
    z.object({ node: z.literal("not"), of: Expression }),
  ]),
);
