# The resolver

_Topic doc (shared core). DECIDED unless marked. Interface decided in data-model session 3; order and views revised in session 6 (written-order fold; stages dropped; four views; roster vs battle locks); **session 7 (review 4):** how numbers are built (target points, rounding and combine rules, clash notice; §5 is the one canonical cascade page), pointers instead of parent-as-station, battles as records, legality per view. Session 8: the side's own position on the path stated explicitly; example tag *based here*. Validation and fixes: `core/validation-and-fixes.md`. Logic rules and strata: `core/logic-rules.md`._

## 1. Shape

- **resolve(request) → resolution.** A **pure function** resolving **one moment**: the same request always gives the same resolution, and resolving stores nothing. The only things ever saved from a resolution are saved by a caller on purpose: a lock's fingerprint at finalise, a battle lock.
- **One resolver** for everything (army builder, battle preparation, node views, tests of the draft): battle views are the same resolver reading further along the path.
- **Targets:** a **roster** (draft head or a version; a grand-army roster with its branches; a draw); a **set of rosters** (a draw group; every roster below a node, for revalidation); a **node** with no roster (army list view, house rules sheet); a single **item** as seen at a node (item card).
- Every output is a view of a resolution; every query (§10) is resolutions plus comparison or analysis.

## 2. Request

| Input | What |
|---|---|
| Game context | manifest and central library (one edition) |
| Working context | its store, node graph (parents, attachments, switch-offs, hidden nodes, available lists) and rosters |
| Target | §1 |
| Version selection | **current** (references follow latest releases) or **as locked** (a roster version's pins) |
| Roster data | stored choices only: units, picks, slots, profiles, links, contingents, inventory, roles, recorded inputs, struck-through marks, extra points; for a draw, its source roster (followed or pinned) — never resolved values |
| Draw group | siblings' stored choices (finalised siblings' commitments read straight from their stored records; draft siblings for live checks) |
| Inputs | roster, unit and slot inputs, each with who set it (user or which caller) |
| **Pointers** | read from the roster: its **stationed at** node (and any campaign-added pointers, e.g. *based at*); a unit's own **raised at** where set; for a battle side, the stationed-at and campaign-added pointers recorded in the battle record (`core/context-graph.md` §2) |
| **Battle** | optional: the **battle record** — site (the **fighting at** node), battle node (scenario, terrain), sides (with their own attachments and battle-time picks) |
| Overlay | optional: the **draft** (undeployed items and node changes) and **proposed roster changes** ("what if": add, remove, take) |
| Ticked conditions | optional set; none ticked = each condition's additions computed separately for printed condition lines |
| **View** | Build · Here · Battle-ready · Battle; caps on/off (§7) |

## 3. Load (before the phases)

1. **Pick versions:** every reference resolves to a release, a pinned release, the lock's release (as locked) or the draft (overlay).
2. **Collect reach along the path:** army-flavour attachments from every node up the roster's **tree path** (a unit with its own **raised at** reads that node's path instead of the roster's ancestors, then the roster's own attachments); attachments tagged for a **campaign-added pointer** from that pointer's node path; *stationed here* attachments from the **stationed-at** node's path; *fighting here* attachments from the **site's** path and the battle node; for a battle side, the side's own attachments (army flavour) and battle-time picks. **Hidden nodes** and everything below them are out of reach. The overlay's node changes apply first; packages expanded member by member (combos in place); switch-off records, deepest wins. For a draw, the source's build is an input (§9), not reach.
3. **Apply patch relations** (`rules/patches.md` §6): a patch that **supersedes** others switches them off wherever it is itself on (transitively; a package can supersede a whole package); a patch that **amends** another is active only while that patch is active, and applies right after it.
4. **Flatten** *extends* chains and pooled links: each content item's view is its parent plus its differences, pins respected.
5. **Stratify** conditional patches, roster-dependent edits and rule numbers, logic rules and **ignore rules** in reach (`core/logic-rules.md` §5). Computed per request over what's in reach of the target (so a cycle whose parts never meet in one roster isn't an error for it); a node's health report computes it over everything in reach of the node.
6. **Load errors** are reported and the offending items skipped, never stopping the whole resolution: cycles (extends, packages, parents and pointers, strata through a negative edge, supersedes/amends links), missing references, edits to missing keys (warn, never append), rules reading results outside checks, unmet *requires*, package *conflicts*.
- Load depends only on content, the graph and the overlay, so implementation can memoise it per node (the per-node view is the input for what sits below).

