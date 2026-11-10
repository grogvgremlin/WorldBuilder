# The game-rules overlay (architecture v2)

_Session 13 (6–7 Nov 2026), opened from `handover-session-13.md`; **session 14 (8 Nov 2026)**: graded effects with declared reads (§5.3), the test view suggesting links (§9), standing moved to `world-structure.md` §6.1 (§15.6); **closed for the first prototype**. How a game system's rules read the v2 world: the world supplies the guest list (`foundations/reach.md`) and world values (`foundations/order.md`); the overlay turns game rules into effects on a system's protagonists. v1's cascade (`core/resolver.md` §5) is the guide; what it supersedes is listed in `foundations/v2-reconciliation.md`._

Markers: **AGREED** · **AGREED (tentative)** (try in the prototype) · **PROPOSED** · **OPEN**.

**Working rule (user, session 13)**: if in doubt, assume the user wants the **greater flexibility** — offer the options, with a sensible default.

---

## 1. Scope

**PROPOSED (session 13, opening summary)**: what the overlay must achieve.
1. ~~Translate world facts into game effects~~ — **moved to Conversion** (§2).
2. ~~**Select** what each system reads (the reading plan)~~ — **reading plan retired** (§10).
3. **Switch-offs before the fold** — settled (§9).
4. **The fold**: origin before environment; the split carried by the rule's nature, not the route (§6); target points; bags, rounding, combine rules, *fixed* as v1; order within a step (§8, §12). Test: Gunnery School `Ld = 8 @statline` + Schwartz `+1` + unpaid `−1` → **8**.
5. **Clashes and GM fixes** — settled (§12).
6. **Views and locks** — settled (§11).
7. **Derivation** — settled (§13).
8. **World-reading predicates** for scopes and hooks — settled (§17).

**Out of scope**: manifest, picks, logic rules, caps, battle state (v1 as decided); amounts and money (Campaigns); actions at a moment (play); world → system translation (Conversion); combat procedures and typed combat effects (match-up, in the tail, `foundations/tail.md`).

## 2. Translation belongs to Conversion

**AGREED (user)**: "the world is just propagating information". A world fact has no game effect by itself ("the rumour started in Nuln that we're not going to get paid"). The world can offer pointers but not impose; those pointers are conversion.
- Consistent with session 9 (`architecture-v2-notes.md` §3): **the fact is the hub, each system's effect a spoke**; fact → effect templates per manifest **propose** effects; no template → a narrative reminder. User then: "it's just another conversion".

## 3. Rules hang on reasons

**AGREED (tentative — user "I think that answers 1?")**
- Game rules (book, FAQ, homebrew) can hang on an **information context**: the **reason for the rule**, a world thing. Three sorts:
  - **attributes** — the Gunnery School's pride;
  - **events** — wages actually withheld; a truce signed;
  - **information items** — a rumour that wages won't be paid; a notice posted.
- **The reason is world, true in every system**; the rule belongs to the game context and is **overlaid onto the world through its reason**.

**AGREED (user): rules with no reason**
- Allowed: "−1 Ld in this region", attached at a place with no reason.
- They are **untagged game effects presented alongside world facts**, **not world facts** themselves.
- Shown to **every system, under the world's visibility rules**, with a **prompt to the author to give it a reason**. Never blocked.
- **Conversion needs nothing extra** (user): scope, effect and link are known, so the rule converts on that basis; if it can't, it comes back as itself, flagged (`pillars/conversion.md` §3). A reason only helps choose the nearest equivalent and end the rule with its cause.

**Status of the session-13 proposals on reasons**
- ~~**Reach to the reason**~~ — **set aside** by scope + trigger (§6). Role links (*affected by*, *party to*) are read instead by a **target filter** on *reaches* (§17).
- **Lifetime**: a scope + trigger rule is on exactly while its trigger holds; origin rules read as of raising (§7), so trained traits outlive their reason. Lifetime-follows-reason is the natural default for **environment** rules.

### 3.1 Truth vs belief: hooks read the truth, mediums carry belief (session 13)

