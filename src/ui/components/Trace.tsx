// Shows a condition trace: each node, true / false / can't tell, and what it read.
// Design: design/rules-overlay.md §13 ("flavour on the tree: inputs beside each boolean").

import type { ConditionTrace, TruthValue } from "../../overlay/conditions";

export function TruthTag({ value }: { value: TruthValue }) {
  if (value === "true") return <span className="tag good">true</span>;
  if (value === "false") return <span className="tag bad">false</span>;
  return <span className="tag warn">can't tell</span>;
}

export function Trace({ trace }: { trace: ConditionTrace }) {
  return (
    <div className="trace">
      <div>
        <TruthTag value={trace.result} /> {trace.text}
      </div>
      {trace.inputs.map((input, i) => (
        <div key={i} className="inputs">
          {input}
        </div>
      ))}
      {trace.children.length > 0 && (
        <div className="children">
          {trace.children.map((child, i) => (
            <Trace key={i} trace={child} />
          ))}
        </div>
      )}
    </div>
  );
}
