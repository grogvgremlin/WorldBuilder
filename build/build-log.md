# Build log

Running record of the build: technical choices (with one line of why), the text shape proposed for world items, and questions for design.

---

## Slice 1 status (14 Nov 2026)

Built in parts, in the brief's order (§0). **Part A is done, with a tidy-up, hook objects (15 Nov) and the readability work (15 Nov) after the owner's checks.** Part B: army data and input format settled with the owner 15–21 Nov (section below); building from 21 Nov.

| Part | State |
|---|---|
| **A** Containers; GM fixes; display feedback | ✓ E1, E2, E4 pass with fixtures split by container (manifest, core, rules, world, log). **C1** ✓ (`test/cases/c1-package-switch.test.ts`), **C2** ✓ (`test/cases/c2-category-order.test.ts`). Round trip ✓ with sandboxes, contexts and GM fixes. |
| **B** Army list and roster builder | ✓ **L1**, **L2**, **L3 (a, b)** (`test/cases/l1-…`, `l2-…`, `l3-…`); L3 (c, d) wait for the O&G pages. Round trip ✓ with rosters. The owner's sheets import (CSV / `.xlsx` / YAML / JSON) with a read-back to sign off; Rosters tab. **Not yet:** FAQs tied to what they correct (owner decision 5 of 14 Nov), carried to the next part. |
| **C–E** Logins, submissions, battle | Not started; design docs for them not yet copied (brief §8) |

### Slice 1, Part B: owner decisions and the army-list input format (15–21 Nov 2026)

Worked out with the owner before building, from photos of *Warhammer: the Old World — Forces of Fantasy*. **The book data is private**: the transcription, the full Empire sheet, and the working notes behind everything below are in the private repo `grogvgremlin/worldbuilder-data` (branch `claude/tow-empire-transcription`), under `transcribed/tow/` and `working/tow/`. This repo holds only the few fixture units (owner, 15 Nov: a handful of units is fine to publish). **To carry back to the design project.**

