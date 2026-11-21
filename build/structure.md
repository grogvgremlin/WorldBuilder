# Structure guide

Each module, what it does, and the design doc and section it implements. Every source file also names its doc in its top comment. "Brief" means the current slice brief (`build/slice-1-brief.md`) unless it says slice 0.

## Core (no I/O except `src/store/`)

| Module | Does | Design |
|---|---|---|
| `src/schema/log-entry.ts` | The log entry in its full shape: envelope (ID, recorded time, device, host sequence number) and seal (identity, status, order, content, visibility) | `infra.md` §8, §5.1 |
| `src/schema/log-values.ts` | What each entry kind holds: event, withdrawal, package switch, category order, pin | `infra.md` §8; `rules-overlay.md` §12; brief §1.2 |
| `src/schema/expression.ts` | Conditions: `reaches`, `in_force`, named scope, hook, `all` / `any` / `not` | `rules-overlay.md` §17, §6, §5 |
| `src/schema/content.ts` | Content items, each in a space (the library or a sandbox): things, dated links, events, units, rules, named scopes, packages, and the containers (manifest: statline, bag order, core; sandbox: its category order; manifest context: books, FAQs, house rules, campaign) | `world-structure.md` §1–3, §7, §12; `rules-overlay.md` §6–8, §12; `manifest.md` §1–2, §9; `items-packages-and-library.md` §4; brief §2.1 |
| `src/schema/draft-and-copy.ts` | Draft batches (with their target: library or a sandbox), per-line problems, the whole copy (version 3, and versions 1–2 for migration) | `infra.md` §1–2; `text-format-and-csv.md` §8 |
| `src/schema/emit.ts`, `scripts/emit-schema.ts` | Writes JSON Schema to `schema/` | CLAUDE.md "Schema defined once" |
| `src/store/store.ts` | The storage seam: one append-only log per sandbox, content by (space, key), drafts, meta, whole copy; `contentForSandbox` | `infra.md` §1–2; brief §2.1 |
| `src/store/memory-store.ts` | The seam in memory, for tests | — |
| `src/store/indexeddb-store.ts` | The seam in IndexedDB (version 3, bringing versions 1 and 2 forward in place); asking for persistent storage | — |
| `src/store/migrate.ts` | Slice 0's and Part A's data into the current containers; the default WFB 6th manifest and category order | brief §2.1; build log, owner decisions of 14 Nov |
| `src/log/unseal.ts` | `unseal()`: the one read path into an entry (no grant check yet) | `infra.md` §5, §5.1 |
| `src/log/log.ts` | Making entries, appending events, withdrawal, GM fixes (package switch, category order, pin), the audit view, accepted entries | `infra.md` §1–2, §6, §8; `rules-overlay.md` §12 |
| `src/world/world.ts` | Building the world from content plus accepted entries (hooks included, and hooks made from inline triggers); `reaches(target, via, when)`; `in force(kind, roles)` | `world-structure.md` §1–3, §7; `rules-overlay.md` §17 |
| `src/world/tree.ts` | A thing's network at a date: its links out and in, what it reaches and what reaches it (each with its route as a condition writes it), rules naming it | `rules-overlay.md` §13; brief §2.3 |
| `src/overlay/context.ts` | A manifest context as the resolver reads it: the core (locked), then books, FAQs, house rules, campaign, on / off; the category order (context, else sandbox, else built-in, then GM fixes); bag order; pins; warnings (requires, conflicts, edition, group, link kinds no link in this world uses); packages switched on bring what they require ("needed by …"); `requiresClosure` | build-log Part B decisions 21–23; brief §1.2, §2.1; `rules-overlay.md` §12; `items-packages-and-library.md` §4, §10 |
| `src/overlay/conditions.ts` | Evaluating scopes and triggers to true / false / can't tell, with a trace of what was read | `rules-overlay.md` §17, §5.1, §13 |
| `src/overlay/order.ts` | Order within a step: target point → source layer → category → depth → bag, then pins; orders come from the context | `rules-overlay.md` §8, §12; `resolver.md` §5.2–5.3 |
| `src/overlay/resolve.ts` | The resolver, a pure function: rules in play by context, the tests per rule, the fold, clash notices, derivation text | `rules-overlay.md` §6–8, §11–13; `resolver.md` §1, §5.2–5.6; brief §1.1–1.2 |
| `src/overlay/derivation.ts` | Shapes of the derivation and the "why not?" tree | `rules-overlay.md` §13; `resolver.md` §11 |
| `src/overlay/hooks.ts` | Each hook's state at a date (or "depends on the unit"), what it read, and the rules on it | `rules-overlay.md` §5, §5.1; owner decisions of 15 Nov |
| `src/overlay/landing.ts` | The units a rule lands on at a date (never the ones it doesn't); a unit filter for "why not?" | `rules-overlay.md` §9, §13; brief §2.3 |
| `src/import/expression-text.ts` | Reading and writing conditions as text, including quoted labels | `rules-overlay.md` §17; `build/yaml-guide.md` §6 |
| `src/import/text-values.ts` | Single YAML values: scalars, lists, (label, key) headers, number edits | `text-format-and-csv.md` §2–3 |
| `src/import/text-format.ts` | Reading a manifest, package or sandbox file into items, with problems per line and every reference noted | `text-format-and-csv.md` §1–3; brief §2.1, §2.3 |
| `src/import/export-text.ts` | Writing any item, package or sandbox back out as text that re-imports unchanged | `text-format-and-csv.md` §1, §6 |
| `src/import/vocabulary.ts` | The words a condition can use in a world (things, link kinds with an example, kinds, event types and their parts, hooks, named scopes); warnings for link kinds and kinds nothing uses; "names world things" for book and FAQ rules | `rules-overlay.md` §17, §5; owner points of 15 Nov |
| `src/import/read-back.ts` | Plain-English read-backs of edits, conditions and rules | `text-format-and-csv.md` §4; `rules-overlay.md` §17 |
| `src/import/draft.ts` | Text → draft (keys matched and written back, labels matched to keys, checked against drafts waiting, moves warned, review status) → refreshed and deployed to the library or a sandbox, or discarded | `text-format-and-csv.md` §1, §3, §6, §8; `infra.md` §1–2; brief §2.1, §2.3 |

## Army lists and rosters (`src/army/`, Part B; pure except `register.ts`)

| Module | Does | Design |
|---|---|---|
| `src/schema/army.ts` | Army content stored **as entered** (every cell by its column): race cells, equipment, common links, special rule texts, cards (Unit = the card, its rows), army lists (composition rows); rosters (choices only; practice or registered) | `army-lists.md` §1–3; `races-and-units.md` §2, §4–6; `rosters.md` §1–3; build-log Part B decisions 5, 12 |
| `src/army/cells.ts` | One cell: splitting at the top level, stats (`4`, `+1`, `-`, `(+1)`), costs (`21~pi`, `+6`), sizes (`10-`, `0-1`, `>=10`, `1 per (X)`), names | `text-format-and-csv.md` §2; owner's Schemae and Glossary |
| `src/army/options.ts` | The expression cells: Equipment / Rules Options (`[A OR B;Mandatory]`, `add`, `replace~X`, budgets, `[ ]` grants, `+X`, `None`, `-X`), Slots, Unit Limit | `options-items-and-rules.md` §1; `army-lists.md` §3; build-log Part B decisions 13–16 |
| `src/army/sheets.ts`, `src/army/xlsx.ts` | Reading CSV, a workbook, YAML or JSON into rows; recognising a sheet by its headers (matched like labels); writing CSV; the YAML form of cards | `text-format-and-csv.md` §7; build-log Part B decisions 5–6 |
| `src/army/library.ts` | The army content in reach, by name; matching a name (exact, alias, trailing-"s" plural); finding a race cell (blank Tree = Core, blank Rank = Base); noting the package of every item looked up (what a card drew on); a stub never replaces a real rule | `text-format-and-csv.md` §3; build-log Part B decisions 3, 8–9 |
| `src/army/card.ts` | A card worked out: Link Key inheritance; each row's line from race cell + equipment effects + as printed (stored delta); slot rows from the unit line; mounts; options, slots, limits; stubs; "cavalry requires a mount" | `races-and-units.md` §1–2, §4–6; build-log Part B decisions 3–4, 12–13, 16–18 |
| `src/army/fit.ts` | Fit on import: the race cell closest to a printed line | `races-and-units.md` §2; build-log Part B decision 10 |
| `src/army/import-sheets.ts` | Sheets → a draft (cards, lists, races, kit, links, rule texts), checked across the whole upload and what's deployed; rebuilt from the sheets kept as CSV; packages per row (Package column), what each requires (worked out, plus a Requires column), stub rules, merging into a package already in the library | `text-format-and-csv.md` §1, §3, §7–8 |
| `src/army/read-back.ts` | A card read back like the book (stats with champion and mount rows, facts, options in the book's words, special rules), then its derivation, then warnings | build-log Part B decision 7; `rules-overlay.md` §13 |
| `src/army/roster.ts` | A roster worked out: points per unit with a breakdown, totals by category against the list's limits, issues (composition, per-1,000 limits, sizes, compulsory picks, the General) with the units each concerns; the army content a roster reads (its list's package and what that requires); what a points value offers ("Show options for"); units by section | `rosters.md` §1–3, §5; `army-lists.md` §3; `validation-and-fixes.md` §1–2 |
| `src/army/registered.ts` | A unit registered from a roster: its base line from the army list, with how it was made | brief §3.1, §3.3 L2 |
| `src/army/register.ts` | Saving a practice roster (outside every sandbox) or registering one in a sandbox (world units with links from the raising date). Writes content only, never the log | brief §1.3, §3.1; `world-structure.md` §12 |
| `src/army/roster-text.ts` | A roster as YAML and back; an army package back out as its sheets (CSV) or their YAML form | brief §3.1; `text-format-and-csv.md` §6 |

## Screens (`src/ui/`, thin)

| Module | Does | Design |
|---|---|---|
| `main.tsx` | Opens storage, registers the service worker, renders | slice 0 brief §1.1 |
| `app-data.ts` | Every operation the screens need, over the storage seam; the open sandbox | brief §2.1 |
| `App.tsx` | Tabs: World, Rosters, Sandbox, Library, Import, Log, Data; the sandbox switch; a back stack of opened items; Edit as text hands text to Import | brief §1.4, §2.1 |
| `item-ref.ts` | Points at an item by space and key | brief §2.1 |
| `tokens.css`, `styles.css` | Design tokens (every colour, type size, spacing, radius); layout built only from them | brief §1.6 |
| `screens/WorldScreen.tsx` | The open sandbox: units, rules in play, named scopes in play, **events** (world history and recorded ones; record, correct, withdraw), **hooks** (state at a read date, what they read, rules on them; make an auto hook a world hook), every link grouped by kind, things grouped by kind; rules in play with their text folded under each | `world-structure.md` §2–3, §7; `rules-overlay.md` §5; brief §2.3; owner decisions of 15 Nov |
| `screens/SandboxScreen.tsx` | The open sandbox's setup: its category order; each context's core, books, FAQs, house rules and campaign (switch on / off), category order (change / back to default), pins (remove); local packages | brief §1.2, §2.1; `rules-overlay.md` §12; owner decisions of 14 Nov |
| `screens/LibraryScreen.tsx` | What's shared: games (manifests) with their core; packages grouped by layer | `manifest.md` §1, §9; `items-packages-and-library.md` §4–5 |
| `screens/ItemScreen.tsx` | Any item in words plus its text; a thing's network at a date and its own links; a hook in plain words; a package's rules with their text; a rule's units at a date and the "why not?" finder | `rules-overlay.md` §9, §13; brief §2.3 |
| `screens/UnitScreen.tsx` | Unit card with a read date; its network; derivation with pin / swap; "why not?" tree per rule; logged events to withdraw or add again | `rules-overlay.md` §12–13; brief §1.1–1.2 |
| `screens/ImportScreen.tsx` | Paste, open a file, edit an item's text, or load a test world (as drafts, not twice) → review with the text → deploy one, or deploy all in order; "What can I write?" | `text-format-and-csv.md` §8; brief §7 |
| `screens/RostersScreen.tsx` | The roster builder (phone-first): new roster from an army list; units by section, each with its Add and its total ("Characters 45/250 (up to 50%)", green or red); roster issues in the summary, unit issues marked on the unit; fold-out costs; size, command and options, the General; "Show options for"; a Saved note; each unit's card; the roster as text; register in the open sandbox | brief §1.3, §1.6, §3.1; `rosters.md` §1–3 |
| `screens/ArmySheets.tsx` | Army sheets on Import (files, game, package; the fixture army) and their review: every card read back to sign off before deploy | `text-format-and-csv.md` §7–8; build-log Part B decision 7 |
| `components/ArmyCardView.tsx` | A card like the book's entry, the derivation folded, warnings | build-log Part B decision 7 |
| `screens/LogScreen.tsx` | The open sandbox's record only: every entry in order, in words, filterable; withdraw | `infra.md` §1–2, §8; owner decisions of 15 Nov |
| `screens/DataScreen.tsx` | Export, import (slice 0 copies migrated) and wipe the whole copy; storage status | CLAUDE.md "No server yet" |
| `save-file.ts` | Hands the viewer a file: the share sheet on iPhone, else a download | CLAUDE.md "No server yet" |
| `components/ItemText.tsx` | "View text" (a toggle) on any item: copy, export it, export its package or sandbox; "Edit as text" | `text-format-and-csv.md` §6; brief §1.4 |
| `components/EventForm.tsx` | Record or correct an event: name, when, things involved with their part, optional type | `world-structure.md` §7; owner decisions of 15 Nov |
| `components/Network.tsx` | A thing's or unit's network at a read date: Connected (links out and in), what it reaches, reached from (each with its copyable route), rules that name it | `rules-overlay.md` §13; owner points of 15 Nov |
| `components/RuleText.tsx` | A rule folded under its name: its read-back and text | `text-format-and-csv.md` §6 |
| `components/WritingHelp.tsx` | "What can I write?" on Import: the fixed words and this world's, tap to copy | `rules-overlay.md` §17; owner points of 15 Nov |
| `components/ReadDate.tsx` | The read-date control | `rules-overlay.md` §7 |
| `components/Trace.tsx` | A condition's trace: true / false / can't tell and its inputs | `rules-overlay.md` §13 |
| `fixtures.ts` | Bundles the test worlds (`test/fixtures/sets.json` and its files) into the app, and the fixture army as sheets (TOW races, TOW rules, the Empire), each naming what it needs loaded first | brief §7 |

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
| `test/unit/hooks.test.ts` | Hooks as world items; triggers on hooks; inline triggers making hooks; missing hooks; hooks only in sandbox files; triggers by label |
| `test/cases/l1-practice-roster.test.ts` | L1 (as built for TOW): a practice roster; points per unit and category; one limit broken; Ld 7; nothing logged |
| `test/cases/l2-registered-roster.test.ts` | L2: the same units registered in E1's sandbox (TOW context); Ld 7 / 8; the army-list base first, then the world steps |
| `test/cases/l3-racial-deltas.test.ts` | L3 (a), (b) and stored deltas; (c), (d) to do (wait for the Orcs & Goblins pages) |
| `test/cases/army-round-trip.test.ts` | Round trip with army lists and rosters, both stores |
| `test/unit/army-import.test.ts` | Cells and expressions; CSV, workbook and YAML give the same content; the read-back; fit on import |
| `test/unit/army-text.test.ts` | A roster as text; an army package as CSV and YAML, re-imported unchanged |
| `test/private/empire.test.ts` | The whole TOW Empire from the private data repo (skipped where it isn't checked out) |
| `test/unit/tidy-up.test.ts` | The owner's container model (core, groups, category order from context / sandbox / built-in, local packages, warnings) and the import fixes |
| `test/unit/import.test.ts` | Package and sandbox files, drafts, keys written back, problems per line, references by label |
| `test/unit/export-text.test.ts` | Every item, package and sandbox re-imports unchanged and rebuilds the same content; read-backs |
| `test/unit/tree-and-landing.test.ts` | A thing's network (connections, routes both ways); the units a rule lands on; the unit filter |
| `test/unit/vocabulary.test.ts` | "What can I write?"; hooks in plain words; warnings for unused link kinds and kinds (import and per context); book rules naming world things |
| `test/unit/seams.test.ts` | Only `log/unseal.ts` reads the seal; only `src/store/` touches IndexedDB |
| `test/unit/schema-emitted.test.ts` | `schema/` matches the zod schemas |
| `test/fixtures/` | The test worlds, split by container: `wfb6` (the game), `wfb6-base` (its core), `e*-rules` and `e1-campaign-rules` (library packages, all campaign), `e*-world` (sandboxes), `e1-log`; `sets.json` lists each world's files in order |

## Guides

- `build/yaml-guide.md`: how to write manifest, package and sandbox files, with examples to try.
- `build/army-data-request.md`: what army data Part B needs, and how to send it.

## Commands

- `npm test`: all tests.
- `npm run dev`: local dev server.
- `npm run build`: type check, then build to `dist/`.
- `npm run schema`: re-emit `schema/` after changing a zod schema.
- `npm run icons`: redraw the app icons.
