# Slice 1 brief — containers, a list builder, two logins and the submission route

_Written 12 Nov 2026 in the design project, from: slice 0's build log (owner feedback 1–12, questions for design 1–9), session 20 notes (§2.1–2.15 and notes 3 §0–0.3) and session 21 notes. Only **fixed** decisions are built: AGREED and AGREED (tentative). PROPOSED items from those sessions are listed in §9 as **not in this slice**, so nothing is built on them by accident._

_Goal: the core from slice 0 gets real containers, then carries an army list, a roster built from it (with or without a world), two logins on one device with a sealed secret, and a player's commit accepted or declined by the GM._

---

## 0. Order of work, and where to cut

Slice 1 is bigger than slice 0. Build it **in parts, in this order**; each part ends green and published. If the slice runs long, stop after a part and the rest becomes slice 2. Write in the build log where you stopped.

| Part | What | Acceptance |
|---|---|---|
| **A** | Containers; slice 0's GM fixes and display feedback | E1, E2, E4 still pass; C1, C2 |
| **B** | Races and tiers; army list and roster builder, standing alone or in a world | L1, L2, L3 |
| **C** | Two logins, roles, grants, view-as, a sealed secret | J1 |
| **D** | The submission route | I1 (cut down, §5) |
| **E** | A battle record with its lock (no map) | G1 |

---

## 1. Decisions to build (from the build log and sessions 20–21)

### 1.1 Answers to slice 0's questions for design
- **Q2 — decided order raises no clash notice.** A clash notice fires only when nothing decided the order (the bag). **The ordering detail goes into the derivation text** ("organisation after place, by category order; reversed it would be 9"). This is what slice 0 built; keep it, and make the wording say it.
- **Q3 — category order has three ranks**: place → organisation → title (an organisation grants a title). **Configurable at macro and micro level**: see §1.2.
- **Q5 — order within a bag**: set → add → multiply → cap → floor. **Configurable at macro and micro level** (§1.2).
- **Q9 — read before raising**: the card says "Not raised until 2520", printed profile greyed, no rules. Already built; keep.
- **Still open — keep slice 0's behaviour until answered**: Q1 (target points across steps), Q4 (partial depth ordering), Q6 (does a named scope that is one `reaches` carry depth?), Q7 (how a hook's condition names a link between two named things), Q8 (where acceptance is recorded). Q8 matters in Part D: see §6.

### 1.2 "Macro and micro configurable" (owner, on Q3 and Q5)
Design: `rules-overlay.md` §12 (AGREED) — "a declared run order of categories, per step, editable … shipped in the default setting package, editable per campaign or context. An edit is the bulk GM fix; dated, shown in the derivation. **Pins** remain for a single pair."
- **Macro**: the category order per step, and the bag order, are **content**: held in the manifest's base package (the shipped default) and overridable per **manifest context** (§2). Not constants in code.
- **Micro**: a **pin** puts one rule before or after another for one value. A pin is a **dated GM fix**, written as a log entry, withdrawable like any entry.
- Both show in the derivation: "order: place → organisation → title (context default, set by the GM 12 Nov)"; "pinned: School before Nuln (GM, 12 Nov)".
- **Owner feedback 1** (swap or pin from the card) is this: on the unit card's derivation, a pair can be **pinned** or **swapped**; the result is a pin entry.

### 1.3 Lists stand alone (session 21 §1, user's correction)
The app is used for **pick-up battles** where lists have no world at all. **A roster must be buildable and resolvable with no world**: the world is optional input to the rules, not a precondition. Design shape (`visibility.md` §3, AGREED tentative; `rules-overlay.md` §7, AGREED): a **practice roster** is **not registered** in the world — no holder or uniqueness limits, no lots, no log entries — and plain list-building is "a single snapshot of the world on a single date, dates hidden". With no world, the snapshot is empty: only the army list's own rules apply.

### 1.4 Logins, the submission route, maps (session 20 §2.1–2.5, AGREED)
- **Two logins on one device**: one GM, one player, logging in and out (§2.2).
- **Roles and grants are real**: a sandbox GM and a player as **dated role entries**; per-viewer derivation (§2.2; `visibility.md` §4).
- **Unencrypted, seams real** (§2.1): `unseal()` now **checks the grant** (still no decryption). A view is derived **strictly from the viewer's grants** — never GM data with screens hidden.
- **The submission route** (§2.3): a player's commit shows as awaiting on her login, lands in the GM's draft batch, and the GM accepts or declines with a reason.
- **No maps** (§2.4). Battles have no coordinates.
- **Content by text import only** (§2.5). On screen: cards, derivations, "why not?" trees, and **play screens**: a basic roster builder, the GM sealing a secret and setting its reveal, recording a battle, the draft-batch review, a login switch. **No editors** (rule builder, scope editor, world canvas).

