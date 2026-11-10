# Slice 0 brief — the core loop on the iPhone

_Goal: prove the toolchain and the core shapes in days, not weeks. Write text, import it into a draft, deploy it, resolve a unit's value, and see the derivation and the "why not?" tree on an iPhone installed from GitHub Pages._

## 1. What slice 0 proves
1. The repository publishes to GitHub Pages and installs to the iPhone home screen. It works offline and keeps data across days.
2. The stored shapes are real: the log entry (full shape), entry status, withdrawal, the `unseal()` read path and the storage seam.
3. The world reads correctly: things, dated links, `reaches(target, via, when)` and `in force(kind, roles)` (`design/rules-overlay.md` §17).
4. The fold matches the design (`design/rules-overlay.md` §7–8, §12; resolver cascade in `design/resolver.md` §5.2–5.7):
   - rules are written as scope + trigger;
   - a rule's nature (origin read as of raising, environment read now) is set by when its condition is read;
   - two steps, origin then stationed;
   - order within a step: target point → source layer → category → depth → bag, with a clash notice where the order changes the result.
5. The derivation and the "why not?" tree are shown (`design/rules-overlay.md` §13).

## 2. Acceptance cases (from `design/test-corpus-v2.md`)
- **E1 Handgunners' Ld: 8 or 7** — required. "Wages withheld" is an event entry in the log.
  - Read 2525 with the event in force → **7**.
  - Withdraw that entry (a withdrawal entry, not a delete) → **8**.
  - The derivation shows each scope route, the trigger state, and what decided the order.
- **E2 Order within a step by depth** — required. The answer is **8**. Written `@statline` instead, it is 8 in any order.
- **E4 Grenzstadt spinach, first part** — stretch. Origin is read as of raising, so the Spearmen keep +1 S after Grenzstadt passes to Stirland in 2523.
  - The "while the Elector holds" variant stops in 2523.
  - Contingents and battlefield state are out of scope.
- **Round trip** — required. Export the whole copy, wipe the data, import it again: the same values and the same derivations.

## 3. In scope
- **Schema** (zod, with JSON Schema emitted) for:
  - the log entry (`design/infra.md` §8);
  - content items with keys;
  - a thing (with kinds) and a dated link (link kind, from, to, start, end);
  - an event (kind, roles, period);
  - a rule (effect, scope, trigger, nature, category, source layer, target point);
  - a package;
  - a unit (profile, raising date).
- **Storage seam** with an IndexedDB and an in-memory implementation. On first run, ask the browser for **persistent storage**.
- **Log**: append, status (everything is "accepted" in slice 0 because there is one user and no host), withdrawal, and `unseal()` as a no-op.
- **Text import** (short YAML; `design/text-format-and-csv.md` §1–4):
  - an import lands in a **draft** and is then deployed or discarded;
  - problems are reported per line and never block the rest of the import;
  - keys are written back.
  - **World things, links, events and scope + trigger rules have no text shape in the design yet.** Propose one that follows the doc's principles (YAML, short tuples, keys) and record it in the build log.
- **Resolver**: the two steps, the fold, the order within a step, and the derivation.
- **Screens** (thin, phone-first):
  - paste or open a YAML file → review the draft → deploy;
  - a list of things and units;
  - a unit card with a **read-date** control;
  - tap a value → its derivation;
  - tap a rule → the "why not?" tree (scope matched, trigger true, not switched off, not ignored, each with its inputs);
  - add or withdraw an event entry;
  - export and import of the whole copy.
- **Fixtures**: the E1, E2 and E4 worlds as YAML files in `test/fixtures/`, also loadable from the app.

## 4. Out of scope (shapes exist; behaviour later)
- Logins, roles, grants and sealing.
- Submissions and the host.
- Sync and encryption.
- Switch-offs (E3).
- Hooks as objects, value(), mediums and standing.
- Battle, dice, maps and editors.
- Calendars: dates are plain years or day counts.

## 5. Done when
- E1 and E2 pass as tests, and the round trip passes.
- The app is installed on the owner's iPhone from the Pages link. E1 loads from its fixture, and toggling the wages event flips Ld between 8 and 7, with the derivation showing why.
- `build/structure.md` and `build/build-log.md` are written. The build log lists the YAML shape chosen for world items and any questions for design.

## 6. Design docs to copy into `design/`
- `foundations/infra.md`
- `foundations/rules-overlay.md`
- `core/resolver.md`
- `authoring/text-format-and-csv.md`
- `core/test-corpus-v2.md`
- `foundations/world-structure.md`
- `foundations/glossary-v2.md`
- `foundations/v2-reconciliation.md`
