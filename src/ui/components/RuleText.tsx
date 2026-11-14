// A rule's text, folded under its name, for reading in a list (a package page, "Rules in play")
// without opening each rule. Shown without the package header; open the rule to copy or edit.
// Design: design/text-format-and-csv.md §6 (any item as text); owner feedback of 15 Nov.

import type { ContentItem, Rule } from "../../schema";
import { readBackRule } from "../../import/read-back";
import { itemToText } from "../../import/export-text";

interface Props {
  rule: Rule;
  all: ContentItem[];
  onOpen: () => void;
}

export function RuleText({ rule, all, onOpen }: Props) {
  const labelOf = (key: string) => all.find((i) => i.key === key)?.label ?? key;
  return (
    <details className="rule-text">
      <summary>
        {rule.label} <span className="muted">· {rule.effect.stat} · {rule.nature} · {rule.category}</span>
      </summary>
      {readBackRule(rule, labelOf).map((line, i) => (
        <p key={i} className="indent">{line}</p>
      ))}
      <pre className="code">{itemToText(rule, undefined, all, false)}</pre>
      <button className="link" onClick={onOpen}>Open the rule</button>
    </details>
  );
}