### 1.5 The server (session 20 notes 3 §0.3, AGREED tentative) — what it changes now
The design moved from "no server" to **one server the owner runs, which reads the data**; devices keep the full copy and work offline. **The server is a later slice.** For slice 1:
- Everything stays on one device. That device stands in for the server: it orders the log.
- **CLAUDE.md's "No server, ever" is out of date** and is changed with this brief.
- **The envelope field "host sequence number" is the order number the server will stamp.** Keep the field; its name can follow the design fold (§8). Nothing in slice 1 depends on the name.

### 1.6 The look iterates (session 21 §1.3, AGREED tentative)
The look will go through several rounds of mockups; the current look is not fixed. So:
- **All colours, type, spacing and radii come from a small set of design tokens** (CSS custom properties in one file). No colour or font written inline in a screen.
- Screens stay functional in slice 1. Layout follows the lead device per area (session 20 notes 3 §0, AGREED): **lists phone-first** (desktop heavily used too), **world desktop-first**, **battle phone-first**. Everything works on all three.
- Don't build the north-star mockup's styling or a theme system: both are still proposals (§9).

---

## 2. Part A — Containers (owner feedback 12, "the most important")

Slice 0 holds one flat world: every deployed rule is in play for every unit, and the stat order and category order are constants in code. Before more is built on top, the containers become real. This is the design's existing shape (README §1 "Sharing a world between systems"; `world-structure.md` §12; `items-packages-and-library.md` §4; `manifest.md` §1, §9); slice 1 builds the smallest working version of it.

### 2.1 The containers

| Container | What it holds | Slice 1 |
|---|---|---|
| **Library** (on the device) | Packages not tied to any world: manifests, base packages, army lists, rules packages | One library. Packages are imported into it by text. |
| **Manifest** (content, one per edition) | Statlines (stat order), classes, categories (army categories, e.g. Core / Special), rule categories and **category order per step**, **bag order** | The WFB stat order and default category order move out of code into a manifest fixture. |
| **Sandbox** | One world (things, dated links, events), one log, its roles. | One or more sandboxes on the device; one is open at a time. |
| **Manifest context** (inside a sandbox) | Which manifest it uses; which library packages are **switched on**, in order; its own overrides (category order); its GMs | A sandbox has one or more contexts. A rule is in play for a unit only if its package is switched on in the unit's context. |
| **Roster** | Units picked from an army list | **Registered** (in a sandbox and context, linked into the world) or **practice** (not registered, outside any sandbox: §1.3). |

- **A package is not a scope.** Switching a package on in a context is what puts its rules in play there; the rule's scope still decides which units it lands on.
- **World content belongs to the sandbox, rules to packages.** Slice 0's E1 fixture mixes world things, rules and a unit in one package because there was nowhere else to put them. Split every fixture into **world** (sandbox content), **rules** (a library package), **army** (army list in a package; rosters) and **log** (entries).
- **Order of packages in a context** is the member order of the context's package list: content first, then patches in order (`items-packages-and-library.md` §4).
- **Requires and conflicts** between packages: shape in the schema, a warning only.
- **Out**: releases, supersedes, switch-offs (E3), the library browser, branching, promote as new.

### 2.2 Acceptance
- **E1, E2, E4 still pass**, with their fixtures split as above and the category order read from the manifest.
- **C1 — a package switched off in a context.** E1's world in a sandbox with one WFB context. The unpaid-wages rule sits in its own package ("Wissenland campaign rules"); Nuln civic pride and the Gunnery School in another. Read 2525 with wages withheld: both packages on → **7** (E1). Switch the campaign-rules package off in this context → **8**; the derivation lists the wages rule as "not in play: package off in this context", not as a scope or trigger failure. Switch it back on → **7**.
- **C2 — category order from the context.** In E1, the context overrides the origin order to organisation → place. Origin: School `= 8` then Nuln +1 → 9; stationed −1 → **8** (wages withheld). The derivation says "order: organisation → place (set for this context by the GM, date)". Withdraw the override entry → back to 7. Then **pin** Nuln before the School on this unit only: same as E1 (**7**), with "pinned" in the derivation.

