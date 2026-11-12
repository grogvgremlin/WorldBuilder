# System manifest

_Topic doc (rules library). DECIDED unless marked. The manifest is one content item per edition (class *manifest*, reserved), the root of the manifest library; the base package beside it holds edition-wide content and the text exposition of the general rules. Rounding, combine rules and armour as a delta stat added in session 7 (R1); money wording aligned with R3 in session 8._

## 1. What it is

- **Every ruleset starts with a manifest** (TOW, WFB 4th, 6th, Mordheim, Quest…). It defines what the ruleset counts and contains. **Differing granularity is data, not code:** Quest, Mordheim and WFB/TOW run on the same engine without special cases.
- **The manifest is content, so it can be patched** (a homebrew stat, a renamed category, a new battlefield condition, changed template parameters are just a package).
- **A manifest belongs to one edition**; editions are mutually exclusive in the resolver. Packages and rosters name the manifest they use.
- **Manifests don't extend each other:** a new one is blank or an independent clone, with "copy from" for individual sections; changes on top are packages.
- Every section is a **keyed list**, so patches add, remove or change entries by key.
- **Header:** ID (`tow/manifest`), label ("The Old World"), short code (`tow`, the default namespace root for official items). Every item's *edition* field references it.

## 2. Named statlines

- **Model** statline (always): M WS BS S T W I A Ld in TOW/WFB, plus **armour** as a delta stat (below); Quest's own (Luck, Pinning, wounds as dice).
- **Weapon** statline where the edition has weapon profiles (TOW Range · S · AP; WFB 6th Range · S · save modifier).
- Others only if needed (a ship or building profile).
- Each class says which statline its profile uses (units, races, tiers, mounts: model; weapons: weapon).

| Stat field property | Meaning | Example |
|---|---|---|
| Key, label, abbreviation | identity and display | `ws`, Weapon Skill, WS |
| Allowed value types | number · target number (4+) · dice (D6, 2D6, D3+1) · none (–) · special text | W: number or dice (Quest) |
| Better direction | higher or lower is better | save: lower |
| **Rounding** (session 7) | **at each fraction step:** round immediately or carry the fraction · **final:** round or leave · **mode:** nearest, up or down, with a tie rule · **granularity:** 1, 0.5… | TOW M: round up each step, granularity 1 |
| **Multiply combine** (session 7) | repeated multiplies on this stat **stack** (product) or apply **once** (only the strongest halving and the strongest doubling count) | M: once, where the edition rules so (verify per edition) |
| **Delta base** (session 7) | optional: the stat is stored and built as a **delta from a base value**, shown in the book's form | armour: base 7 = none, shown "–"; +1 → 6+ |
| Bounds | min and max; a **cap at output** by default (the theory value may exceed it), or at build if the manifest says so | 1–10 |
| Display order | position on cards | — |

- Number edits act on the number inside a typed value: +1 to a target number moves it the better way (5+ → 4+); +1 to dice gives D6+1; *none* and special text are untouched except by a set.
- **Armour as a delta stat (WFB/TOW):** every model starts at base 7 (no save, shown "–"); light armour +1 (6+), heavy armour +2, shield +1, barding +1 (to the rider), natural armour on the statline (scaly skin +2 → 5+). Everything is an add, so default kit and bought options combine in any order. **"Only one body armour counts"** is a combine rule on the source group *body armour* (best), in the base package. Ward saves are their own stat.
- **Combine rules on source groups** (session 7): any group of effects can be marked **best** (only one counts) or **sum**, in the manifest or base package; same shape as parameters' best / sum / keep both.
- **Absolute or relative values:** every stat value, anywhere, is **absolute** ("S 4", "5+", pins) or **relative** ("+2"; "as user" = +0, follows its reference):

| Where it sits | Reference for a relative value | Example |
|---|---|---|
| a unit's or profile's statline | the derived base (race + tiers): the stored **delta** | Black Orc Boss WS +1 |
| a child item (extends) | the parent's value | Black Orc base S +0 from Orc |
| a weapon's statline | the **bearer's** resolved stat | great weapon S+2; "as user" |

- Relative values live in content, never in the roster (the roster records picks; the resolver works values out).
- **War machines:** one model with several profiles: an **engine** profile on the model statline with *none* where a field doesn't apply (T 7, W 3), **crew** profiles; the shot is a **weapon item** on the weapon statline. A Steam Tank is an engine profile with T 10, W 10. Anything left (steam points) is a special rule with a parameter, or battle state.

## 3. Measures

| Property | Meaning |
|---|---|
| Key, label, unit | `points`, Points, pts; `gold`, Gold crowns, gc |
| Scope | roster, unit or slot |
| Computed as (result) | none · **sum of costs** in this measure · **formula** (logic-rule number language) |
| Recorded (input) | can arrive as an input from outside (Campaigns, the user) |
| Limit | has a limit input (the **target**: points limit, starting treasury) |
| **Rounding** (session 7) | as for stats (§2): per step, final, mode, granularity (points usually round up) |

