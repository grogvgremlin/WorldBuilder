// "View text": any item as it would be written to import it; copy it, export it, or export the
// whole package or sandbox it belongs to.
// Design: design/text-format-and-csv.md §6 (export; re-imports exactly).

import { useState } from "react";
import type { ContentItem } from "../../schema";
import { containerToText, itemToText, type Container } from "../../import/export-text";
import { saveFile } from "../save-file";

export function ItemText({ all, item, label = "View text" }: { all: ContentItem[]; item: ContentItem; label?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const container = all.find(
    (i): i is Container => (i.class === "package" || i.class === "sandbox") && i.key === item.package && i.space === item.space,
  );
  const text = itemToText(item, container, all);
  const isContainer = item.class === "package" || item.class === "sandbox";

  if (!open) {
    return (
      <button className="link gap-top" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <div className="gap-top">
      <pre className="code">{text}</pre>
      <div className="row">
        <button onClick={async () => { await navigator.clipboard?.writeText(text); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
        <button onClick={() => saveFile(item.key + ".yaml", text, "text/plain")}>Export</button>
        {container && !isContainer && (
          <button onClick={() => saveFile(container.key + ".yaml", containerToText(container, all), "text/plain")}>
            Export {container.class}
          </button>
        )}
        <button className="link" onClick={() => setOpen(false)}>Hide</button>
      </div>
      <p className="muted">Re-importing this text changes nothing; edit it first to change it.</p>
    </div>
  );
}
