# Patches: selectors, edits, number edits, costs and relations

_Topic doc (rules library; the same patch shape is used by geography). DECIDED unless marked (data-model sessions 1–2; flavour session 5; order and stages revised session 6; **number edits, target points and patch relations revised session 7**). Order of application: the cascade, `core/resolver.md` §5._

## 1. Patch fields

| Field | Meaning |
|---|---|
| Common shape | ID, label, source, narration, rules as text, notes, tags, history |
| Selector | **who it affects** within its reach (§2) |
| Edits | ordered, keyed list of **structural edits** and **number edits** |
| Cost | optional charges in any measure (§5) |
| Counts towards | optional: which allocation its own charges count towards |
| Flavour (tag) | **army** (part of the build), **stationed here**, **fighting here**, or a campaign-added tag (e.g. *based here*); each is read by the matching pointer (`core/context-graph.md` §2); default from where it's authored (a list or roster → army; a place → stationed here; a battle → fighting here) |
| Condition | optional expression that must hold; a patch with a condition, or with roster criteria in its selector, is a **selection-triggered effect** (facts and logic phase, stratified). Patches carried by a unit are implicitly conditional on that unit being present |
| **Relations** | optional **amends** (one patch) and **supersedes** (one or more patches) (§6) |

- **A patch edits the resolved view** of what its selector matches below its attachment (definitions as seen there, or roster entities); it never edits the stored item, which stays intact and the patch can be switched off.
- **Patches never edit patches**; to cancel one, switch it off at a node, or supersede it (§6) — a relation, not an edit.
- **Items are small:** an FAQ becomes one patch or rule per erratum, each takeable or skippable.
- **Patches are generic; attachment gives reach** (`core/items-packages-and-library.md` §5).
- **Environment tags are limited** (session 7, R6): number edits, granting or suppressing rules, and logic rules; **not** costs, structural option edits or category changes.

## 2. Selector

- One **ID or address**, or a **selection** combining: class · tags · race (descendants unless "this race only") · category · role · slot kind · profile key · link type · branch · context (sits below node X) · options taken · **system tags** (*splinter*, *drawn*, origin kind, fraction of source) · *self* · *source*.
- The **same selector language** is used by logic rules. Authoring shows it as "who it affects": this model / this unit / all Orcs / all infantry.

| Criteria | Kind | Known from |
|---|---|---|
| ID / address, class, tags on content, race, extends descendants, profile key, branch, context | static | context phase |
| options taken, tags or rules granted by picks, slot kind, link type, system tags, *self* / *source* | roster (picks) | picks phase |
| category **as counted**, role, anything granted by a selection-triggered effect | roster (facts) | facts and logic |

