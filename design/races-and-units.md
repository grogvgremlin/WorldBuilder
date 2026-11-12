# Races, tier axes, units, profiles, slots and links

_Topic doc (rules library). DECIDED unless marked (data-model session 1). Content side only: what content **offers**. Filled slots, individualised profiles and actual links are roster data (`roster/rosters.md`)._

## 1. Shared rules for all content

**Extends**
- Any content except a manifest may **extend** one item of the same class or an ancestor class, storing **only what differs**: plain fields override; keyed lists add, remove or change members by key; statline values and maximums are differences (zero by default), so parent changes flow down; a value can be **pinned** ("Black Orc max S is 5, whatever Orc's is").
- Patches aimed at a parent reach its children by default; a selector can narrow to the parent only. Chains allowed (Black Orc → Orc → Greenskin); cycles are load errors.
- Example: *Armour of Doom* (magic armour) extends *heavy armour* and adds a ward save; an FAQ to heavy armour reaches it.

**Aliases at point of use**
- Any reference (a unit's equipment entry, an army-list entry, a rule on a unit) can carry a display label: "axe" pointing at *hand weapon*. Cards show the alias; the QRS groups by the real item ("Hand weapon (axes, swords)").
- **Promote** turns an alias into a child item (extends the real item) and re-points every use in one step. Child items when rules differ (Mordheim sword parries: sword extends hand weapon). Applies to rules too (race-specific names for a shared rule).

**Parameters**
- Content may declare parameters (key, label, type: number, choice or reference; default; **combine**: *best*, *sum* or *keep both* when the same rule arrives twice). References supply values ("Wizard (level 2)"). Narration placeholders and logic rules read them.

**Inline or pooled**
- Some parts (tier axes, option groups) are **inline** (owned by the item) or **linked from the pool** (a standalone shared item). A linked part extends the pooled one; **per-item tweaks are stored on the item** as differences by key (if the item isn't yours, the tweak is a patch on it). A part can be **copied** inline (frozen, *based on*); an inline part can be **saved to the pool**.

**General principle:** store only what differs, let changes flow down, use an override (pin) to stop them.

## 2. Races and tier axes

**Race** (class *race*): base profile (model statline; differences if it extends); maximums (differences or pinned; a cap **at build** or **at output** as the manifest sets); ordered axes (inline or linked from the pool; order = order deltas apply); granted rules (racial psychology); extends.
- A child race inherits its parent's axes, can add or remove by key, or patch nodes.
- Patches aimed at a race reach its descendants ("all orcs +1 S" hits Black Orcs); a selector can narrow to "Orc only".
- A manifest without maximums (Quest) leaves the field empty.

**Tier axis** (inline or pooled): a keyed **tree** of nodes (rank: normal → champion → hero → lord); per node a **delta relative to its parent node**, optional caps, granted rules and available advances (references to option groups); optional **keyed by** another axis.
- Axes are independent of each other; a profile picks one node per axis; no node has two parents.
- **Pooled axes** shared by several races (WFRP careers used by Human, Dwarf and Elf; a homebrew "veteran" axis), named by key so a pooled dependent axis works on any race with that keying axis.

**Dependent axis** (Quest career keyed by level; WFRP career keyed by career level)
- Its nodes carry no deltas; contributions live in a **grid of entries** keyed by (node of the keying axis, own node). Each entry is the career's **full contribution** at that level: stat delta, caps, granted rules, available advances.
- **Fallback:** no entry for (level, career) → the entry at the nearest ancestor level that has one; none → nothing. The authoring grid shows fallback cells greyed.
- Quest: (human, champion, barbarian) = human base + champion + barbarian-at-champion (or at normal). WFRP: rolled characteristics are an add patch on the individual (characteristic class), recorded once; careers by the same mechanism with caps, advances, skills and talents; advances are slot patches limited by them. Exact WFRP mechanics checked when entered.

**How a profile's statline is built**
1. Race base, walking up *extends* (differences added, pins respected).
2. Each axis in order: independent → deltas from root to the picked node; dependent → the fallback-resolved entry for the current pick on its keying axis.
3. The unit's delta.
4. Racial maximums and axis caps as caps (at build or at output); granted rules join the profile's rules.
Every step is in the derivation path.

**Book entry:** statlines entered **as printed**; the stored delta is printed − derived, against the **unpatched** base, so homebrew still applies on top. A unit can also have a plain statline with no race link, linked later. Minimum to enter a unit: stats and points (`core/items-packages-and-library.md` §2).

## 3. Dependent changes

- Editing a race, tier or maximum shows everything affected (child races, child tiers, units, slots, rosters), each branch able to:
  1. **Follow** the change (default);
  2. **Keep its values but stay linked** (a counter-modifier; still follows future changes);
  3. **Dissociate** (re-pointed to a new parent with current values preserved).
- The view also flags maximum breaches, costs unchanged by stat changes, and affected locked rosters.

## 4. Units

| Field | Meaning |
|---|---|
| Profiles | keyed list: the profiles making up **one model** (§5) |
| Size | min, max, default (a character: 1–1) |
| Cost | per model and/or per unit, in any measure |
| Equipment | references (alias, parameters), each saying which profile carries it |
| Rules | references (alias, parameters), applying to the unit, every model, or one profile |
| Option groups | keyed list, inline or linked from the pool (`rules/options-items-and-rules.md` §1) |
| Logic rules carried | rules that travel with the unit: its own limits (0–1, unique) and **selection-triggered effects** on others (Grimgor: "Black Orcs count as Core while I'm present") |
| May name models | whether rank and file can become **notables** |
| Extends | parent unit (Big 'Uns extends Orc Boyz) |
| Rules as text | scratch box (`core/items-packages-and-library.md` §2) |

- **A unit is a collection of models** (an Orc Mob is a group of Orc Boyz). Any list entry is a unit: troops, character, monster.
- **A character** is a unit of size 1–1 with no command options; no separate shape. Characters can be attached to units in the roster by links.
- **Category is not on the unit** (it belongs to the army-list entry). **Counts towards** is not a unit field: set on the army-list entry, on slot templates and on link effects; everything else defaults to its parent's category.
- **Where a rule lives decides where it travels:** printed as part of a unit → carried by the unit (works in every list with that unit, homebrew included); tied to one list → on that list's entry; army-wide → on the list.
- **Options cascade** from unit to models ("may take shields" applies to every model).

## 5. Profiles, mounts and links

**Profile** (a member of a unit's profile list): key, label (`rider`, `boar`, `crew`); **count per model** (cannon crew ×3; chariot boars ×2); **basis**: race + tier picks, **or** a mount/crew unit used as the source, **or** a plain statline; delta; equipment and rules scoped to it.
- Examples: Bretonnian Knights (knight + warhorse); chariot (chariot + 2 crew + 2 boars); Great Cannon (engine + crew ×3); a Mordheim hero buying a horse.
- Options can add, swap or target profiles (a Warboss takes a boar; barding on the horse); a profile can apply modifiers to a sibling (barding gives the rider +1 save).
- Profile costs roll into the unit; per-model mount costs charged per model. **Composition sees one unit.**

**Mounts and crew are ordinary units** of classes such as *mount* and *crew*, with their own profile, rules, equipment and cost; a profile uses one as its basis, so "all warhorses +1 M" is one patch on one item.
- **Default by content type:** ordinary mounts, crew and engines are **profiles**; monster mounts are **linked units** because their class **acts alone** (set per edition by the manifest).

**Individualised profile** (in a slot): own name, ID, deltas and patches (*Sir Gaston rides Bayard*); can be **promoted** to its own linked unit (Bayard surviving Gaston; a Mordheim warhound becoming its own entry), keeping its ID and history.

**Ridden monsters (linked by default):** the Warboss unit linked to a wyvern unit; the link **counts towards its parent** (the monster's points to the character allocation, no unit choice of its own unless an edition says otherwise); cards show them together; the wyvern carries its own wounds and "if the rider is slain" rule; if the link is removed (the monster stays on alone) it takes its own category (Monsters in WFB 4th, Behemoths in TOW).

**Links** are used for attached characters, ridden monsters, **detachments** (Empire: tied to a parent regiment, own category, size and options constrained by rules referencing the parent) and promoted profiles. Content offers links through option effects ("add a linked unit": unit, link type, counts towards); attached characters need no content, only rules ("may join units of…").

## 6. Slots on the content side

- A unit doesn't list slots; **every command slot comes from an option effect** "add a slot of kind X", carrying a **slot template**:

| Field | Meaning | Example |
|---|---|---|
| Kind | manifest slot kind | standard bearer |
| Tier step | from the kind's default, or overridden | champion → rank: champion; none for standard and musician |
| Label / alias | display name | "Boss", "Drummer" |
| Rules | special rules the slot carries | *Standard*, *Musician* |
| Equipment, deltas | anything else | a horn |
| Option groups | options for this slot only | magic standard up to 50 pts |
| Counts towards | default the unit's; overridden for character-like slots | WFB 4th champion → characters |
| Cost | the command option's cost | 10 pts |
| Fixed name | optional, for units that come with named command (Regiments of Renown: Ricco, his standard bearer) | — |

- **Standard bearers and musicians** keep the rank-and-file profile; their function comes from the template's rules. **Magic standards** are an option group on the template; limits ("only one unit may take a magic standard", "the BSB may take one if…") are logic rules.
- **The Battle Standard Bearer is a role**, not a slot kind.
- **Notables** need only *may name models*; the roster creates them.
- **Character-like slots:** a slot patched to become character-like can redirect its points to the character allocation (WFB 4th champions bought from the character allowance; Dogs of War Regiments of Renown with special command). Selectors can tell attached characters and character-like slots apart.
- Where a named leader is compulsory, a requirement rule says the command option must be taken.

## 7. Test cases
- Orc Boyz → Black Orcs: Black Orc unit on race Black Orc; shields 2 pts (per-unit tweak of the pooled group). ✓
- Orc Mob command: Boss (rank: champion), standard (rule *Standard*, magic standard group), musician. ✓
- Warboss on boar (profile) / on wyvern (link counting towards the Warboss). ✓
- Great Cannon: cannon ×1 and crew ×3, shot as a weapon item. ✓
- WFB 4th champion from the character allowance: slot counting towards characters. ✓
- Mordheim henchman group: 1–5 Human Warriors, may name models. ✓
- Orc Boss = orc base + champion + hero deltas. Quest Barbarian at level 3 with fallback. WFRP careers pooled across races. Mordheim advances limited by build-cap maximums. ✓
- 5th ed Dogs of War army: every entry a Regiment of Renown or special character with named command on fixed-name slot templates; 0–1 on every entry; own composition rules. ✓
- 4th ed Night Goblin netters and clubbers: named slots or a contingent inside the unit (each with its own ID for the battle map). ✓
