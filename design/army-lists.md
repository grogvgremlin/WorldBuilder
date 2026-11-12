# Army lists, composition and grand armies

_Topic doc (rules library). DECIDED unless marked. Session 7 (review 4): local recruits are units with their own *raised at* (R2), replacing the "branch whose source is a roster" route._

## 1. Army lists

- **An army list defines what can be taken** (entries, options, limits), as in a book; a **roster** is the user's selection from it, checked against its constraints. Its own level of definition, separate from packages and rosters.
- **Content, so patchable:** add or remove units, change categories, adjust limits, add rules. **Extends other army lists** (an Army of Infamy extends the base list: adds, removes or changes entries by key, overrides composition rules by name, adds army-wide items).
- **Minimum to enter** (session 6): its list of units.
- **Fully resolved before any roster built from it:** the roster starts from the list as seen at its node, numbers and values included.
- **Revalidated whenever rules change:** every deployed rules change runs the health check on every army list in reach.

| Field | Meaning | Example |
|---|---|---|
| Header | label, source, **extends** | Troll Horde extends O&G |
| Entries | keyed list (§2) | — |
| Composition rules | logic rules (role: composition): category percentages, min/max, duplicates, per-points scaling | Core ≥ 25%; Rare ≤ 25%; 0–1 Lord per 1000 pts |
| Army-wide items | special rules, patches and named rules applying whenever a roster uses this list (army flavour) | Animosity on Orcs and Goblins; the list's own *spell selection* |
| Written summary | optional, shown in the grand army view by toggle | — |
| Rules as text | scratch box | — |

## 2. Entries

| Field | Meaning | Example |
|---|---|---|
| Unit | reference with optional alias | Orc Boyz as "Orc Mob" |
| Category | manifest category for this list | Special |
| Counts towards | for points and for character choices; defaults to the category | — |
| List-only additions | options, rules, equipment or limits for this list only, stored as **differences on the entry** (the entry's unit extends the unit inline) | Savage Orcs: Frenzy; Big 'Uns option |
| Entry rules | logic rules (0–1, unique, per 1000 pts, requires) | Grimgor: 0–1, unique |
| Selection-triggered effects | only effects that hold in this list alone; anything belonging to the unit is carried by the unit | — |

- **Category belongs to the entry, not the unit**, so Black Orcs can be Core in one list and Special in another.
- **Where a rule lives decides where it travels:** Grimgor's "Black Orcs count as Core" is carried by the Grimgor **unit**; its selector names the Black Orc **unit**, so it works in any list with both and does nothing otherwise.

## 3. Composition

- **Composition is a general requirement of every roster:** the manifest, packages and patches define what's available; list-building restrictions come from the army list plus any packages of composition rules attached at the roster or above (Grand Melee, a tournament pack, a scenario's list rules, a Patrol). There is no separate "format" concept (at most a UI label).
- **Percentages are of the roster's target** (the limit set up front), not the running total.
- Composition rules from every node in the build all apply; the tightest limit wins unless a node switches one off. A place's composition rule (*stationed here*, e.g. "no monsters fielded here") is checked in the **Here** view and only warns (session 7, R6).
- **Can define its own special rules** (army-wide), and is the level where army-wide patches and rules live, including selection-triggered ones; rules belonging to a unit travel with the unit.
- **Mounts** are defined by their content type (profiles or linked units).

## 4. Grand armies and branching groups

_A grand army is one case of a node with branches. Organisations and alliances in Campaigns have the same shape._

| Field | Meaning | Example |
|---|---|---|
| Branches | keyed list; each an army list, a grand army, a **choice group** (min/max), or **a roster acting as a limited army list** (the draw mechanism) | 4th Chaos: Undivided + up to two god lists |
| Balance rules | logic rules across branches: how many branches, each branch's share (fixed allowance or %), combined limits | Khorne + Nurgle together ≤ 50% |
| Central items | rules and patches applied to branches; each says which branches inherit (none = all) | Mark of Chaos rules for every branch |
| Cross-branch rules | roles and checks spanning branches | exactly one General in the whole force |

- A **grand army roster** holds one branch roster per chosen branch; a single-army roster is the one-branch case, so there is one roster shape.
- **Points roll up:** each branch has its own totals and composition; all count towards the overall target, split as fixed allowances or percentages.
- **Roles can span branches**; **an unlock reaches only its own branch** unless it says otherwise; **nestable**.
- **Branched pass-down:** central patches with each branch choosing what it inherits (selectors and switch-offs).
- **Local recruits** (session 7, R2): a roster that has marched elsewhere recruits locally by adding units with their own **raised at** pointer (the local place), so their build path runs through where they were raised, not the roster's own ancestors (`core/context-graph.md` §2). Which local list they may be taken from is an ordinary availability question (the local list attached at that place, or a package).
- **Event checks across lists** ("both lists share the same General") can use the same mechanism: rules across branches.

## 5. Mercenaries, allies and Regiments of Renown

- **Hired by another army:** a mercenaries package adds hireable entries to each host list, with availability rules for bans (vampire hunters not with Vampire Counts) and counts-towards plus percentage rules for the allowance (allies or Rare, by edition). In a pickup game, uniqueness is per army.
- **TOW allies** depend on the pair (host, ally): a **table** read by availability and composition rules.
- **A Dogs of War army in its own right** (5th edition: every entry a Regiment of Renown or special character, 0–1 each, its own composition rules): an army list with a list-wide "no entry more than once" rule; Regiments with named command use fixed-name slot templates; the same Regiment unit item can have entries in several lists.
- **Dogs of War contingents** in another army: a grand-army branch with a % cap.
- **In a campaign** a Regiment is one real company: a **uniqueness check across all rosters below the campaign root** (flag + patch), or the company as its own roster that employers draw from (`core/validation-and-fixes.md` §6).
- **Hired swords in Mordheim** cost 0 on the roster; fees and upkeep are manual inventory lines until Campaigns (`roster/rosters.md` §5).

## 6. Test cases
- TOW Orcs and Goblins: Black Orcs (Special), Orc Mob (Core), Boss (Characters, magic items 50 pts); army-wide Animosity; composition percentages. ✓
- Troll Horde / Nomadic Waaagh! (Armies of Infamy): list extends with entry changes and list-wide patches; "every character has a mount" as a requirement rule. ✓
- Grimgor counts-as Core; Big 'Uns unlock; wyvern link, boar mount. ✓
- WFB 4th champion from the character allowance; 4th Chaos grand army (branches, choice group, one General). ✓
- WFB 6th/7th Empire detachments and the Battle Wizard College. ✓
- Dogs of War contingent as a % branch; 5th ed Dogs of War army as its own list. ✓
- List-only additions stored as differences on the entry. ✓
- Grom's Region 4 army in Region 5 takes Region 5 Boyz with their own raised at. ✓
