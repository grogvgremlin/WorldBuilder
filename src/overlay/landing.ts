// Which units a rule lands on at a date, and a filter over units to ask "why not?" about others.
// Design: build/slice-1-brief.md §2.3 ("a rule's page lists the units it applies to, each with
// its route. Never list the units it doesn't match. To ask 'why not?' about another unit, pick
// it, or narrow the unit list with a filter over units and their links"); design/rules-overlay.md
// §9 (the test view), §13.
//
// Pure: no I/O.

import type { ContentItem, Unit } from "../schema";
import type { AcceptedEntry } from "../log/log";
import type { Viewer } from "../log/unseal";
import { buildWorld, reaches, type World } from "../world/world";
import { resolve } from "./resolve";
import type { RuleCheck } from "./derivation";

export interface Landing {
  unitKey: string;
  label: string;
  routes: string[]; // what the scope matched, as text
}

// Every unit the rule applies to at `readDate`. Units it doesn't apply to are not listed.
export function unitsRuleAppliesTo(content: ContentItem[], entries: AcceptedEntry[], ruleKey: string, readDate: number, viewer: Viewer): Landing[] {
  const landings: Landing[] = [];
  for (const unit of resolve(content, entries, readDate, viewer).units) {
    const check = unit.rules.find((r) => r.ruleKey === ruleKey);
    if (!check?.applies) continue;
    const scope = check.tests.find((t) => t.name === "scope matched")?.trace;
    landings.push({ unitKey: unit.unitKey, label: unit.label, routes: scope ? allInputs(scope) : [] });
  }
  return landings;
}

function allInputs(trace: { inputs: string[]; children: { inputs: string[]; children: unknown[] }[] }): string[] {
  const out = [...trace.inputs];
  for (const child of trace.children) out.push(...allInputs(child as typeof trace));
  return out;
}

// One rule's "why not?" tree for one unit, or null if the rule isn't in that unit's context.
export function ruleCheckFor(content: ContentItem[], entries: AcceptedEntry[], ruleKey: string, unitKey: string, readDate: number, viewer: Viewer): RuleCheck | null {
  const unit = resolve(content, entries, readDate, viewer).units.find((u) => u.unitKey === unitKey);
  return unit?.rules.find((r) => r.ruleKey === ruleKey) ?? null;
}

// --- The unit filter -----------------------------------------------------------------------

export interface UnitFilter {
  text: string; // part of the label; "" for any
  linkKind: string | null; // e.g. raised_at; null for any
  target: string | null; // a thing key the link leads to
  orInside: boolean; // also count anything inside the target (follows `in` links up)
}

export function filterUnits(content: ContentItem[], entries: AcceptedEntry[], filter: UnitFilter, readDate: number): Unit[] {
  const world = buildWorld(content, entries);
  return [...world.units.values()].filter((unit) => matches(world, unit, filter, readDate)).sort((a, b) => a.label.localeCompare(b.label));
}

function matches(world: World, unit: Unit, filter: UnitFilter, readDate: number): boolean {
  if (filter.text && !unit.label.toLowerCase().includes(filter.text.toLowerCase())) return false;
  if (!filter.linkKind || !filter.target) return true;
  const via = [{ link: filter.linkKind, repeat: false }, ...(filter.orInside ? [{ link: "in", repeat: true }] : [])];
  return reaches(world, unit.key, { by: "thing", key: filter.target }, via, "as_of", readDate).reached;
}

// The link kinds units have, for the filter's drop-down.
export function unitLinkKinds(content: ContentItem[]): string[] {
  const units = new Set(content.filter((i) => i.class === "unit").map((i) => i.key));
  const kinds = content.filter((i) => i.class === "link" && units.has(i.from)).map((i) => (i.class === "link" ? i.kind : ""));
  return [...new Set(kinds)].sort();
}
