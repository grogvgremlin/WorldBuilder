# Quick text format and CSV

_Topic doc. DECIDED (data-model session 4; flavour words session 5; stage keywords removed and rules-as-text lines added session 6; number-edit words, target points and patch relations session 7). Describes the **shape** of the app's own text format and CSV import, not a parser. No external dataset formats._

## 1. Purpose and principles

- **Why:** typing in books is the main workload; the text format is the fastest way in; CSV and the grid cover tabular bulk entry.
- **Concept drives the format:** every block maps to one item kind and every line to a field or keyed list member. The format adds no concepts.
- **Enter as printed:** stats as in the book (the delta is stored against the unpatched race + tier base); costs, sizes and options as printed; errata values as printed (stored as a delta against the book value at entry).
- **Imports land in the draft**, never deployed automatically; nothing is used anywhere until reviewed, tested (optionally) and deployed. An import goes into the open package if there is one, else a new package named after the file.
- **Importing never blocks:** problems reported per line; good blocks still import.
- **Keys are slugs never regenerated;** the format carries keys, or matches on label once and keeps them.
- **Order-free within one import:** blocks can refer to each other in any order.
- **One canonical form on export** (stable field and key order), so exports diff and merge cleanly.
- **User guide requirement:** a worked input → output example for every case.

## 2. Shape: valid YAML with short values and tuples

- The typing format is **valid YAML** (standard parsers read the structure) with the app's own **short values**, and **positional tuples** wherever a field has a fixed shape.

```yaml
unit: [Black Orcs, black_orcs]
src: [Forces of Fantasy, 44]
extends: Orc Boyz
race: Black Orc
profile: [4, 4, 3, 4, 4, 1, 2, 1, 8]
options:
  - [Shields, +2]
  - [Great weapons, +2]
  - [Command, link Orc command]
rules_as_text: |
  - Quell Animosity | Orc units within 6" may re-roll Animosity
  - Armed to da Teef | may choose weapon at start of combat
```

| Field | Tuple | Defaults |
|---|---|---|
| item header (`unit:`, `rule:`, `item:`, `table:`…) | (label, key) | key from label, written back after first import |
| source | (work, page, reference) | — |
| profile | values in **manifest stat order** | `-` none, `4+` target, `D6` dice, `+1` relative, `=4` pinned |
| several profiles | `profile: {rider: [...], boar: [...]}` | — |
| option | (label, cost, basis, effects) | cost is a +/− delta (`2` read as `+2`); basis from the group's *applies to* |
| size | (min, max, default) | max open, default = min |
| cost | (amount, basis, measure) | per model; the manifest's first measure |
| equipment / rule reference | `label` or (label, alias, params) | — |
| army-list entry | (unit, category, alias) | counts towards = category |
| number edit (patches) | (target, kind and value, target point): `[S, +1]`, `[WS, =3, statline]`, `[S, =3, end]` | target point: add/multiply in-line, cap/floor end; **a set must state it** |
| relations (patches) | `amends: key` · `supersedes: [key, key]` | — |
| flavour (patches, packages, logic rules) | (flavour, environment scope): `[environment, stationed]`, `[environment, fighting]`, `[army]` | army; a package's flavour applies to its members unless a member says otherwise |
| rules as text | a block of bullet lines, each `ID | text` or plain text | — |

- Plain YAML remains available for anything without a tuple shape; the import review shows every tuple expanded with field names.
- Every class uses the same pattern; its fields are the class's field groups: races (base profile, maximums with `at build` / `at output`), tier axes (indented tree), dependent axes (grid), equipment (weapon profile, always / when used; armour as `+1` on the armour stat, with group `body armour`), special rules (rule type, parameters with combine, `ignores`), spells, lores (members with signature), option groups, tables (axes and cells), army lists (entries by category), grand armies (branches).

**Longer line form** (the earlier illustration; same content):

```
Unit: Orc Boyz {orc_boyz}
  @ Forces of Fantasy p.42
  race: Orc   tier: rank normal
  profile: M4 WS3 BS3 S3 T4 W1 I2 A1 Ld7
  size: 10+   cost: 5 per model
  equipment: hand weapon "choppa", light armour
  rules: Animosity, Choppas
  options:
    - Shields {shields}: +1 per model
    - Orc command (pooled)
    - Big 'Uns {big_uns}: +2 per model, WS +1 S +1
        rule: requires Black Orc Boss in branch
```