_C1 and C2 are new cases written for this brief from `rules-overlay.md` §12 and `items-packages-and-library.md` §4. They go to the test corpus at the next fold._

### 2.3 Display feedback from slice 0 (all in the design; no new mechanisms)
- **Things grouped by kind** (feedback 11): on the World tab, things under each kind; a thing with several kinds under each (`world-structure.md` §2–3).
- **A thing's tree at a date** (feedback 3; `rules-overlay.md` §13): what it reaches, what reaches it, the rules active there, at a chosen read date.
- **A rule's page lists the units it applies to** (feedback 10; `rules-overlay.md` §9, §13): at a chosen read date, each with its route. **Never list the units it doesn't match.** To ask "why not?" about another unit, pick it, or narrow the unit list with a **filter** over units and their links (raised at somewhere in Averland; member of the Gunnery School), then open its tree.
- **The kind a scope uses** (feedback 2; `rules-overlay.md` §6, AGREED tentative): where a thing has several kinds, the author's chosen kind (and so the link followed) **shows in the derivation**. No new question at import; the rule's category already records it.
- **References by label** (feedback 9; `text-format-and-csv.md` §3): link ends, condition targets and roles may be written as labels; a label is matched against deployed items as headers are (one match takes its key, written back; none or several is a problem on that line).
- **Not now**: shorter derivation wording (feedback 5, owner: later), attach a rule at a thing (§6 shorthand).

---

## 3. Part B — Army list and roster builder