- **Number edits** may use any criteria.
- **Rule numbers** are settled before anything reads them (static: context phase; roster-dependent: facts and logic).
- **Structural edits** with only static criteria apply in the context phase (or picks phase for a pick's own patch); with any roster criterion ("all Core units gain X"; "the General's unit gains Stubborn") they are selection-triggered effects, stratified.
- **No selector may use results.**

## 3. Structural edits

| Operation | What | Example |
|---|---|---|
| **Set** | a plain field | change a unit's alias |
| **Add** | a member to a keyed list, with a new key | add Frenzy to Savage Orcs |
| **Remove** | a member by key | remove Stupidity |
| **Change** | nested edits inside one member | inside *shields*: change its cost |
| **Exclude** | an exclusion on a fill-by-class group | magic weapons except the Axe of Grimnir |
| **Replace whole item** | a whole item; **warns** | wholesale errata of a unit |

- Every edit addresses by key; a missing key **warns**, never appends.
- **Order:** written order along the path (`core/resolver.md` §5); structural edits are army flavour only (environment tags can't make them, §1); target-side ignore filters incoming edits; two structural edits on one field from different sources: the later wins and a **clash notice** shows both (`core/resolver.md` §5.6).
- **Removing vs forbidding:** *remove* for unconditional changes; conditional limits are logic rules. Removing something taken orphans the pick.
- **Conditional "add option"** is stored as an unconditional add plus an availability rule.

## 4. Number edits — DECIDED (session 7, R1)

| Field | Meaning | Example |
|---|---|---|
| Target | **any numeric value by address** | M; shields cost; "0–1" limit; unit size |
| Kind | **set** · **add** · **multiply** · **cap** (at most) · **floor** (at least) | `= 3`; `+1`; `×½`; at most 2 |
| Value | absolute or relative, or a borrowed value | +1; "the General's Ld" |
| **Target point** | **statline** · **in-line** · **end**; adds and multiplies default to in-line, caps and floors to end; **a set must state it** | `WS = 3 @statline` |
| Source class | characteristic · equipment | — |
| Source group | optional, for combine rules (e.g. *body armour*: only one counts) | heavy armour in *body armour* |
| Condition | optional battlefield condition (situational: shown as condition lines) | first round of combat |
| Fixed | optional: later steps can't change the result | — |
| Cap keyword | caps from content (racial maximums, bounds): **at build** or **at output** | Mordheim maximum: at build; TOW 1–10: at output |

- **Targets:** a stat (profile or weapon statline); a cost (unit, option, item); a content number (unit size min/max, option quantity, pick limit, budget, a parameter value: "+1 Wizard level"); a number inside a logic rule (by rule name and key: Grimgor 0–1 → `max = 2 @statline`); an **input** (points limit; a scenario's "defender +25%"). Content numbers, rule numbers and inputs are **rule numbers**, settled before rules read them.
- **What the target points mean** (canonical: `core/resolver.md` §5.2): **statline** changes the fundamental value the fold starts from, and every later step still applies; **in-line** applies at its place in written order; **end** applies after all in-line steps (forced values, ceilings, floors). End caps and floors also limit condition lines; relative weapon values read the bearer's final value.
- **Wording:** a set is written `= v` plus its target point. "Becomes" is not used; the read-back says "sets the statline to 3", "sets 3 at this point", "forces 3".
- **Unordered bags** (an entity's own content effects plus the picks at one node): add before multiply within a target point; a bag with two different sets on one field raises a clash notice.
- **Rounding, direction and combine rules** come from the manifest (`rules/manifest.md` §2–3); the resolution keeps raw and capped values.
- **Options and errata on costs are deltas:** an option's cost is a +/− on the unit; an erratum entered **as printed** ("shields cost 2") is stored as a delta against the book value at entry (+1), the way statlines store differences. So FAQ +1 and a house rule +1 commute (3 either way).
- **The "stage" field and its defaults are gone** (session 6); the **delay flag** stays parked — target points cover its legitimate use (session 7).

## 5. Costs

- **Charge** (a cost the patch adds): measure, amount, **basis**:
  - **per roster:** once for each roster reached, its own line at army level; in a grand army once on the whole-force roster unless the selector picks branches ("25 pts for the Waaagh! banner");
  - **per unit:** once per unit or slot reached ("+10 pts per Orc unit for a totem");
  - **per model:** for each model reached, including from higher nodes; a selector aimed at a profile counts that profile's instances ("+1 pt per crewman").
- **Cost edit:** an ordinary number edit on an existing cost (FAQ "shields cost 2 on Black Orcs", stored +1; manual "+15").
- On a definition (no roster), per-unit and per-model charges show in the unit's resolved costs, so army list views and cards are right before anything is built.
- **Stat changes never drive costs automatically.** If a homebrew boost should cost points, the patch says so (a manifest formula can *suggest* a cost; `rules/manifest.md` §8).
- Costs keep derivation paths ("245 = 20 × 10 boyz + 25 command + 20 banner"). **Which allocation points count towards is patchable** (counts towards).
- **Extra points** in a roster (per unit, per section) are manual cost adjustments, traced as such (`roster/rosters.md` §7).
- **Cost tiers** are a table (`rules/options-items-and-rules.md` §6).

## 6. Patch relations: amends and supersedes — DECIDED (session 7)

| Relation | Meaning | When the other patch is off or missing |
|---|---|---|
| **amends X** | a delta that only makes sense on top of patch X; **requires** X and applies **right after** X | inactive, with a warning and a fix ("1.2b needs 1.0b: switch on / attach FAQ 1.0") |
| **supersedes X, Y…** | replaces those patches: each is switched off **wherever this patch is on**; transitive (1.3c → 1.2c → 1.1c) | a link to something not in reach does nothing; switching this patch off brings X back |

- **Links are explicit, by patch** (not worked out from target and field), so they survive renames, handle one entry replacing two or being split in two, and never catch a homebrew patch by accident. **Authoring suggests** earlier patches on the same target and field as "supersedes?" candidates, confirmed in one click.
- **Across sources:** a homebrew patch may supersede an official erratum (house-ruling it).
- **Package level:** a package may **supersede another package** in one of two modes (`core/items-packages-and-library.md` §4): **replacement** (every member of the old package off) or **cumulative** (only members linked by their own supersedes).
- **Not edits:** amends is a dependency plus an ordering; supersedes is an automatic switch-off. The rule "patches never edit patches" holds.
- Cycles through amends or supersedes are load errors. The derivation path shows "superseded by 1.2c (FAQ 1.2)" and "inactive: amends 1.0b (off)".

## 7. Picks are patch instances

- **Taking an option** records a **pick** (option address, quantity, parameter values, any roll). The resolver turns it into that option's patch attached at the unit or slot node, in the picks phase; nested picks after their parent.
- An option patch's selector is **relative to where it's taken** (*self* by default; a profile key for "barding on the horse"), so one pooled option works on every unit that links it.
- **Advances, injuries and campaign-time choices** recorded by Campaigns are slot patches the same way, in-world-time-stamped by Campaigns.

## 8. Test cases
- Orc Boyz get shields, +1 pt each: add *shield* + charge 1 per model. ✓
- Elves +1 M, +5 pts each: number edit on race Elf + charge 5 per model. ✓
- FAQ Black Orc shields 2 pts, entered as printed: stored +1 against book 1; house rule "+1 on shields" → 3, in either order. ✓
- Remove Stupidity from a homebrew Troll: remove by key. ✓
- Curse on a slot `WS = 1 @statline`, item +1 in the slot's bag → 2; `WS = 1 @end` → 1. ✓
- "Brutal Orcs" world homebrew: S +1 to race Orc, path shows "homebrew, world node, build, in-line". ✓
- Scenario "all models are S3": `S = 3 @end` at the battlefield; a *fixed* value resists it. ✓
- "Use the General's Ld" within 12": condition with a borrowed value. ✓
- FAQ Grimgor 0–2 (`grimgor_unique › max = 2 @statline`): rule number, settled in the context phase. ✓
- Totem +10 pts per Orc unit: charge per unit. ✓
- "Core units gain Stubborn" with Grimgor present: roster criterion → after counts-as; Black Orcs get it. ✓
- Siege scenario, defender +25%: number edit on the points-limit input, on the battle roster. ✓
- FAQ Orc Mob minimum 10 → 5 (`size › min = 5 @statline`): number edit on the size minimum. ✓
- FAQ 1.2 taken with 1.1: 1.2a new; 1.2b amends 1.0b (inactive with a warning without FAQ 1.0); 1.2c supersedes 1.1c; the rest of 1.1 applies. ✓
- Homebrew "Black Orc shields free" superseding the FAQ erratum: FAQ entry off where the homebrew is on. ✓