| Line form | Maps to |
|---|---|
| `Class: Label {key}` | new content item of that class; key optional |
| `@ work p.N ref` | structured source |
| `"…"` after a reference | alias at point of use |
| `Name(param)` | reference with parameters ("Regeneration(5+)") |
| `extends: X` | extends |
| `profile:` with abbreviations | statline; `+1` relative, `=4` pinned |
| `tier: axis node` | tier picks |
| `- Label {key}: …` | keyed list member |
| `(pooled)` / `link: X` | link to a pooled part |
| `narration:` | rule narration |
| `rules_as_text:` | rules-as-text scratch box |
| `note:` / `tags:` | notes / tags |

## 3. Keys and matching

- **A written key wins.** **No key:** the label is matched once against items in reach and the batch: one match → that item (a reference, or an edit if the block is a patch); several → the user picks; none → a new item.
- **Once matched or created, the key is written back into the text**, so re-importing is exact. Renaming later changes only the label.

**Worked example:** typed `unit: Black Orcs` / `extends: Orc Boyz` / `race: Black Orc` / `profile: [4, 4, 3, 4, 4, 1, 2, 1, 8]` / `options: - [Shields, 2]` → rewritten with keys (`[Black Orcs, black_orcs]`, `[Orc Boyz, orc_boyz]`, `[Shields, +2, {key: shields}]`); the review shows a new unit `home/black_orcs`, extends `tow.foh/orc_boyz` (matched, confirmed), basis race `tow.foh/black_orc` rank normal, delta all zero, `shields` as a per-unit tweak (+2 per model), in the open package. Renamed later to "Black Orc Mob", re-import still edits `black_orcs`.

- Sub-items follow the same rule within their parent list. A written key that no longer exists warns and is not created silently.

## 4. Patches, logic rules and packages

Patches are one line each where possible, addressed by label or key path (typed as tuples, e.g. `- [Black Orcs › Shields, cost, 2]`):

```
Package: TOW FAQ 1.2 {tow.faq1_2}
  @ TOW FAQ v1.2
  supersedes: tow.faq1_1 (cumulative)
  - Orc Boyz › Shields: cost 1 per model {a}         (as printed; stored as delta vs book)
  - Black Orcs › Shields: cost 2 {b} [amends tow.faq1_0 › b]
  - Orc Mob: size 5+ {c} [supersedes tow.faq1_1 › c]  (size minimum)
  - Grimgor › limit: 0–2                             (rule number)
  - Troll: remove Stupidity                          (structural remove)
  - Orc Boyz: add Shield, +1 per model               (add + charge)
  - Elves: M +1, +5 per model                        (number edit + charge)
```

```
Package: Region 4 conditions {r4_conditions}
  flavour: [environment, stationed]
  - Orcs: S −1                                       (the bug, for orcs stationed here)
  - Crossbows: BS −1                                 (rust, worked out by Campaigns)
```

| Words | Maps to |
|---|---|
| `add` · `remove` · `set` · `exclude` · `replace whole item` | structural edits |
| `= v @statline` · `= v @inline` · `= v @end` | set, with its target point (required) |
| `+v` / `−v` · `×v` · `at most v` / `at least v` | add · multiply · cap · floor (target point optional: `@statline`, `@inline`, `@end`) |
| `cost v` without a sign on a patch | an erratum value as printed, stored as a delta against the book value |
| `[amends key]` · `[supersedes key, key]` · `supersedes: P (replacement | cumulative)` | patch relations; package supersession |
| `+N per model / per unit / per roster` | charge with basis |
| `when charging` (a manifest condition) | situational modifier |
| `at build` · `at output` · `fixed` | content cap keyword, fixed |
| `group: body armour` | source group for a combine rule |
| `flavour: army` / `environment`, `scope: stationed` / `fighting` | flavour and environment scope |
| `ignores: environment` · `ignores: tag marsh` · `ignores: M from terrain` | target-side ignore on a special rule |
| `only when …` | patch condition (a conditional "add option" becomes option + availability rule) |
| `who: all Orcs` / `who: race Orc only` | selector |

- **Order in the file is written order** within a package (it decides results only where two non-commuting steps touch the same value; a clash notice says so).
- **The word "becomes" is not used**; the import review reads sets back as "sets the statline to 3", "sets 3 at this point" or "forces 3".
- **Logic rules** are written as the rule builder's plain-English read-back (`rule: at most 1 per army`; `rule: requires Black Orc Boss in branch`; `composition: Core at least 25% of points`; `composition: Rare no more than Core`); anything else in the bracketed expression form, read back on import.
- **Packages:** a `Package:` block whose members are the blocks or lines inside it, in order; sub-packages nest in place; `requires:`, `conflicts:`, `supersedes:`, `core: yes`, `flavour:` in the header.

