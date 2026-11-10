// The resolver: (content, accepted entries, read date, viewer) -> values + derivation.
// Design: design/rules-overlay.md §6 (scope + trigger), §7 (a rule's nature sets its read
// date: origin as of raising, environment now), §8 (order within a step), §11 (two steps:
// origin then stationed), §12 (category order), §13 (derivation and the "why not?" tree);
// design/resolver.md §1 (a pure function), §5.2–5.6 (target points, bags, clash notice).
//
// Pure: no I/O, no clock, nothing stored. The same inputs always give the same output.
// Slice 0 leaves out switch-offs and ignore rules: those two tests always pass, and say so.

import type { ContentItem, Rule, Unit } from "../schema";
import type { AcceptedEntry } from "../log/log";
import type { Viewer } from "../log/unseal";
import { buildWorld, type World } from "../world/world";
import { evaluate, type ConditionTrace, type TruthValue } from "./conditions";
import {
  stepOfNature,
  type AppliedStep,
  type ClashNotice,
  type LostStep,
  type ReadInfo,
  type RuleCheck,
  type TreeTest,
  type ValueDerivation,
} from "./derivation";
import { applyEdit, categoryRank, orderCandidates, type Candidate, type Ordered } from "./order";

export interface UnitResolution {
  unitKey: string;
  label: string;
  raised: number;
  readDate: number;
  // Read before the raising date: the unit doesn't exist yet. No rules are read; values are
  // the printed profile. (Owner decision, slice 0; build-log question 9.)
  notYetRaised: boolean;
  values: Record<string, number>;
  derivations: Record<string, ValueDerivation>;
  rules: RuleCheck[]; // the "why not?" tree for every rule touching this unit's stats
  clashes: ClashNotice[];
}

export interface Resolution {
  readDate: number;
  viewer: Viewer;
  units: UnitResolution[];
}

// Resolves every unit.
export function resolve(content: ContentItem[], entries: AcceptedEntry[], readDate: number, viewer: Viewer): Resolution {
  const world = buildWorld(content, entries);
  const units = [...world.units.values()].map((unit) => resolveUnitInWorld(world, unit, readDate));
  return { readDate, viewer, units };
}

// Resolves one unit. Returns null if there is no unit with that key.
export function resolveUnit(
  content: ContentItem[],
  entries: AcceptedEntry[],
  unitKey: string,
  readDate: number,
  _viewer: Viewer,
): UnitResolution | null {
  const world = buildWorld(content, entries);
  const unit = world.units.get(unitKey);
  return unit ? resolveUnitInWorld(world, unit, readDate) : null;
}

// --- One unit --------------------------------------------------------------------

function resolveUnitInWorld(world: World, unit: Unit, readDate: number): UnitResolution {
  if (readDate < unit.raised) return notYetRaised(unit, readDate);
  const rulesOnUnit = world.rules.filter((rule) => rule.effect.stat in unit.profile);
  const checks = rulesOnUnit.map((rule) => checkRule(world, rule, unit, readDate));

  const values: Record<string, number> = {};
  const derivations: Record<string, ValueDerivation> = {};
  const clashes: ClashNotice[] = [];
  for (const [stat, base] of Object.entries(unit.profile)) {
    const forStat = checks.filter((check) => check.rule.effect.stat === stat);
    const derivation = foldValue(stat, base, forStat);
    values[stat] = derivation.final;
    derivations[stat] = derivation;
    clashes.push(...derivation.clashes);
  }
  return {
    unitKey: unit.key,
    label: unit.label,
    raised: unit.raised,
    readDate,
    notYetRaised: false,
    values,
    derivations,
    rules: checks.map((check) => check.tree),
    clashes,
  };
}

