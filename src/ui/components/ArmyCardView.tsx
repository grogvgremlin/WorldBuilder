// A card shown like the book's entry: stats, troop type, equipment, options, special rules;
// then the derivation (folded), then warnings. Used in the import review (to sign off) and in
// a roster. Design: build-log Part B owner decision 7; design/rules-overlay.md §13.

import type { CardText } from "../../army/read-back";

export function ArmyCardView({ text, open = false }: { text: CardText; open?: boolean }) {
  return (
    <div className="card army-card">
      <h3>{text.title}</h3>
      <p className="muted">{text.subtitle}</p>
      <div className="table-scroll">
        <table className="statline">
          <thead>
            <tr>
              {text.table.header.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {text.table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="facts">
        {text.facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {text.options.length > 0 && (
        <>
          <p className="facts-label">Options</p>
          <ul className="options">
            {text.options.map((line, i) => (
              <li key={i} className={line.startsWith("    ") ? "indent-2" : line.startsWith("  ") ? "indent-1" : ""}>
                {line.trim().replace(/^[•-] /, "")}
              </li>
            ))}
          </ul>
        </>
      )}
      {text.rules && (
        <p>
          <span className="facts-label">Special Rules: </span>
          {text.rules}
        </p>
      )}
      <details open={open}>
        <summary>Derivation</summary>
        <pre className="code">{text.derivation.join("\n")}</pre>
      </details>
      {text.warnings.map((w, i) => (
        <p key={i} className="problem-warning">
          {w}
        </p>
      ))}
    </div>
  );
}
