// The resolver: (content, accepted entries, read date, viewer) -> values + derivation.
// Design: design/rules-overlay.md §6 (scope + trigger; the kind a scope uses shows in the
// derivation), §7 (a rule's nature sets its read date: origin as of raising, environment now),
// §8 (order within a step), §11 (two steps: origin then stationed), §12 (category order per
// step, GM fixes), §13 (derivation and the "why not?" tree); design/resolver.md §1 (a pure
// function), §5.2–5.6 (target points, bags, clash notice); build/slice-1-brief.md §1.1 (Q2: the
// ordering detail goes into the derivation text), §1.2, §2.1 (a rule is in play only if its
// package is switched on in the unit's manifest context).
//
// Pure: no I/O, no clock, nothing stored. The same inputs always give the same output.
// The content given is the library plus one sandbox (store.contentForSandbox).
// Switch-offs (E3) and ignore rules are not built: those tests always pass, and say so.

import type { ContentItem, Rule, Unit } from "../schema";
import type { AcceptedEntry } from "../log/log";
import type { Viewer } from "../log/unseal";
import { autoHookKey, buildWorld, kindsOf, labelOf, type World } from "../world/world";
import { evaluate, type ConditionTrace, type TruthValue } from "./conditions";
import { contextFor, describeRanks, packageState, readContext, type ContextView } from "./context";
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
import { applyEdit, categoryRank, orderCandidates, type Candidate, type OrderConfig, type Ordered } from "./order";

export interface UnitResolution {
  unitKey: string;
  label: string;
  raised: number;
  readDate: number;
  // Read before the raising date: the unit doesn't exist yet. No rules are read; values are
  // the printed profile. (Owner decision, slice 0; build-log question 9.)
  notYetRaised: boolean;
  context: { key: string; label: string } | null;
  manifest: { key: string; label: string } | null;
  statOrder: string[]; // the manifest's statline order, for the card
  contextWarnings: string[];
  values: Record<string, number>;
  derivations: Record<string, ValueDerivation>;
  rules: RuleCheck[]; // the "why not?" tree for every rule in this context touching this unit
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
  const view = readContext(world, contextFor(world, unit.context));
  const header = resolutionHeader(unit, readDate, view);
  if (readDate < unit.raised) return notYetRaised(unit, header);

  // Rules from packages listed in this context (on or off). Others aren't in this context at
  // all, so they aren't shown. With no context (an old copy), every rule is in play.
  const rulesHere = world.rules.filter(
    (rule) => rule.effect.stat in unit.profile && (view.context === null || packageState(view, rule.package) !== null),
  );
  const checks = rulesHere.map((rule) => checkRule(world, view, rule, unit, readDate));

  const values: Record<string, number> = {};
  const derivations: Record<string, ValueDerivation> = {};
  const clashes: ClashNotice[] = [];
  for (const [stat, base] of Object.entries(unit.profile)) {
    const forStat = checks.filter((check) => check.rule.effect.stat === stat);
    const derivation = foldValue(world, view, unit, stat, base, forStat);
    values[stat] = derivation.final;
    derivations[stat] = derivation;
    clashes.push(...derivation.clashes);
  }
  return { ...header, notYetRaised: false, values, derivations, rules: checks.map((check) => check.tree), clashes };
}

type Header = Omit<UnitResolution, "values" | "derivations" | "rules" | "clashes" | "notYetRaised">;

function resolutionHeader(unit: Unit, readDate: number, view: ContextView): Header {
  return {
    unitKey: unit.key,
    label: unit.label,
    raised: unit.raised,
    readDate,
    context: view.context ? { key: view.context.key, label: view.context.label } : null,
    manifest: view.manifest ? { key: view.manifest.key, label: view.manifest.label } : null,
    statOrder: view.manifest?.statOrder ?? Object.keys(unit.profile),
    contextWarnings: view.warnings,
  };
}

// Before the raising date: the printed profile only, nothing read from the world.
function notYetRaised(unit: Unit, header: Header): UnitResolution {
  const derivations: Record<string, ValueDerivation> = {};
  for (const [stat, base] of Object.entries(unit.profile)) {
    derivations[stat] = { stat, base, baseNote: "profile (not raised until " + unit.raised + ")", steps: [], lost: [], final: base, clashes: [] };
  }
  return { ...header, notYetRaised: true, values: { ...unit.profile }, derivations, rules: [], clashes: [] };
}

