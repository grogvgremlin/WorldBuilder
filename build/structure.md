# Structure guide

Each module, what it does, and the design doc and section it implements. Every source file also names its doc in its top comment.

## Core (no I/O except `src/store/`)

| Module | Does | Design |
|---|---|---|
| `src/schema/log-entry.ts` | The log entry in its full shape: envelope (ID, recorded time, device, host sequence number) and seal (identity, status, order, content, visibility) | `infra.md` §8, §5.1 |
| `src/schema/expression.ts` | Conditions: `reaches`, `in_force`, named scope, `all` / `any` / `not` | `rules-overlay.md` §17, §6 |
| `src/schema/content.ts` | Things, dated links, events, units, rules (effect, scope, trigger, nature, category, source layer, target point), named scopes, packages | `world-structure.md` §1–3, §7, §12; `rules-overlay.md` §6–8, §12; `resolver.md` §5.2 |
| `src/schema/draft-and-copy.ts` | Draft batches, per-line problems, the whole-copy export | `infra.md` §1–2; `text-format-and-csv.md` §8 |
| `src/schema/emit.ts`, `scripts/emit-schema.ts` | Writes JSON Schema to `schema/` | CLAUDE.md "Schema defined once" |
| `src/store/store.ts` | The storage seam (append-only log, content by key, drafts, meta, whole copy) | `infra.md` §1–2 |
| `src/store/memory-store.ts` | The seam in memory, for tests | — |
| `src/store/indexeddb-store.ts` | The seam in IndexedDB; asking for persistent storage | — |
| `src/log/unseal.ts` | `unseal()`: the one read path into an entry (a no-op in slice 0) | `infra.md` §5, §5.1 |
| `src/log/log.ts` | Making entries, appending events, withdrawal, the audit view, accepted entries | `infra.md` §1–2, §6, §8 |
| `src/world/world.ts` | Building the world from content plus accepted entries; `reaches(target, via, when)`; `in force(kind, roles)` | `world-structure.md` §1–3, §7; `rules-overlay.md` §17 |
| `src/overlay/conditions.ts` | Evaluating scopes and triggers to true / false / can't tell, with a trace of what was read | `rules-overlay.md` §17, §5.1, §13 |
| `src/overlay/order.ts` | Order within a step: target point → source layer → category → depth → bag; category order per step | `rules-overlay.md` §8, §12; `resolver.md` §5.2–5.3 |
| `src/overlay/resolve.ts` | The resolver, a pure function; the four tests per rule; the fold; clash notices | `rules-overlay.md` §6–8, §11–13; `resolver.md` §1, §5.2–5.6 |
| `src/overlay/derivation.ts` | Shapes of the derivation and the "why not?" tree | `rules-overlay.md` §13; `resolver.md` §11 |
| `src/import/expression-text.ts` | Reading and writing conditions as text | `rules-overlay.md` §17; build log "text shape" |
| `src/import/text-format.ts` | Reading the YAML text format into items, with problems per line | `text-format-and-csv.md` §1–3; build log "text shape" |
| `src/import/draft.ts` | Text → draft (keys matched and written back, review status, reference checks) → deploy or discard | `text-format-and-csv.md` §1, §3, §8; `infra.md` §1–2 |

## Screens (`src/ui/`, thin)

| Module | Does | Design |
|---|---|---|
| `main.tsx` | Opens storage, registers the service worker, renders | brief §1.1 |
| `app-data.ts` | Every operation the screens need, over the storage seam | brief §3 |
| `App.tsx` | Tabs: World, Import, Log, Data | brief §3 |
| `screens/WorldScreen.tsx` | Units and things | brief §3 |
| `screens/UnitScreen.tsx` | Unit card with a read date; tap a value → derivation; tap a rule → "why not?" tree; withdraw / add again the logged events | `rules-overlay.md` §13 |
| `screens/ImportScreen.tsx` | Paste, open a file, or load a test world → draft review → deploy / discard | `text-format-and-csv.md` §8 |
| `screens/LogScreen.tsx` | Add an event entry; withdraw; the audit view | `infra.md` §2 |
| `screens/DataScreen.tsx` | Export, import and wipe the whole copy; storage status | CLAUDE.md "No server" |
| `components/Trace.tsx` | A condition's trace: true / false / can't tell and its inputs | `rules-overlay.md` §13 |
| `fixtures.ts` | Bundles `test/fixtures/*.yaml` into the app | brief §3 "Fixtures" |

## Tests

| File | Covers |
|---|---|
| `test/cases/e1-handgunners.test.ts` | E1 (required) |
| `test/cases/e2-depth.test.ts` | E2 (required), plus a bag with a clash notice |
| `test/cases/e4-grenzstadt.test.ts` | E4, first part (stretch) |
| `test/cases/round-trip.test.ts` | Export → wipe → import (required), both stores |
| `test/unit/log.test.ts` | Entry shape, withdrawal, `unseal()` |
| `test/unit/store-contract.test.ts` | Both stores behave the same |
| `test/unit/import.test.ts` | Drafts, keys written back, problems per line, condition text |
| `test/unit/seams.test.ts` | Only `log/unseal.ts` reads the seal; only `src/store/` touches IndexedDB |
| `test/unit/schema-emitted.test.ts` | `schema/` matches the zod schemas |
| `test/cases/guide-examples.test.ts` | The "try" examples in `build/yaml-guide.md` |
| `test/fixtures/*.yaml` | The E1, E2 and E4 worlds (also loadable from the app) |

## Guides

- `build/yaml-guide.md`: how to write world text for the import, with examples to try.

## Commands

- `npm test`: all tests.
- `npm run dev`: local dev server.
- `npm run build`: type check, then build to `dist/`.
- `npm run schema`: re-emit `schema/` after changing a zod schema.
- `npm run icons`: redraw the app icons.
