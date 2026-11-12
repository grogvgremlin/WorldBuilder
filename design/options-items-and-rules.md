# Options, equipment, special rules, spells, lores and tables

_Topic doc (rules library). DECIDED unless marked (data-model session 1; effects lost their "stage" field in session 6; tables added session 6; effects gained target points and armour became a delta stat in session 7)._

## 1. Option groups

An option group lives inline on a unit or slot template, or in the pool as its own item (class *option group*).

| Field | Meaning | Example |
|---|---|---|
| Key, label | identity | `command`, "Command" |
| Applies to | unit · each model · one profile (by key) · the slot (on a slot template) | barding → profile `horse` |
| Timing | list · battle · campaign | spells: battle |
| Pick method | chosen · rolled (with a roll **table**) · chosen or rolled | 4th-ed random spells |
| Pick limit | min and max picks, or any | College: exactly 1 |
| Budget | optional cap in a measure across the group's picks | magic items up to 50 pts |
| Members | keyed option cards and/or **fill by class** | — |
| Rules | logic rules attached to the group | at most one magic standard per army |

**Fill by class**
- "Every item of class X" (narrowed by tags or exclusions): members worked out when resolving — **every item of that class in reach** (attached at or above the roster's node, directly or through a package; not switched off; passing its own availability rules). Being stored in the library is not reach. New and homebrew items appear automatically.
- Each member costed by its own cost; the group's budget and rules still apply.

**Option card**

| Field | Meaning | Example |
|---|---|---|
| Key, label / alias | identity | `shields`; "Bright college" |
| Item | optional reference (alias, parameters) | shield; Lore of Fire |
| Cost | any measure, as a **+/− delta**; per model or per unit; class-fill members use the item's cost unless overridden | +1 pt per model |
| Quantity | min / max (default 0–1) | daggers ×2 |
| Replaces | what it swaps out (equipment, profile, option by key); cards show the swap | spear replaces hand weapon |
| Effects | what taking it does: a **patch** | — |
| Nested option groups | open once this is taken; belong to it, so their picks come after it | boar → barding |
| Rules | logic rules on this option | Big 'Uns: requires a Black Orc Boss |

**An option is a patch offered for choosing.** Taking it records a **pick**; the resolver attaches that patch at the unit or slot node in the picks phase. Picks at one node join the entity's **own bag** with its content effects (combined by kind, so pick order and default-vs-bought don't matter; `core/resolver.md` §5.1). Conditional options are stored as always present plus an availability rule.
- **Pooled groups and per-unit tweaks:** a unit's linked group extends the pooled one; the unit stores only its differences by option key (Black Orcs: shields 2 pts, no musician, add great weapons).

**Timing and deferred choices**
- **List time** (default): lores, marks, runes, vows, magic items, equipment.
- **Battle time:** chosen or rolled before or during a game (spells in most editions, "choose at the start of the battle" items, Animosity rolls). The roster resolves the **available options** (costs, rules and restrictions apply at list time); the battle node holds what was picked or rolled, and how.
- **Campaign time:** chosen between games and kept (Mordheim spells, Quest treasure); recorded by Campaigns as a slot patch, so the roster sees it as decided.
- **Rolled at list time** (4th Chaos rewards): the roll is recorded on the pick.
- **Wizard lores:** list-time options with limits as logic rules; homebrew "two lores with restrictions" = pick up to 2 plus a rule.

## 2. Effects

Shared by equipment, special rules and spells. An **effect** is a number edit (`rules/patches.md` §4): stat, kind (**set · add · multiply · cap · floor**), value (absolute or relative, or a borrowed value), **target point** (statline · in-line · end; a set must state it), **source class**, optional **source group** (for combine rules: *body armour* = only one counts), optional battlefield **condition**, optional **fixed**, for content caps a keyword (**at build** / **at output**).
- **Applies to:** the bearer (default) · the bearer's unit · a sibling profile (barding → rider's armour) · a borrowed value from another entity.
- **Ignores…:** a rule can say what its holder ignores among incoming changes, by flavour, tag, stat or source (*Strider*: ignores marsh movement penalties; "weapons ignore environment modifiers").
- An entity's own effects and the picks at its node form one **unordered bag** (combined by kind); effects arriving from layers apply by the cascade (`core/resolver.md` §5).
- Effects are what the resolver applies; **narration** is what cards print. A rule with no effects is pure text, which is fine (mechanisation ladder, `authoring/authoring.md` §3).

## 3. Equipment

| Field | On | Meaning |
|---|---|---|
| Cost | all | default when taken as an option |
| Effects | all | source class *equipment* by default |
| Rules | all | special rules it grants (Armour Bane, Flaming Attacks) |
| Weapon profile | weapons | values on the weapon statline, **as printed**: absolute or relative to the bearer ("S+2", "as user") |
| Use | weapons | **always** or **when used** (one of several weapons chosen at the table; its own weapon line) |
| Extends | all | magic great weapon extends great weapon; Mordheim sword extends hand weapon |

