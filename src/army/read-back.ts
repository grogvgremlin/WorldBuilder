// A card read back like the book's entry, then its derivation, then warnings: what the uploader
// signs off (build-log Part B owner decision 7). Also used for the unit card in a roster.
// Design: design/text-format-and-csv.md §8 (the import review reads every value back);
// design/rules-overlay.md §13 (every value can say what it read).
//
// Pure: a resolved card in, lines of text out.

import { describeRange, type Cost } from "./cells";
import { STATS, optionId, type CardOption, type ResolvedCard } from "./card";
import type { OptionEntry, OptionGroup } from "./options";

export interface CardText {
  title: string;
  subtitle: string; // "Forces of Fantasy, p. 58 · The Empire of Man · Core"
  table: { header: string[]; rows: string[][] }; // stats, with the Points column
  facts: [string, string][]; // Troop Type, Base Size, Unit Size, Equipment
  options: string[]; // in the book's words, one line each ("• …", "  - …")
  rules: string;
  derivation: string[];
  warnings: string[];
}

export function costText(cost: Cost | null, perUnit = false): string {
  if (!cost) return "";
  if (cost.amount === 0) return "free";
  const n = Math.abs(cost.amount);
  const points = n === 1 ? "point" : "points";
  const signText = cost.amount < 0 ? "−" : "+";
  if (cost.perModel && !perUnit) return signText + n + " " + points + " per model";
  if (perUnit) return signText + n + " " + points + " per unit";
  return signText + n + " " + points;
}

function referenceText(reference: string): string {
  const [book, page] = reference.split(";").map((s) => s.trim());
  return page ? book + ", p. " + page : book;
}

function entryText(entry: OptionEntry): string {
  let text = optionId(entry).replace(" instead of ", " instead of ");
  if (entry.isMount) text += " (mount)";
  const extras: string[] = [];
  if (entry.budget) extras.push("up to " + (entry.budget.max ?? "no limit") + " points" + (entry.budget.max === null ? "" : " in total"));
  if (entry.conditions.length > 0) extras.push(entry.conditions.join(", ").toLowerCase());
  if (entry.grants.length > 0) extras.push("gives " + entry.grants.join(", "));
  if (extras.length > 0) text += " (" + extras.join("; ") + ")";
  const cost = costText(entry.cost);
  return cost ? text + " … " + cost : text;
}

// One option group in the book's words. `who` is the subject: "The entire unit", "A Sergeant",
// or "" for a character (the book: "May take one of the following:").
function groupLines(group: OptionGroup, who: string): string[] {
  const subject = who ? who + " " : "";
  const verb = (w: string) => (subject ? subject + w : w.charAt(0).toUpperCase() + w.slice(1));
  if (group.members.length === 1 && !group.mandatory) return ["• " + verb("may take ") + entryText(group.members[0])];
  const head = verb(group.mandatory ? "must take one of the following:" : "may take one of the following:");
  return ["• " + head, ...group.members.map((m) => "  - " + entryText(m))];
}

function ruleLines(group: OptionGroup): string[] {
  if (group.members.length === 1 && !group.mandatory) {
    const m = group.members[0];
    const cost = costText(m.cost);
    return ["• May have the " + m.name + " special rule" + (cost ? " … " + cost : "")];
  }
  return groupLines(group, "");
}

function optionLines(card: ResolvedCard): string[] {
  const lines: string[] = [];
  const bySection = (section: CardOption["section"]) => card.options.filter((o) => o.section === section);
  const unitWho = card.cost?.perModel ? "The entire unit" : "";
  for (const o of bySection("equipment")) lines.push(...groupLines(o.group, unitWho));
  for (const slot of card.slots) {
    const cost = costText(slot.cost, true);
    if (slot.type === "crew" || slot.type === "steed") {
      lines.push("• " + (slot.count ? describeRange(slot.count) + " " : "") + slot.name + (slot.type === "crew" ? " (crew)" : " (pulling it)"));
      continue;
    }
    const champion = slot.row !== null && slot.row.storedDelta.length > 0;
    const title = champion ? slot.name : slot.name.toLowerCase();
    lines.push("• Upgrade one model to a " + title + (champion ? " (champion)" : "") + (cost ? " … " + cost : ""));
    for (const o of card.options.filter((x) => x.section === "slot" && x.slot === slot.name)) lines.push(...groupLines(o.group, "A " + title).map((l) => "  " + l));
  }
  for (const o of bySection("rules")) lines.push(...ruleLines(o.group));
  for (const limit of card.limits) lines.push("• Limit: " + limit.what + " " + describeRange(limit.range) + (limit.perPoints ? " per " + limit.perPoints.toLocaleString("en-GB") + " points of the " + limit.basis : " per " + limit.basis));
  return lines;
}

export function cardText(card: ResolvedCard): CardText {
  const header = ["", ...STATS, "Points"];
  const rows = card.rows.map((r) => [
    r.name + (r.count && r.count.min > 1 ? " (×" + r.count.min + ")" : ""),
    ...STATS.map((s) => (r.line[s] === undefined ? "" : r.line[s] === "-" ? "–" : String(r.line[s]))),
    r.kind === "mount" || r.kind === "crew" || r.kind === "steed" ? "–" : r.cost ? (r.kind === "slot" ? "+" : "") + Math.abs(r.cost.amount) : "",
  ]);
  const equipment = card.rows
    .filter((r) => r.equipment.length > 0)
    .map((r, i) => (i === 0 && r.kind === "model" ? "" : r.name + ": ") + r.equipment.join(", "))
    .join(" · ");
  const derivation: string[] = [];
  for (const r of card.rows) {
    derivation.push(r.name + " (" + r.identity + "):");
    for (const step of r.steps) derivation.push("  " + step);
    if (r.storedDelta.length === 0 && r.identity.includes("·")) derivation.push("  matches the printed line: no delta stored");
  }
  if (card.inherits.length > 0) derivation.push("Inherits from: " + card.inherits.join(" → "));
  for (const m of card.matches) derivation.push("Matched: " + m);
  const warnings = [...card.warnings];
  if (card.stubs.length > 0) warnings.push("Not entered yet (stubs, incomplete): " + card.stubs.join(", "));
  return {
    title: card.unit,
    subtitle: [referenceText(card.reference), card.category].filter(Boolean).join(" · "),
    table: { header, rows },
    facts: [
      ["Troop Type", card.troopType],
      ["Base Size", card.baseSize],
      ["Unit Size", card.size ? describeRange(card.size) : ""],
      ["Equipment", equipment],
    ].filter(([, v]) => v !== "") as [string, string][],
    options: optionLines(card),
    rules: card.rules.join(", "),
    derivation,
    warnings,
  };
}

// The whole card as plain text (for tests, copying, and a phone's narrow screen).
export function cardPlainText(text: CardText): string {
  const widths = text.table.header.map((_, i) => Math.max(...[text.table.header, ...text.table.rows].map((r) => (r[i] ?? "").length)));
  const pad = (r: string[]) => r.map((v, i) => (i === 0 ? v.padEnd(widths[i]) : v.padStart(widths[i]))).join("  ").trimEnd();
  return [
    text.title,
    text.subtitle,
    "",
    pad(text.table.header),
    ...text.table.rows.map(pad),
    "",
    ...text.facts.map(([k, v]) => k + ": " + v),
    "",
    "Options:",
    ...text.options,
    "",
    "Special Rules: " + text.rules,
    "",
    "Derivation:",
    ...text.derivation,
    ...(text.warnings.length > 0 ? ["", "Warnings:", ...text.warnings.map((w) => "⚠ " + w)] : []),
  ].join("\n");
}