- **Result vs input:** computed values are results (checks only); recorded values and limits are inputs (any rule). A measure can have both forms, kept distinct (recorded vs current warband rating).
- **Struck-through** units count towards spent cost only (`roster/rosters.md` §6).
- **Money (session 7, R3):** the Engine has no ledger. The treasury **limit stays at its starting value** and everything that moves money is an **inventory line** (income negative, fees and upkeep positive, fractional quantities allowed), so spend against the limit is the real balance (`roster/rosters.md` §5). Treasury history, income and upkeep rules, spendable XP, prices paid and repricing are **Campaigns'**, as is whether measures should ever be marked *derived* or *ledger* (`pillars/campaigns.md` §4).
- Test cases: TOW points = sum of costs with a limit. Mordheim gold = sum of costs (including money lines) against a fixed limit (starting treasury); experience = slot scope, recorded; warband rating = formula, also recorded. Quest gold recorded; battle-level recorded per slot.

## 4. Categories, slot kinds, roles

- **Categories:** keyed list (TOW Characters/Core/Special/Rare; Mordheim Heroes/Henchmen/Hired Swords; Quest none). Limits on them are logic rules.
- **Slot kinds:** key, label, type (**command** or **notable**), optional default tier step (champion → the race's `rank: champion`). Standard bearer and musician have no tier step.
- **Role types:** key, label, may be held by (unit, slot or both). Role limits ("exactly one General") are logic rules in the base package.

## 5. Battlefield conditions, source classes, rule types

- **Battlefield conditions:** key, label, group (combat, movement, shooting, terrain, magic…) for toggles and the QRS; situational modifiers reference them.
- **Source classes:** key, label, card placement: *characteristic* → profile line; *equipment* → item line beneath (cards keep base and item stats separate, optional combined view).
- **Rule types:** key, label, QRS order (psychology, effects, weapons, magic items, spells…).

## 6. Class tree

- Nodes: key, label, parent, **abstract** flag (*equipment* abstract, *weapon* concrete).
- Each class switches on Engine-defined **field groups** (profile with its statline, race and tier picks, option groups, slots, links, effects, cost, magic-item allowance, casting, rule type, parameters, entries, branches, members, table axes); children inherit and may add.
- **Custom fields:** simple manifest-defined fields (number, text, choice, reference to an item of a class), shown on cards and usable by selectors.
- **Reserved roots** the Engine depends on: *manifest, tag, race, tier axis, unit, special rule, equipment, spell, lore, option group, table, army list, grand army*. Users add children, can't delete or re-parent them.
- **"Acts alone"** on a class: default *linked unit* when used as a mount (wyvern), else *profile* (boar); set per edition (TOW monsters vs WFB 6th).
- Every content item has exactly one class; tags stay free labels.
- _Naming clash:_ Quest "classes" are modelled as a **career axis**, not manifest classes.

## 7. Output templates

- The manifest lists, **per output kind** (army list sheet, unit card, QRS, validation report, spell card, item card, character sheet, roster sheet), a **template reference with parameters** (which stats and measures show, experience boxes, card size, grouping, which toggles default on).
- **Template bodies are app code** (a small fixed set of layouts per output kind); parameters are content, patchable. A genuinely new sheet shape (a WFRP character sheet) needs code. Templates could become content later without changing this shape; revisit if limiting.
- A user's display settings are **view presets**, not manifest fields (`outputs/view-models.md`).

## 8. Formulae (session 6)

- The manifest may hold **formulae** in the logic-rule number language, e.g. a **suggested cost** formula shown beside an entered homebrew cost ("formula: 13 pts"): advice only, never overriding what's entered.

## 9. What is not in the manifest

- **Default logic rules** (role limits, the default spell-selection rule, edition-wide composition), **edition-wide content** (common special rules, mundane weapons, common magic items, the *body armour* combine rule) and the **text exposition of the general rules** (for general-rule cards and the QRS) live in the **base package** beside the manifest, so they can be switched off or patched item by item.

## 10. Test cases
- TOW vs WFB 4th: same model statline, different categories and mount default; two manifests, no special code. ✓
- Mordheim: gold (with money lines against a fixed limit), experience, warband rating as above. ✓
- Quest: different model statline, no categories, careers as an axis. ✓
- War machines: engine and crew profiles, shot as a weapon item. ✓
- Homebrew stat "Morale": one structural add to a statline in a package. ✓
- Armour as a delta stat: light armour (default) + shield (bought) → 5+; light + heavy armour on one model → only heavy counts (body armour: best). ✓
- Halving: M 5 ×½ with round up each step → 3; with carry and final round down → 2. ✓