### 3.1 What's built
- **Manifest content** for one edition by text import: model statline, classes (unit, special rule, equipment, option group, army list), army categories and their limits as simple rules (`manifest.md` §1–4, §9).
- **Races, tiers and unit deltas** (`races-and-units.md` §1–2, DECIDED; the resolver's step kinds *race base · parent race · tier step · unit delta*, `resolver.md` §13): a profile is built as **race base** (walking up *extends*: Black Orc → Orc) → **tier axis** steps (the rank axis: normal → champion → hero → lord) → the **unit's delta** → racial maximums as caps. Statlines are **entered as printed**; the stored delta is printed − derived against the unpatched base, so a patch on the race ("all Orcs +1 S") reaches every unit of that race and its child races. Every step shows in the derivation. **Out**: dependent axes (careers keyed by level), pooled axes, the dependent-changes view (§3).
- **Army list content**: units with their profile (as above), base cost per model, minimum size, options (option groups with costs per model or per unit, one-of or any-of), equipment, special rules as text (`army-lists.md`, `races-and-units.md`, `options-items-and-rules.md`). Rules-as-text boxes shown on the card.
- **Roster builder** (play screen, phone-first): new roster from an army list → add units → size → tick options → points total, by category, against a limit → **validation** with the issue shown (over the limit, a category limit broken, below minimum size) (`rosters.md`; `validation-and-fixes.md`, issues and severities only; fixes later).
- **Two kinds of roster** (§1.3):
  - **practice**: outside any sandbox; resolves with army-list rules only;
  - **registered**: in a sandbox and context; each unit **registered in the world** as a thing linked to its world links (*raised at*, *member of*, *stationed at*) with a raising date (`world-structure.md` §12; `rules-overlay.md` §7: a unit is stamped with the current timeline point, overridable).
- **Unit card** for a roster unit: profile (army-list base + options + world rules), equipment, rules, points; the read-date control and derivation from slice 0. In a practice roster, no dates and no world.
- **Text format**: rosters export and import as text, like everything else.

### 3.2 Not built
Draws and allocation, inventory, split / merge / transform, contingents, locks, versions, output templates and printing, magic item allowances, mounts, characters' slots (stub actors), cost formulae, fixes.

### 3.3 Acceptance
- **L1 — a pick-up list with no world.** A practice roster from the fixture army list: Handgunners ×10 with a champion and a musician, plus one other unit. Points total and per category correct against the list's costs; one category limit broken shows as an issue; Ld reads **7** (printed profile; no world, no world rules). Nothing is written to any log.
- **L2 — the same list, registered.** The same units as a registered roster in E1's sandbox: the Handgunners raised at Nuln 2520, member of the Gunnery School, stationed at Nuln. Ld at 2525 = **7** with wages withheld, **8** with wages paid — the E1 values, now coming through the roster. The derivation shows the army-list base first, then the world steps.

- **L3 — racial deltas.** Fixture races: Human (Empire), Orc, Black Orc *extends* Orc, each with the rank axis. (a) Handgunners entered as printed: the derivation reads race base Human → unit delta (0 where printed = base) → Ld 7. (b) The Handgunner champion (Marksman) reads Human → **champion tier step** (+1 BS) → the printed champion line. (c) A homebrew package "Brutal Orcs: S +1 to race Orc", switched on in a context: Orc Boyz and Black Orcs both S 4 → 5, with the derivation step "race Orc, homebrew"; a selector narrowed to "Orc only" leaves Black Orcs at 4. (d) Switched off, everything is back as printed.

_L1–L3 are new cases written for this brief from §1.3 and `races-and-units.md` §2. **Fixture armies** (owner, 12 Nov): **WFB 6th edition Empire** by default; where a case needs a second player in the same manifest, **WFB 6th edition Orcs & Goblins**; a case written for another game uses that game. Keep the fixture lists small (a handful of units each); points and profiles as printed in the books._

---

## 4. Part C — Logins, roles, grants, a sealed secret

### 4.1 What's built (`infra.md` §4–5; `visibility.md` §1, §4, §6)
- **People and logins** on one device: a login switch; a password is optional in slice 1 (no encryption to unlock).
- **Roles as dated entries**: sandbox GM and player. A GM who also plays has a **GM view and a player view**.
- **View-as**: a GM can view as any player; the view is derived **strictly from that player's grants**, read-only.
- **Grants as data**: who may read which field. **A reveal is a dated entry.**
- **`unseal()` checks the grant.** A field the viewer may not read is **absent** from their derivation. The player sees no "can't tell" for a secret they don't know exists (`visibility.md` §3, §6).
- **Caches** of derived values are kept per viewer (or not at all).

### 4.2 Acceptance
- **J1 — the curse.** From session 20 §2.2 (AGREED) and `visibility.md` §6. E1's world, wages paid. The GM adds a curse on the Handgunners, `Ld −1`, **sealed for the GM role**. The player's login (Bea, owner of the roster) reads **Ld 8**, and her derivation has no trace of the curse. The GM's own view reads **7**. The GM sets the curse's **reveal at battle set-up**. When the battle's set-up entry is accepted (Part E, or a stand-in set-up entry if E is cut), a reveal entry grants Bea the curse: her view now reads **7**, and the derivation shows the curse with "revealed at set-up, date". The GM viewing as Bea before the reveal sees 8.

_J1 is the first of the Visibility cases (section J) that `handover-session-20.md` §3 asked for. It goes into `test-corpus-v2.md` at the next fold._

**The reveal "at set-up"**: build the minimum — the reveal is set on the secret as "reveal to the owner when a set-up entry for a battle including this unit is accepted"; accepting that entry writes the reveal entry. Hook objects as a general mechanism stay out (`rules-overlay.md` §5). Note it in the build log as the minimum taken.

---

## 5. Part D — The submission route

### 5.1 What's built (`infra.md` §6; `campaign-loop.md` §1.3, §7)
- **A player's commit is a submission.** On her login it shows **awaiting**: provisional, shown as such, usable for further work. Derivations read accepted entries, **plus the viewer's own awaiting entries, shown provisional**.
- **On the GM's login it lands in a draft batch**: differences only ("24 unchanged" hidden, show all), **bulk accept by group**, **sensitive kinds held back** from bulk accept (deaths, transfers between players), each item **accepted or declined with a reason**.
- **Accepted** → ordered log entries. **Declined** → returned to the player with the reason; whatever depended on it is re-derived and checked; an **integrity notice** only if something broke (`infra.md` §3), with no fixes proposed yet.
- **Proposed vs committed**: an item edited before commit keeps both, with the editor and reason ("proposed +2 · committed +3 by Bea · re-roll from *Lucky*").
- **Auto-accept**: the setting exists (default off); not built.

### 5.2 Acceptance
- **I1, cut down.** Bea's Reikland warband vs Cal's Clan Skaar: I1 is written for **Mordheim**, so it uses a small Mordheim manifest and two small warband lists (fixture rule, §3.3). Two manifests on one device is also a check on Part A's containers. Bea enters a post-battle batch of items as text (no outcome feed: there's no battle engine). Expected as `test-corpus-v2.md` I1: unchanged items hidden behind "show all"; bulk accept takes gold and XP but not Karl's death or the shard; she ticks both; one commit writes the entries; the wyrdstone entry reads "proposed +2 · committed +3 by Bea · re-roll from *Lucky*"; the shard entry records "signed off by Bea"; nothing reaches the log before commit. **Then** it travels as a submission: the GM accepts all but the shard, which he declines with a reason; Bea sees it returned with the reason.
- **Dice are out** (§9): the re-roll is a manual edit with a reason.