## 4. Phases

| # | Phase | Does | Writes |
|---|---|---|---|
| 1 | **Context** | (a) patches to the **manifest** first; (b) structural edits with **static** selectors, in written order down the build path; target-side ignore rules filter incoming edits; clashes found; (c) **rule numbers** with static selectors and **input** modifiers; (d) available lists; (e) **definition values** (stats and costs of definitions as seen at each node) | the **definitions view** at each node (the list as seen there: structure, rule numbers, values), resolved inputs, clash issues |
| 2 | **Picks** | create instances (units, slots from command picks, individualised profiles, links, contingents; for a draw, own IDs with *drawn from*); apply each pick's own patch (static part), **parent picks before nested ones** | roster structure; picks as attachments on unit and slot nodes |
| 3 | **Facts and logic** | strata bottom-up: facts; selection-triggered effects (conditional patches, roster-criteria structural edits, roster-dependent rule numbers); availability, requirement and non-result composition rules; roles; named-rule winners; deferred choices' available options; what's left for a draw after finalised siblings; orphans | final structure, facts, option states, rule outcomes, issues |
| 4 | **Values** | builds every number by the **cascade** (§5): target points, written order, bags, rounding and combine rules, *fixed*, ignore rules; charges per roster / unit / model; computed measures | values per position (raw and capped), costs per measure, **results**, clash notices |
| 5 | **Checks** | percentages of the target, budgets, "worth more than X", mutual exclusions, uniqueness (including across rosters below a node), draft allocation | issues |
| 6 | **Outputs** | assemble entities, totals, issues, derivation paths and fingerprints | the **resolution** (§8) |

- **Each phase finishes for every entity before the next starts.** Only phase 3 has internal order (its strata), plus parent-before-nested picks in phase 2 and the cascade in phase 4.
- **No selector or condition reads results** (current points, current warband value); those are for checks only.

## 5. The cascade: how a number is built — DECIDED (session 7, R1; supersedes the session-6 wording)

_This is the one canonical statement of order. `core/context-graph.md` §3, `rules/patches.md` §4, `rules/options-items-and-rules.md` §2 and `pillars/battle.md` §2 link here._

