// The derivation (what a value read) and the "why not?" tree (why a rule did or didn't apply).
// Design: design/rules-overlay.md §13 (derivation fields; the tree's four tests);
// design/resolver.md §11 (losers kept with their reason); §5.6 (clash notice).
//
// These are derived, never stored: recomputed on every resolve.

import type { EditKind, Nature, SourceLayer, TargetPoint } from "../schema";
import type { ConditionTrace, TruthValue } from "./conditions";

// The two steps in slice 0. Origin reads as of raising; stationed reads now.
export type FoldStepName = "origin" | "stationed";

export function stepOfNature(nature: Nature): FoldStepName {
  return nature === "origin" ? "origin" : "stationed";
}

// What put a rule after the one before it (rules-overlay.md §8).
export type OrderReason =
  | "first" // nothing before it on this value
  | "step" // origin before stationed
  | "target point" // statline -> in-line -> end
  | "source layer" // book -> FAQ -> house rules -> campaign
  | "category" // the step's category order
  | "depth" // nearer on a shared chain applies later
  | "bag"; // nothing decided: add before multiply, with a clash notice if it matters

// When and how a rule read the world.
export interface ReadInfo {
  step: FoldStepName;
  readDate: number;
  readDateNote: string; // "as of raising, 2520" or "now, 2525"
}

// One rule applied to a value.
export interface AppliedStep extends ReadInfo {
  ruleKey: string;
  ruleLabel: string;
  kind: EditKind;
  amount: number;
  targetPoint: TargetPoint;
  sourceLayer: SourceLayer;
  category: string;
  base: string | null;
  scope: ConditionTrace;
  trigger: ConditionTrace | null;
  decidedBy: OrderReason;
  decidedByNote: string;
  before: number;
  after: number;
  // Where this step and the one before it don't commute: the result had they been swapped.
  ifSwappedWithPrevious: number | null;
  outcome: "applied";
}

// A rule on this value that didn't apply, kept with its reason.
export interface LostStep extends ReadInfo {
  ruleKey: string;
  ruleLabel: string;
  outcome: "scope not matched" | "scope can't tell" | "trigger false" | "trigger can't tell";
  scope: ConditionTrace;
  trigger: ConditionTrace | null;
}

export interface ClashNotice {
  stat: string;
  rules: [string, string]; // the two rule keys
  message: string; // "8 as ordered, 9 if reversed"
}

export interface ValueDerivation {
  stat: string;
  base: number;
  baseNote: string; // "profile"
  steps: AppliedStep[];
  lost: LostStep[];
  final: number;
  clashes: ClashNotice[];
}

// One of the four tests in the "why not?" tree.
export interface TreeTest {
  name: "scope matched" | "trigger true" | "not switched off" | "not ignored";
  result: TruthValue;
  trace: ConditionTrace | null;
  note: string;
}

export interface RuleCheck extends ReadInfo {
  ruleKey: string;
  ruleLabel: string;
  stat: string;
  nature: Nature;
  tests: TreeTest[];
  applies: boolean;
}