## 5. Grids and tables in text

- **Dependent axes:** levels down the side, careers across; an empty cell means fall back.
- **Roll tables:** `D6: 1–2 X, 3–4 Y, 5–6 Z` on an option group, or a `table:` block.
- **Tables:** a `table:` block naming its axes and listing cells by axis keys (`[Empire, Dwarfs]: trusted`); any number of axes.
- **Army list entries:** one line per entry under a category heading: `Core: Orc Mob "Orc Boyz", Night Goblins`.

## 6. Export (round trip)

- **Three forms, all accepted and all output:** **short YAML** (typing), **full YAML** (every field named), **JSON** (same structure). Keys included, so any export re-imports exactly; import detects the form; converting is exporting in another form.
- Uses: review a package at a glance, back up homebrew, move content between working contexts by hand, edit many entries in a text editor and re-import (only changed entries show as edits).
- Exports of items that aren't yours re-import as **patches** on them.

## 7. CSV and the spreadsheet grid

- **One CSV = one class**, one row per item; the grid uses the same columns; cells use the text format's value forms.

| Class | Columns (illustrative) |
|---|---|
| Unit | key · label · class · race · tier picks · one column per stat · size · cost per model · cost per unit · equipment · rules · pooled option groups · rules as text · source work · page |
| Unit options | unit · group · option · cost (delta) · basis · under (parent option) · adds (profile, slot, linked unit) · effects · rule; group settings on the group's first row |
| Equipment | key · label · class · cost · weapon statline columns · use · effects · source group · rules · tags · rules as text · source |
| Spell | key · label · lore(s) · signature · casting value · range · spell type · narration · source |
| Special rule | key · label · class · rule type · parameters · ignores · narration · rules as text · source |
| Army-list entry | army list · category · unit · alias · counts towards · entry rules |
| Race | key · label · extends · base stat columns · maximum stat columns · maximums apply (at build / at output) |

- Header names columns by field label or manifest abbreviation; unknown columns reported and ignored, or mapped once and remembered for that file shape.
- **Too nested for CSV:** slot templates with their own option groups, logic rules beyond one sentence, patches, tables with more than two axes: text format or card editor (a cell can still reference them).
- With units, unit options and army-list entries, a whole army list can be entered as CSV. In the grid and CSV window a unit row's options open with a click as a pop-up grid; both have the library side panel and autocomplete on names and aliases.
- Columns are a starting shape, to iterate with the CSV window.

## 8. Import review

| Shown | |
|---|---|
| Per block or row: new · edit (direct or patch) · unchanged · skipped | — |
| Matches made by label, to confirm; ambiguous ones to pick | §3 |
| Problems per line with severity (unknown class or field, unreadable value, missing reference, key not found, rule sentence not understood, **a set without a target point**) | — |
| Missing references offered as **stubs** (default on), flagged incomplete | — |
| Each patch's flavour, so a defaulted *army* can be corrected | — |
| **"Supersedes?" suggestions**: earlier patches on the same target and field, one click to link | `rules/patches.md` §6 |
| **Clash notices** raised by the import | `core/resolver.md` §5.6 |
| Rules-as-text lines found, linking to the bulk transcription view | — |
| Preview against a chosen roster or node | — |
| Keep in the draft, deploy, or discard | — |

## 9. Test cases
- Orc Boyz and Black Orcs: `extends`, race, profile as printed, shields +2 as a per-unit tweak. ✓
- Grimgor counts-as Core: patch line on the Grimgor unit block. ✓
- Big 'Uns: option line plus `rule: requires Black Orc Boss in branch`. ✓
- Boar with nested barding; wyvern link. Magic items by fill by class up to 50. ✓
- TOW FAQ: one package, one line per erratum; entry 14 switched off by key. ✓
- FAQ 1.2 with `supersedes: tow.faq1_1 (cumulative)`, entry c `[supersedes tow.faq1_1 › c]`, entry b `[amends tow.faq1_0 › b]`. ✓
- Curse: `- Cursed Helm: WS = 1 @statline` reads back "sets the statline to 1"; without `@…` the import review reports "set needs a target point". ✓
- Region 4's bug and rust: a package with `flavour: [environment, stationed]`. ✓
- Strider: `ignores: tag marsh`. ✓
- Mordheim equipment as CSV; racial maximums `at build`. ✓
- Quest career × level grid. WFB 6th Battle Wizard College. 4th Chaos grand army. ✓
- A bare-bones O&G list imported with stats, points and rules as text only; the to-do view lists 40 cards; bulk transcription sets *Animosity* once and replaces it everywhere. ✓
