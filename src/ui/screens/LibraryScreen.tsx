// The library: everything shared by all sandboxes and pick-up games on this device. The games
// (manifests, each with its core packages), and rules packages grouped by layer. Which of them
// are in play is the Sandbox tab's business.
// Design: design/manifest.md §1 (a manifest per edition), §9 (the base package beside it);
// design/items-packages-and-library.md §4–5 (packages; the library per game); owner decisions
// of 14 Nov (build log): the manifest holds its core; books, FAQs, house rules and campaign.

import type { Manifest, Package } from "../../schema";
import type { Snapshot } from "../app-data";
import { itemRef, type ItemRef } from "../item-ref";

const LAYER_TITLES: { layer: Package["sourceLayer"]; title: string }[] = [
  { layer: "book", title: "Books and core rules" },
  { layer: "faq", title: "FAQs" },
  { layer: "house", title: "House rules" },
  { layer: "campaign", title: "Campaign packages" },
];

export function LibraryScreen({ snapshot, onOpenItem }: { snapshot: Snapshot; onOpenItem: (ref: ItemRef) => void }) {
  const library = snapshot.all.filter((i) => i.space === "library");
  const packages = library.filter((i): i is Package => i.class === "package").sort((a, b) => a.label.localeCompare(b.label));
  const manifests = library.filter((i): i is Manifest => i.class === "manifest");
  const labelOf = (key: string) => packages.find((p) => p.key === key)?.label ?? key + " (missing)";
  const count = (p: Package) => p.members.length + (p.members.length === 1 ? " item" : " items");

  return (
    <>
      <h1>Library</h1>
      <p className="muted">Shared by every sandbox and pick-up game on this device. What's switched on where is on the Sandbox tab.</p>
      <div className="columns">
        <div>
          <h2>Games (manifests)</h2>
          {manifests.length === 0 && <p className="muted">None yet. Import a manifest file, or a test world.</p>}
          {manifests.map((m) => (
            <div key={m.key} className="card">
              <button className="list-button bare" onClick={() => onOpenItem(itemRef(m))}>
                <span>{m.label} <span className="muted">· {m.key}</span></span>
                <span aria-hidden>›</span>
              </button>
              <p className="muted">
                Core: {m.core.length ? m.core.map(labelOf).join(", ") : "none"} · {m.statOrder.join(" ")}
              </p>
            </div>
          ))}
        </div>
        <div>
          {packages.length === 0 && <p className="muted">No packages yet.</p>}
          {LAYER_TITLES.map(({ layer, title }) => {
            const here = packages.filter((p) => p.sourceLayer === layer);
            if (here.length === 0) return null;
            return (
              <div key={layer}>
                <h2>{title}</h2>
                <div className="card">
                  <ul className="plain">
                    {here.map((pkg) => (
                      <li key={pkg.key}>
                        <button className="list-button bare" onClick={() => onOpenItem(itemRef(pkg))}>
                          <span>{pkg.label} <span className="muted">· {pkg.edition ?? "no edition"} · {count(pkg)}</span></span>
                          <span aria-hidden>›</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
