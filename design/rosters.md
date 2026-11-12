# Rosters, units, picks, slots and inputs

_Topic doc (roster builder). DECIDED unless marked. A roster stores **what the user chose**, never resolved values. Draws, inventory and identity operations: `roster/draws-inventory-and-operations.md`. Finalising, locks and history: `roster/lifecycle-and-history.md`. Session 7 (review 4): pointers (R2), money through the inventory (R3)._

## 1. Roster

| Field | Meaning | Example |
|---|---|---|
| Instance ID | generated, unique everywhere | — |
| Label, notes | free | "Grom's Waaagh! 2000" |
| Node | the roster **is** a node: parent (its build path), attachments (composition packages, roster-level patches), switch-offs | parent: Lustria → Region 4 → Black Orc Warband |
| **Stationed at** | pointer to where it is now (`core/context-graph.md` §2); campaign-added pointers if any | Region 5 |
| Source | an army list or grand army (following or pinned), or **another roster** (a draw) | `tow.foh/orcs_and_goblins` |
| Inputs | values fixed before building (§5) | target 2000 pts; side: attacker |
| Units | roster units (§2) | — |
| Branch rosters | grand armies: one child roster per chosen branch | Undivided, Khorne |
| Roles | role assignments (§4) | General → Grom |
| Inventory | the roster's stash, including money lines (`roster/draws-inventory-and-operations.md` §4) | 10 spare crossbows; wyrdstone sold −105 |
| Draw group | optional, for draws | "Autumn patrols" |
| Exceptions node | a child node holding finalise-time fixes | — |
| Extra points | per section (§7) | Core +15 |
| State and versions | draft head + numbered versions | — |
| Based on / copied from | clone origin | — |

- **Composition rules** come from the source plus every composition package in reach; the roster stores none.
- **A pickup roster** has an army list as source, no draw group, no inventory, no stationed at.

## 2. Roster unit