// Before the raising date: the printed profile only, nothing read from the world.
function notYetRaised(unit: Unit, readDate: number): UnitResolution {
  const derivations: Record<string, ValueDerivation> = {};
  for (const [stat, base] of Object.entries(unit.profile)) {
    derivations[stat] = { stat, base, baseNote: "profile (not raised until " + unit.raised + ")", steps: [], lost: [], final: base, clashes: [] };
  }
  return {
    unitKey: unit.key,
    label: unit.label,
    raised: unit.raised,
    readDate,
    notYetRaised: true,
    values: { ...unit.profile },
    derivations,
    rules: [],
    clashes: [],
  };
}

// --- The four tests (the "why not?" tree) -------------------------------------------------

interface CheckedRule {
  rule: Rule;
  read: ReadInfo;
  scope: ConditionTrace;
  trigger: ConditionTrace | null;
  tree: RuleCheck;
}

// rules-overlay.md §7: origin rules read the world as of raising; environment rules read now.
function readInfoFor(rule: Rule, unit: Unit, readDate: number): ReadInfo {
  if (rule.nature === "origin") {
    return { step: "origin", readDate: unit.raised, readDateNote: "as of raising, " + unit.raised };
  }
  return { step: stepOfNature(rule.nature), readDate, readDateNote: "now, " + readDate };
}

function checkRule(world: World, rule: Rule, unit: Unit, readDate: number): CheckedRule {
  const read = readInfoFor(rule, unit, readDate);
  const scope = evaluate(world, rule.scope, unit.key, read.readDate);
  const trigger = rule.trigger ? evaluate(world, rule.trigger, unit.key, read.readDate) : null;

  const tests: TreeTest[] = [
    { name: "scope matched", result: scope.result, trace: scope, note: "" },
    {
      name: "trigger true",
      result: trigger ? trigger.result : "true",
      trace: trigger,
      note: trigger ? "" : "no trigger: on whenever the scope matches",
    },
    { name: "not switched off", result: "true", trace: null, note: "no switch-offs in slice 0" },
    { name: "not ignored", result: "true", trace: null, note: "no ignore rules in slice 0" },
  ];
  const applies = tests.every((test) => test.result === "true");
  const tree: RuleCheck = {
    ...read,
    ruleKey: rule.key,
    ruleLabel: rule.label,
    stat: rule.effect.stat,
    nature: rule.nature,
    tests,
    applies,
  };
  return { rule, read, scope, trigger, tree };
}

// --- The fold ------------------------------------------------------------------------------

function foldValue(stat: string, base: number, checks: CheckedRule[]): ValueDerivation {
  const passing = checks.filter((check) => check.tree.applies);
  const lost = checks.filter((check) => !check.tree.applies).map(lostStep);

  const candidates = passing.map(toCandidate);
  const ordered = orderCandidates(candidates);
  const byKey = new Map(passing.map((check) => [check.rule.key, check]));

  const steps: AppliedStep[] = [];
  let value = base;
  for (let i = 0; i < ordered.length; i++) {
    const check = byKey.get(ordered[i].candidate.ruleKey)!;
    const before = value;
    value = applyEdit(value, check.rule.effect.kind, check.rule.effect.value);
    steps.push(appliedStep(check, ordered, i, before, value, steps));
  }
  const clashes = findClashes(stat, base, ordered);
  return { stat, base, baseNote: "profile", steps, lost, final: value, clashes };
}

function toCandidate(check: CheckedRule): Candidate {
  const rule = check.rule;
  // Depth only for a scope that is a direct `reaches` on one thing (rules-overlay.md §8).
  const isDirectReach = rule.scope.node === "reaches" && rule.scope.target.by === "thing";
  return {
    ruleKey: rule.key,
    step: check.read.step,
    targetPoint: rule.effect.targetPoint,
    sourceLayer: rule.sourceLayer,
    category: rule.category,
    kind: rule.effect.kind,
    amount: rule.effect.value,
    chainRoute: isDirectReach ? (check.scope.routes[0] ?? null) : null,
  };
}

