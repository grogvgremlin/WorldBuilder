// "View text": any item as it would be written to import it; copy it, export it, or export its
// whole package. Design: design/text-format-and-csv.md §6 (export; re-imports exactly).

import { useState } from "react";
import type { ContentItem, Package } from "../../schema";
import { itemToText, packageToText } from "../../import/export-text";
import { saveFile } from "../save-file";

export function ItemText({ content, itemKey, label = "View text" }: { content: ContentItem[]; itemKey: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const item = content.find((i) => i.key === itemKey);
  if (!item) return null;
  const pkg = content.find((i): i is Package => i.class === "package" && i.key === item.package);
  const text = itemToText(item, pkg, content);

  if (!open) {
    return (
      <button className="link" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <div style={{ marginTop: 8 }}>
      <pre className="code">{text}</pre>
      <div className="row">
        <button onClick={async () => { await navigator.clipboard?.writeText(text); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
        <button onClick={() => saveFile(item.key + ".yaml", text, "text/plain")}>Export</button>
        {pkg && item.class !== "package" && (
          <button onClick={() => saveFile(pkg.key + ".yaml", packageToText(pkg, content), "text/plain")}>Export package</button>
        )}
        <button className="link" onClick={() => setOpen(false)}>Hide</button>
      </div>
      <p className="muted">Re-importing this text changes nothing; edit it first to change it.</p>
    </div>
  );
}