#### Owner decisions
1. **The fixture army is TOW Empire**, not WFB 6th (the books to hand). WFB 6th becomes a second test case later; when is open. Orcs & Goblins (TOW *Ravening Hordes*) waits for its pages, and **L3(c) waits with it**.
2. **Races belong to the game**, not to an army list ("a human is a human whether Empire or elsewhere"). The Empire is just where the human numbers come from for now.
3. **Races, trees and ranks are common themes across profiles**, not the book's champion rows. A race's grid is **Tree × Rank** (e.g. Human · Professional · Veteran), each cell a full line, or a delta to another cell. Blank Tree reads Core; blank Rank reads Base. (The design's dependent-axis grid, `races-and-units.md` §2.)
4. **A command slot may set a rank, a career (tree), or both, different from its unit's.** A career different from the unit's **warns, never blocks**.
5. **The import format is the owner's spreadsheet** (`Input_Eg.xlsx`): sheets Army Entry, Equipment, Core Common Links, Races, plus a Rules sheet; Schemae and Glossary describe it. It supersedes `army-data-request.md` §2–3 and the YAML army-list sketches. Several input forms for the same data are accepted on purpose.
6. **Import forms:**
   - **bulk:** a set of CSVs, an `.xlsx` workbook (Google Sheets exported to `.xlsx` or CSV; a direct Google link is later), or the same content as **YAML or JSON**, with the same fields as the CSV columns;
   - **single unit, or a correction:** a YAML or CSV window. A unit card form for simple changes is **later** (the brief has no editors in slice 1).
7. **Review and sign-off:** the import turns each entry into a plain-text read-back that reads like the book entry (stats table including the champion and mount rows, troop type, base, size, equipment, options in the book's words, special rules). Then a separate **derivation** section (race cell, deltas, equipment effects, what each name matched). Then **warnings**. The uploader signs it off.
8. **Unmatched names become stubs, flagged incomplete** (AGREED, tentative), so a later army book naming an unentered rule still imports. A written **key** that matches nothing is a warning and makes nothing (`text-format-and-csv.md` §3). **Keys are never typed in an upload**: names are matched within the kind the column expects; keys appear in exports.
9. **Plural auto-alias:** a name with a trailing "s" matches the name without it (Halberds → Halberd). Only a plain "s". Other names: the item's **Alias** column (Hand Weapon ← Sword, Axe) and **Match Key** ("counts as": Iron Shod Hooves → Hand Weapon).
10. **Fit on import** stays in Part B: when race, tree or rank is left blank, suggest the best-fitting cell and the delta it would store. Re-checking units after a race's grid changes, and suggesting new cells from recurring deltas, are a **later slice**.
11. **"-" means "no such stat"**, not 0. **Delta or full line** may be entered; the resolved line is checked against the page in the review. Numbers accept the book's forms (10+, 0-1, 2-12) and relational ones (>, >=, <, <=).
12. **Unit is the card** (the book entry / army entry; what other rows point at). **Name is a row within it** (the printed statline line: Empire Knight, Preceptor, Barded Warhorse). Links are written `X~Unit`. One card per army entry: State Troops and Veteran State Troops are two cards.
13. **Inheritance (Link Key):** a card linked to another inherits it. An option written **with `+`** adds to the inherited ones; **the same name without `+`** replaces the inherited one; **`None`** removes all; **`-X`** removes one.
14. **The options cell stays a one-cell expression** (`[A(add;+1~pi) OR B(add;+1~pi) OR C(replace~Shield;0~pi);Mandatory]`), read back in plain text for sign-off.
15. **Limits:** a header (`rules options`) limits the set as a whole within the entry; a sub-item (`Drilled`) limits that one; `,` joins limits into one shared allowance, `;` makes separate allowances. **Cross-entry limits are army-level composition rows** ("0-1 General or Grand Master per 1,000"); unique ones may sit on the unit. **Where an army rule and a unit's own clash, the army rule wins.** "per 1,000" is per 1,000 of the **roster target**. State Missile Troops' "0-1 unit per 1,000 points may: Drilled; a magic standard" is read as **two** allowances (the page is ambiguous: a candidate to test an FAQ patch).
16. **Crew and steeds via Slots:** `Crew(3;crew;0)` (existing slot syntax: count; type; cost); the crew row is one crewman (e.g. Human · Core · Base). The rulebook's crew and war machine rules adjust the card (TOW prints the gun crew as one line, W 3 A 3). Without those rules the card shows the line with a count of 3. The War Altar's horses: `Steed(2;steed;0)`.
17. **Barding is equipment on the horse** (M −1, Save +1, Only(Mount)): one horse race, not two horse profiles. **The mount rules pass a mount's save to its rider**, not the barding item.
18. **Mounts don't carry cavalry traits.** Horses have no Counter Charge, First Charge, Swiftstride or Fast Cavalry, and aren't heavy or light cavalry: those belong to the mounted unit, and a character's mount option grants them (`Barded Warhorse~Mount(add;+16)[Troop Type(Heavy Cavalry);Counter Charge;First Charge;Swiftstride]`). **A cavalry troop type requires being mounted.** A monster's own rules (Fly, Fear, Terror, Large Target, Stomp Attacks) **stay on the monster**.
19. **The Battle Standard Bearer** is fine as a slot via Core Common Links (`BSB`); a "Role" line type would be the same information.
20. **A magic standard sits on the standard bearer**, replacing the plain standard (`+Magic Standard (replace~Standard;0-50;0-1)`).

#### The cases as built (brief §3.3, reworded for TOW)
- **L1:** a practice roster from the TOW Empire fixture list: **Handgunners ×10 (State Missile Troops with handguns) with a Sergeant and a musician**, plus other units. Points per unit and per category against the list's costs; one limit broken shows as an issue; Ld reads **7**; nothing written to any log. (The brief's "Marksman" is the Empire Archers' champion in this book; the handgun unit's champion is a Sergeant, BS +1.)
- **L2:** the same units registered in E1's sandbox, in a **TOW context** with **TOW copies of E1's campaign rules bound to the same world hooks** (rules belong to a game; owner, 14 Nov). Ld at 2525 = 7 with wages withheld, 8 paid; the derivation shows the army-list base first, then the world steps.
- **L3:** (a) Handgunners read Human · Core · Base, no delta, Ld 7. (b) The Sergeant reads the unit line + the slot's delta (BS +1). (c) waits for the Orcs & Goblins pages. (d) as written.

#### The text shape: army lists (proposal; the owner's format)
Worked example: the whole Empire, in the private repo (`working/tow/input/` and `working/tow/forces-of-fantasy/the-empire/input/`), with its edge cases (`edge-cases.md`) and an import check. Sheets:

| Sheet | One row per | Key columns |
|---|---|---|
| **Army Entry** | a card, or a row within a card (`Type`: Unit, Slots-Upgrade, Mount, Crew, Steed, Composition) | Package, SubPackage, Rule Type, Unit, Type, Link Key, Name, Tier (the army category), M…Ld, Cost, Equipment, Min/Max, Troop Type, Base Size, Slots, Equipment Options, Reference (book;page), Unit Limit, Rules, Rules Options, Status, Race, Rank, Tree, Save |
| **Equipment** | an item (mundane, book, magic) | Equipment, Match Key, M…Ld, Save, Rules, Alias, Rules 2 (text), Type, R, AP, Cost, Reference |
| **Core Common Links** | a shared slot kind | Link Key (C, SB, M, BSB, Crew, Steed), Name, Equipment it carries, Alias |
| **Races** | a Race · Tree · Rank cell | Race, Tree, Rank, M…Ld, Rules, Reference |
| **Rules** | a special rule printed in a book | Rule, Rules (programmatic), Rules 2 (text), Reference |

An Empire Knights card, as CSV rows (empty columns left out):

| Unit | Type | Link Key | Name | Stats | Cost | Other |
|---|---|---|---|---|---|---|
| Empire Knights | Unit | | Empire Knight | – 4 3 3 3 1 3 1 8 | 21~pi | Tier Core; Equipment `Hand Weapon;Heavy Armour;Shield;Barded Warhorse(Ridden)~Mount`; Min/Max `4-`; Troop Type Heavy Cavalry; Slots `C(slots);SB(slots);M(0-1;upgrade;+6)`; Equipment Options `[Great Weapons(add;+1~pi) OR Lances(add;+1~pi) OR Great Weapons(replace~Shield;0~pi);Mandatory]`; Unit Limit `rules options~0-1~1000 roster target`; Rules Options `Drilled(1~pi);Stubborn(2~pi)`; Race Human, Tree Professional, Rank Veteran; Reference `Forces of Fantasy;64` |
| Empire Knights | Slots-Upgrade | C | Preceptor | A +1 | +6 | Min/Max `0-1`; Equipment Options `+Magic Items(;0-25 total)` |
| Empire Knights | Slots-Upgrade | SB | Standard Bearer | | +6 | Equipment Options `+Magic Standard (replace~Standard;0-25 total;0-1)` |

**The same card in YAML** (and JSON: the same structure): one block per card, the rows within it as a list, field names as the CSV columns, cell values written exactly as in the CSV:

```yaml
- unit: Empire Knights
  type: Unit
  name: Empire Knight
  tier: Core
  stats: {M: '-', WS: 4, BS: 3, S: 3, T: 3, W: 1, I: 3, A: 1, Ld: 8}
  cost: 21~pi
  equipment: Hand Weapon;Heavy Armour;Shield;Barded Warhorse(Ridden)~Mount
  min/max: 4-
  troop type: Heavy Cavalry
  slots: C(slots);SB(slots);M(0-1;upgrade;+6)
  equipment options: '[Great Weapons(add;+1~pi) OR Lances(add;+1~pi) OR Great Weapons(replace~Shield;0~pi);Mandatory]'
  unit limit: rules options~0-1~1000 roster target
  rules: Close Order;Counter Charge;First Charge;Swiftstride
  rules options: Drilled(1~pi);Stubborn(2~pi)
  race: Human
  tree: Professional
  rank: Veteran
  reference: Forces of Fantasy;64
  rows:
    - {type: Slots-Upgrade, link key: C, name: Preceptor, stats: {A: +1}, cost: +6, min/max: 0-1, equipment options: '+Magic Items(;0-25 total)'}
    - {type: Slots-Upgrade, link key: SB, name: Standard Bearer, cost: +6, min/max: 0-1, equipment options: '+Magic Standard (replace~Standard;0-25 total;0-1)'}
```

#### Questions for design (Part B)
Built the way described; each is beyond the design docs as they stand.
17. **The options cell** is a small expression language inside one cell (`[ … OR … ;Mandatory]`, `add` / `replace~X`, `~pi`, budgets `0-25 total`, `[ ]` linked rules after an option). The design has option groups and cards as structured fields (`options-items-and-rules.md` §1). Read as a notation for the same thing; problems are reported down to the option within the cell.
18. **Inheritance through Link Key** with `+`, same-name replace, `None`, `-X`. The design's `extends` stores differences on keyed lists; this is the same idea with the owner's override words.
19. **The race grid** (Tree × Rank cells) instead of independent axes with per-node deltas from the parent. Both are in `races-and-units.md` §2 (independent and dependent axes); the owner's form is the grid.
20. **Statuses** (Ridden, Mounted; `MayBe(…)`, `Only(…)`) as conditions and grants. Closest design shapes: system tags, selectors on link type / profile, battlefield conditions.
21. **A mount's bonuses to its rider** (Pegasus W +1; Griffon T +1, W +3; a mount's save) pass through the mount rules. The design has "a profile can apply modifiers to a sibling" (`races-and-units.md` §5).
22. **Crew rules** turn a crew of 3 into the printed card line (W 3, A 3). The design has crew as profiles with a count; the pooling rule is new.
23. **Role vs slot** for the Battle Standard Bearer (the design: the BSB is a role, `races-and-units.md` §6); built as a slot via Core Common Links, as the owner prefers.
24. **Book group names** ("Commanders of the Empire only" on the Dragon Bow) need a way to name a group of entries. Not built yet.