function appliedStep(
  check: CheckedRule,
  ordered: Ordered[],
  index: number,
  before: number,
  after: number,
  earlier: AppliedStep[],
): AppliedStep {
  const rule = check.rule;
  const decidedBy = ordered[index].decidedBy;
  return {
    ...check.read,
    ruleKey: rule.key,
    ruleLabel: rule.label,
    kind: rule.effect.kind,
    amount: rule.effect.value,
    targetPoint: rule.effect.targetPoint,
    sourceLayer: rule.sourceLayer,
    category: rule.category,
    base: rule.base,
    scope: check.scope,
    trigger: check.trigger,
    decidedBy,
    decidedByNote: describeDecidedBy(decidedBy, check, index > 0 ? earlier[index - 1] : null),
    before,
    after,
    ifSwappedWithPrevious: swappedResult(ordered, index, earlier),
    outcome: "applied",
  };
}

function describeDecidedBy(decidedBy: string, check: CheckedRule, previous: AppliedStep | null): string {
  const rule = check.rule;
  switch (decidedBy) {
    case "first":
      return "first on this value";
    case "step":
      return "the " + check.read.step + " step runs after the origin step";
    case "target point":
      return rule.effect.targetPoint + " runs after " + (previous?.targetPoint ?? "");
    case "source layer":
      return rule.sourceLayer + " runs after " + (previous?.sourceLayer ?? "");
    case "category":
      return "category " + rule.category + " runs after " + (previous?.category ?? "");
    case "depth":
      return "nearer on a shared chain applies later";
    default:
      return "nothing decided the order: bag by kind (add before multiply)";
  }
}

// The value had this step and the one before it run the other way round, or null if
// swapping them gives the same value.
function swappedResult(ordered: Ordered[], index: number, earlier: AppliedStep[]): number | null {
  if (index === 0) return null;
  const previous = ordered[index - 1].candidate;
  const current = ordered[index].candidate;
  const start = earlier[index - 1].before;
  const swapped = applyEdit(applyEdit(start, current.kind, current.amount), previous.kind, previous.amount);
  const asOrdered = applyEdit(applyEdit(start, previous.kind, previous.amount), current.kind, current.amount);
  return swapped === asOrdered ? null : swapped;
}

// resolver.md §5.6 and rules-overlay.md §8 step 5: a clash notice for two rules whose order
// nothing decided (the bag) where swapping them changes the final value.
function findClashes(stat: string, base: number, ordered: Ordered[]): ClashNotice[] {
  const clashes: ClashNotice[] = [];
  const asOrdered = foldList(base, ordered);
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      if (!ordered[i].inBag || !ordered[j].inBag) continue;
      if (!sameBag(ordered[i].candidate, ordered[j].candidate)) continue;
      const swapped = [...ordered];
      [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
      const other = foldList(base, swapped);
      if (other !== asOrdered) {
        clashes.push({
          stat,
          rules: [ordered[i].candidate.ruleKey, ordered[j].candidate.ruleKey],
          message: stat + " " + asOrdered + " as ordered, " + other + " if reversed",
        });
      }
    }
  }
  return clashes;
}

function sameBag(a: Candidate, b: Candidate): boolean {
  return (
    a.targetPoint === b.targetPoint &&
    a.step === b.step &&
    a.sourceLayer === b.sourceLayer &&
    categoryRank(a.step, a.category) === categoryRank(b.step, b.category)
  );
}

function foldList(base: number, ordered: Ordered[]): number {
  return ordered.reduce((value, item) => applyEdit(value, item.candidate.kind, item.candidate.amount), base);
}

function lostStep(check: CheckedRule): LostStep {
  const scopeResult: TruthValue = check.scope.result;
  let outcome: LostStep["outcome"];
  if (scopeResult === "false") outcome = "scope not matched";
  else if (scopeResult === "cant_tell") outcome = "scope can't tell";
  else if (check.trigger?.result === "cant_tell") outcome = "trigger can't tell";
  else outcome = "trigger false";
  return {
    ...check.read,
    ruleKey: check.rule.key,
    ruleLabel: check.rule.label,
    outcome,
    scope: check.scope,
    trigger: check.trigger,
  };
}
