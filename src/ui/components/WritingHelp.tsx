// "What can I write?": the fixed words of a condition, and this world's own words (things, link
// kinds with an example each, kinds of thing, event types, hooks, named scopes). Tap a word to
// copy it. A stand-in for autocomplete until there are editors (slice 1 brief §1.4: no editors).
// Design: design/rules-overlay.md §17 (conditions), §5 (hooks); build/yaml-guide.md §5–6;
// owner feedback of 15 Nov.

import { useState } from "react";
import type { ContentItem, EventRecord } from "../../schema";
import { vocabulary } from "../../import/vocabulary";

interface Props {
  all: ContentItem[];
  sandbox: string | null;
  logged: EventRecord[]; // events recorded in the open sandbox's log
}

const FIXED: { word: string; means: string }[] = [
  { word: "reaches(nuln, raised_at > in*)", means: "the unit gets to Nuln along these link kinds, in order; * = any number of times" },
  { word: "reaches(any settlement, stationed_at)", means: "…to any thing of this kind" },
  { word: "reaches(nuln, raised_at, ever)", means: "…at any time up to the date, not only on it" },
  { word: "in_force(wages_withheld, withholder = wissenland_treasury)", means: "an event of this type (or this one event) is in force, with these things in these parts" },
  { word: "hook(treasury_not_paying)", means: "a hook is true (in a trigger, the bare key is enough)" },
  { word: "all(…, …)", means: "every part is true" },
  { word: "any(…, …)", means: "at least one part is true" },
  { word: "not(…)", means: "the part is false" },
];

export function WritingHelp({ all, sandbox, logged }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const words = vocabulary(all, sandbox ?? "library", logged);
  const copy = async (text: string) => {
    await navigator.clipboard?.writeText(text);
    setCopied(text);
  };
  const Word = ({ text }: { text: string }) => (
    <button className="link copy-word" onClick={() => copy(text)} title="Copy">
      <code>{text}</code>
    </button>
  );

  return (
    <div className="gap-top">
      <button className="link" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Hide the words you can write" : "What can I write?"}
      </button>
      {open && (
        <div className="card">
          <p className="muted">Tap a word to copy it.{copied && <> Copied <code>{copied}</code>.</>} The full guide is build/yaml-guide.md.</p>
          <h3>Conditions (scope, trigger, query, when)</h3>
          {FIXED.map((f) => (
            <p key={f.word}>
              <Word text={f.word} /> <span className="muted">· {f.means}</span>
            </p>
          ))}

          <h3>In {sandbox ? "this world" : "every world"}</h3>
          <p className="muted">A route follows link kinds from the unit outward: <code>serves &gt; paid_by</code> means "a link of kind serves, then from there a link of kind paid_by".</p>
          <h3>Link kinds (route steps)</h3>
          {words.linkKinds.length === 0 ? <p className="muted">None yet.</p> : words.linkKinds.map((l) => (
            <p key={l.kind}>
              <Word text={l.kind} /> <span className="muted">· {l.count} · e.g. {l.example}</span>
            </p>
          ))}
          <h3>Things (by key)</h3>
          <p>
            {words.things.map((t) => (
              <span key={t.key} className="word">
                <Word text={t.key} /> <span className="muted">{t.label}</span>
              </span>
            ))}
          </p>
          <h3>Kinds of thing (after “any”)</h3>
          <p>{words.thingKinds.map((k) => <span key={k} className="word"><Word text={"any " + k} /></span>)}</p>
          <h3>Event types (for in_force)</h3>
          <p>{words.eventTypes.length === 0 ? <span className="muted">None yet: record one on the World tab.</span> : words.eventTypes.map((e) => <span key={e.type} className="word"><Word text={e.type} /> <span className="muted">{e.parts.length > 0 ? "parts: " + e.parts.join(", ") : "no parts"}</span></span>)}</p>
          <h3>Hooks (for trigger)</h3>
          <p>{words.hooks.length === 0 ? <span className="muted">None yet.</span> : words.hooks.map((h) => <span key={h.key} className="word"><Word text={h.key} /> <span className="muted">{h.label}</span></span>)}</p>
          <h3>Named scopes (for scope)</h3>
          <p>{words.scopes.length === 0 ? <span className="muted">None yet.</span> : words.scopes.map((h) => <span key={h.key} className="word"><Word text={h.key} /> <span className="muted">{h.label}</span></span>)}</p>
        </div>
      )}
    </div>
  );
}