### 5.1 The path
- **Build** (root → … → roster → unit → slot, along the tree; a unit with its own *raised at* reads that node's path, then the roster's attachments) → **campaign-added pointers**, in their declared order (e.g. *based at*: based-here layers) → **station** (the *stationed at* node's path: stationed-here layers) → **battlefield** (the site's path: fighting-here layers, then the battle node: scenario, terrain, spells in effect) → **side** (the battle side's own attachments, army flavour, and its battle-time picks) → **conditions** (situational lines).
- **Written order:** down the path, root to leaf; at each node, attachments in order; within a package, members in order (combos in place). This is the user's framing: *each node's resolved view is the input for what sits below it*.
- **At a unit or slot node:** first the entity's **own bag** (its content effects — default equipment, rules — **plus** the picks taken at that node), then the node's **attachments** in written order (slot patches, injuries, rules attached there).
- _The shape of the battle node and sides (one shared battle node plus a node per side) is settled in the Battle pillar; the order above holds whatever that shape is._

### 5.2 Edits to numbers
- **Kinds:** **set** (`= v`), **add** (`+v` / `−v`), **multiply** (`×v`, halve, double), **cap** (*at most v*) and **floor** (*at least v*).
- **Every number edit has a target point:**

| Target point | Meaning | Default for |
|---|---|---|
| **statline** | changes the fundamental value the fold starts from (a profile or printed value); later steps all still apply | — |
| **in-line** | applies at its place in written order, on the result so far | add, multiply |
| **end** | applies after every in-line step, in written order among end steps: forced values, ceilings, floors | cap, floor |

- **A set must state its target point** (no default): `WS = 3 @statline` ("his WS is now 3; bonuses still apply"), `@inline` ("at this point it is 3"), `@end` ("3, whatever"). The wording "becomes" is not used.
- **Build order for one number:** statline steps (written order) → in-line steps (written order) → end steps (written order) → **conditions** (lines beneath clean profiles; ticked on screen) → **output bounds** (manifest caps *at output*, e.g. TOW 1–10). Caps *at build* (e.g. Mordheim racial maximums) are checked when the build is complete and raise an issue if exceeded; raw and capped values are both kept.
- **End caps and floors also limit condition lines** (session 7): "WS at most 2 while cursed" holds when charging too; output bounds still clip last.
- **Relative weapon values read the bearer's final value** (after end steps) (session 7): a great weapon "S+2" on a Warboss with a potion (+1, in-line) and a spell forcing S 3 (`@end`) strikes at S 5. A weapon that should behave otherwise says so with its own target point.

### 5.3 Unordered bags
- Where nobody chose an order — an entity's own content effects and the picks at one node — steps of one target point combine **by kind**: add before multiply; caps and floors after; a bag holding two different sets on one field raises a **clash** notice.

### 5.4 Rounding and combine rules (manifest)
- **Rounding** is set per stat and per measure in the manifest (`rules/manifest.md` §2–3): **at each fraction step** (round immediately, or carry the fraction), **final** (round, or leave), **mode** (nearest, up, down, with a tie rule) and **granularity** (1, 0.5…).
- **Combine rules:** **repeated multiplies** on one stat **stack** (product) or apply **once** (only the strongest halving and the strongest doubling count); **source groups** (e.g. *body armour*) combine as *best* (only one counts) or *sum*. Same shape as parameters' best / sum / keep both.
- **Direction** of typed values comes from the manifest (+1 to a target number moves 5+ → 4+); **armour is a delta stat** (base 7 = none; light +1, heavy +2, shield +1, barding +1; *body armour* best), as stated in `rules/manifest.md` §2.

### 5.5 Fixed, rule numbers, borrowed values
- **Fixed:** a value marked *fixed* at a position can't be changed by later steps of any target point; the exception, not the default.
- **Rule numbers** (limits, sizes, pick limits, budgets, parameters, inputs) use the same cascade and are settled before anything reads them: static ones in the context phase (the FAQ's Grimgor "0–2", `max = 2 @statline`, is the roster's starting point); roster-dependent ones as selection-triggered effects in facts and logic.
- **Borrowed values** ("use the General's Ld") refer to another entity's resolved value; usually conditions. _(Cycle detection deferred to the Battle pillar.)_

### 5.6 Clash flag
- On test, on deploy and in the health report, a **clash notice** (default severity notice; a package or working context can raise it) when:
  1. two steps on one field from **different packages or nodes** don't commute (an add and a multiply, or two sets) and the other order would give a different result — shown with both results ("3 as written, 2 if reversed");
  2. two **active standalone patches** on the same target and field, neither superseding the other — shown with both results.
- Moving an attachment that creates or removes such a pair shows it when the draft is tested.

### 5.7 Examples
- **M 5 Orc:** world "orcs raised here move at half" (in-line ×½, round up each step) → 3; boon on the slot +1 → 4; marsh (battlefield) ×½ → 2.
- **FAQ and house rule on Black Orc shields:** book 1; FAQ entered as printed 2, stored +1 against the book; house rule +1 → **3** in either order (adds commute).
- **World ×½ S, army +1 S** on S 3: 3 → 2 → 3, with a clash notice "3 as written, 2 if reversed".
- **Curse `WS = 3 @statline`** on a hero with +2 WS advances → 5; written `@end` → 3.
- **Light armour and shield** (armour as a delta stat): +1 and +1 → 5+, whichever is default and whichever is picked.
- **Two halvings** (marsh and a spell) on M 4: *once* → 2; *stack* → 1, as the manifest says.

## 6. Caps

- **At build:** a restriction on what can be built, checked when the build is complete (catches picks and advances); a clip raises an issue so the user can choose otherwise. Example: Mordheim racial maximums (race → unit → army list; for a draw, the source acts as the list).
- **At output:** applied only when values are shown; the raw value is kept (S 11 is fine in list-hammer). Example: TOW 1–10 bounds (the default for manifest bounds).
- **A cap or floor from an effect** ("WS at most 2 while cursed") is an ordinary number edit, at the **end** target point by default (§5.2).
- **Raw and capped values are both kept**; outputs show either or both; the derivation path shows "limited by racial maximum 4".

## 7. Views — DECIDED (session 6)

| View | Includes | Battle-time picks | Default caps |
|---|---|---|---|
| **Build** | the build (what the roster lock covers) | no | switch: **off = theory** (S 11 shows 11) / **on = natural** |
| **Here** | + campaign-added pointers and stationed at | no | on |
| **Battle-ready** | + battlefield (site, scenario, terrain, spells in effect) and the side's own attachments | **no**: deferred choices show their available sets | on |
| **Battle** | + battle-time picks (spells chosen, items chosen at the start) | yes | on |

- **Build caps apply in every view.** Printed profiles **never fold in conditions**: condition lines of additions beneath, built on the view's value; ticked conditions recalculate on screen.
- Without a stationed-at pointer, Here = Build; without a battle in reach, Battle-ready and Battle show Here values, marked as such.
- **Legality per view (session 7, R6):** **finalise checks Build** — illegal issues block. Issues that exist only in **Here** (a *stationed here* composition rule) show on the roster as "here" issues, warnings by default, never blocking finalise. A battle runs a **Battle-ready check** on the battle record, warnings by default, never blocking its start.
- **Battle mode** (outputs) = the Battle view plus deferred choices showing what was picked or rolled, and optional battle-state fields.

## 8. Resolution

Everything keyed by **instance ID** (roster things) or **address** (definitions), so two resolutions can be diffed.
- **Header:** target, version selection, overlay marker ("test"), station, battle, ticked conditions, view, fingerprints.
- **Entities** (roster → branch rosters → units → profiles, slots, links, contingents), each with: identity (instance ID, entry and unit, labels and aliases, identity links, system tags, entity reference); **profiles** (values per position on the path, raw and capped, split by source class into characteristic and weapon/item lines, plus each condition's additions with sources); rules (parameters combined, rule type, origin); equipment (alias and real item, *always* / *when used*); **options** with state (available, newly unlocked, taken, excluded with reason, greyed with reason and what it waits on, orphaned) and cost here; deferred choices (available set; the battle pick when a battle is in reach); costs per measure with breakdown, counts towards, category as counted, roles; contingents (IDs, labels, model counts, recorded origin); struck-through marks; extra points.
- **Roster totals:** spend per measure (struck-through units count towards spent cost only), per category, per allocation, per branch, against targets and limits; computed measures; whole-force totals for grand armies.
- **Allocation** (draws), **issues** (including clash notices), **derivation index** (every value, option state, rule outcome, cost and total points to its path).
- **For a node target:** the definitions view (lists available, units with per-unit and per-model costs, army-wide rules, composition read back) and what the node changes compared with its parent, its working context root or the book.

## 9. Draws and allocation

- A draw's units, slots, contingents and individualised profiles have their own instance IDs with *drawn from* links (and the source roster version once finalised); system tag *drawn* with fraction of source.
- **Input, not reach:** the draw's input is the source's **build** (who the units are, picks, slot patches); the draw's own position then applies (its stationed at and campaign-added pointers, each defaulting to the source's; its battlefield; anything attached at the draw). Composition from the draw's own reach applies, tightest wins; anything unwanted is switched off at the draw.
- **Allocation per source instance** (via *drawn from*): models across a draw group ≤ source size; each source slot, contingent and individualised profile in at most one draw; holdings ≤ quantity.
- **Finalised siblings** are inputs limiting menus ("Halberdiers: 10 of 20 available, 10 with Patrol A"); **draft siblings** checked live. A group with conflicts can't be finalised.
- **Feeding back:** battle results recorded against a draw's IDs reach the source through the links (Campaigns policy decides what carries over).
- A grand-army **branch whose source is a roster** reads that roster the same way.

## 10. Queries over the same inputs

| Query | Built from |
|---|---|
| **Test** | resolve with and without the draft overlay; compare; clash notices raised or cleared |
| **Compare** | any two resolutions; entities **aligned** first (same instance ID → shared origin through identity links → same army-list entry, then order within it), then diffed field by field; unmatched shown as added or removed |
| **Lock check** | as locked vs current; or current fingerprint vs stored (§12); identity-only changes recognised by the old → new ID map |
| **Army-list revalidation** | any saved rules change runs the health check on every army list in reach (missing units or items, rules that can no longer be met, clashes), and the lock check on rosters |
| **Rehome plan** | `core/context-graph.md` §8, with before-and-after views of every roster below and the move choices (keep / rebuild / adjust / restore from history) |
| **Health report** | load errors, clashes (including clash notices), unused and switched-off items, superseded and inactive (amends) patches, unmet requires and conflicts, possible duplicates, optional consistency check |
| **Impact / dependency tree** | references and attachments, plus "rosters resolving it" from derivation indexes |
| **History** | every stored roster version containing an instance ID, plus every instance linked to it (drawn, split, merged, promoted, copied, transformed, **converted**), across rosters and editions, ordered; changes between appearances as diffs of stored records, optionally of their resolutions as locked |
| **Draw-group allocation** | a set-of-rosters request (§9) |
| **What if** | resolved with and without a proposed roster change: **add** a unit, **remove** a unit or pick, **take** an option or role; options opened, greyed, excluded or orphaned; affected units; totals and issues raised or cleared. Also the **greyed-options summary** |
| **Fixes** | `core/validation-and-fixes.md` |
| **Why?** | read from the derivation path and rule chain |

## 11. Derivation paths

- A path is an ordered list of **steps**, plus a **rule chain** for decisions (available, greyed, illegal).
- **Step fields:** kind (race base · parent race · tier step (fallback noted) · unit delta · structural edit · rule number · number edit (set / add / multiply / cap / floor) · charge · pick · switch-off / on · named-rule source · input · borrowed value · rounding · output bound · manual extra points); **target point** (statline / in-line / end); source item (ID, release or draft marker, package path `my_campaign › tow.faq1 › entry 14`); node and position on the path (build / campaign pointer / station / battlefield / side / condition) with the patch's flavour; phase; before → after; **outcome**: applied · overridden by (step) · lost to a later step at the same field · **ignored by** the target's rule · lost on specificity (named rules) · switched off at node X (and back on at Y) · **superseded by** (patch) · **inactive** (amends a patch that is off or missing) · lost in a combine rule (only one / once) · condition false.
- **Losers are kept with their reason**, so "why isn't my house rule applying?" always has an answer.
- **Rule chain:** the rule's read-back, the facts it used and, for each fact, its own path.
- Hidden by default, always available; every value in any output links to its path.
- Covers everything derived: stats, costs, options, rules, where points counted, which named-rule source won, switch-offs, supersessions, legality.
- Example: S 4 = orc base 3 → rank: normal +0 → delta +0 → "Brutal Orcs" (homebrew, world node, build, in-line) +1; condition: first round of combat +1 (choppa).

## 12. Locks and fingerprints — DECIDED (session 6, F3A)

- **Roster lock** (with each finalised roster version): content snapshots of every package and item in reach of the **build** (locks pin content, released or not), the source's version (draws), and a **fingerprint of the build**: values (raw and capped), rules held with parameters, options and states, costs, legality, structure, rule wording. **Station and battlefield are not in it.**
  - A change to any of these shows **"rules changed: review differences"** with a diff; nothing updates without the user's say.
  - Labels, aliases, notes and source references are left out: a change to those shows quietly as **"wording updated"**.
  - Changes at the stationed-at node (a weekly campaign effect) or a move of the pointer show only as a quiet **"conditions changed"** in the Here view.
- **Battle lock** (session 7): each side's locked roster version + **each side's stationed-at** (and campaign-added pointers) as recorded + the **battle record** (site, scenario, battle node, sides' attachments, battle-time picks). Resolving it *as locked* reproduces the actual state of everything in that battle. Held by the Battle pillar. In-world time and dated records are Campaigns' (not the Engine's).
- **View presets** are display settings, never fingerprinted.

## 13. Battle hook — DECIDED (session 7, R2)

- A battle is a **record** (a battle node placed anywhere convenient in the tree, e.g. under a campaign's "Battles" node, or standalone): **site** (the *fighting at* pointer), scenario, terrain, and one **side** per army (roster version, side inputs such as attacker / defender, composition packages, battle-time picks, the roster's stationed-at and campaign-added pointers as recorded).
- **Each side reads its roster as input**, exactly as a draw reads its source: build from the roster; campaign-added pointers and station from the recorded pointers; battlefield from the site's path and the battle node; then the side's own attachments and picks. A battle is always at a location.
- Battle-time picks (army flavour at the side) fill **deferred choices**.
- **In-battle state** (wounds, casualties by contingent, one-use items used, fled, model placement in ranks) is **not a resolver input**: it is the Battle pillar's state record keyed by instance IDs, merged by outputs.
- Battle rules that read the opposing side (hatred of the enemy general) are deferred to the Battle pillar.

## 14. Test cases
- **TOW O&G:** Grimgor's counts-as (lower stratum) → "Core units gain Stubborn" (roster criterion, next stratum) → Core ≥ 25% (check on spend vs a fixed 500). Big 'Uns exist statically, greyed until a Boss is present, in any order. Boar then barding (nested). Wyvern link from a pick. Magic items by fill by class; the 50-pt budget is a rule number, checked in checks. ✓
- **FAQ then house rule on shields:** FAQ entered as printed 2 (stored +1 against book 1), house +1 → 3, in either order. ✓
- **World half S then army +1 S:** 3 → 2 → 3, with a clash notice "2 if reversed". ✓
- **Light armour and shield, either default or picked:** +1 +1 → 5+. ✓
- **Two body armours on one model:** source group *body armour*, combine *best* → only the better counts. ✓
- **Curse `WS = 3 @statline` with +2 advances:** 5; `@end`: 3. ✓
- **Two halvings on M 4:** manifest *once* → 2; *stack* → 1. ✓
- **FAQ 1.2 with 1.1 in reach:** 1.2c supersedes 1.1c (1.1c off, shown "superseded by 1.2c"); 1.2b amends 1.0b (inactive with a warning if 1.0 isn't in reach). ✓
- **TOW unit at S 11:** Build with caps off shows 11; cards with caps on show 10; both available. ✓
- **Mordheim:** gold vs the target with struck-through warriors counted; warband rating as a formula result (struck-through not counted); experience inputs; racial maximums as build caps; henchman promoted to hero by split, history following the slot's ID. ✓
- **Quest:** career × level tier steps, fallback shown in the path. ✓
- **Patrol with limited crossbows:** draw units with own IDs; input is the source's build; fielding rule over stock; Patrol B limited by Patrol A's finalised commitments; compare aligns through *drawn from*. ✓
- **Siege scenario:** defender +25% as an input modifier on the battle roster; siege kit "granted by". ✓
- **Grom's army moved from Region 4 to Region 5:** the stationed-at pointer changes; the tree and roster version don't; build still reads Region 4; Here adds Region 5's heat; the weekly supply effect shows "conditions changed", not "rules changed". ✓
- **Battle in Region 6 between Grom (stationed Region 5) and an Empire army (stationed Region 7):** each side reads its roster; station from each recorded pointer; both get Region 6's fighting-here layers; Region 6's stationed-here layers touch neither. ✓
- **Camp bug (*based here* at the camp):** both camp-based armies get −1 S in Here; a patrol drawn with its based-at cleared doesn't. ✓
- **Great weapon on a Warboss with a potion and a spell forcing S 3 @end:** S 5 on the weapon line. ✓
- **Cursed "WS at most 2" model charging (+1 WS condition):** charge line stays 2. ✓
- **Wyvern Warboss stationed where "no monsters fielded here":** Build legal (finalise OK); Here warning. ✓
- **Strider in a marsh:** "ignored by Strider" in the path. ✓