**AGREED (tentative — user "think so … for now it's fine")**
- **Hooks read the truth**, and that includes **medium values at a place**: a rumour's currency in the Handgunners' camp is a fact about the camp. `reach.md` §9's default (source's view; impersonal → truth) is unchanged. **Session 14**: belief at a place is a **derived** value (`world-structure.md` §6.2), so a hook can read it with `value(…)` too.
- **Belief-driven rules** are written through the medium: a **rumour object** exists (on / off) and propagates as needed; the hook is "**currency of the unpaid-wages rumour > 50% where the unit is**"; the patch is "**hook true, or tag set**".
- **The tag is the GM's escape hatch** for a unit marked directly (a captain told them outright they won't be paid).
- **Exempting a unit** (Hoffmann keeps his men insulated from camp gossip): a **"not" in the condition** ("… and not tagged *steady*") or an **ignore rule** ("ignores rumours", shown as "ignored by" in the derivation).
- Same outcomes as the named-viewer table it replaces:

| Truth | Rumour in camp | Result |
|---|---|---|
| withheld | strong (they know) | −1 |
| withheld | weak (word hasn't arrived) | no penalty |
| paid | a strong false rumour | −1 |
| paid | none | no penalty |

- **Named viewers on hooks** — **set aside**: rules whose source holds beliefs are covered by §9; a single character's personal belief (WFRP) is just another fact a hook can read.
- User expects to find a way to break this later.

## 4. Information items and mediums

**AGREED (user)**: carried into `world-structure.md` §6.3 (information items, spread / currency / belief, mutation likelihood, medium inputs) and §6.2 (the first iteration of transmission for any medium, session 14). World-structure is now the statement of record.

- **Hooks are true / false / can't tell.** A threshold is still a true / false output (user).
- ~~**Graded hooks** (PROPOSED as a later extension)~~ → **graded effects** (session 14, §5.3): the hook stays boolean; the hook object declares the values it's about; each binding declares its reads and formula.
- **Flag volume: settled by §5.1** — a medium value no hook reads stays silent (visible if looked at, never pushed).

## 5. Rules reading world values: hook objects

**AGREED (user)**
- A rule may read **values in world facts**: a feud level, a rumour's currency; the **current nature of a timeline event** ("during the war, X hates Y"); a **place** ("we're in Averland, so horses are better").
- **The key is exposing it.** Two forms:
  1. **Direct**: the condition written in the rule ("Hatred (Sect A) whilst Hans's feud with Sect A is at −4 or worse").
  2. **Hook object**, made of:
     - a **label**: a plain word in the world's vocabulary, never a game term ("Hans hates Sect A");
     - a **condition** reading world values directly (Hans's feud toward Sect A at −4 or worse, as seen by Hans); conditions may use **not**; built from the expression tree plus the world-reading nodes (§17);
     - optionally, the **world values it's about** (its declared magnitude, §5.3);
     - **a hook per system** binding to it (WFB: Hatred (Sect A); WFRP its own equivalent, or nothing), each declaring the values it reads and its formula (§5.3).
- **Purpose: transparency.** §3's untagged effects show what is applied *now*; a hook object shows the **standing rule** — that a system applies something whenever the condition holds, and why — so other systems can bind their own equivalent and switch with the same condition.
- **Duplication is flagged** (user): two hook objects reading the same value with different thresholds raise a notice; they aren't forced to share.
- Sign conventions in examples are illustrative only.

### 5.1 GM flags are hooks bound to a notice (session 13)

**AGREED (user)**
- A **GM flag is a hook bound to a GM notice** instead of a game rule; there is no separate flag machinery.
- **Hooks that rules depend on** notify the GM when they **change state** (false → true, true → false), not on every read: "Wissenland isn't paying" turns true → "unpaid wages now applies to 12 regiments". One notice per change.
- **The GM can make notify-only hooks** for things no rule depends on: "tell me when any rumour in Nuln is 80% or more likely to have mutated".
- **Nothing else flags**: a value no hook reads stays silent.

**AGREED (user): statuses**

What a **hook** can report: **true**; **false**; **can't tell** — the data it reads is missing. A rule on a can't-tell hook doesn't apply; the GM is notified once.

Where a **GM notice** stands in the queue: **new** · **seen** · **snoozed** (until a date, or until the hook changes again) · **resolved** (links to what was done) · **dismissed** (kept in history, so the derivation can show "GM saw this and left it") · **superseded** (the hook changed back before the GM acted; closed automatically, kept in history).

### 5.2 Rule templates (session 13)

**AGREED (user)**: templates for rule hooks, **split like hook objects**:
- a **hook template, on the world side**, shared by every system: "<payer> isn't paying its bills" (slot *payer*: a title, organisation or treasury);
- a **rule template per system**, bound to the hook template: WFB "−1 Ld for <scope>"; WFRP perhaps "Fellowship tests −10 for <scope>"; or none.
- Filling it in once creates **one hook object** plus **a rule in each system** that has a rule template.
- Not combined per system: a combined template wouldn't share the hook.

**Taken as accepted**
- **When a template changes**, filled-in copies **follow** by default; the test-mode display (§9) shows each affected roster; **pin** or **copy** available.
- **Slot checks**: a slot declares what it expects; a mismatch **warns, never blocks**.
- **Where they live**: hook templates in the **setting package**; rule templates in each **system's package**.

### 5.3 Graded effects: declared reads (session 14)

**AGREED (user)**
- **Hooks stay true / false / can't tell.** No severity or bands on the hook: bands would force every system onto the same grain (WFRP may want a step every 10%, TOW every 25%).
- **A hook object may declare the world values it's about** (its **magnitude**: "currency of the unpaid rumour where the unit is") — declared, not graded.
- **Each system's binding declares the world values it reads and its formula.** Systems **can read different fields** (TOW currency, WFRP belief); the hook object shows every binding's reads and formula — "good to know" (user).
- The patch's **amount may be an expression** over those values (expression tree + `value(…)`, §17), applied only while the trigger holds; manifest rounding applies.
- **Explanation**: the rule builder's plain-English read-back of each binding shows automatically ("units commissioned by the treasury: −1 Ld per 25% currency"); an optional hand-written note per binding.
- **Notices**: the hook's own notices fire on switching on / off only; a moving amount shows quietly as "conditions changed" (Here); finer step notices, if wanted, belong to the binding. The existing clash notice catches a moving amount that changes which rule wins.
- Case: hook "word that Wissenland won't pay"; currency 60%: TOW `Ld −floor(currency / 25)` → −2; WFRP −1 per 10% → −6.

## 6. Scope + trigger: the general shape of a rule (session 13)

**AGREED (user)**: a targeted rule is written as a **scope** and a **trigger**, not hung on an event:

```
{ rule: Ld −1,
  scope: all units carrying the tag "commissioned by the Wissenland treasury",
  trigger_hook: "Wissenland not paying its bills",
  trigger_value: True }
```

- The **scope** picks the protagonists; the **trigger** is a hook object (§5) reading the world directly. Specific rules should be specified specifically.

**AGREED (user): scope + trigger is the general shape for every rule**; attaching at a thing is kept only as a **shorthand for a scope**. Consequences:
- **Routes drop out of the fold**: a rule's place in the fold comes from its **nature** (origin or environment, §7) and its **target points**, then the order within a step (§8, §12).
- **Reverses a lean, not a decision**: `graph-options.md` §7 leaned to attachment + climb; now the scope is the main carrier and reach supplies the facts scopes read.
- **Cost**: every scope checked against every protagonist; implementation (indexing), not design.

**AGREED (tentative): a scope is a query over the guest list.**
- Worked case (user's): "Extra training spinach in Averland: all units originating here +1 S". A regiment *raised at* a village → *in* Averheim → *in* Averland has Averland on its guest list by a raised-at route. The scope: `reaches(Averland, via raised at → in*)` (§17).
- **No hand-built collection**: a new village *in* Averheim is covered with no edit.
- **Attachment as shorthand**: "attach at Averland, for units reaching it by raised at" ≡ "scope: Averland on the guest list by a raised-at route".
- **The default link follows the kind of thing attached to**: a **place** → *in*; a **polity or title** → *ruled by* / *under*.

**AGREED (tentative)**: **when a scope could follow more than one route, the author selects**: a **name matching several things** → choose the thing; **one thing with several kinds** (Nuln: *settlement* + *polity*) → choose the kind, and so the link followed. Where only one route is possible, the default applies; the derivation shows what was chosen.

**AGREED (user, "both"): where a scope tag comes from** — a **named scope** (derived; a saved query that follows the world) or a **status** (recorded by hand). Both allowed; where both exist and **disagree**, a **duplication flag**.

## 7. As of when: a rule's nature is when its condition is read (session 13)

**AGREED (user)**
- **Origin rules read the world as of the unit's raising date**; **environment rules read it now** (the date being viewed).
- **A rule's nature follows when its condition is read**; the wording of the condition decides:
  - "Averland levy: +1 Ld **while** the Elector holds Grenzstadt" → **environment**;
  - "Averland levy: +1 Ld **if raised while** the Elector held Grenzstadt" → **origin**.
  - So nature and read time can never disagree, and nothing in Build can change with current events (§11).
- Case: the Grenzstadt Spearmen, raised 2520 at Grenzstadt (then *in* Averland), keep the spinach +1 S after Grenzstadt passes to Stirland (2523) and after a blight ends the spinach (2524).
- **Raising date**: a unit is stamped with the **current timeline point** when created; **overridable** on the unit or roster.
- **Plain list-building** is the same structure with a **single snapshot of the world on a single date**, dates hidden.

**AGREED (user): consequences**
- **Copies keep the original's date** through identity links; option to **re-stamp**.
- **Overrides are dated facts**, shown in the derivation ("raised 2510 (set by GM)").
- **Corrections** (bitemporal): a later correction that changes an as-of-raising answer raises a **GM flag**, not a silent change.
- **Replacements and merges are contingents (slots)** with their own details: recruits joining in 2524 from a Stirland village are their own contingent, raised 2524 there.
- **Outside battle, a mixed unit is separate units packaged together**: in Build and Here each contingent has its own effects.
- **The unit's battlefield state** (Battle-ready onwards): **original** · **new** · **average** (by model count, manifest rounding) · **majority** · **individual**.
- **Default set by the manifest**; suggested shipped default **majority, tie → original**. GM can change it **in bulk** or **case by case**.

## 8. Order within a step (session 13)

Only rules that **don't commute** need an order: adds never clash; in-line sets and add / multiply mixes do.

Case (origin, both in-line): **Wissenland discipline** `Ld = 7 @inline` (scope: raised in Wissenland) and **Nuln civic pride** `Ld +1` (scope: raised in Nuln). Wissenland then Nuln → **8**; Nuln then Wissenland → **7**.

**AGREED (user): the order within a step**
1. **Target point** (statline → in-line → end, as v1).
2. **Source layer** (book → FAQ → house rules → campaign).
3. **Category order** of the step (§12).
4. **Depth on a shared chain**: the **nearer applies later** (Nuln before Wissenland → 8). Matches nearest wins (`order.md` §7).
5. **Otherwise a bag by kind** (add before multiply), with a **clash notice** where the order would change the result; GM fixes by pin or in bulk (§12).

**Depth**
- For the fold, **nearer = fewer hops up the protagonist's own route** (village 0, Averheim 1, Averland 2).
- Depth gives no answer for **equal hops on different chains** — settled by the category order — or for **scopes that name no thing** → step 5.
- Target points settle most cases first: Wissenland's discipline written `Ld = 7 @statline` gives 8 in any order.

## 9. Switch-offs before the fold (session 13)

**General principle**: a switch-off is a rule whose effect is to remove another rule, for a scope, while its trigger holds. Switch-offs are **worked out as a set at the date read**, before the fold runs on what remains.

**The truce in the scope + trigger form**
- **P5, Old grudge**: `{rule: grant Hatred (Averland), scope: units raised in Nuln, nature: origin}`.
- **T1, the truce**: `{rule: switch off P5, scope: units serving a party to the truce, trigger: "truce in force"}`.
- The **Handgunners** are in both scopes → no Hatred (Averland) while the truce holds; the derivation shows "Old grudge, switched off by the truce".
- The **Countess's mercenaries** (serving her as a person) are outside T1's scope → keep Hatred.

**AGREED (user): chronology acts through the date, not sequence**: read in 2522, the Handgunners have Hatred; in 2524 (truce signed 2523), they don't.

**AGREED (user): what a switch-off names**
- A **rule** or a **package**, plus a **qualitative description of its effect** (a label for transparency; it never selects).
- **New rules are never caught automatically.**
- **Safeguard (user)**: when a new patch arrives, **cross-reference the protagonists it affects, grouped by roster, and show the effect** — v1's *test* query.
- **AGREED (tentative — user "can try it", session 14): the test view suggests links.** When a new rule's effect matches one an existing switch-off removes, for an overlapping scope, the test view offers "extend the truce to cover the Nuln war memorial?" (one tap). **Match on the effect itself**: the same granted rule (exact), or the same stat in the same direction (a setting, can be turned off to cut noise); scopes overlap on at least one protagonist. Never automatic; no description matching.

**AGREED (user): switching back on**
- A switch-on names the **original rule**, never the switch-off.
- Conflicts between a switch-off and a switch-on on the same protagonist and rule:
  - **on one authority chain**: **nearest standing law wins**, even if a superior's change came later (§15.4);
  - **between bases, or on unrelated chains — in-fiction switches**: **in-world chronology** — the one whose trigger **started later** wins;
  - **out-of-fiction switches** (errata, house rules): §8's order;
  - **ties, or a mix of the two kinds** → **clash notice**; GM pins.

**AGREED (user): across stages** — a switch-off removes the rule whatever its step and reads its own trigger at its own time: a truce (environment) switches off a grudge the Handgunners were raised with (origin).

## 10. The reading plan is retired (session 13)

**AGREED (user)**
- The **reading plan** has **no job left**: **which routes count** → each rule's **scope**; **the order of the fold** → §8, §12; **whose eyes a rule reads through** → `reach.md` §9 (the source's view; impersonal sources read truth).
- **No per-system defaults table** replaces it.
- **Stance wins over belief** (user): where a stance exists it decides; otherwise belief. A clash between the two is visible to the GM, who may call for a test — play.
- **Any belief counts** for selection; a rule that cares about strength tests it in its hook.
- **Weak statuses** are covered by `reach.md` §9.

**For Visibility** (carried to `pillars/visibility.md` via `foundations/v2-reconciliation.md` §3): **a player's belief view of the world, with the GM nudging it astray**.

## 11. Views and locks (session 13)

**AGREED (user)**
- **The same four steps as v1, in the same order**: origin → stationed → battle location → battle (views **Build · Here · Battle-ready · Battle**). In v2 these are **steps**, not trees: each gathers rules by nature from any chain.
- **How a rule is placed on a step**: by **what the rule reads**:

| View | Adds | Step |
|---|---|---|
| **Build** | origin rules (read as of raising) + picks | origin |
| **Here** | environment rules (read now) | stationed |
| **Battle-ready** | environment rules whose scope or trigger reads the **battle record** (site, scenario, terrain); a mixed unit's battlefield state applies from here (§7) | battle location |
| **Battle** | battle-time picks | battle |

- **Roster lock fingerprints Build**: a change shows "rules changed: review"; Here changes show quietly as "conditions changed".
- Greatswords *serve* the Elector title; their elite training is an origin rule read **as of raising**, so a new Elector doesn't change their build.
- **Nothing in Build can change with current events.**

## 12. Clashes and GM fixes: a category order per step (session 13)

**Clash notices carry over** from v1. Others join the same GM queue: duplicate hook objects (§5), switch conflicts (§9), "intended, didn't land" (`reach.md` §9), structural changes that move a value (`order.md` §4.5), hook state changes and can't-tell hooks (§5.1), cross-base clashes and defiance (§15). All use the notice statuses in §5.1.

**AGREED (user): a declared run order of categories, per step, editable**

| Step | Category order (default) |
|---|---|
| **Origin** | place → organisation / title |
| **Stationed** | place → organisation / title |
| **Battle location** | scenario → place / site (terrain with the site) |

- **All configurable**: shipped in the default setting package, editable per campaign or context. An edit is the **bulk GM fix**; dated, shown in the derivation. **Pins** remain for a single pair.
- Sits as **step 3** of §8.
- Worked case (Handgunners, base Ld 7): origin — Nuln civic pride (+1, place) → 8, then the Gunnery School (`= 8 @inline`, organisation) → 8; stationed — unpaid wages (−1, title) → **7**.

## 13. Derivation and "why not?" (session 13)

**AGREED (user)**

**Derivation fields**:
- **kind, source, before → after**;
- **base** — whose rule it is; for an embedded rule, the embedding ("Church privilege, via imperial law");
- **scope matched** — which scope, by which route; or "named scope" / "status (recorded)";
- **trigger** — which hook, and true / false / can't tell; **declared reads and formula** for a graded amount (§5.3);
- **step and read date** — origin as of raising (GM override shown), or environment now;
- **what decided the order** — target point, source layer, category, depth, bag, a pin or a category edit (dated);
- **outcome** — applied · lost to a later step · ignored by (rule) · switched off by (and back on by) · trigger false / can't tell · intended, didn't land · cross-base clash · inherited defiance · battlefield state.
- Losers kept with their reason, as v1.

Worked example (Handgunners' Ld, read 2525): profile 7 → Nuln civic pride +1 (raised at → Nuln; origin as of 2520; category: place) → 8 → Gunnery School `= 8 @inline` (member of → School; category: organisation) → 8 → unpaid wages −1 (named scope "commissioned by the treasury"; hook "treasury not paying": true; stationed, now) → **7**.

**"Why not?" is the tree** (user)
- **Any thing has a tree**: what it reaches, what reaches it, the rules active there.
- **A rule applies to X when four true / false tests pass**: the **scope matches** X; the **trigger is true**; **not switched off**; **not ignored**.
- **Flavour on the tree**: **inputs and thresholds** beside each boolean — "treasury not paying: **true** (*wages withheld* in force since week 3)"; "rumour currency 62% > 50%: **true**".
- **No standing near-miss list**: the tree is looked at on request.
- What the tree doesn't explain is **order**: that stays in the derivation fields.

## 14. (reserved)

## 15. Bases, recognition and defiance (session 13, user's model)

**AGREED (user)**: four independent entities **actioned at a place** — rules from separate **bases** meet where they land.

Running case: a Reik stretch *ruled by* Fred's title, *under* the lord, *under* the Emperor; a Marienburg toll-levy also applies there. Fred's edict levies one man in ten from armed bands stationed in his lands. The Church's law exempts Templars from lords' levies.

### 15.1 Bases
- **The Empire** (with its province, district and lordship layers), **the Church** and **Marienburg** are three distinct **bases**: authorities with their own law packages.
- **Every rule carries its base** as provenance.
- **Fred's law** is a layer of the Empire base.

### 15.2 Recognition = embedding
- "**The Empire recognises the Church**": Church law is **embedded at the root of Empire law** — by reference, with provenance.
- **Lower layers** can **switch portions off or back on**, using the existing switches (§9).
- Embedding can **follow**, **pin** or **copy**, as templates do.
- **Refines, doesn't contradict** `reach.md` §7 and `order.md` §6: bases stay distinct; recognition adopts by reference; the claim remains the world's record.
- **Structural rule**: an override from one base **lands silently only where the overridden rule's base has embedded it**; otherwise both rules stand and the clash is **flagged structurally** (Marienburg doesn't embed Church law → the Templar exemption vs Marienburg's levy is a structural clash).

### 15.3 Without recognition
- Where the Empire doesn't recognise the Church but Church rules **still land**, **Fred has to choose**, through his own laws.
- **Choices carry history and consequences**: **standing** (`world-structure.md` §6.1).

### 15.4 Defiance down one chain
- The lord switches off the Church portion embedded in Empire law: the **lord** defies the Emperor (flag on the lord).
- **Fred adds nothing**: **inheriting isn't a declaration** — no flag against Fred.
- **Fred switches it back on**: he **defies his lord** (flag on Fred).
- **Fred actually levies the Templars**: an **action**, so **play**.

**AGREED (user): an earlier lower law vs a later change from above**
- Case: in 2524 Fred passes "In my lands, the Church's privileges hold". In 2525 his lord switches the Church portion off for the province.
- **Nearest standing law wins**: Fred's law still holds; **Flag**: "Fred's 2524 law now conflicts with his lord's 2525 decree".
- Refines §9: chronology applies **between bases or unrelated chains**, not down one authority chain.
- **"Always on" toggle**: a lower law can be marked **entrenched**; it raises **one notice** when it first starts defying a superior.
- **Transmission**: by default a law change reaches everyone at once. Timing (a change cascading as a message) is **simple simulation**, in the tail; the values side of transmission is `world-structure.md` §6.2.

### 15.5 Parking a clash, visibility, log
- A structural clash can be **parked**: **out of fiction** (the GM dismisses the notice; re-flags only on a change of status) or **in fiction** (an **accommodation** recorded as a world thing). Both allowed.
- **The position where a switch takes place is highly visible**: shown at that node (card, map, tree).
- **Actioning the flag raises a notification**; the **decision goes to the log**; the **standing impact** is recorded.
- **Simulation** (GM aids, in the tail) may propose a response.

### 15.6 Standing between entities
- **Moved** (session 14): standing is agreed and stated in `world-structure.md` §6.1 (party to party, asymmetric, blocks of points with decay keyed by event type; network standing in the tail).

## 16. Open
- None for the first prototype. Items to try in the prototype are marked AGREED (tentative). Deferred items are in `foundations/tail.md`.

## 17. World-reading predicates for scopes and hooks (session 13)

**General principle**: scopes and hooks are written in the **existing expression tree** (`core/logic-rules.md` §6: all / any / not, present, absent, compare, count, sum, arithmetic, min / max, table lookup). A small set of **nodes that read the world** is added: the **guest list**, **world values**, and **dated things in force**.

**AGREED (user)**

**Nodes**
1. **reaches(target, via, when)** → yes / no (countable with *count*).
   - **target**: a thing (Averland), a kind (any title), or a **filter** on the thing landed on (any party to the truce). Filters only test the thing landed on; a filter **never widens what is reached**.
   - **via**: a route pattern — the entry link, then the chains it may climb (`raised at → in*`; `serves → under*`).
   - **when**: **as of** (default: the rule's read date); **ever** (the same history the unit card shows, following identity links); **during**(period or event).
   - **Statuses held** are reached by *holds*: "tagged *told unpaid*" = `reaches(told unpaid, via holds)`.
2. **value(of, …)** → a number, or *can't tell*: a **relation's level**; a **medium's value** at a thing (currency, belief); an **attribute**; **standing** (`value(standing, holder, target)`). **Start and end dates are readable**, so elapsed time is arithmetic: `read date − start(stationed at here) > 2 days`.
3. **in force(thing or kind, roles)** → yes / no: `in force(wages withheld, withholder = Wissenland treasury)`.

**References**: **protagonist**; **here** (the protagonist's stationed place); **slots** (a template's open slots); **other side** (in a battle, the opposing side's guest list — `pillars/battle.md` §1).

**Dates and views**
- Every node reads **as of the rule's read date** — except *reaches … ever / during*, which reads history up to that date.
- Each node uses `reach.md` §9's default view.

**The cases, rewritten**
- **Spinach**: scope `reaches(Averland, via raised at → in*)`.
- **Unpaid wages**: scope `reaches(Wissenland treasury, via serves → paid by)`; trigger `in force(wages withheld, withholder = Wissenland treasury)`.
- **Rumour morale**: trigger `value(currency of the unpaid rumour, at here) > 50%` **or** `reaches(told unpaid, via holds)`.
- **Hans's hatred**: trigger `value(feud, holder Hans, target Sect A) ≤ −4`.
- **The truce**: scope `reaches(any party to the truce, via serves → under*)`; trigger `in force(the truce)`.
- **Fred's levy**: scope `reaches(any place ruled by Fred's title, via stationed at → in*)`.
- **Veterans of the Siege of Nuln**: `reaches(Siege of Nuln, via participated in, ever)`; read now → environment; a **battle honour** (status) locks it into Build if wanted.
- **Fought in three or more battles**: `count(reaches(any battle, via participated in, ever)) ≥ 3`.
- **Foul water** (WFRP): `read date − start(stationed at here) > 2 days`.

**Not adopted**: a "historical" flag on link kinds (superseded by *ever*); a separate *age* node (superseded by readable dates).

**Authoring**: these nodes join the rule builder's condition list with plain-English read-backs; hook objects, scopes and templates become structured objects with editors (`authoring/authoring.md` §5; editors are authoring v2). Code-only patches are in the tail (`foundations/tail.md`); author-defined keys are infra.
