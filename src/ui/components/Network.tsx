// The whole story from one card: a thing's (or unit's) direct connections both ways by link kind
// (the register), everything it reaches and everything that reaches it, with each route written
// as a condition would write it (`serves > paid_by`, tap to copy), and the rules that name it.
// Design: design/rules-overlay.md §13 (any thing has a tree), §17 (route patterns);
// owner, 15 Nov (build log): see the whole chain from any card.

import { useEffect, useState } from "react";
import type { AppData } from "../app-data";
import type { ThingTree, TreeBranch } from "../../world/tree";

interface Props {
  data: AppData;
  sandbox: string;
  thingKey: string;
  readDate: number;
  refreshKey?: unknown; // changes when the data does
  onOpen: (key: string) => void;
}

export function Network({ data, sandbox, thingKey, readDate, refreshKey, onOpen }: Props) {
  const [tree, setTree] = useState<ThingTree | null>(null);
  useEffect(() => {
    void data.thingTree(sandbox, thingKey, readDate).then(setTree);
  }, [data, sandbox, thingKey, readDate, refreshKey]);

  if (!tree) return <p className="muted">Reading…</p>;
  const words = (kind: string) => kind.replace(/_/g, " ");
  const { connections } = tree;

  return (
    <>
      <h3>Connected, in {readDate}</h3>
      {connections.out.length === 0 && connections.in.length === 0 && <p className="muted">No links on in {readDate}.</p>}
      {connections.out.map((group) => (
        <p key={"out" + group.kind}>
          <span className="muted">{words(group.kind)} →</span>{" "}
          {group.to.map((c, i) => (
            <span key={c.linkKey}>
              {i > 0 ? ", " : ""}
              <button className="link" onClick={() => onOpen(c.key)}>{c.label}</button>
            </span>
          ))}
        </p>
      ))}
      {connections.in.map((group) => (
        <p key={"in" + group.kind}>
          <span className="muted">← {words(group.kind)}:</span>{" "}
          {group.from.map((c, i) => (
            <span key={c.linkKey}>
              {i > 0 ? ", " : ""}
              <button className="link" onClick={() => onOpen(c.key)}>{c.label}</button>
            </span>
          ))}
        </p>
      ))}

      <h3>Its network: what it reaches</h3>
      <p className="muted">Each route is written as a condition would write it, from here. Tap a route to copy it.</p>
      <Branches branches={tree.reaches} onOpen={onOpen} />

      <h3>Reached from</h3>
      <p className="muted">The route from the other thing to here.</p>
      <Branches branches={tree.reachedBy} onOpen={onOpen} />

      <h3>Rules that name it</h3>
      {tree.rules.length === 0 && <p className="muted">None.</p>}
      {tree.rules.map(({ rule, via }) => (
        <p key={rule.key}>
          <button className="link" onClick={() => onOpen(rule.key)}>{rule.label}</button> <span className="muted">· through {via}</span>
        </p>
      ))}
    </>
  );
}

function Branches({ branches, onOpen }: { branches: TreeBranch[]; onOpen: (key: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (branches.length === 0) return <p className="muted">Nothing.</p>;
  return (
    <>
      {branches.map((b) => (
        <p key={b.key}>
          <button className="link" onClick={() => onOpen(b.key)}>{b.label}</button>{" "}
          <button className="small" onClick={async () => { await navigator.clipboard?.writeText(b.pattern); setCopied(b.key); }} aria-label={"Copy route " + b.pattern}>
            <code>{b.pattern}</code>
          </button>{" "}
          {copied === b.key && <span className="muted">copied</span>}
          {b.hops > 1 && <span className="muted"> · {b.route.trim()}</span>}
        </p>
      ))}
    </>
  );
}
