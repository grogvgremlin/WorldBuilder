// Order within a step.
// Design: design/rules-overlay.md §8 (target point -> source layer -> category -> depth -> bag),
// §12 (category order per step, editable; pins for a single pair), design/resolver.md §5.2
// (target points), §5.3 (bags: add before multiply; two different sets clash), §5.6 (clash
// notice); build/slice-1-brief.md §1.2 (category order and bag order come from the manifest,
// overridable per context; pins are dated GM fixes).

import { SOURCE_LAYER_ORDER, type CategoryRanks, type EditKind, type TargetPoint } from "../schema";
import type { Route } from "../world/world";
import type { FoldStepName, OrderReason } from "./derivation";

export const TARGET_POINT_ORDER: TargetPoint[] = ["statline", "inline", "end"];

// What the context says about order, for one value on one unit.
export interface OrderConfig {
  categoryOrder: Record<FoldStepName, CategoryRanks>;
  bagOrder: EditKind[];
  pins: { first: string; then: string }[]; // already narrowed to this unit and stat
}

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

export function categoryRank(ranks: CategoryRanks, category: string): number {
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
// source layer -> category -> depth -> bag; then pins move a rule before another.
export function orderCandidates(candidates: Candidate[], config: OrderConfig): Ordered[] {
  const ordered: Ordered[] = [];
  for (const targetPoint of TARGET_POINT_ORDER) {
    for (const step of ["origin", "stationed"] as FoldStepName[]) {
      const here = candidates.filter((c) => c.targetPoint === targetPoint && c.step === step);
      ordered.push(...applyPins(orderWithinStep(here, config), config));
    }
  }
  return explainOrder(ordered, config);
}

// Groups by (source layer, category rank), then orders each group by depth or as a bag.
function orderWithinStep(candidates: Candidate[], config: OrderConfig): Ordered[] {
  const rank = (c: Candidate) => categoryRank(config.categoryOrder[c.step], c.category);
  const sorted = [...candidates].sort(
    (a, b) => sourceLayerRank(a.sourceLayer) - sourceLayerRank(b.sourceLayer) || rank(a) - rank(b) || a.ruleKey.localeCompare(b.ruleKey),
  );
  const result: Ordered[] = [];
  for (const group of groupBy(sorted, (c) => c.sourceLayer + "|" + rank(c))) {
    if (group.length === 1) {
      result.push({ candidate: group[0], decidedBy: "first", inBag: false });
    } else if (depthDecides(group)) {
      // Nearer applies later: the deepest (farthest) first.
      const byDepth = [...group].sort((a, b) => b.chainRoute!.depth - a.chainRoute!.depth);
      result.push(...byDepth.map((candidate) => ({ candidate, decidedBy: "depth" as OrderReason, inBag: false })));
    } else {
      const kindRank = (kind: EditKind) => config.bagOrder.indexOf(kind);
      const bag = [...group].sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.ruleKey.localeCompare(b.ruleKey));
      result.push(...bag.map((candidate) => ({ candidate, decidedBy: "bag" as OrderReason, inBag: true })));
    }
  }
  return result;
}

// A pin puts `first` just before `then` when both are in this step at this target point.
// Pinned rules are no longer in the bag: the GM has decided their order.
function applyPins(ordered: Ordered[], config: OrderConfig): Ordered[] {
  const result = [...ordered];
  for (const pin of config.pins) {
    const firstIndex = result.findIndex((o) => o.candidate.ruleKey === pin.first);
    const thenIndex = result.findIndex((o) => o.candidate.ruleKey === pin.then);
    if (firstIndex === -1 || thenIndex === -1) continue;
    const [moved] = result.splice(firstIndex, 1);
    const target = result.findIndex((o) => o.candidate.ruleKey === pin.then);
    const insertAt = firstIndex < thenIndex ? firstIndex : target; // already before: stays put
    result.splice(insertAt, 0, { ...moved, decidedBy: "pin", inBag: false });
    const thenItem = result.findIndex((o) => o.candidate.ruleKey === pin.then);
    result[thenItem] = { ...result[thenItem], decidedBy: "pin", inBag: false };
  }
  return result;
}

// Names what put each rule after the one before it: the first key on which they differ.
function explainOrder(ordered: Ordered[], config: OrderConfig): Ordered[] {
  const rank = (c: Candidate) => categoryRank(config.categoryOrder[c.step], c.category);
  return ordered.map((current, i) => {
    if (i === 0) return { ...current, decidedBy: current.decidedBy === "pin" ? "pin" : "first" };
    const previous = ordered[i - 1].candidate;
    const now = current.candidate;
    let decidedBy: OrderReason = current.decidedBy;
    if (previous.targetPoint !== now.targetPoint) decidedBy = "target point";
    else if (previous.step !== now.step) decidedBy = "step";
    else if (current.decidedBy === "pin" && ordered[i - 1].decidedBy === "pin") decidedBy = "pin";
    else if (previous.sourceLayer !== now.sourceLayer) decidedBy = "source layer";
    else if (rank(previous) !== rank(now)) decidedBy = "category";
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
