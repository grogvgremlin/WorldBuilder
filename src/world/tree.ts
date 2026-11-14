// A thing's tree at a date: what it reaches, what reaches it, and the rules that name it; and
// its direct connections both ways, grouped by link kind (the register).
// Design: design/rules-overlay.md §13 ("any thing has a tree: what it reaches, what reaches it,
// the rules active there"), §17 (route patterns: `serves > paid_by`); build/slice-1-brief.md
// §2.3 (a thing's tree at a chosen read date); owner, 15 Nov (build log): see the whole story
// from any card, with each route written as it would be in a condition.
//
// Pure: reads the World, does no I/O.

import type { Expression, Rule } from "../schema";
import { referencedKeys } from "../import/expression-text";
import { isOnAt, labelOf, type World } from "./world";

export interface TreeBranch {
  key: string;
  label: string;
  route: string; // "—in→ Wissenland —in→ The Empire"
  hops: number;
  // The route as a condition writes it, read from the far end's point of view where needed:
  // out: from this thing, `serves > paid_by`; in: from the other thing to this one.
  pattern: string;
}

// A direct link, seen from one end.
export interface Connection {
  key: string; // the thing at the other end
  label: string;
  linkKey: string;
  start: number;
  end: number | null;
}

export interface Connections {
  // Grouped by link kind, in kind order. `out`: this thing's own links; `in`: links to it.
  out: { kind: string; to: Connection[] }[];
  in: { kind: string; from: Connection[] }[];
}

export interface ThingTree {
  key: string;
  label: string;
  date: number;
  reaches: TreeBranch[]; // following its links outward
  reachedBy: TreeBranch[]; // following links into it, backwards
  connections: Connections; // its direct links, both ways, by kind
  rules: { rule: Rule; via: string }[]; // rules that name it, directly or through a named scope
}

const MAX_HOPS = 8; // enough for any chain in a campaign world; stops runaway walks

export function thingTree(world: World, key: string, date: number): ThingTree {
  return {
    key,
    label: labelOf(world, key),
    date,
    reaches: walk(world, key, date, "out"),
    reachedBy: walk(world, key, date, "in"),
    connections: connections(world, key, date),
    rules: rulesNaming(world, key),
  };
}

// Breadth-first over the links on at `date`, each thing once, by its shortest route.
function walk(world: World, start: string, date: number, direction: "out" | "in"): TreeBranch[] {
  const found: TreeBranch[] = [];
  const seen = new Set([start]);
  let frontier: { key: string; route: string; hops: number; kinds: string[] }[] = [{ key: start, route: "", hops: 0, kinds: [] }];
  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const here of frontier) {
      if (here.hops >= MAX_HOPS) continue;
      for (const link of world.links) {
        if (!isOnAt(link, date)) continue;
        const from = direction === "out" ? link.from : link.to;
        const to = direction === "out" ? link.to : link.from;
        if (from !== here.key || seen.has(to)) continue;
        seen.add(to);
        const kind = link.kind.replace(/_/g, " ");
        const step = direction === "out" ? " —" + kind + "→ " + labelOf(world, to) : " ←" + kind + "— " + labelOf(world, to);
        const kinds = [...here.kinds, link.kind];
        // Outward, the pattern reads from here; inward, from the far thing back to here.
        const pattern = (direction === "out" ? kinds : [...kinds].reverse()).join(" > ");
        found.push({ key: to, label: labelOf(world, to), route: here.route + step, hops: here.hops + 1, pattern });
        next.push({ key: to, route: here.route + step, hops: here.hops + 1, kinds });
      }
    }
    frontier = next;
  }
  return found;
}

// This thing's direct links at `date`, both ways, grouped by kind.
export function connections(world: World, key: string, date: number): Connections {
  const out = new Map<string, Connection[]>();
  const into = new Map<string, Connection[]>();
  for (const link of world.links) {
    if (!isOnAt(link, date)) continue;
    if (link.from === key) {
      if (!out.has(link.kind)) out.set(link.kind, []);
      out.get(link.kind)!.push({ key: link.to, label: labelOf(world, link.to), linkKey: link.key, start: link.start, end: link.end });
    }
    if (link.to === key) {
      if (!into.has(link.kind)) into.set(link.kind, []);
      into.get(link.kind)!.push({ key: link.from, label: labelOf(world, link.from), linkKey: link.key, start: link.start, end: link.end });
    }
  }
  const sorted = <T,>(m: Map<string, T>) => [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return {
    out: sorted(out).map(([kind, to]) => ({ kind, to })),
    in: sorted(into).map(([kind, from]) => ({ kind, from })),
  };
}

function names(expression: Expression | null, key: string): boolean {
  if (!expression) return false;
  const refs = referencedKeys(expression);
  return refs.things.includes(key) || refs.scopes.includes(key) || refs.hooks.includes(key);
}

function rulesNaming(world: World, key: string): { rule: Rule; via: string }[] {
  const scopesNamingIt = [...world.scopes.values()].filter((s) => names(s.query, key));
  const hooksNamingIt = [...world.hooks.values()].filter((h) => !h.fromRule && names(h.condition, key));
  const result: { rule: Rule; via: string }[] = [];
  for (const rule of world.rules) {
    if (names(rule.scope, key)) result.push({ rule, via: "its scope" });
    else if (names(rule.trigger, key)) result.push({ rule, via: "its trigger" });
    else {
      const hook = hooksNamingIt.find((h) => names(rule.trigger, h.key));
      const scope = scopesNamingIt.find((s) => names(rule.scope, s.key) || names(rule.trigger, s.key));
      if (hook) result.push({ rule, via: "hook “" + hook.label + "”" });
      else if (scope) result.push({ rule, via: "named scope “" + scope.label + "”" });
    }
  }
  return result;
}
