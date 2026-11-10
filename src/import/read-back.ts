// Plain-English read-backs: what an item means, in words, beside its text.
// Design: design/text-format-and-csv.md §4 (the review reads sets back as "sets the statline
// to 3", "sets 3 at this point", "forces 3"), §8 (the import review); design/rules-overlay.md
// §17 ("these nodes join the rule builder's condition list with plain-English read-backs").
//
// Pure: labels are looked up through the function passed in.

import type { Expression, NumberEdit, Rule } from "../schema";

export type LabelOf = (key: string) => string;

function words(text: string): string {
  return text.replace(/_/g, " ");
}

export function readBackEdit(edit: NumberEdit): string {
  const value = String(edit.value);
  switch (edit.kind) {
    case "set":
      if (edit.targetPoint === "statline") return "sets the statline " + edit.stat + " to " + value + " (later edits still apply)";
      if (edit.targetPoint === "end") return "forces " + edit.stat + " " + value + ", whatever came before";
      return "sets " + edit.stat + " " + value + " at this point";
    case "add":
      return edit.stat + " " + (edit.value >= 0 ? "+" + value : "−" + String(-edit.value));
    case "multiply":
      return edit.stat + " × " + value;
    case "cap":
      return edit.stat + " at most " + value;
    case "floor":
      return edit.stat + " at least " + value;
  }
}

// Two phrasings: after "units that" (a scope: "reach Nuln by …"), or as a clause on its own
// (a trigger: "the unit reaches Nuln by …").
export type Phrasing = "after units that" | "clause";

export function readBackCondition(expression: Expression, labelOf: LabelOf, phrasing: Phrasing = "clause"): string {
  const again = (part: Expression) => readBackCondition(part, labelOf, phrasing);
  switch (expression.node) {
    case "reaches": {
      const target = expression.target.by === "thing" ? labelOf(expression.target.key) : "any " + words(expression.target.kind);
      const route = expression.via.map((step) => words(step.link) + (step.repeat ? " (any number of times)" : "")).join(", then ");
      const when = expression.when === "ever" ? ", at any time up to the date" : "";
      const verb = phrasing === "clause" ? "the unit reaches " : "reach ";
      return verb + target + " by " + route + when;
    }
    case "in_force": {
      const roles = Object.entries(expression.roles).map(([role, key]) => words(role) + ": " + labelOf(key));
      return words(expression.what) + " is in force" + (roles.length ? " (" + roles.join(", ") + ")" : "");
    }
    case "named_scope":
      return (phrasing === "clause" ? "the unit is" : "are") + " in the named scope “" + labelOf(expression.key) + "”";
    case "all":
      return expression.of.map(again).join(", and ");
    case "any":
      return "either " + expression.of.map(again).join(", or ");
    case "not":
      return "not (" + again(expression.of) + ")";
  }
}

// "Ld −1 for units that are in the named scope “…”, while wages withheld is in force (…)."
export function readBackRule(rule: Rule, labelOf: LabelOf): string[] {
  const lines = ["Effect: " + readBackEdit(rule.effect) + "."];
  lines.push("Applies to units that " + readBackCondition(rule.scope, labelOf, "after units that") + ".");
  lines.push(rule.trigger ? "Only while " + readBackCondition(rule.trigger, labelOf, "clause") + "." : "No trigger: on whenever the scope matches.");
  lines.push(
    rule.nature === "origin"
      ? "Origin rule: reads the world as of each unit's raising date, in the origin step."
      : "Environment rule: reads the world at the date you're viewing, in the stationed step.",
  );
  lines.push("Category " + rule.category + " · " + rule.sourceLayer + " layer.");
  return lines;
}
