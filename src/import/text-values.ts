// Reading single values out of the YAML text: scalars, lists, (label, key) headers, edits.
// Design: design/text-format-and-csv.md §2 (valid YAML with short values and positional
// tuples; number edits `[S, +1]`, `[WS, =3, statline]`; a set must state its target point),
// §3 (a written key wins; a header without one gets a key written back).

import { isScalar, isSeq, LineCounter, type Node as YamlNode } from "yaml";
import type { NumberEdit, Problem } from "../schema";

// The WFB model statline: used for a profile written as a list when no manifest is found.
export const DEFAULT_STAT_ORDER = ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"];

export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "item"
  );
}

// Collects problems with the line they're on.
export class Reader {
  problems: Problem[] = [];
  constructor(private lines: LineCounter) {}

  lineOf(node: YamlNode | null | undefined): number | null {
    if (!node?.range) return null;
    return this.lines.linePos(node.range[0]).line;
  }

  problem(node: YamlNode | null | undefined, severity: Problem["severity"], message: string): void {
    this.problems.push({ line: this.lineOf(node), severity, message });
  }
}

// A scalar's value as text, or null.
export function textOf(node: unknown): string | null {
  if (isScalar(node) && node.value !== null && node.value !== undefined) return String(node.value);
  return null;
}

export function numberOf(node: unknown): number | null {
  if (isScalar(node) && typeof node.value === "number") return node.value;
  const text = textOf(node);
  if (text !== null && text.trim() !== "" && !Number.isNaN(Number(text))) return Number(text);
  return null;
}

// The items of a flow or block list, or [] if the node isn't a list.
export function listOf(node: unknown): unknown[] {
  return isSeq(node) ? node.items : [];
}

// A list of words: `[a, b]`, or one word.
export function wordsOf(node: unknown): string[] {
  if (isSeq(node)) return node.items.map(textOf).filter((w): w is string => !!w);
  const one = textOf(node);
  return one ? [one] : [];
}

// The character range of a node in the text, for writing back.
export function rangeOf(node: unknown): [number, number] | null {
  const range = (node as YamlNode | undefined)?.range;
  return range ? [range[0], range[1]] : null;
}

// --- The header tuple: (label, key) ---------------------------------------------------------

export interface Header {
  label: string;
  key: string | null;
  node: YamlNode;
  // In a tuple, the character range of the fields after (label, key), kept when writing back.
  restRange: [number, number] | null;
}

export function readHeader(node: unknown, reader: Reader, what: string): Header | null {
  if (isScalar(node) && textOf(node)) return { label: textOf(node)!, key: null, node, restRange: null };
  if (isSeq(node)) {
    const label = textOf(node.items[0]);
    const key = textOf(node.items[1]);
    const rest = node.items.slice(2) as YamlNode[];
    const restRange: [number, number] | null =
      rest.length > 0 && rest[0].range && rest[rest.length - 1].range ? [rest[0].range[0], rest[rest.length - 1].range![1]] : null;
    if (label) return { label, key: key ?? null, node, restRange };
  }
  reader.problem(node as YamlNode, "error", what + " needs a label: [label, key]");
  return null;
}

// --- Number edits: (stat, kind and value, target point) -----------------------------------------

const TARGET_POINT_WORDS: Record<string, NumberEdit["targetPoint"]> = {
  statline: "statline",
  inline: "inline",
  "in-line": "inline",
  end: "end",
};

// Reads `[Ld, +1]`, `[Ld, =8, inline]`, `[M, x0.5]`, `[WS, at most 2]`.
export function readEffect(node: unknown, reader: Reader): NumberEdit | null {
  if (!isSeq(node) || node.items.length < 2) {
    reader.problem(node as YamlNode, "error", "effect should be [stat, edit] or [stat, edit, target point]");
    return null;
  }
  const stat = textOf(node.items[0]);
  const editNode = node.items[1];
  const pointText = textOf(node.items[2])?.replace(/^@/, "") ?? null;
  if (!stat) {
    reader.problem(node, "error", "effect needs a stat");
    return null;
  }
  const edit = readEditWords(editNode);
  if (!edit) {
    reader.problem(node, "error", "can't read the edit “" + textOf(editNode) + "”");
    return null;
  }
  let targetPoint: NumberEdit["targetPoint"];
  if (pointText !== null) {
    if (!(pointText in TARGET_POINT_WORDS)) {
      reader.problem(node, "error", "unknown target point “" + pointText + "” (statline, inline or end)");
      return null;
    }
    targetPoint = TARGET_POINT_WORDS[pointText];
  } else if (edit.kind === "set") {
    reader.problem(node, "error", "set needs a target point: statline, inline or end");
    return null;
  } else {
    targetPoint = edit.kind === "cap" || edit.kind === "floor" ? "end" : "inline";
  }
  return { stat, kind: edit.kind, value: edit.value, targetPoint };
}

function readEditWords(node: unknown): { kind: NumberEdit["kind"]; value: number } | null {
  // A bare number is an add: `2` is read as `+2` (text-format §2).
  if (isScalar(node) && typeof node.value === "number") return { kind: "add", value: node.value };
  const text = textOf(node)?.trim().replace(/−/g, "-");
  if (!text) return null;
  const patterns: [RegExp, NumberEdit["kind"]][] = [
    [/^=\s*(-?[\d.]+)$/, "set"],
    [/^([+-][\d.]+)$/, "add"],
    [/^[x×*]\s*([\d.]+)$/, "multiply"],
    [/^at most\s+(-?[\d.]+)$/, "cap"],
    [/^at least\s+(-?[\d.]+)$/, "floor"],
  ];
  for (const [pattern, kind] of patterns) {
    const match = pattern.exec(text);
    if (match) return { kind, value: Number(match[1]) };
  }
  return null;
}