#### For the design project's registers
- **Techniques used:**
  - label matching like headers, scoped to the kind a column expects, with a trailing-"s" plural alias;
  - nearest-label "did you mean" suggestions (edit distance), suggestion only;
  - factoring profiles into a base plus shared steps by recurring differences (fit on import);
  - read everything, resolve across the whole upload, then report.
- **Techniques rejected:** averaging profiles to find a race base (leaves a delta on everything); parsing the book's sentences directly (the user types the shape).
- **Links:** none new.

#### What Part B built (21 Nov)
- **The importer** for the owner's sheets: CSV files, an `.xlsx` workbook, or the same as YAML / JSON. Sheets are recognised by their headers. Everything is read first, names are resolved across the upload and what's deployed, then problems are reported. Unknown names become stubs (listed, flagged incomplete), plurals match, aliases and Match Keys work, and fit on import suggests a race cell.
- **The review:** every card read back like the book entry (stats including champion and mount rows; troop type, base, size, equipment; options in the book's words; special rules), then its derivation, then warnings. **Each card is signed off before deploy.**
- **Cards worked out on read:**
  - Link Key inheritance (`+`, same name, `None`, `-X`);
  - each row's line from its race cell + its equipment's statline effects + as printed, with the stored delta shown;
  - slot rows as the unit's line + the slot's delta;
  - mounts from their own cards;
  - crew and steeds counted through Slots;
  - limits, and "cavalry requires a mount".
- **Rosters:** practice (outside every sandbox, nothing logged) and registered (each unit a world unit with its links from a raising date). Points per unit with a breakdown; totals per category against the list's percentages of the target; issues for composition rows (including cross-entry ones), per-1,000 limits (army rows win over a unit's own), sizes, compulsory groups, the General. A unit registered from a roster reads its **army-list base first**, then the world rules (L2).
- **Text:** a roster as YAML and back; an army package back out as CSV or YAML, re-importing unchanged.
- **Screens:** Import → Army sheets (and the fixture army as two buttons); a **Rosters** tab, phone-first; the unit card shows the army-list base steps.
- **Tests:**
  - L1 ✓, L2 ✓, L3 (a), (b) ✓; L3 (c), (d) to do (the O&G pages);
  - round trip with rosters ✓ (both stores);
  - the importer's own tests;
  - the whole private Empire imports with no errors and no warnings beyond the rulebook stubs (`test/private/`, run only where the data repo is checked out).
- **Not built (brief §3.2, unchanged):** magic item allowances (shown, not picked), mounts' bonuses to riders as numbers, the crew rule's pooling (the crew shows as one crewman ×3), draws, inventory, locks, fixes, the card edit form (later, owner 21 Nov).

#### Technical choices (Part B)
| Choice | Why |
|---|---|
| Army content stored as entered: every cell as typed, by column; parsing, inheritance and lines derived on read | The stored truth stays what the owner typed; an export gives it back exactly; a better reader never needs a migration. |
| `.xlsx` read by a small reader of our own (zip directory + `DecompressionStream("deflate-raw")` + the sheet XML), no library | About 150 lines; avoids the npm `xlsx` package's old, advised-against releases. Formulas read as their saved value. |
| A workbook's sheets are kept in the draft as CSV | The draft can be rebuilt against what's deployed now (like a text draft), whatever the upload's format. |
| Keys: a card is `package.unit` (`the_empire_of_man.state_troops`); other army items carry a kind prefix (`kit.`, `race.`, `link.`, `rule.`) | Keys are unique within a space: a weapon and the card it's named after (Helblaster Volley Gun) mustn't collide. Never typed by the user. |
| A weapon's numbers (Type `weapon`) don't change the bearer's line; other kit's statline cells do (barding M −1) | The owner's sheet uses the S column for a weapon's bonus (great weapon S +1) and the M column for barding's effect on the horse. |
| A race cell written as deltas adds to the same tree's Base cell, else Core · Base | The owner's sample writes Professional · Veteran as "WS +1"; either reading gives the same line there. |
| Stubs are listed and flagged, not made into items | Nothing half-made is stored; when the rulebook is entered, the names simply match. |
| Fit on import: the cells needing the fewest stored deltas, then the smallest; skipped for engines (more than one "-") | War machines and chariots have no race on purpose. |
| An option is picked by its name, or by name + "instead of …" where two share a name | Empire Knights have two "Great Weapons" options (as well as / instead of the shield). |
| A practice roster lives in the space `practice`, which no sandbox reads | Brief §1.3: not registered, nothing logged. |

### Queued for the next build (owner, 15 Nov)

1. **A performance check in the tests.** The synthetic-world benchmark (place tree, guilds, a money chain, units across contexts) becomes part of `npm test`, with generous time budgets, plus `npm run bench` to print the full table. Results are kept per stage, so propagation (mediums) is checked as it's built, not rebuilt later. First measurements: every unit at 500 units / 100 rules takes 0.7 s (after the link index); one unit 16 ms; importing 11,400 things in one file 55 s.
2. **Index the import's checks.** Label matching (`pool`, `assignKeys`), move warnings and container lookups scan all content for every reference, so a large import grows with the square of its size. Look them up by key and label instead.

### Owner points, 15 Nov: campaign rules, and seeing the whole story