// --- The tests (the "why not?" tree) ------------------------------------------------------

interface CheckedRule {
  rule: Rule;
  read: ReadInfo;
  inPlay: boolean;
  inPlayNote: string;
  scope: ConditionTrace;
  trigger: ConditionTrace | null;
  tree: RuleCheck;
}

// A rule triggers on a hook (owner, 15 Nov). An inline trigger is read through the hook made
// from it (world.ts addAutoHooks), so the derivation always shows a hook.
function triggerHook(rule: Rule) {
  if (!rule.trigger || rule.trigger.node === "hook") return rule.trigger!;
  return { node: "hook" as const, key: autoHookKey(rule.key) };
}

// rules-overlay.md §7: origin rules read the world as of raising; environment rules read now.
function readInfoFor(rule: Rule, unit: Unit, readDate: number): ReadInfo {
  if (rule.nature === "origin") {
    return { step: "origin", readDate: unit.raised, readDateNote: "as of raising, " + unit.raised };
  }
  return { step: stepOfNature(rule.nature), readDate, readDateNote: "now, " + readDate };
}

function checkRule(world: World, view: ContextView, rule: Rule, unit: Unit, readDate: number): CheckedRule {
  const read = readInfoFor(rule, unit, readDate);
  const scope = evaluate(world, rule.scope, unit.key, read.readDate);
  const trigger = rule.trigger ? evaluate(world, triggerHook(rule), unit.key, read.readDate) : null;

  const state = packageState(view, rule.package);
  const inPlay = view.context === null || (state?.on ?? false);
  const packageLabel = world.packages.get(rule.package ?? "")?.label ?? rule.package ?? "no package";
  const inPlayNote = view.context === null ? "no manifest context: every rule in play" : packageLabel + ": " + (state?.note ?? "");

  const tests: TreeTest[] = [
    { name: "in play in this context", result: inPlay ? "true" : "false", trace: null, note: inPlayNote },
    { name: "scope matched", result: scope.result, trace: scope, note: "" },
    {
      name: "trigger true",
      result: trigger ? trigger.result : "true",
      trace: trigger,
      note: trigger ? "" : "no trigger: on whenever the scope matches",
    },
    { name: "not switched off", result: "true", trace: null, note: "no switch-offs yet" },
    { name: "not ignored", result: "true", trace: null, note: "no ignore rules yet" },
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
  return { rule, read, inPlay, inPlayNote, scope, trigger, tree };
}

// --- The fold ------------------------------------------------------------------------------

function orderConfigFor(view: ContextView, unit: Unit, stat: string): OrderConfig {
  return {
    categoryOrder: { origin: view.categoryOrder.origin.ranks, stationed: view.categoryOrder.stationed.ranks },
    bagOrder: view.bagOrder,
    pins: view.pins.filter((pin) => pin.stat === stat && (pin.unit === null || pin.unit === unit.key)),
  };
}

function foldValue(world: World, view: ContextView, unit: Unit, stat: string, base: number, checks: CheckedRule[]): ValueDerivation {
  const passing = checks.filter((check) => check.tree.applies);
  const lost = checks.filter((check) => !check.tree.applies).map(lostStep);

  const config = orderConfigFor(view, unit, stat);
  const ordered = orderCandidates(passing.map(toCandidate), config);
  const byKey = new Map(passing.map((check) => [check.rule.key, check]));

  const steps: AppliedStep[] = [];
  let value = base;
  for (let i = 0; i < ordered.length; i++) {
    const check = byKey.get(ordered[i].candidate.ruleKey)!;
    const before = value;
    value = applyEdit(value, check.rule.effect.kind, check.rule.effect.value);
    steps.push(appliedStep(world, view, config, check, ordered, i, before, value, steps));
  }
  const clashes = findClashes(stat, base, ordered, config);
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

// rules-overlay §6: where a thing has several kinds, which one the rule read it as. The rule's
// category records the author's choice.
function scopeKind(world: World, rule: Rule): string | null {
  if (rule.scope.node !== "reaches" || rule.scope.target.by !== "thing") return null;
  const key = rule.scope.target.key;
  const kinds = kindsOf(world, key);
  if (kinds.length === 0) return null;
  return labelOf(world, key) + " (" + kinds.join(" · ") + "), read as " + rule.category;
}

function appliedStep(
  world: World,
  view: ContextView,
  config: OrderConfig,
  check: CheckedRule,
  ordered: Ordered[],
  index: number,
  before: number,
  after: number,
  earlier: AppliedStep[],
): AppliedStep {
  const rule = check.rule;
  const decidedBy = ordered[index].decidedBy;
  const swapped = swappedResult(ordered, index, earlier);
  const previous = index > 0 ? earlier[index - 1] : null;
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
    scopeKind: scopeKind(world, rule),
    trigger: check.trigger,
    packageKey: rule.package,
    decidedBy,
    decidedByNote: describeDecidedBy(world, view, config, decidedBy, check, previous, swapped),
    before,
    after,
    ifSwappedWithPrevious: swapped,
    outcome: "applied",
  };
}

// Q2: the ordering detail goes into the derivation text, with what reversing would give.
function describeDecidedBy(
  world: World,
  view: ContextView,
  config: OrderConfig,
  decidedBy: string,
  check: CheckedRule,
  previous: AppliedStep | null,
  swapped: number | null,
): string {
  const rule = check.rule;
  const step = check.read.step;
  const reversed = swapped === null ? "" : "; reversed it would be " + swapped;
  switch (decidedBy) {
    case "first":
      return "first on this value";
    case "step":
      return "the " + step + " step runs after the origin step" + reversed;
    case "target point":
      return rule.effect.targetPoint + " runs after " + (previous?.targetPoint ?? "") + reversed;
    case "source layer":
      return rule.sourceLayer + " runs after " + (previous?.sourceLayer ?? "") + reversed;
    case "category": {
      const order = view.categoryOrder[step];
      return (
        "category: " + rule.category + " runs after " + (previous?.category ?? "") + " (order " + describeRanks(order.ranks) + ", " + order.note + ")" + reversed
      );
    }
    case "depth":
      return "depth: nearer on a shared chain applies later" + (previous ? ", so after " + previous.ruleLabel : "") + reversed;
    case "pin": {
      const pin = view.pins.find((p) => p.first === rule.key || p.then === rule.key);
      const label = (key: string) => world.rules.find((r) => r.key === key)?.label ?? key;
      return "pinned: " + (pin ? label(pin.first) + " before " + label(pin.then) + " (" + pin.note + ")" : "") + reversed;
    }
    default:
      return "nothing decided the order: bag order " + config.bagOrder.join(" → ") + reversed;
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
function findClashes(stat: string, base: number, ordered: Ordered[], config: OrderConfig): ClashNotice[] {
  const clashes: ClashNotice[] = [];
  const asOrdered = foldList(base, ordered);
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      if (!ordered[i].inBag || !ordered[j].inBag) continue;
      if (!sameBag(ordered[i].candidate, ordered[j].candidate, config)) continue;
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

function sameBag(a: Candidate, b: Candidate, config: OrderConfig): boolean {
  return (
    a.targetPoint === b.targetPoint &&
    a.step === b.step &&
    a.sourceLayer === b.sourceLayer &&
    categoryRank(config.categoryOrder[a.step], a.category) === categoryRank(config.categoryOrder[b.step], b.category)
  );
}

function foldList(base: number, ordered: Ordered[]): number {
  return ordered.reduce((value, item) => applyEdit(value, item.candidate.kind, item.candidate.amount), base);
}

function lostStep(check: CheckedRule): LostStep {
  const scopeResult: TruthValue = check.scope.result;
  let outcome: LostStep["outcome"];
  let outcomeNote = "";
  if (!check.inPlay) {
    outcome = "not in play: package off in this context";
    outcomeNote = check.inPlayNote;
  } else if (scopeResult === "false") outcome = "scope not matched";
  else if (scopeResult === "cant_tell") outcome = "scope can't tell";
  else if (check.trigger?.result === "cant_tell") outcome = "trigger can't tell";
  else outcome = "trigger false";
  return {
    ...check.read,
    ruleKey: check.rule.key,
    ruleLabel: check.rule.label,
    outcome,
    outcomeNote,
    scope: check.scope,
    trigger: check.trigger,
  };
}
