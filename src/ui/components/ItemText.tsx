// "View text": any item as it would be written to import it; copy it, export it, export the
// whole package or sandbox it belongs to, or edit it as text (opens the Import screen with the
// text ready to change: still a text import, not an editor).
// Design: design/text-format-and-csv.md §6 (export; re-imports exactly); build/slice-1-brief.md
// §1.4 (content by text import only; no editors).

import { useState } from "react";
import type { ContentItem } from "../../schema";
import { containerToText, itemToText, type Container } from "../../import/export-text";
import { saveFile } from "../save-file";

interface Props {
  all: ContentItem[];
  item: ContentItem;
  label?: string;
  onEditText?: (text: string, label: string) => void;
}

export function ItemText({ all, item, label = "View text", onEditText }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const container = all.find(
    (i): i is Container => (i.class === "package" || i.class === "sandbox") && i.key === item.package && i.space === item.space && item.class !== "manifest",
  );
  const text = itemToText(item, container, all);
  const isContainer = item.class === "package" || item.class === "sandbox";

  return (
    <div className="gap-top">
      <div className="row">
        <button className="link" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Hide text" : label}
        </button>
        {onEditText && (
          <button className="link" onClick={() => onEditText(text, item.key + ".yaml")}>Edit as text</button>
        )}
      </div>
      {open && (
        <>
          <pre className="code">{text}</pre>
          <div className="row">
            <button onClick={async () => { await navigator.clipboard?.writeText(text); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
            <button onClick={() => saveFile(item.key + ".yaml", text, "text/plain")}>Export</button>
            {container && !isContainer && (
              <button onClick={() => saveFile(container.key + ".yaml", containerToText(container, all), "text/plain")}>Export {container.class}</button>
            )}
          </div>
          <p className="muted">Re-importing this text changes nothing; edit it first to change it.</p>
        </>
      )}
    </div>
  );
}
