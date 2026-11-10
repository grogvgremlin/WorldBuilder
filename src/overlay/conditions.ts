// Evaluating scopes and triggers, keeping a trace of what was read.
// Design: design/rules-overlay.md §17 (the world-reading nodes, read as of the rule's read
// date), §5.1 (true / false / can't tell: missing data is "can't tell"), §13 (the "why not?"
// tree shows inputs beside each boolean).
//
// Pure: reads the World, does no I/O.

import type { Expression, ReachTarget, RouteStep } from "../schema";
import { describeRoute, inForce, labelOf, reaches, type Route, type World } from "../world/world";

export type TruthValue = "true" | "false" | "cant_tell";

// What one node of a condition read and what it came to.
export interface ConditionTrace {
  text: string; // the node in words: "reaches Nuln via raised at → in*, as of 2520"
  result: TruthValue;
  inputs: string[]; // what it read: routes found, events in force, or what was missing
  children: ConditionTrace[];
  // For a direct `reaches` on one thing: the routes found (used for depth in the fold).
  routes: Route[];
}

export function evaluate(world: World, expression: Expression, protagonist: string, date: number): ConditionTrace {
  switch (expression.node) {
    case "reaches":
      return evaluateReaches(world, expression.target, expression.via, expression.when, protagonist, date);
    case "in_force":
      return evaluateInForce(world, expression.what, expression.roles, date);
    case "named_scope":
      return evaluateNamedScope(world, expression.key, protagonist, date);
    case "all":
      return combineAll(expression.of.map((part) => evaluate(world, part, protagonist, date)));
    case "any":
      return combineAny(expression.of.map((part) => evaluate(world, part, protagonist, date)));
    case "not":
      return negate(evaluate(world, expression.of, protagonist, date));
  }
}

function emptyTrace(text: string, result: TruthValue, inputs: string[]): ConditionTrace {
  return { text, result, inputs, children: [], routes: [] };
}

// --- reaches ----------------------------------------------------------------

export function describeVia(via: RouteStep[]): string {
  return via.map((step) => step.link.replace(/_/g, " ") + (step.repeat ? "*" : "")).join(" → ");
}

function describeTarget(world: World, target: ReachTarget): string {
  return target.by === "thing" ? labelOf(world, target.key) : "any " + target.kind;
}

function evaluateReaches(
  world: World,
  target: ReachTarget,
  via: RouteStep[],
  when: "as_of" | "ever",
  protagonist: string,
  date: number,
): ConditionTrace {
  const whenText = when === "as_of" ? "as of " + date : "ever, up to " + date;
  const text = "reaches " + describeTarget(world, target) + " via " + describeVia(via) + ", " + whenText;
  if (target.by === "thing" && !world.things.has(target.key) && !world.units.has(target.key)) {
    return emptyTrace(text, "cant_tell", ["unknown thing: " + target.key]);
  }
  const result = reaches(world, protagonist, target, via, when, date);
  const inputs = result.reached
    ? result.routes.map((route) => "route: " + describeRoute(world, route))
    : ["no route on " + date];
  return { text, result: result.reached ? "true" : "false", inputs, children: [], routes: result.routes };
}

// --- in force -----------------------------------------------------------------

function evaluateInForce(world: World, what: string, roles: Record<string, string>, date: number): ConditionTrace {
  const roleText = Object.entries(roles)
    .map(([role, thing]) => role + " = " + labelOf(world, thing))
    .join(", ");
  const text = "in force: " + what.replace(/_/g, " ") + (roleText ? " (" + roleText + ")" : "") + ", on " + date;
  const result = inForce(world, what, roles, date);
  const inputs = result.inForce
    ? result.events.map((event) => {
        const where = event.recordedIn.from === "log" ? "log entry " + event.recordedIn.entryId : "world history";
        const until = event.end === null ? "" : " until " + event.end;
        return event.label + " in force since " + event.start + until + " (" + where + ")";
      })
    : ["nothing matching in force on " + date];
  return emptyTrace(text, result.inForce ? "true" : "false", inputs);
}

// --- named scope -----------------------------------------------------------------

function evaluateNamedScope(world: World, key: string, protagonist: string, date: number): ConditionTrace {
  const scope = world.scopes.get(key);
  if (!scope) return emptyTrace("named scope " + key, "cant_tell", ["unknown named scope: " + key]);
  const inner = evaluate(world, scope.query, protagonist, date);
  return {
    text: "named scope “" + scope.label + "”",
    result: inner.result,
    inputs: [],
    children: [inner],
    routes: [], // a named scope names no thing for depth: rules-overlay.md §8
  };
}

// --- all / any / not ------------------------------------------------------------------

function combineAll(parts: ConditionTrace[]): ConditionTrace {
  let result: TruthValue = "true";
  if (parts.some((p) => p.result === "cant_tell")) result = "cant_tell";
  if (parts.some((p) => p.result === "false")) result = "false";
  return { text: "all of", result, inputs: [], children: parts, routes: [] };
}

function combineAny(parts: ConditionTrace[]): ConditionTrace {
  let result: TruthValue = "false";
  if (parts.some((p) => p.result === "cant_tell")) result = "cant_tell";
  if (parts.some((p) => p.result === "true")) result = "true";
  return { text: "any of", result, inputs: [], children: parts, routes: [] };
}

function negate(part: ConditionTrace): ConditionTrace {
  const flipped: Record<TruthValue, TruthValue> = { true: "false", false: "true", cant_tell: "cant_tell" };
  return { text: "not", result: flipped[part.result], inputs: [], children: [part], routes: [] };
}