### 5.3 Q8 must be answered before Part D
Where acceptance is recorded, given nothing is edited in place and status sits inside the seal: **(a)** an acceptance entry (status worked out from later entries, as withdrawal is now), or **(b)** the order number on the envelope standing for "accepted". With the server now the orderer (§1.5), the order number becomes the server's; a GM's acceptance is a separate act. **Lean (design project): (a)**. Build (a) unless the owner answers otherwise before Part D starts.

---

## 6. Part E — A battle record and its lock (no map)

### 6.1 What's built (`battle.md` §4, §8, §8.1)
- **A battle**: date, site (a world place, optional), the rosters taking part (registered or practice), and **set-up** as an entry.
- **Practice battle** = outcome feed off: kept as a battle record outside the world log (`visibility.md` §3).
- **Effective time** on entries, separate from recorded time.
- **The battle lock**: snapping a battle fixes what it read. A later change with an effective time **before** the battle but recorded **after** the snap leaves the record unchanged, with a **permanent out-of-sync flag** (notice dismissible, mark stays) and a parallel recompute.
- **Out**: the action log, turns, positions, outcome feed and victory conditions.

### 6.2 Acceptance
- **G1** as written in `test-corpus-v2.md`, both variants.

---

## 7. Throughout

- **Every rule from CLAUDE.md holds**: append-only log; withdrawals; one read path; pure resolver; every value says what it read.
- **Tests before screens**, from the cases above.
- **Fixtures** in `test/fixtures/`, split by container (§2.1), loadable from the app.
- **Round trip** still passes with sandboxes, contexts, rosters, roles and grants in the whole copy.
- **`structure.md` and `build-log.md`** kept current. New text shapes (manifest, army list, roster, sandbox, context, roles, pins) proposed in the build log as in slice 0.

---

## 8. Design docs to copy into `design/`

From slice 0: `infra.md`, `rules-overlay.md`, `resolver.md`, `text-format-and-csv.md`, `test-corpus-v2.md`, `world-structure.md`, `glossary-v2.md`, `v2-reconciliation.md`.

**Copied 12 Nov for Parts A–B:** `manifest.md`, `army-lists.md`, `races-and-units.md`, `options-items-and-rules.md`, `patches.md`, `items-packages-and-library.md`, `validation-and-fixes.md`, `rosters.md`. These are v1 in shape: where they speak of nodes, attachment and working contexts, §2.1 above says what that means now.

**To copy before Parts C–E** (ask through the build log if you get there first): `core/identity-and-versioning.md`, `pillars/visibility.md`, `pillars/campaign-loop.md` (§1, §7, §9 matter), `pillars/battle.md` (§4, §8 matter).

**Not yet folded into the design docs** (sessions 20–21): the server (§1.5) — `infra.md` §4–6 still say "host"; read "host" as "the device standing in for the server". The answers in §1.1. The cases C1, C2, L1, L2, J1.

---

## 9. Not in this slice — proposals from sessions 20–21, not yet agreed

Listed so they aren't built by accident:
- Dice in the slice (session 20 §2.6) — out; edits by hand with a reason.
- Decks; calendars beyond plain years / day counts (§2.6).
- "Awaiting GM" / "awaiting server" naming; GM-device merge as the offline mode; one server, many sandboxes (notes 3 §0.2–0.3.1).
- Structure-first editors and the scope sentence builder (notes 3 §0.1) — editors are out anyway.
- One app, separate tools per sandbox; build-order and timebox rules; "every slice ends in something used at the table" (session 21 §1–1.2).
- The north-star look; two-layer theming (viewer base theme + army atmosphere); in-world links on the card (session 21 §1.3–1.4).

---

## 10. Owner decisions wanted (none blocks Part A)
1. ~~Which army and edition~~ — answered 12 Nov: WFB 6th Empire; 6th Orcs & Goblins as a second player; another game where a case is written for it (§3.3).
2. **Q8** before Part D (§5.3).
3. Q1, Q4, Q6, Q7 when convenient; slice 0's behaviour stands meanwhile.
