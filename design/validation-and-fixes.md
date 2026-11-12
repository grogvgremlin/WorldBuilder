# Validation, issues and fixes

_Topic doc (shared core). DECIDED unless marked. Severities decided in data-model session 3; fixes narrowed in session 6 (F7) and meant to be refined in practice, so the Engine must make new fix types easy to add. Session 7: legality per view (R6), clash notices (R1), exceptions always printed (confirmed)._

## 1. Principles

- **Building never blocks.** An illegal roster can be built and saved as a draft; issues are shown with explanations and fixes. (Hard cap enforced while building: filled slots + contingent models ≤ unit size.)
- **Finalised rosters must have no illegal issues in the Build view.** Issues that exist only **Here** (a *stationed here* composition rule) show on the roster as "here" issues, warnings by default, and never block finalising. A battle's **Battle-ready check** shows its issues on the battle record, warnings by default, and never blocks the start (session 7).
- Draw groups can't be finalised with allocation conflicts. Campaign-imposed locks use the same rule.
- **Violations are produced by logic rules** (or by the Engine's own structural checks) and carry their explanation and any fix hints.

## 2. Issues

| Field | Meaning |
|---|---|
| ID | stable for the same kind and subject, so dismissals and chosen fixes survive re-resolution |
| Kind | load error · clash · **clash notice** (order or competing patches; `core/resolver.md` §5.6) · orphan · rule failure (availability taken anyway, requirement, composition, check) · allocation · slot cap · build cap clip · uniqueness across rosters · rules changed since lock · **inactive amends** · **pointer to a hidden or missing node** |
| View | Build · Here · Battle-ready (where the issue exists) |
| Severity | illegal · warning · notice |
| Subject | instance ID or address |
| Message | the rule's read-back plus current values for checks ("requires warband worth more than 500 (currently 420)") |
| Explanation | the **smallest clash** (§4) and the rule chain |
| Fixes | tier 1 information and tier 2 patches (§5) |

**Severity**
- **Illegal** (blocks finalising, Build view only): failed requirement, composition rule or check; orphaned pick; allocation conflict between draws; slot cap; missing item the roster uses; same-flavour clash between non-nested nodes touching this roster.
- **Warning:** edit aimed at a missing key; "replace whole item" in use; unmet package *requires*; an *amends* patch inactive because its base is off or missing; rules changed since the lock; a build cap clipping a value; a unit present elsewhere when it should be unique across rosters (default; may be raised); any issue that exists only Here or at a battle.
- **Notice:** newly unlocked options; unused or switched-off changes; clash notices (default; may be raised); untranscribed rules-as-text on items the roster uses (optional, links to the to-do view).
- A package or working context can move an issue kind up or down a level.
- **Dismissed** warnings and notices stay hidden across re-resolution (stable IDs); illegal issues can't be dismissed. Dismissals are view state kept with the roster, not rules.

## 3. Orphans

- Removing the source of an unlock (or an option the roster took) orphans dependent picks. An orphan is an issue with three fixes: drop the upgrade; keep it with a unit-level patch linked to where it came from; keep it as an army-level rule, no longer conditional.

## 4. Explanations — DECIDED (session 6)

- Explain with the **smallest set of rules that clash** ("Two Grimgors break *Grimgor: 0–1* (Forces of Fantasy p.47)"), with the full rule chain expandable. (Configuration software calls this a minimal conflict; QuickXPlain-style.)
- "Why can't I take this?" and "why is this greyed?" read the same way.

## 5. Fixes — DECIDED (session 6, F7)

**Fixed for automatic patch fixes** (only ever fixed by hand, never offered as a generated patch):
- the **points reference** (target);
- **composition proportions** (Core ≥ 25%…);
- **unique models** (two Grimgors can't be patched legal; you could have one Grimgor plus a homebrew copy, "Bob", made by hand or through *create a copy*).

**Tier 1 — information**
- **Flags**, e.g. "composition out of proportion". Info only: in a campaign it may be fine.
- **Pointers:** roster changes that would make it legal ("take a Core unit", "drop the second Grimgor", "add a Black Orc Boss", "take the swap offered" for exclusions), plus fix hints written on the rule.

**Tier 2 — patches** (generated, chosen by the user)
- **Switch off** this rule (for this roster or wherever chosen).
- **Set to what's required**: a number set to the value needed ("0–1 → 0–2"), raising a model cap, **always allow** an option.
- **Create a copy** (e.g. homebrew Bob from Grimgor).
- **Split** (e.g. a unit over its size, split into two).
- Plus the orphan fixes (§3).

**Where a patch goes:** the user chooses: the roster's **exceptions node** (this roster only; a child of the roster, so it comes after the roster's own layers), the roster, the army list's node or any node above (every roster there), or the library.
- Chosen patches sit in the draft and are **tested together** (this roster and every other roster they would reach) before deploying; applying them is an ordinary change, never an edit to released content.
- Issues no patch can sensibly fix (allocation conflicts, the slot cap, physical models) offer tier 1 only.

**Exceptions are always printed** on the army list sheet and the house rules sheet, so an opponent sees them (confirmed session 7).

**Extensible:** the fix menu is expected to be refined in practice; new fix types plug in without changing the issue shape.

## 6. Uniqueness across rosters — DECIDED (session 6)

- A logic rule's scope can be **"all rosters below node X"** (e.g. the campaign root): "at most one Grimgor among all current rosters below the campaign". It reads the other rosters' **stored choices** (like finalised draw siblings), so no recursive resolution.
- It **flags** an issue; the user allows it with a patch as usual (or makes a homebrew copy).
- Struck-through units don't count.
- Modelling a mercenary company as its own roster that employers draw from is also possible (draw allocation then prevents it being in two draws out at the same time).

## 7. Army-list revalidation

- Every deployed rules change runs the health check on every army list in reach (missing units or items, rules that can no longer be met, clashes) and the lock check on rosters (`core/resolver.md` §12).

## 8. Test cases
- **O&G 2000 with two Grimgors, Core at 480 and orphaned Big 'Uns:** explanation "two Grimgors break Grimgor 0–1"; tier 1: drop one Grimgor, add a Core unit, add a Black Orc Boss; tier 2: Big 'Uns kept by orphan fix; Grimgor and Core not offered as patches. ✓
- **Illegal roster at finalise:** orphaned Big 'Uns kept as an exception patch (or allowed on the army list's node); roster legal; house rules sheet and army sheet show the exception. ✓
- **Campaign with Grimgor in two rosters:** uniqueness flag; user allows it with a patch or renames one as homebrew Bob. ✓
- **Wyvern Warboss stationed where "no monsters fielded here":** finalise OK (Build legal); Here warning on the roster. ✓
- **Scenario requires a unit the fixed list lacks:** Battle-ready warning on the battle record; the battle can start. ✓