- Weapon values relative to the bearer: the item stores "+2", the roster stores only the pick; the weapon line reads the **bearer's final value** (after end steps; `core/resolver.md` §5.2) by default, printed "S+2" or "S 6 for this bearer". A weapon that should behave otherwise states its own target point.
- **Armour is a delta stat** (session 7; `rules/manifest.md` §2): base 7 (no save, "–"); light armour +1 (6+), heavy armour +2 (5+), shield +1, barding +1 to the rider (sibling profile), natural armour on the statline. All adds, so any mix of default and bought kit gives the same result. Light and heavy armour are both in the source group *body armour* (best), so only one counts.
- **Magic items** are children of *magic item* (weapon, armour, talisman, arcane item, enchanted item, magic standard…), with category by class, who may take it (logic rules), one use flag (Battle tracks use), tags such as *common*. A magic standard's effects apply to the unit carrying it. Magic armour joins *body armour* where it replaces mundane armour.
- **Composed items** (Dwarf runes: up to three runes per item, at most one master rune, the same rune once per item unless stated, no two identical rune items in an army, forbidden combinations): an option opening a nested rune group with a pick limit, uniqueness and exclusion checks.

## 4. Special rules and traits

| Field | Meaning |
|---|---|
| Rule type | manifest rule type, for QRS grouping |
| Narration | the rule text, with parameter placeholders ("Regeneration (*x*+)") |
| Parameters | key, label, type, default, **combine** (best · sum · keep both: Regeneration 5+ and 6+ → 5+) |
| Effects | optional (Frenzy: +1 A; Hatred's re-rolls stay text) |
| Ignores | optional filters (§2) |
| Named rules | optional logic rules carried by name (Wizard → *spell selection*, *lore selection*) |
| Typed combat effects | **reserved, empty**: for match-up (Battle pillar) |

- **Traits** are special rules of a manifest class *trait*, shown as name + parameter ("Wizard (level 2)").
- The **default spell-selection rule** lives in the base package, targeting anything with the *Wizard* trait, so homebrew wizards get it automatically.

## 5. Spells and lores

- **Spell:** casting value (and per-level variants), range, spell type (custom choice per manifest), narration, effects, parameters. A spell doesn't say which lore it's in.
- **Lore:** members (spell references, each with **signature** flag and optional **sub-group**, High / Low); its own *spell selection* rule if it differs; rules on who may use it.
- **Membership lives on the lore**, so one spell can sit in several lores.
- **Specificity for spell selection:** manifest default → army list → lore → unit → entry → slot; the wizard inherits the lore's rule and overrides it where it has its own.
- **Several lores:** the picker works over the combined pool; each lore's rule governs its spells unless the wizard overrides; cross-lore limits are logic rules.
- **Lore choice:** the base unit card lists available lores as options; "exactly one lore" lets a draft leave it open, a finalised roster must narrow it.
- **Locked lores without duplicate entries:** one Battle Wizard entry with a **College** option group (pick 1 of 8); each college fixes the lore by an availability rule, gives the alias ("Bright Wizard") and any college rule. A named character has its lore fixed on the entry.
- **Pool uniqueness** (a possible rule, not a default): "unique within a pool until exhausted" — no member taken again until every member has been taken once; the picker hides or greys taken members; random generation draws from the remaining pool.

## 6. Tables — DECIDED (session 6)

- A **table** is a content item (reserved class *table*) holding a **multi-dimensional** lookup: one or more **axes** (each with keyed values: a dice range, an army list, a level, a unit type…) and a **result** per cell (a number, a text, a reference, or a small set of these).
- **Viewable by slice:** fix one or more axes and view the rest as a grid (host × ally for one host; injury results for one roll range).
- Used by: option groups (roll tables), logic rules (table lookup number/yes-no nodes), costs (**cost tiers**: an item's cost by who takes it, Champion 10 / Hero 20 / Lord 30 — replacing the parked "one patch per level"), and Campaigns (injuries, advances, price lists, XP thresholds).
- Patchable like any content (a cell is addressed by its axis keys).
- Examples: TOW allies (host × ally → allowed / suspicious / trusted); 4th Chaos rewards (D66 → reward); Mordheim serious injuries; Quest treasure; WFRP advance costs by career level.

## 7. Test cases
- Orc Mob: shields (each model, +1 pt); Orc command (pooled); Big 'Uns (requires a Black Orc Boss). ✓
- Black Orcs: pooled Orc command extended, shields 2 pts. ✓
- Warboss mount group: boar (adds profile) with nested barding; wyvern (adds linked unit). ✓
- Magic items: fill by class, budget 50 pts, no duplicates except *common*. ✓
- Battle Wizard College: pick 1 of 8, lore fixed by rule. ✓
- Mordheim hero equipment: pooled list, gold costs, quantities, campaign timing for later purchases. ✓
- TOW wizard spells: battle timing, pick limit from the level parameter. ✓
- Choppa: weapon, when used, S +1 in the first round (condition). Great weapon: S +2, Strikes Last. ✓
- Light armour + shield on a boar rider with barding → 4+, whatever is default and whatever is picked (armour +1 +1 +1 on base 7). ✓
- Light and heavy armour on one model → 5+ (body armour: best). ✓
- Regeneration from two sources: best. Armour of Doom: extends heavy armour, adds Ward (5+). ✓
- 4th Chaos reward rolled on a table at list time; roll recorded on the pick. ✓