| Field | Meaning |
|---|---|
| Instance ID | generated; in a draw, its own ID with a *drawn from* link |
| Entry | the army-list entry taken from (gives unit, category, counts towards); in a draw, the source roster unit |
| Name | optional (a named regiment) |
| Origin | identity link (taken from entry, drawn from, split from, merged from/into, promoted from, copied from, transformed from, converted from) |
| **Raised at** | optional pointer: this unit's own place of recruitment, overriding the roster's ancestors for its build path (local recruits; `core/context-graph.md` §2) |
| System tags | e.g. *splinter*, *drawn* (reserved partition; removable, conditional; expiry is Campaigns') |
| Entity reference | optional, to a Background entity |
| Contingents | identity-keeping groups of its rank and file, each recording its own origin |
| Size | number of models (the unit's min/max apply as rules) |
| Picks | §3; in a draw, references to the source unit's picks it keeps |
| Slots, individualised profiles, links | §4 |
| Inventory, loadouts | owned stock; saved field-pick sets |
| Recorded inputs | trained count, recorded measures |
| Granted by | draws only: the package that allowed this addition |
| Struck through | §6 |
| Extra points | §7 |

- A roster unit is a **node** (child of the roster); its picks become its attachments in the picks phase.
- **Hard cap** while building: filled slots + contingent models ≤ size; unit size can't drop below that without removing a slot first.

## 3. Pick

| Field | Meaning | Example |
|---|---|---|
| Option | address of the option card as seen through the entry, or a fill-by-class member item | `…orc_mob › options › shields` |
| Target | unit · a slot · a profile (key or individualised profile ID) | barding → profile `boar` |
| Quantity | within the option's min/max | daggers ×2 |
| Parameters | values for the item's parameters | Wizard level 2 |
| Roll | for rolled options: dice result and the option it gave | 4th Chaos reward: 5 → Crown of… |
| Timing state | **made** (list or campaign time) or **deferred** (battle time: the roster resolves what's available; the pick is made on the battle side) | spells: deferred |
| Parent pick | for a nested option | barding → the boar pick |
| Source | user, campaign (a slot patch recorded by Campaigns), or granted by a package (draws) | — |

- A pick stores **only the choice**; effects and cost come from the option's patch when resolved. An option removed later **orphans** the pick, with the usual fixes.
- Picks at one node join the entity's **own bag** (combined by kind; order of clicking and default-vs-bought don't matter).

## 4. Slots, profiles, links and roles

**A unit's models** are nameless rank and file (optionally grouped into contingents) plus **slots**. Slots exist only once filled; no empty slots.

**Filled slot**

| Field | Meaning |
|---|---|
| Instance ID | generated; in a draw its own ID with *drawn from* |
| Kind | **command** (created by a pick adding a slot; the pick's address stored) or **notable** (created by naming a model, if the unit allows) |
| Name, notes | "Sgt Brandt" |
| Picks | from the slot template's option groups (magic standard) and other slot options |
| Slot patches | attached by Campaigns or the user: advances, injuries, personal tweaks; in a draw, read from the source slot through the link |
| Individualised profiles | below |
| Recorded inputs | experience, battle-level, rolled characteristics |
| System tags, entity reference, raised at | as for units |

- A slot is a node (child of its unit). It starts from the rank and file (profiles, equipment, rules); its contents sit on top. Filling a slot reduces the nameless count by 1; unit size is the total number of models.
- The champion uses the champion node on the race's rank axis. A slot's adjustments (tier promotion, advances, personal equipment) are **patches at slot level**. A slot's cost = its configuration's cost plus its patches' costs.
- Command slot attributes can be contingent on other units or army rules ("the BSB can take a magic standard if…").
- Removing the command pick removes the slot (warning if it has a name or patches).

**Individualised profile:** instance ID, the profile key it individualises, name ("Bayard"), own picks and patches; lives on a slot (or a character's unit). **Promote** turns it into a linked roster unit (link type *promoted profile*) keeping the same ID and history.

**Link:** instance ID; type (attached character · ridden monster · detachment · promoted profile); parent and child roster units; created by a pick ("add a linked unit") or the user (attached characters); counts towards from the link effect (attached characters count towards the character allocation by default). Removing a link leaves both units; the child takes its own category.

**Counts towards** is set separately for **points allocation** and **character choices**: attached character → character allocation and limits, doesn't change the unit's size; character-like slot → counts towards unit size and takes a slot, counts towards whatever its configuration says.

**Role assignment:** role type, holder (a unit or slot), scope (branch, or whole force). Limits are logic rules. Roles can go to a unit (typically a character) or to a slot.

## 5. Inputs

| Input | Where | Set by |
|---|---|---|
| **Target** for each measure with a limit (points limit, treasury) | roster | user or caller; required before percentages and limits can be checked |
| Side and other scenario facts | roster or battle side | caller (Scenarios/Battle) or user |
| Recorded measures (warband rating, gold held) | roster | caller (Campaigns) or user |
| Experience, battle-level, trained counts, rolled characteristics | unit or slot | caller or user |
| Finalised siblings' commitments | draw | computed from the draw group's stored choices |

- Each entered input keeps **who set it** for the derivation path. Packages can modify inputs before any rule reads them (siege "defender +25%").
- **Money until Campaigns exists — DECIDED (session 7, R3):** the treasury **limit stays at its starting value**; everything that moves money is an **inventory line** (`roster/draws-inventory-and-operations.md` §4): income is a negative-cost line (wyrdstone 1.05 × −100 = −105), hire fees and upkeep are positive manual lines, hired swords themselves cost 0. Spend against the limit then gives the real balance, and the inventory gives the breakdown. Experience stays a recorded input on the slot.

## 6. Struck-through units and slots — DECIDED (session 6; revised session 7)

- A unit or slot can be **struck through** (e.g. a Mordheim henchman killed in game 1).
- **Its holdings move to the stash**, taking their cost with them (session 7): the gear is counted once, on the inventory line, and another model can field it from stock without paying again.
- The struck-through unit keeps its own hire cost in spent cost only. It does **not** count towards computed measures (warband rating), composition (warband size, 0–1 limits), uniqueness across rosters, cards, the QRS or play.
- It stays in the roster and in history, shown struck through on the army list sheet.
- Price changes don't re-cost it unless the user accepts "rules changed" on the locked version. Repricing of owned items generally waits for Campaigns.
- **Mordheim example:** limit 500; hire 480; Hans dies, his sword (10) moves to the stash; wyrdstone sold −105; bow +10; Otto fields Hans's sword from stock → spend 385 ≤ 500, so **115 gc** left = the real treasury.

## 7. Extra points — DECIDED (session 6)

- An **"extra points" box per unit and per roster section** (category or branch), so the accounting works while rules are still untranscribed (rules as text).
- Traced as **manual cost adjustments** in the derivation path ("why is this unit 15 pts more? manual adjustment").
- Listed in the to-do view, to be removed as the rules are transcribed.

## 8. Battle rosters and scenarios

- **A battle side = a roster version** (an army list roster, a pool's draw, a prepared list, or a campaign force) **+ composition packages** (army list, campaign/theatre, scenario, tournament) **+ inputs** (points target, side, recorded counts), recorded on the **battle record** (`core/resolver.md` §13).
- **Scenario list rules** are a composition package on the **battle side or draw**, never on the army or pool: mandatory or forbidden units, grantable content (siege kit, fortifications), input changes (uneven points). Side is an input, so the package can treat sides differently. The scenario's battlefield rules sit at the battle node.
- **Timing:** if the scenario is known before selection, its list package applies to selection. If the list is fixed first and the scenario rolled later, purchases become battle-time picks on the side, and unmet requirements show against the battle as **warnings** (the Battle-ready check never blocks the start; session 7, R6).
- **Supported flows:** scenario → roster; list brought → scenario rolled; list picked → scenario → battle roster drawn from the list.
- **Campaign restrictions in a theatre:** nested draws (army → theatre force → battle roster) for which units are present; composition packages at the theatre node; theatre-level inventory.

## 9. Test cases
- TOW O&G 2000: Grimgor, Black Orcs (Core via Grimgor), Orc Mob with Boss, standard (magic standard on the slot), musician; Warboss on wyvern (link). ✓
- Big 'Uns greyed until a Black Orc Boss is in the branch; order doesn't matter. ✓
- WFB 4th champion from the character allowance. ✓
- 4th Chaos grand army: branch rosters, one General across both. ✓
- Mordheim warband through two games, money through the inventory (§6 example); hero promoted from a henchman by split; experience as recorded inputs. ✓
- Quest party: all characters; career × level from tier picks; gold and battle-level recorded. ✓
- Siege scenario: battle side drawn from the army; siege kit granted; defender +25%. ✓
- Untranscribed Troll rules: +20 extra points on the unit until the rule is transcribed. ✓
- Region 5 Boyz with their own raised at in Grom's Region 4 roster. ✓
