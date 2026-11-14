# Structure guide

Each module, what it does, and the design doc and section it implements. Every source file also names its doc in its top comment. "Brief" means the current slice brief (`build/slice-1-brief.md`) unless it says slice 0.

## Core (no I/O except `src/store/`)

| Module | Does | Design |
|---|---|---|
| `src/schema/log-entry.ts` | The log entry in its full shape: envelope (ID, recorded time, device, host sequence number) and seal (identity, status, order, content, visibility) | `infra.md` §8, §5.1 |
| `src/schema/log-values.ts` | What each entry kind holds: event, withdrawal, package switch, category order, pin | `infra.md` §8; `rules-overlay.md` §12; brief §1.2 |
| `src/schema/expression.ts` | Conditions: `reaches`, `in_force`, named scope, `all` / `any` / `not` | `rules-overlay.md` §17, §6 |
| `src/schema/content.ts` | Content items, each in a space (the library or a sandbox): things, dated links, events, units, rules, named scopes, packages, and the containers (manifest: statline, bag order, core; sandbox: its category order; manifest context: books, FAQs, house rules, campaign) | `world-structure.md` §1–3, §7, §12; `rules-overlay.md` §6–8, §12; `manifest.md` §1–2, §9; `items-packages-and-library.md` §4; brief §2.1 |
| `src/schema/draft-and-copy.ts` | Draft batches (with their target: library or a sandbox), per-line problems, the whole copy (version 3, and versions 1–2 for migration) | `infra.md` §1–2; `text-format-and-csv.md` §8 |
| `src/schema/emit.ts`, `scripts/emit-schema.ts` | Writes JSON Schema to `schema/` | CLAUDE.md "Schema defined once" |
| `src/store/store.ts` | The storage seam: one append-only log per sandbox, content by (space, key), drafts, meta, whole copy; `contentForSandbox` | `infra.md` §1–2; brief §2.1 |
| `src/store/memory-store.ts` | The seam in memory, for tests | — |
| `src/store/indexeddb-store.ts` | The seam in IndexedDB (version 3, bringing versions 1 and 2 forward in place); asking for persistent storage | — |
| `src/store/migrate.ts` | Slice 0's and Part A's data into the current containers; the default WFB 6th manifest and category order | brief §2.1; build log, owner decisions of 14 Nov |
| `src/log/unseal.ts` | `unseal()`: the one read path into an entry (no grant check yet) | `infra.md` §5, §5.1 |
| `src/log/log.ts` | Making entries, appending events, withdrawal, GM fixes (package switch, category order, pin), the audit view, accepted entries | `infra.md` §1–2, §6, §8; `rules-overlay.md` §12 |
| `src/world/world.ts` | Building the world from content plus accepted entries; `reaches(target, via, when)`; `in force(kind, roles)` | `world-structure.md` §1–3, §7; `rules-overlay.md` §17 |
| `src/world/tree.ts` | A thing's tree at a date: what it reaches, what reaches it, rules naming it | `rules-overlay.md` §13; brief §2.3 |
| `src/overlay/context.ts` | A manifest context as the resolver reads it: the core (locked), then books, FAQs, house rules, campaign, on / off; the category order (context, else sandbox, else built-in, then GM fixes); bag order; pins; warnings (requires, conflicts, edition, group) | brief §1.2, §2.1; `rules-overlay.md` §12; `items-packages-and-library.md` §4, §10 |
| `src/overlay/conditions.ts` | Evaluating scopes and triggers to true / false / can't tell, with a trace of what was read | `rules-overlay.md` §17, §5.1, §13 |
| `src/overlay/order.ts` | Order within a step: target point → source layer → category → depth → bag, then pins; orders come from the context | `rules-overlay.md` §8, §12; `resolver.md` §5.2–5.3 |
| `src/overlay/resolve.ts` | The resolver, a pure function: rules in play by context, the tests per rule, the fold, clash notices, derivation text | `rules-overlay.md` §6–8, §11–13; `resolver.md` §1, §5.2–5.6; brief §1.1–1.2 |
| `src/overlay/derivation.ts` | Shapes of the derivation and the "why not?" tree | `rules-overlay.md` §13; `resolver.md` §11 |
| `src/overlay/landing.ts` | The units a rule lands on at a date (never the ones it doesn't); a unit filter for "why not?" | `rules-overlay.md` §9, §13; brief §2.3 |
| `src/import/expression-text.ts` | Reading and writing conditions as text, including quoted labels | `rules-overlay.md` §17; `build/yaml-guide.md` §6 |
| `src/import/text-values.ts` | Single YAML values: scalars, lists, (label, key) headers, number edits | `text-format-and-csv.md` §2–3 |
| `src/import/text-format.ts` | Reading a manifest, package or sandbox file into items, with problems per line and every reference noted | `text-format-and-csv.md` §1–3; brief §2.1, §2.3 |
| `src/import/export-text.ts` | Writing any item, package or sandbox back out as text that re-imports unchanged | `text-format-and-csv.md` §1, §6 |
| `src/import/read-back.ts` | Plain-English read-backs of edits, conditions and rules | `text-format-and-csv.md` §4; `rules-overlay.md` §17 |
| `src/import/draft.ts` | Text → draft (keys matched and written back, labels matched to keys, checked against drafts waiting, moves warned, review status) → refreshed and deployed to the library or a sandbox, or discarded | `text-format-and-csv.md` §1, §3, §6, §8; `infra.md` §1–2; brief §2.1, §2.3 |

## Screens (`src/ui/`, thin)

| Module | Does | Design |
|---|---|---|
| `main.tsx` | Opens storage, registers the service worker, renders | slice 0 brief §1.1 |
| `app-data.ts` | Every operation the screens need, over the storage seam; the open sandbox | brief §2.1 |
| `App.tsx` | Tabs: World, Sandbox, Library, Import, Log, Data; the sandbox switch; a back stack of opened items; Edit as text hands text to Import | brief §1.4, §2.1 |
| `item-ref.ts` | Points at an item by space and key | brief §2.1 |
| `tokens.css`, `styles.css` | Design tokens (every colour, type size, spacing, radius); layout built only from them | brief §1.6 |
| `screens/WorldScreen.tsx` | The open sandbox: units, rules in play, named scopes in play, world-history events and events in the log, things grouped by kind | `world-structure.md` §2–3; brief §2.3 |
| `screens/SandboxScreen.tsx` | The open sandbox's setup: its category order; each context's core, books, FAQs, house rules and campaign (switch on / off), category order (change / back to default), pins (remove); local packages | brief §1.2, §2.1; `rules-overlay.md` §12; owner decisions of 14 Nov |
| `screens/LibraryScreen.tsx` | What's shared: games (manifests) with their core; packages grouped by layer | `manifest.md` §1, §9; `items-packages-and-library.md` §4–5 |
| `screens/ItemScreen.tsx` | Any item in words plus its text; a thing's tree at a date and its own links; a rule's units at a date and the "why not?" finder | `rules-overlay.md` §9, §13; brief §2.3 |
| `screens/UnitScreen.tsx` | Unit card with a read date; derivation with pin / swap; "why not?" tree per rule; logged events to withdraw or add again | `rules-overlay.md` §12–13; brief §1.1–1.2 |
| `screens/ImportScreen.tsx` | Paste, open a file, edit an item's text, or load a test world (as drafts, not twice) → review with the text → deploy one, or deploy all in order | `text-format-and-csv.md` §8; brief §7 |
| `screens/LogScreen.tsx` | The open sandbox's log: add an event entry (with field help, kinds, roles and things to pick); correct or withdraw one; the audit view, with GM fixes in words | `infra.md` §2 |
| `screens/DataScreen.tsx` | Export, import (slice 0 copies migrated) and wipe the whole copy; storage status | CLAUDE.md "No server yet" |
| `save-file.ts` | Hands the viewer a file: the share sheet on iPhone, else a download | CLAUDE.md "No server yet" |
| `components/ItemText.tsx` | "View text" (a toggle) on any item: copy, export it, export its package or sandbox; "Edit as text" | `text-format-and-csv.md` §6; brief §1.4 |
| `components/ReadDate.tsx` | The read-date control | `rules-overlay.md` §7 |
| `components/Trace.tsx` | A condition's trace: true / false / can't tell and its inputs | `rules-overlay.md` §13 |
| `fixtures.ts` | Bundles the test worlds (`test/fixtures/sets.json` and its files) into the app | brief §7 |

## Tests

| File | Covers |
|---|---|
| `test/cases/e1-handgunners.test.ts` | E1 |
| `test/cases/e2-depth.test.ts` | E2, plus a bag with a clash notice |
| `test/cases/e4-grenzstadt.test.ts` | E4, first part |
| `test/cases/c1-package-switch.test.ts` | C1: a package switched off in a context |
| `test/cases/c2-category-order.test.ts` | C2: category order from the context; pins |
| `test/cases/round-trip.test.ts` | Export → wipe → import, both stores, with sandboxes and GM fixes |
| `test/cases/guide-examples.test.ts` | The "try" examples in `build/yaml-guide.md` |
| `test/unit/log.test.ts` | Entry shape, withdrawal, `unseal()` |
| `test/unit/store-contract.test.ts` | Both stores behave the same (logs per sandbox, content by space) |
| `test/unit/migrate.test.ts` | Slice 0 and Part A data and copies brought forward; IndexedDB upgraded in place from versions 1 and 2 |
| `test/unit/tidy-up.test.ts` | The owner's container model (core, groups, category order from context / sandbox / built-in, local packages, warnings) and the import fixes |
| `test/unit/import.test.ts` | Package and sandbox files, drafts, keys written back, problems per line, references by label |
| `test/unit/export-text.test.ts` | Every item, package and sandbox re-imports unchanged and rebuilds the same content; read-backs |
| `test/unit/tree-and-landing.test.ts` | A thing's tree; the units a rule lands on; the unit filter |
| `test/unit/seams.test.ts` | Only `log/unseal.ts` reads the seal; only `src/store/` touches IndexedDB |
| `test/unit/schema-emitted.test.ts` | `schema/` matches the zod schemas |
| `test/fixtures/` | The test worlds, split by container: `wfb6` (the game), `wfb6-base` (its core), `e*-rules` and `e1-campaign-rules` (library packages), `e*-world` (sandboxes), `e1-log`; `sets.json` lists each world's files in order |

## Guides

- `build/yaml-guide.md`: how to write manifest, package and sandbox files, with examples to try.
- `build/army-data-request.md`: what army data Part B needs, and how to send it.

## Commands

- `npm test`: all tests.
- `npm run dev`: local dev server.
- `npm run build`: type check, then build to `dist/`.
- `npm run schema`: re-emit `schema/` after changing a zod schema.
- `npm run icons`: redraw the app icons.
