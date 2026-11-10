// Order within a step, and the category order per step.
// Design: design/rules-overlay.md §8 (target point -> source layer -> category -> depth -> bag),
// §12 (category order per step, default shipped), design/resolver.md §5.2 (target points),
// §5.3 (bags: add before multiply; two different sets clash), §5.6 (clash notice).

import { SOURCE_LAYER_ORDER, type EditKind, type TargetPoint } from "../schema";
import type { Route } from "../world/world";
import type { FoldStepName, OrderReason } from "./derivation";

export const TARGET_POINT_ORDER: TargetPoint[] = ["statline", "inline", "end"];

// rules-overlay.md §12: default category order per step. Categories on one rank share it.
// Shipped as a constant in slice 0; editing it per campaign is later.
export const CATEGORY_ORDER: Record<FoldStepName, string[][]> = {
  origin: [["place"], ["organisation", "title"]],
  stationed: [["place"], ["organisation", "title"]],
};

// resolver.md §5.3: inside a bag, kinds run in this order.
const BAG_KIND_ORDER: EditKind[] = ["set", "add", "multiply", "cap", "floor"];

// A rule that passed its four tests, waiting to be folded into one value.
export interface Candidate {
  ruleKey: string;
  step: FoldStepName;
  targetPoint: TargetPoint;
  sourceLayer: string;
  category: string;
  kind: EditKind;
  amount: number;
  chainRoute: Route | null; // the route of a direct `reaches` on one thing, for depth
}

export function categoryRank(step: FoldStepName, category: string): number {
  const ranks = CATEGORY_ORDER[step];
  const found = ranks.findIndex((rank) => rank.includes(category));
  return found === -1 ? ranks.length : found; // unknown categories run last
}

function sourceLayerRank(layer: string): number {
  return SOURCE_LAYER_ORDER.indexOf(layer as (typeof SOURCE_LAYER_ORDER)[number]);
}

// --- Depth ---------------------------------------------------------------------------

// The things along a route, protagonist first.
function thingsOnRoute(route: Route): string[] {
  return [route.start, ...route.hops.map((hop) => hop.to)];
}

// Two routes are on a shared chain when one is the start of the other.
export function onSharedChain(a: Route, b: Route): boolean {
  const left = thingsOnRoute(a);
  const right = thingsOnRoute(b);
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  return shorter.every((thing, i) => longer[i] === thing);
}

// Depth decides a group only when every rule has a route, all routes lie on one chain and no
// two depths are equal. Otherwise the group goes to the bag.
function depthDecides(group: Candidate[]): boolean {
  const routes = group.map((c) => c.chainRoute);
  if (routes.some((route) => route === null)) return false;
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      if (!onSharedChain(routes[i]!, routes[j]!)) return false;
      if (routes[i]!.depth === routes[j]!.depth) return false;
    }
  }
  return true;
}

// --- Ordering ------------------------------------------------------------------------------

export interface Ordered {
  candidate: Candidate;
  decidedBy: OrderReason;
  inBag: boolean;
}

// Orders every candidate on one value: target point, then step, then within a step
// source layer -> category -> depth -> bag.
export function orderCandidates(candidates: Candidate[]): Ordered[] {
  const ordered: Ordered[] = [];
  for (const targetPoint of TARGET_POINT_ORDER) {
    for (const step of ["origin", "stationed"] as FoldStepName[]) {
      const here = candidates.filter((c) => c.targetPoint === targetPoint && c.step === step);
      ordered.push(...orderWithinStep(here));
    }
  }
  return explainOrder(ordered);
}

// Groups by (source layer, category rank), then orders each group by depth or as a bag.
function orderWithinStep(candidates: Candidate[]): Ordered[] {
  const sorted = [...candidates].sort(
    (a, b) =>
      sourceLayerRank(a.sourceLayer) - sourceLayerRank(b.sourceLayer) ||
      categoryRank(a.step, a.category) - categoryRank(b.step, b.category) ||
      a.ruleKey.localeCompare(b.ruleKey),
  );
  const result: Ordered[] = [];
  for (const group of groupBy(sorted, (c) => c.sourceLayer + "|" + categoryRank(c.step, c.category))) {
    if (group.length === 1) {
      result.push({ candidate: group[0], decidedBy: "first", inBag: false });
    } else if (depthDecides(group)) {
      // Nearer applies later: the deepest (farthest) first.
      const byDepth = [...group].sort((a, b) => b.chainRoute!.depth - a.chainRoute!.depth);
      result.push(...byDepth.map((candidate) => ({ candidate, decidedBy: "depth" as OrderReason, inBag: false })));
    } else {
      const bag = [...group].sort(
        (a, b) => BAG_KIND_ORDER.indexOf(a.kind) - BAG_KIND_ORDER.indexOf(b.kind) || a.ruleKey.localeCompare(b.ruleKey),
      );
      result.push(...bag.map((candidate) => ({ candidate, decidedBy: "bag" as OrderReason, inBag: true })));
    }
  }
  return result;
}

// Names what put each rule after the one before it: the first key on which they differ.
function explainOrder(ordered: Ordered[]): Ordered[] {
  return ordered.map((current, i) => {
    if (i === 0) return { ...current, decidedBy: "first" };
    const previous = ordered[i - 1].candidate;
    const now = current.candidate;
    let decidedBy: OrderReason = current.decidedBy;
    if (previous.targetPoint !== now.targetPoint) decidedBy = "target point";
    else if (previous.step !== now.step) decidedBy = "step";
    else if (previous.sourceLayer !== now.sourceLayer) decidedBy = "source layer";
    else if (categoryRank(previous.step, previous.category) !== categoryRank(now.step, now.category)) decidedBy = "category";
    return { ...current, decidedBy };
  });
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): T[][] {
  const groups: T[][] = [];
  let lastKey: string | null = null;
  for (const item of items) {
    const key = keyOf(item);
    if (key !== lastKey) groups.push([]);
    groups[groups.length - 1].push(item);
    lastKey = key;
  }
  return groups;
}

// --- Applying one edit ------------------------------------------------------------------------

export function applyEdit(value: number, kind: EditKind, amount: number): number {
  switch (kind) {
    case "set":
      return amount;
    case "add":
      return value + amount;
    case "multiply":
      return value * amount;
    case "cap":
      return Math.min(value, amount);
    case "floor":
      return Math.max(value, amount);
  }
}
