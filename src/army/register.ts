// Saving a roster: as a practice roster (outside every sandbox), or registered in a sandbox with
// each unit made a world unit linked to its world links, from a raising date.
// Design: build/slice-1-brief.md §1.3 (a practice roster is not registered: no lots, no log
// entries), §3.1 (registered: each unit registered in the world as a thing linked to its world
// links with a raising date); design/world-structure.md §12 (units registered in the world);
// design/rules-overlay.md §7 (a unit is stamped with its raising date).
//
// Writes content only, through the storage seam. Never writes a log entry.

import type { Link, Roster, Unit } from "../schema";
import { PRACTICE } from "../schema";
import type { Store } from "../store/store";

// A practice roster lives in its own space, which no sandbox reads (brief §1.3).
export async function savePracticeRoster(store: Store, roster: Roster): Promise<void> {
  await store.putContent([{ ...roster, space: PRACTICE, package: null, registration: null }]);
}

export interface UnitRegistration {
  unit: string; // the roster unit's id
  key: string; // the world unit's key
  label: string; // its name in the world ("Nuln Handgunners")
  raised: number; // its raising date
  links: [kind: string, to: string][]; // raised_at, member_of, serves, stationed_at …
}

// Registers a roster in a sandbox and context: the roster itself (in the sandbox's space), and
// one world unit per roster unit, with its links from the raising date.
export async function registerRoster(store: Store, roster: Roster, sandbox: string, context: string, units: UnitRegistration[]): Promise<void> {
  const saved: Roster = { ...roster, space: sandbox, package: sandbox, registration: { sandbox, context } };
  const items: (Roster | Unit | Link)[] = [saved];
  for (const reg of units) {
    items.push({
      class: "unit",
      key: reg.key,
      label: reg.label,
      space: sandbox,
      package: sandbox,
      profile: {},
      raised: reg.raised,
      context,
      source: { roster: roster.key, unit: reg.unit },
    });
    for (const [kind, to] of reg.links) {
      items.push({ class: "link", key: reg.key + "~" + kind + "~" + to + "~" + reg.raised, label: "", space: sandbox, package: sandbox, kind, from: reg.key, to, start: reg.raised, end: null });
    }
  }
  await store.putContent(items);
}
