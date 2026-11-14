// Hooks as the World screen shows them: each hook's state at a read date, what it read, and the
// rules bound to it.
// Design: design/rules-overlay.md §5 (hook objects: a label, a condition reading the world, a
// rule per game bound to it), §5.1 (true / false / can't tell); owner decisions of 15 Nov (build
// log): hooks are world items; an inline trigger makes its hook automatically.
//
// Pure: no I/O.

import type { ContentItem, Expression, Rule } from "../schema";
import type { AcceptedEntry } from "../log/log";
import { referencedKeys } from "../import/expression-text";
import { autoHookKey, buildWorld, type HookView } from "../world/world";
import { evaluate, type ConditionTrace } from "./conditions";

export interface HookState {
  hook: HookView;
  // A hook that follows links from a unit (`reaches`) has no single answer: it depends on the
  // unit. Its state shows on each unit's card instead.
  perUnit: boolean;
  trace: ConditionTrace | null; // null when perUnit
  rules: Rule[]; // rules that trigger on it
}

function readsFromAUnit(expression: Expression, hooks: Map<string, HookView>, seen = new Set<string>()): boolean {
  switch (expression.node) {
    case "reaches":
      return true;
    case "hook": {
      const inner = hooks.get(expression.key);
      if (!inner || seen.has(expression.key)) return false;
      seen.add(expression.key);
      return readsFromAUnit(inner.condition, hooks, seen);
    }
    case "all":
    case "any":
      return expression.of.some((part) => readsFromAUnit(part, hooks, seen));
    case "not":
      return readsFromAUnit(expression.of, hooks, seen);
    default:
      return false;
  }
}

function triggersOn(rule: Rule, hookKey: string): boolean {
  if (!rule.trigger) return false;
  if (autoHookKey(rule.key) === hookKey && rule.trigger.node !== "hook") return true;
  return referencedKeys(rule.trigger).hooks.includes(hookKey);
}

// Every hook in this sandbox's world (its own, and those made from rules' inline triggers),
// with its state at `readDate`. `rulesInPlay` limits auto hooks to rules switched on here.
export function hookStates(content: ContentItem[], entries: AcceptedEntry[], readDate: number, rulesInPlay: Set<string> | null): HookState[] {
  const world = buildWorld(content, entries);
  const states: HookState[] = [];
  for (const hook of world.hooks.values()) {
    if (hook.fromRule && rulesInPlay && !rulesInPlay.has(hook.fromRule)) continue;
    const perUnit = readsFromAUnit(hook.condition, world.hooks);
    states.push({
      hook,
      perUnit,
      trace: perUnit ? null : evaluate(world, { node: "hook", key: hook.key }, "", readDate),
      rules: world.rules.filter((rule) => triggersOn(rule, hook.key)),
    });
  }
  return states.sort((a, b) => Number(a.hook.fromRule !== null) - Number(b.hook.fromRule !== null) || a.hook.label.localeCompare(b.hook.label));
}