1. **Rules that name world things are campaign rules.** E1's rules name Nuln, the Gunnery School and the Wissenland treasury, so they can't be core or book: they "connect to world things and therefore by definition fall into campaign". Built: the E1, E2 and E4 rules packages are `layer: campaign` and listed under the context's `campaign` (values unchanged; E1, E2, E4, C1, C2 still pass). A package of layer book or FAQ (or with no layer, which defaults to book) whose rules name a world thing or hook gets the warning "names world things: … belongs in a campaign package". House rules are left alone (try-1's garrison rule is a house rule that names Nuln). See question 15.
2. **"It's very difficult to test this only being able to see half the story."** Every card now shows its whole network at a read date, both ways: **Connected** (each link out and in, so the Gunnery School shows the Handgunners), **what it reaches** and **reached from**, each branch with its route written as a condition would write it (`serves > paid_by`, tap to copy), and the rules that name it. The unit card has the same. World lists **every link, grouped by kind**.
3. **What can I write?** The Import tab has a panel listing the words of a condition and this world's own words: link kinds (with an example link each), things by key, kinds (`any settlement`), event types with their parts (`withholder`), hooks and named scopes; tap to copy. A stand-in for autocomplete until there are editors.
4. **Warnings for words nothing uses.** A route along a link kind no link uses, or `any <kind>` no thing has, is warned on import for a sandbox's own files, and on the Sandbox tab for library rules switched on in a context ("follows the link kind … which no link in this world uses").
5. **Hooks in plain words**: "Watches: true whenever an event of type “wages withheld”, with Wissenland treasury as the withholder, is in force."
6. **Rule text inline** on package pages and under World → Rules in play (folded under each rule's name), and a unit's or rule's text on screen without the package or sandbox header (Copy, Export and Edit as text keep it, so the text still re-imports into the right place).
7. **Later, with Part B:** the unit card's link back to its source unit in the army list.

### Owner decisions, 15 Nov: events, hooks, rules, and the log screen

**To carry back to the design project** (changes slice 1 brief §4.1's "hook objects as a general mechanism stay out").

1. **An event stands alone.** A **hook** is a world item that watches events (or other world facts). A **rule** triggers on a hook, or has no trigger (always on). Each game binds its own rule to the same hook (`rules-overlay.md` §5; decision 4 of 14 Nov, settled in the design project).
2. **Hook objects are built now**, as world items in a sandbox (`hooks:` in a sandbox file: a label and a `when:` condition). A rule's `trigger:` names a hook by key or label.
3. **The inline trigger is a shorthand that makes its hook automatically, so it is always visible** ("When “Unpaid wages” is on", marked "made from a rule's trigger" under World → Hooks, with **Make it a world hook**). The derivation always shows a hook.
4. **The screen keeps the three apart:** events are recorded on **World** (name, when, things involved with their part, optional type: no rule vocabulary); hooks show on World with their state at a read date and the rules on them; the **Log** tab is the record only (events, GM fixes, corrections, withdrawals), nothing made there.
5. Templates that make a hook from an event and a rule from a hook in one go (`rules-overlay.md` §5.2) stay later.

**Still to build from decision 4 (settled 14 Nov):** a sandbox-local package should hold world content only; a game's campaign rules should be local to a **context** (or in the library). The build still lets a sandbox-local package hold rules (marked "under review" in the guide). Next change.

### Owner decisions, 14 Nov: how the containers fit (supersede parts of brief §1.2 and §2.1)

From the owner's checks of Part A on the phone and desktop. **To carry back to the design project.**

1. **The manifest is the game, and only the game**: its statline, its bag order, and its **core** packages (always applied; can't be switched off as a whole). It's a file of its own with **one key** (`manifest: [label, key]`), not something inside a package.
2. **The category order belongs to the world, not the game.** Origin and stationed only exist when a campaign runs in a world; a pick-up game has neither. It's set on the **sandbox**, and a context can override it for one game. This follows `rules-overlay.md` §12 ("shipped in the default setting package, editable per campaign or context"). Brief §1.2 had it in the manifest's base package; the brief should be corrected.
3. **A context lists its packages in groups**, each in order: **books, FAQs, house rules, campaign**. The manifest brings its core. Each group expects packages of the matching source layer (warned if not).
4. ~~**Campaign packages can be local to a sandbox** (`sandbox: key` under a package's header), or in the library.~~ **Under review (owner, 14 Nov):** rules are specific to a game, so only *non-game* packages (world or setting content) can be local to a sandbox; a game's campaign rules belong to that game (in the library, or local to the context). Design is being updated. Until then the build still lets a sandbox-local package hold rules and be switched on under a context's `campaign`; this will change to match the design.
   **Settled (design project, 14 Nov):** a **world item vs a game rule**. A sandbox-local package holds world content only: things, links, events, world patches, and the **reasons and hook objects** that game rules trigger on. A game's rules (anything with game numbers: books, FAQs, house rules, campaign rules) live in the library or local to a manifest context, and each binds to a world hook. E.g. the Nuln sandbox holds the *wages withheld* event and the hook "treasury not paying"; the 6th context's local campaign package holds "unpaid wages `Ld −1`", bound to that hook. Folded into `design/v2-reconciliation.md` §1; leans on questions 10–14 in the design project's `session-22-notes.md` §3.
5. **FAQs attach to what they correct** (agreed, for Part B): package-level `corrects:` (the design's `requires`), and per entry `amends` and `supersedes` (`patches.md` §6). The source layer stays as the tie-break. Built with army list errata in Part B.

### The tidy-up after Part A (14 Nov)
- **Bugs fixed:**
  - loading a test world made every draft before any was deployed, so the world draft warned about its own packages: drafts are now checked against the other drafts waiting too;
  - tapping a test world twice queued it twice and logged its event twice: identical drafts aren't queued again, and every draft is rebuilt against the current state when it's deployed;
  - events added to the log didn't show on World: they now do, beside world history.
- **Display:**
  - a **Sandbox** tab (the world's category order; each game's core, books, FAQs, house rules and campaign packages with switches; its order and pins; local packages);
  - **Library** only shows what's shared (games with their core; packages grouped by layer);
  - a thing lists its own links, each openable;
  - View text is a toggle;
  - the draft review always shows the text;
  - **Edit as text** opens any item's text on Import, ready to change (a text import, not an editor);
  - the Log tab explains each field, offers the kinds and roles the rules use and things to pick, and has **Correct** (withdraw and add a fixed entry);
  - a warning when an import would move an item out of its package;
  - a warning when a context switches on a package of another edition, or lists it under the wrong group.
- **Migration:** Part A's stored data (IndexedDB version 2) and exported copies (version 2) are brought forward. The category order moves from the manifest to each sandbox using it; the package holding a manifest becomes its core; a context's one list is split by each package's layer. Tested from a real version 2 database.

### What Part A built
- **Containers** (brief §2.1): the **library** and each **sandbox** are content spaces; keys are unique within a space. The **manifest** (stat order, category order per step, bag order) is content in the WFB 6th base package. A **sandbox** holds one world and its own log. A **manifest context** names its manifest and the library packages switched on in it, in order. A unit reads in its context (its own `context:`, or the sandbox's first).
- **A rule is in play only if its package is on in the unit's context** (C1). A rule from a package listed but switched off shows as "not in play: package off in this context", with who switched it and when. Rules from packages not in the context aren't shown.
- **GM fixes are dated log entries in the sandbox's log**, withdrawable (brief §1.2): `package_switch`, `category_order` (macro, per context and step) and `pin` (micro, one pair on one value, for one unit or every unit). The derivation shows them: "order organisation → place → title, set for this context by owner, 2026-11-12"; "pinned: Nuln civic pride before Gunnery School (owner, 2026-11-12)".
- **Q2, Q3, Q5** as answered: the ordering detail is in the derivation text with what reversing would give; the category order has three ranks; the bag order comes from the manifest.
- **Display feedback** (brief §2.3): things grouped by kind; a thing's tree at a read date (what it reaches, what reaches it, the rules naming it); a rule's page lists only the units it applies to, with a filter (name, link, target, "or anywhere inside it") to ask "why not?" about others; the kind a scope read shows in the derivation ("Nuln (settlement · polity), read as place"); references by label on import.
- **Screens**: a sandbox switch; a **Library** tab (packages, manifests, and each context's packages with Switch on / off, category order with Change / Back to default, pins with Remove); the unit card offers **Pin this order** and **Swap** on any adjacent pair whose order changes the value. Design tokens are in `src/ui/tokens.css`; no styles inline in screens (brief §1.6).
- **Migration**: slice 0's stored data (IndexedDB version 1) and exported copies are brought forward on open / import: the world into a sandbox "slice0", rules into the library, a WFB 6th manifest added, one context with every old package switched on. Old drafts are dropped.

### Technical choices (slice 1)
| Choice | Why |
|---|---|
| Content keyed by (space, key); `space` is "library" or a sandbox key | Two sandboxes can each have their own Nuln; the library is one namespace (v2-reconciliation §3, author-defined keys). |
| One log per sandbox: the sandbox is the log's partition (IndexedDB index on it), not a field inside the seal | Keeps the sealed envelope as infra §5.1 says; a server will order each sandbox's log separately. |
| IndexedDB version 2 (`logs`, `items`), migrating version 1 inside the upgrade | The owner's phone keeps its slice 0 data. |
| Whole copy version 2 (`logs` by sandbox); version 1 copies are migrated on import | Old exports still load. |
| GM fixes have no in-world date; the latest accepted entry per context (and step, or pair) wins | They are out-of-fiction fixes (rules-overlay §9: errata and house rules follow §8's order, not chronology). See question 13. |
| A pin moves its first rule just before the other within one step and target point, and takes both out of the bag | The GM has decided their order, so no clash notice for that pair. |
| Pin and swap are offered only for adjacent pairs whose order changes the value | Pinning a commuting pair changes nothing. |
| Fix dates in derivations are the recorded day (`2026-11-12`), not a localised date | Keeps the resolver's output the same on every device. |
| No manifest found → built-in WFB orders, with a warning on the card | A sandbox still resolves while its base package is missing. |
| Library rules may name things by bare key; a key-like name no sandbox has is accepted quietly | Library packages are world-agnostic; a sandbox may be loaded later. See question 10. |
| Test worlds are sets of files (`test/fixtures/sets.json`), loaded as drafts and deployed in order with "Deploy all" | Imports still land in drafts first (text-format §1); later files see what earlier ones deployed. |
| A draft is rebuilt from its own text against the current state when deployed, and when the Import tab opens | Its warnings, new / edit statuses and logged-event check are never stale. |
| IndexedDB version 3 (same stores as 2, items reshaped in place); whole copy version 3 | The owner's Part A data comes forward on first open. |
| A package local to a sandbox lives in that sandbox's space; it wins over a library package with the same key | Keys are unique within a space; the sandbox's own rules come first. |
| A hook made from an inline trigger is **derived** when the world is built (key `rule~trigger`), not stored | Library rules serve many sandboxes, so the hook can't belong to one; nothing to keep in step, export or migrate. "Make it a world hook" writes a real one into the sandbox. |
| In a trigger or a hook's condition, a bare key is a hook; in a scope, a named scope; `hook(key)` works anywhere; a field that's only a name (no brackets) is one name, spaces and all | Triggers read naturally (`trigger: Treasury not paying`); YAML drops quotes, so they can't be required. |
| A hook that follows links from a unit (`reaches`) shows "depends on the unit" on World, and its answer on each unit's card | It has no single answer for the world. |
| A recorded event with no type gets its name as its type; roles with no part are "involved" | The form stays four boxes; hooks can still match by event or by type. |
| A thing's tree walks links on at the read date, each thing once by its shortest route, at most 8 hops | Readable, and stops runaway walks in big worlds. |
| `src/ui/tokens.css` holds every colour, type size, spacing and radius; two columns above 760px | Brief §1.6: the look iterates; world views desktop-first, lists phone-first. |
| A thing's **network** (Connected, reaches, reached from) is read at the card's read date; inward routes are written from the far end, as the other thing's condition would write them | A route is only useful if it can be pasted into a condition. |
| Unknown link kinds in a library rule are warned per context (Sandbox tab), not at import | A library rule doesn't know its world until a context switches it on; warning at import would flag every rule loaded before its world. |
| "Names world things" counts things and hooks in the rule's scope and trigger, not what a named scope names | Keeps the check to what the rule itself writes. |
| A route step looks up the links out of a thing by (from, kind) in an index built once per world, instead of scanning every link | Measured 15 Nov on a synthetic world (2,900 things, 5,600 links, 500 units, 100 rules): every unit 5.9 s → 0.7 s, one unit 49 → 16 ms. Same results; the 86 tests pass. |

### The text shape, slice 1
Three kinds of file (owner decisions of 14 Nov): `manifest:` is a game (statline, bag order, core); `package:` is a rules package (in the library, or local to a sandbox with `sandbox: key`); `sandbox:` is a world (its category order, contexts with books / faqs / house / campaign, things, links, units, events, log). References may be labels. Full description and tested examples: **`build/yaml-guide.md`**. The slice 0 section below is kept as history.

### Questions for design (slice 1)
10. **Library rules name sandbox things by bare key.** A library rule says `reaches(nuln, …)`; each sandbox reads `nuln` in its own world. v2-reconciliation §3 says cross-namespace references carry a prefix and a bare key works inside its own namespace. Built as: bare keys in library rules resolve in the sandbox that reads them. Is that intended, or should a library rule reach world things another way (template slots, a setting package)?
11. **Where campaign packages live.** Under review: see owner decision 4 above (rules belong to a game, not a sandbox).
12. **Named scopes in both places.** Built: a named scope can be in a library package (with the rules that use it) or in a sandbox. Right?
13. **Package switches and the read date.** A switch applies at every read date (out of fiction). Should a GM be able to switch a package on from an in-world date (a campaign rule that only starts in 2524)? Today that's a rule trigger's job.
14. **Pins across steps.** A pin between rules in different steps or target points is ignored (it can't change their order). Right?
15. **Writing scopes isn't intuitive (owner, 15 Nov).** `reaches(wissenland_treasury, serves > paid_by)` reads as "the unit serves something, and that something is paid by the Wissenland treasury", but the owner found it hard to see where `paid_by` comes in: it's a link on the commission, not on the unit, so nothing on the unit's card says it's there. The cards now write each route out, and "What can I write?" lists the words, but the writing itself is still a bare expression. **For design:** a sentence builder or route helper (pick the unit, then step along its links: serves → Handgunners' commission → paid by → Wissenland treasury, and the condition is written for you). Editors are out of slice 1 (brief §1.4), so this is logged, not built. Also: is the "names world things → campaign" rule (point 1 above) right for house rules too, and for a rule that names a world thing only through a named scope?
16. **A link's meaning is hidden in its name (owner, 15 Nov).** "The Handgunners serve the commission" implies "whoever pays the commission pays the Handgunners", but nothing says so: the app only sees an arrow called `serves`, so a rule has to spell the chain out (`serves > paid_by`), and `reaches(wissenland_treasury, paid_by)` is false because the Handgunners have no `paid_by` link of their own. Today there are two ways round it: give the route a name (a named scope, as E1's "commissioned by the treasury" does), or link each unit directly (`[paid_by, wissenland_treasury]`), which repeats it on every unit. **For design:** should a world be able to say what a link kind implies (derived links, or link rules: "a thing that serves X is paid by whoever pays X"), so the implied `paid_by` shows on the unit's card as implied and a one-step route works? That would be a new mechanism, so it isn't built. It's related to question 15, but not the same: 15 is about writing routes, this is about where a link's meaning lives.

---

## Slice 0 status (10 Nov 2026)

| Done-when item (brief §5) | State |
|---|---|
| E1 passes as a test | ✓ `test/cases/e1-handgunners.test.ts`: 7 with wages withheld, 8 after the withdrawal entry; derivation shows routes, trigger, order |
| E2 passes as a test | ✓ `test/cases/e2-depth.test.ts`: 8 by depth; 8 in any order when written `@statline` |
| Round trip passes | ✓ `test/cases/round-trip.test.ts`, on both the in-memory and IndexedDB stores |
| E4 (stretch) | ✓ `test/cases/e4-grenzstadt.test.ts`: +1 S kept in 2525; "while the Elector holds" stops in 2523 |
| Installed on the iPhone from the Pages link | Published: Pages deploys from `main` (first merge 10 Nov). Phone checks: see "Closing slice 0" below |
| `structure.md` and `build-log.md` | ✓ |

Checked in a headless phone-sized browser against the production build: load E1 from its fixture → deploy → Ld 7 → withdraw → 8 → add again → 7; data kept across reload; the app opens offline once loaded.

### To publish
1. The repository is **private**. GitHub Pages from a private repository needs a paid GitHub plan (Pro, Team or Enterprise). On a free plan, make the repository public, or tell me and I'll propose another static host.
2. Repository **Settings → Pages → Source: GitHub Actions**.
3. Merge this branch into `main`. `.github/workflows/pages.yml` tests, builds and publishes. The address will be `https://<owner>.github.io/WorldBuilder/`.
4. On the iPhone, open the address in Safari → Share → **Add to Home Screen**. Open it once online; after that it works offline.

---

## Technical choices

| Choice | Why |
|---|---|
| Pinned versions: Vite 6, Vitest 3, React 18, TypeScript 5.8, zod 4, yaml 2 | Well-known, stable releases; newer majors add nothing slice 0 needs. |
| zod 4's built-in `z.toJSONSchema` for `schema/*.schema.json`; a test fails if they are stale | One definition; no extra generator library. Run `npm run schema` after changing a schema. |
| Plain IndexedDB, no wrapper library | About 100 lines; nothing hidden from a reviewer. |
| `fake-indexeddb` in tests | The IndexedDB store runs the same contract and round-trip tests as the in-memory one. |
| IndexedDB log keyed by an auto-increment number, unique index on entry ID only | Gives append order without reading inside the seal; refuses a duplicate entry. |
| `replaceWithCopy` wipes and loads in one transaction | A bad import file can't leave half a copy. |
| `vite-plugin-pwa` (Workbox, generated service worker, auto-update) | The standard way to make a Vite build installable and offline; precaches every built file. |
| Icons drawn by `scripts/make-icons.mjs` (no image library) | Three PNGs; a dependency would be overkill. |
| No router: four tabs held in React state | Four screens; a router adds nothing yet. |
| `src/ui/app-data.ts` holds the app's operations; screens only render and call it | Keeps the screens thin, as CLAUDE.md asks. |
| IDs: `crypto.randomUUID()`; device ID made on first run and kept in meta | Unique without a server. Tests inject repeatable IDs and times. |
| Persistent storage asked for on first run (and again on later starts until granted); the answer is shown on the Data screen | Brief §3. |
| Export uses the iOS share sheet when available, else a download link | On an installed iPhone app, "Save to Files" goes through the share sheet. |
| "Withdrawn" is derived, not written: `readLog` marks an entry withdrawn when an accepted, not-withdrawn withdrawal entry names it | Nothing is edited in place. Withdrawing a withdrawal brings the original back. |
| Content items are replaced by key on deploy | Content has no release history in slice 0. The log stays append-only. |
| A route search is breadth-first; each (thing, pattern step) is visited once | Finds the shortest route first; stops loops. |
| Depth = links climbed after the entry link | Matches rules-overlay §8 ("village 0, Averheim 1, Averland 2"). |
| Numbers are not rounded | No manifest rounding in slice 0; nothing in E1, E2 or E4 makes a fraction. |
| A rule on a stat the unit's profile doesn't have is skipped | No base value to fold from. |
| Re-importing text whose `log:` events are already logged (same event key) skips them, with a warning | Loading a fixture twice doesn't double the event. |
| Exported text: one canonical form (sections in the package's own order, a unit's links under it, every rule's `layer` written out) | Re-importing an export changes nothing, and a fresh import rebuilds the same content: tested for every fixture. |
| Importing part of a package keeps its other members (deployed members first, new ones added at the end) | text-format §6: edit some entries and re-import; only those show as edits. Before this, re-importing one rule would have dropped the rest from the package's member list. |
| Code boxes scroll sideways instead of wrapping | A wrapped YAML line reads as a different structure. |
| Version label (`commit · date`) on the Data screen | So the owner can tell which build the phone is running. |
| Second workflow `test.yml` runs tests and the build on other branches | Catches problems before merging to `main`. |

---

## The text shape for world items (proposal, brief §3)

_Superseded by slice 1 Part A (package files and sandbox files): see `build/yaml-guide.md`. Kept as history._

The design has no text shape yet for world things, links, events, named scopes or scope + trigger rules. This follows `text-format-and-csv.md` §1–3: valid YAML, short positional tuples, `(label, key)` headers, keys written back, one file = one package. Worked examples: `test/fixtures/*.yaml`.

```yaml
package: [E1 Handgunners' Ld, e1_handgunners]   # (label, key)
layer: book                                     # source layer for its rules (default book)

things:                                         # (label, key, kinds)
  - [Nuln, nuln, [settlement, polity]]
  - [Talabheim, ~, [settlement]]                # ~ = no key yet: one is written back
  - Altdorf                                     # label alone: key written back

links:                                          # (from, kind, to, start, end) — end optional
  - [nuln, in, wissenland, 2000]
  - [grenzstadt, in, averland, 2400, 2523]

units:
  - unit: [Nuln Handgunners, nuln_handgunners]
    raised: 2520
    profile: [3, 3, 3, 3, 3, 1, 3, 1, 7]        # manifest stat order M WS BS S T W I A Ld, or a map {Ld: 7}
    links:                                      # (kind, to, start, end); start defaults to `raised`
      - [raised_at, nuln]
      - [member_of, gunnery_school]

scopes:                                         # named scopes: saved queries
  - scope: [commissioned by the treasury, commissioned_by_the_treasury]
    query: reaches(wissenland_treasury, serves > paid_by)

rules:
  - rule: [Gunnery School, gunnery_school_pride]
    effect: [Ld, =8, inline]                    # (stat, edit, target point), as text-format §2
    scope: reaches(gunnery_school, member_of)
    trigger: in_force(wages_withheld, withholder = wissenland_treasury)   # optional
    nature: origin                              # origin (read as of raising) | environment (read now)
    category: organisation
    layer: faq                                  # optional: overrides the package's layer

events:                                         # world history: stored as content
  - event: [Spinach grows in Averland, averland_spinach]
    kind: spinach_harvest
    roles: {where: averland}
    period: [2400, 2524]                        # (start, end)

log:                                            # same shape; appended to the log as event entries on deploy
  - event: [Wages withheld, wages_withheld_2524]
    kind: wages_withheld
    roles: {withholder: wissenland_treasury}
    period: [2524]
```

**Conditions** (scopes, triggers, named-scope queries) are written as §17's nodes:
- `reaches(nuln, raised_at > in*)` — one thing; `*` means "any number of times";
- `reaches(any title, serves > under*)` — any thing of a kind;
- `reaches(siege_of_nuln, participated_in, ever)` — "ever" instead of "as of";
- `in_force(wages_withheld, withholder = wissenland_treasury)` — an event kind or event key, plus roles;
- `all(…)`, `any(…)`, `not(…)`;
- a bare key is a named scope.

`→` is accepted for `>`. The import review reads every condition back in this one form.

**Edits**: `+1` / `-1` (a bare number is an add, as text-format §2), `=8` with a required target point, `x2`, `at most 3`, `at least 3`. Target point words: `statline`, `inline`, `end` (with or without `@`).

**Keys**: a written key wins. With no key, the label is matched once against deployed items of the same class: one match takes its key; none or several makes a new slug key (several also gives a warning). The rewritten text is shown in the review to copy back. Links have no header: their key is the tuple `from~kind~to~start`.

**Problems** are reported per line (YAML line numbers) and never stop the rest: an item with an error is left out; warnings (missing reference, no category, unknown section) still import.

---

## Owner feedback on the prototype (10 Nov 2026)

Candidates for the next slice brief. None is a design change: each is in the design, outside slice 0's brief.

1. **Swap or pin the order from the card.** The Gunnery School's order matches the design (category decides), but there's no way to change it on the card. Design: pins and category-order edits are the GM fixes (`rules-overlay.md` §12), shown dated in the derivation.
2. **Place or polity?** Nuln is a settlement and a polity. Nuln civic pride's scope targets the thing Nuln by `raised_at > in*` (containment, so effectively the place). Its `category: place` is written on the rule, not taken from the kind. Design (`rules-overlay.md` §6, AGREED tentative): where one thing has several kinds, the author chooses the kind (and so the link followed), and the derivation shows what was chosen. Slice 0 neither asks nor shows it.
3. **Tap a thing to see its tree.** Design (`rules-overlay.md` §13): "any thing has a tree: what it reaches, what reaches it, the rules active there". Slice 0 only gives the tree per rule on a unit card.
4. **Rules on their own.** A list of every rule (scope, trigger, nature, category, layer, package) without opening a unit.
5. **The explanation is wordy.** Fine for now; refine the derivation's wording later.
6. **A guide to the text format.** Done: `build/yaml-guide.md`, with examples checked by a test.
7. **"View rule", with export.** Done: on the unit card, each rule has **View rule**: its text as it would be written for import, with Copy, Export rule and Export package.
8. **The same for every item.** Done: the World tab lists units, things, rules, named scopes, events and packages. Tapping one shows it in words (a thing's links in and out, its events and the rules that name it, directly or through a named scope; a rule read back in plain English; a package's members) and **View text** with the same Copy / Export / Export package. This also covers items 3 and 4 in part: a thing shows the rules that name it, and rules can be opened on their own. Not yet the full tree (what reaches it, worked out at a date).
9. **Keys you don't know.** References (link ends, condition targets, roles) must be keys in slice 0; labels resolve only in headers. Owner asked what happens when you don't know the key. Answered; see the reply in the session. Candidate: resolve references by label as well, writing the key back (`text-format-and-csv.md` §3, the same rule as headers; authoring v2 "resolve on entry").

Added 12 Nov 2026, from checking on a desktop:

10. **A rule should link to the units it lands on.** A rule's page shows the things it names (Nuln), not the units it reaches through them. Slice 1 candidate: at a chosen read date, list the units it **applies** to, each with its route. **Don't list every unit it doesn't match** (owner): that gets out of hand as the world grows. To ask "why not?" about others, pick them directly, or narrow the unit list with a filter (an advanced option) over units and their links (e.g. raised at somewhere in Averland, member of the Gunnery School), then show the tree for those. Design: `rules-overlay.md` §9 (the test view: protagonists affected, grouped by roster), §13.
11. **Things grouped by kind.** The World tab groups items by class; things should also be grouped by kind (settlement, polity, organisation, title), a thing with several kinds under each. Display only, no design question. Design: `world-structure.md` §2 (kinds), §3 (topics are display groupings).
12. **Structural: the package is the only container (most important).** In slice 0 the device holds one flat world: every deployed item and one log. There is no manifest (the WFB stat order and default category order are constants in code), no sandbox, no manifest context and no working context. Every deployed rule is in play for every unit; its scope alone decides who it lands on. A package is only a bundle of items imported together: it records where they came from and sets the default source layer of its rules. It sets no scope, sits at no level, and isn't switched off, superseded or required (none of that is built). The E1 fixture mixes world content (places, organisations, links), system rules and a protagonist in one package only because slice 0 has nowhere else to put them; the design keeps them apart (the world or setting, the system's rules package, a roster registered in the world). **Before more is built on top, a brief needs to decide the containers:** the sandbox (the world), the manifest context or contexts in it, which packages sit in each, and where rosters live. The design docs on the manifest, packages and the library, and sandboxes aren't copied into `design/`; that brief would need to bring them over.

---

## Closing slice 0 (10 Nov 2026)

Slice 0 stops adding features here. Everything in "Owner feedback" above, apart from items done, goes to the slice 1 brief.

**Left for the owner to check on the iPhone** (a failure here is fixed in slice 0; anything else waits):
- [x] Installed from https://grogvgremlin.github.io/WorldBuilder/ (Share → Add to Home Screen)
- [x] Opens with Airplane Mode on
- [x] E1 still there after a few days; Data tab says storage is persistent
- [x] Round trip on the phone: Export → Files → Wipe → import → same values  - user: tested for 2 days
- [x] E1: withdraw / add again flips Ld 7 → 8 → 7, derivation explains it

**To take to the design project:**
- Questions for design 1–8 below (9 decided by the owner).
- The verdict on the YAML text shape (keep / change / drop).
- **First, the containers (feedback 12):** sandbox, manifest context(s), packages, rosters. This shapes everything after it.
- Owner feedback items not done, as slice 1 candidates: a rule's page listing the units it lands on, with a filter for "why not?" (10); things grouped by kind (11); references by label; attach a rule at a thing (§6 shorthand); the full tree at a date (what reaches a thing); pin or swap order from the card; shorter derivation wording; choosing a thing's kind in a scope; fixtures split into world / rules / army / log.

---

## Questions for design

Each is built the way described, so slice 0 runs. None changes E1, E2 or E4.

1. **Target points across steps.** Built as: every statline edit first (origin step, then stationed), then every in-line edit (origin, then stationed), then every end edit. That follows `resolver.md` §5.2 ("statline steps → in-line → end" over the whole path). `rules-overlay.md` §8 lists target point as the first key *within* a step, which could instead mean origin (statline → in-line → end) then stationed (statline → in-line → end). The two differ only for a statline or end edit in the stationed step. Which is meant?
2. **When does a clash notice fire?** Built as: only when nothing decided the order (step 5, the bag) and swapping changes the result. When the category or depth decides a non-commuting pair (E1: Nuln +1 then the School `= 8` → 8; reversed 9), no notice is raised; the derivation shows "swapped with the step before: 9" as information. `resolver.md` §5.6 (1) would raise a notice for any non-commuting pair from different packages. Should a decided order still raise one? (- user: decided order is fine to not raise.  the ordering detail should make it into the derivation text)
3. **"place → organisation / title".** Built as two ranks: place first, then organisation and title sharing a rank. Or is it three ranks: place → organisation → title? (- user: it is three, but mainly because an organisation should grant a title.  As with everything else is should be macro and micro configurable)
4. **Depth when only some rules share a chain.** Built as: depth orders a group only if every rule in it has a route, all routes lie on one chain, and no two depths are equal. Otherwise the whole group goes to the bag. Is a partial ordering wanted instead (depth for the rules that share a chain, the bag for the rest)?
5. **Where sets go in a bag.** `resolver.md` §5.3 says add before multiply and caps and floors after, but not where a set goes. Built as set → add → multiply → cap → floor. (- user: Yes.  As with everything else is should be macro and micro configurable)
6. **Named scopes and depth.** A named scope is treated as "a scope that names no thing" (no depth; straight to category, then the bag). Right? (- user: Yes although need some examples)
7. **"While the Elector holds Grenzstadt" (E4).** §17 has no node for "does X rule Y now?" between two things other than the protagonist. Built as a trigger read through the unit: `reaches(elector_of_averland, raised_at > ruled_by)`. Is that the intended way to write it, or does §17 need a node for a link between two named things? (- user: don't understand. "does X rule Y now?" is a hook and we shoudl have that covered)
8. **Entry status inside the seal.** `infra.md` §5.1 leaves only ID, recorded time, device and host sequence number outside the seal, so status sits inside. In slice 0 status is written once at append ("accepted") and "withdrawn" is derived from withdrawal entries. When the host arrives, how does an entry move from awaiting host to accepted without an edit in place: an acceptance entry, or the host sequence number (outside the seal) itself standing for "accepted"? (user: need a tangible example)
9. **Read date before the raising date.** ~~Should the card say "not yet raised"?~~ **Owner decision (10 Nov):** yes. Read before its raising date, a unit reads nothing from the world: the card says "Not raised until 2520" and shows the printed profile, greyed, with no rules (`UnitResolution.notYetRaised`; tested in E1). To carry back to the design project.

**Still open:** 1 and 4 have no answer yet.

### Examples asked for (12 Nov)

**6. Named scopes and depth.** Two origin rules, both category place, on Handgunners raised at Nuln (Nuln is *in* Wissenland):
- Nuln civic pride `Ld +1`, scope `reaches(nuln, raised_at > in*)`: Nuln is 0 hops up the unit's chain.
- Wissenland discipline `Ld = 7 @inline`, scope written **directly** as `reaches(wissenland, raised_at > in*)`: Wissenland is 1 hop up. Depth decides: Wissenland first, Nuln later → **8**. This is E2.
- Now write Wissenland discipline's scope as a **named scope** "raised in Wissenland" whose query is that same `reaches(…)`. Built as: a named scope names no thing, so it has no depth. The pair falls to the bag (set before add) → still 8 here, **with a clash notice** ("8 as ordered, 7 if reversed").
- The question: should a named scope that is a single `reaches` to one thing carry that thing's depth, so it orders the same as writing it directly?

**7. "While the Elector holds Grenzstadt".** Agreed, it's a hook: "the Elector of Averland rules Grenzstadt". The question is what the hook's **condition** is written with. §17 gives three nodes: `reaches` (starts from the unit), `value(…)` and `in force(…)`. "The Elector rules Grenzstadt" is a link between two named things, and neither is the unit. Ways to write it:
- **(a) Through the unit**, as built: `reaches(elector_of_averland, raised_at > ruled_by)`. It works only because these units were raised at Grenzstadt; a unit raised elsewhere can't use the same hook.
- **(b) As an event in force:** model the holding as a period that holds the link (`world-structure.md` §7: a reign holds a link package), then `in force(elector_rules_grenzstadt)`.
- **(c) A new node** that tests a link between two named things at the date, e.g. `linked(grenzstadt, ruled_by, elector_of_averland)`.
- Which is intended?

**8. Entry status inside the seal.** Bea, a player, is offline. She buys a sword: her device appends an entry, status **awaiting host**, inside the seal. Next day she syncs; the GM's device (the host) accepts it. Where is "accepted" recorded, given nothing is edited in place and status is inside the seal?
- **(a) An acceptance entry:** the host appends a new entry, "accepted Bea's entry X", with its own host sequence number. Bea's entry is never touched; its status is worked out from the entries that follow, as withdrawal is now.
- **(b) The host sequence number:** the host stamps a number on Bea's entry's **envelope** (outside the seal, so no unsealing needed). Having a number means accepted. The sealed part is untouched, but the envelope is changed in place.
- Which is intended?
