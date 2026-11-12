# Build log

Running record of the build: technical choices (with one line of why), the text shape proposed for world items, and questions for design.

---

## Slice 1 status (12 Nov 2026)

Built in parts, in the brief's order (§0). **Part A is done; the build stopped there.** Part B needs the WFB 6th Empire numbers (`build/army-data-request.md`).

| Part | State |
|---|---|
| **A** Containers; GM fixes; display feedback | ✓ E1, E2, E4 pass with fixtures split by container and orders read from the manifest. **C1** ✓ (`test/cases/c1-package-switch.test.ts`), **C2** ✓ (`test/cases/c2-category-order.test.ts`). Round trip ✓ with sandboxes, contexts and GM fixes. |
| **B** Army list and roster builder | Waiting on army data |
| **C–E** Logins, submissions, battle | Not started; design docs for them not yet copied (brief §8) |

### What Part A built
- **Containers** (brief §2.1): the **library** and each **sandbox** are content spaces; keys are unique within a space. The **manifest** (stat order, category order per step, bag order) is content in the WFB 6th base package. A **sandbox** holds one world and its own log. A **manifest context** names its manifest and the library packages switched on in it, in order. A unit reads in its context (its own `context:`, or the sandbox's first).
- **A rule is in play only if its package is on in the unit's context** (C1). A rule from a package listed but switched off shows as "not in play: package off in this context", with who switched it and when. Rules from packages not in the context aren't shown.
- **GM fixes are dated log entries in the sandbox's log**, withdrawable (brief §1.2): `package_switch`, `category_order` (macro, per context and step) and `pin` (micro, one pair on one value, for one unit or every unit). The derivation shows them: "order organisation → place → title, set for this context by owner, 2026-11-12"; "pinned: Nuln civic pride before Gunnery School (owner, 2026-11-12)".
- **Q2, Q3, Q5** as answered: the ordering detail is in the derivation text with what reversing would give; the category order has three ranks; the bag order comes from the manifest.
- **Display feedback** (brief §2.3): things grouped by kind; a thing's tree at a read date (what it reaches, what reaches it, the rules naming it); a rule's page lists only the units it applies to, with a filter (name, link, target, "or anywhere inside it") to ask "why not?" about others; the kind a scope read shows in the derivation ("Nuln (settlement · polity), read as place"); references by label on import.
- **Screens**: a sandbox switch; a **Library** tab (packages, manifests, and each context's packages with Switch on / off, category order with Change / Back to default, pins with Remove); the unit card offers **Pin this order** and **Swap** on any adjacent pair whose order changes the value. Design tokens are in `src/ui/tokens.css`; no styles inline in screens (brief §1.6).
- **Migration**: slice 0's stored data (IndexedDB version 1) and exported copies are brought forward on open / import: the world into a sandbox "slice0", rules into the library, a WFB 6th manifest added, one context with every old package switched on. Old drafts are dropped.

### Technical choices (slice 1)
| Choice | Why |
|---|---|
| Content keyed by (space, key); `space` is "library" or a sandbox key | Two sandboxes can each have their own Nuln; the library is one namespace (v2-reconciliation §3, author-defined keys). |
| One log per sandbox: the sandbox is the log's partition (IndexedDB index on it), not a field inside the seal | Keeps the sealed envelope as infra §5.1 says; a server will order each sandbox's log separately. |
| IndexedDB version 2 (`logs`, `items`), migrating version 1 inside the upgrade | The owner's phone keeps its slice 0 data. |
| Whole copy version 2 (`logs` by sandbox); version 1 copies are migrated on import | Old exports still load. |
| GM fixes have no in-world date; the latest accepted entry per context (and step, or pair) wins | They are out-of-fiction fixes (rules-overlay §9: errata and house rules follow §8's order, not chronology). See question 13. |
| A pin moves its first rule just before the other within one step and target point, and takes both out of the bag | The GM has decided their order, so no clash notice for that pair. |
| Pin and swap are offered only for adjacent pairs whose order changes the value | Pinning a commuting pair changes nothing. |
| Fix dates in derivations are the recorded day (`2026-11-12`), not a localised date | Keeps the resolver's output the same on every device. |
| No manifest found → built-in WFB orders, with a warning on the card | A sandbox still resolves while its base package is missing. |
| Library rules may name things by bare key; a key-like name no sandbox has is accepted quietly | Library packages are world-agnostic; a sandbox may be loaded later. See question 10. |
| Test worlds are sets of files (`test/fixtures/sets.json`), loaded as drafts and deployed in order with "Deploy all" | Imports still land in drafts first (text-format §1); later files see what earlier ones deployed. |
| A thing's tree walks links on at the read date, each thing once by its shortest route, at most 8 hops | Readable, and stops runaway walks in big worlds. |
| `src/ui/tokens.css` holds every colour, type size, spacing and radius; two columns above 760px | Brief §1.6: the look iterates; world views desktop-first, lists phone-first. |

### The text shape, slice 1
World content and rules now go in **different files**: a file starting `package:` is a library package (rules, named scopes, a manifest); a file starting `sandbox:` is a world (contexts, things, links, units, events, log). References may be labels. Full description and tested examples: **`build/yaml-guide.md`**. The slice 0 section below is kept as history.

### Questions for design (slice 1)
10. **Library rules name sandbox things by bare key.** A library rule says `reaches(nuln, …)`; each sandbox reads `nuln` in its own world. v2-reconciliation §3 says cross-namespace references carry a prefix and a bare key works inside its own namespace. Built as: bare keys in library rules resolve in the sandbox that reads them. Is that intended, or should a library rule reach world things another way (template slots, a setting package)?
11. **Where campaign packages live.** C1's "Wissenland campaign rules" is built as a library package, switched on in E1's context. Should a campaign's own rules live in its sandbox instead (campaign-loop §12.3's "campaign-local package")? Built: packages only in the library.
12. **Named scopes in both places.** Built: a named scope can be in a library package (with the rules that use it) or in a sandbox. Right?
13. **Package switches and the read date.** A switch applies at every read date (out of fiction). Should a GM be able to switch a package on from an in-world date (a campaign rule that only starts in 2524)? Today that's a rule trigger's job.
14. **Pins across steps.** A pin between rules in different steps or target points is ignored (it can't change their order). Right?

---

## Slice 0 status (10 Nov 2026)

| Done-when item (brief §5) | State |
|---|---|
| E1 passes as a test | ✓ `test/cases/e1-handgunners.test.ts`: 7 with wages withheld, 8 after the withdrawal entry; derivation shows routes, trigger, order |
| E2 passes as a test | ✓ `test/cases/e2-depth.test.ts`: 8 by depth; 8 in any order when written `@statline` |
| Round trip passes | ✓ `test/cases/round-trip.test.ts`, on both the in-memory and IndexedDB stores |
| E4 (stretch) | ✓ `test/cases/e4-grenzstadt.test.ts`: +1 S kept in 2525; "while the Elector holds" stops in 2523 |
| Installed on the iPhone from the Pages link | Published: Pages deploys from `main` (first merge 10 Nov). Phone checks: see "Closing slice 0" below |
| `structure.md` and `build-log.md` | ✓ |

Checked in a headless phone-sized browser against the production build: load E1 from its fixture → deploy → Ld 7 → withdraw → 8 → add again → 7; data kept across reload; the app opens offline once loaded.

### To publish
1. The repository is **private**. GitHub Pages from a private repository needs a paid GitHub plan (Pro, Team or Enterprise). On a free plan, make the repository public, or tell me and I'll propose another static host.
2. Repository **Settings → Pages → Source: GitHub Actions**.
3. Merge this branch into `main`. `.github/workflows/pages.yml` tests, builds and publishes. The address will be `https://<owner>.github.io/WorldBuilder/`.
4. On the iPhone, open the address in Safari → Share → **Add to Home Screen**. Open it once online; after that it works offline.

---

## Technical choices

| Choice | Why |
|---|---|
| Pinned versions: Vite 6, Vitest 3, React 18, TypeScript 5.8, zod 4, yaml 2 | Well-known, stable releases; newer majors add nothing slice 0 needs. |
| zod 4's built-in `z.toJSONSchema` for `schema/*.schema.json`; a test fails if they are stale | One definition; no extra generator library. Run `npm run schema` after changing a schema. |
| Plain IndexedDB, no wrapper library | About 100 lines; nothing hidden from a reviewer. |
| `fake-indexeddb` in tests | The IndexedDB store runs the same contract and round-trip tests as the in-memory one. |
| IndexedDB log keyed by an auto-increment number, unique index on entry ID only | Gives append order without reading inside the seal; refuses a duplicate entry. |
| `replaceWithCopy` wipes and loads in one transaction | A bad import file can't leave half a copy. |
| `vite-plugin-pwa` (Workbox, generated service worker, auto-update) | The standard way to make a Vite build installable and offline; precaches every built file. |
| Icons drawn by `scripts/make-icons.mjs` (no image library) | Three PNGs; a dependency would be overkill. |
| No router: four tabs held in React state | Four screens; a router adds nothing yet. |
| `src/ui/app-data.ts` holds the app's operations; screens only render and call it | Keeps the screens thin, as CLAUDE.md asks. |
| IDs: `crypto.randomUUID()`; device ID made on first run and kept in meta | Unique without a server. Tests inject repeatable IDs and times. |
| Persistent storage asked for on first run (and again on later starts until granted); the answer is shown on the Data screen | Brief §3. |
| Export uses the iOS share sheet when available, else a download link | On an installed iPhone app, "Save to Files" goes through the share sheet. |
| "Withdrawn" is derived, not written: `readLog` marks an entry withdrawn when an accepted, not-withdrawn withdrawal entry names it | Nothing is edited in place. Withdrawing a withdrawal brings the original back. |
| Content items are replaced by key on deploy | Content has no release history in slice 0. The log stays append-only. |
| A route search is breadth-first; each (thing, pattern step) is visited once | Finds the shortest route first; stops loops. |
| Depth = links climbed after the entry link | Matches rules-overlay §8 ("village 0, Averheim 1, Averland 2"). |
| Numbers are not rounded | No manifest rounding in slice 0; nothing in E1, E2 or E4 makes a fraction. |
| A rule on a stat the unit's profile doesn't have is skipped | No base value to fold from. |
| Re-importing text whose `log:` events are already logged (same event key) skips them, with a warning | Loading a fixture twice doesn't double the event. |
| Exported text: one canonical form (sections in the package's own order, a unit's links under it, every rule's `layer` written out) | Re-importing an export changes nothing, and a fresh import rebuilds the same content: tested for every fixture. |
| Importing part of a package keeps its other members (deployed members first, new ones added at the end) | text-format §6: edit some entries and re-import; only those show as edits. Before this, re-importing one rule would have dropped the rest from the package's member list. |
| Code boxes scroll sideways instead of wrapping | A wrapped YAML line reads as a different structure. |
| Version label (`commit · date`) on the Data screen | So the owner can tell which build the phone is running. |
| Second workflow `test.yml` runs tests and the build on other branches | Catches problems before merging to `main`. |

---

## The text shape for world items (proposal, brief §3)

_Superseded by slice 1 Part A (package files and sandbox files): see `build/yaml-guide.md`. Kept as history._

The design has no text shape yet for world things, links, events, named scopes or scope + trigger rules. This follows `text-format-and-csv.md` §1–3: valid YAML, short positional tuples, `(label, key)` headers, keys written back, one file = one package. Worked examples: `test/fixtures/*.yaml`.

```yaml
package: [E1 Handgunners' Ld, e1_handgunners]   # (label, key)
layer: book                                     # source layer for its rules (default book)

things:                                         # (label, key, kinds)
  - [Nuln, nuln, [settlement, polity]]
  - [Talabheim, ~, [settlement]]                # ~ = no key yet: one is written back
  - Altdorf                                     # label alone: key written back

links:                                          # (from, kind, to, start, end) — end optional
  - [nuln, in, wissenland, 2000]
  - [grenzstadt, in, averland, 2400, 2523]

units:
  - unit: [Nuln Handgunners, nuln_handgunners]
    raised: 2520
    profile: [3, 3, 3, 3, 3, 1, 3, 1, 7]        # manifest stat order M WS BS S T W I A Ld, or a map {Ld: 7}
    links:                                      # (kind, to, start, end); start defaults to `raised`
      - [raised_at, nuln]
      - [member_of, gunnery_school]

scopes:                                         # named scopes: saved queries
  - scope: [commissioned by the treasury, commissioned_by_the_treasury]
    query: reaches(wissenland_treasury, serves > paid_by)

rules:
  - rule: [Gunnery School, gunnery_school_pride]
    effect: [Ld, =8, inline]                    # (stat, edit, target point), as text-format §2
    scope: reaches(gunnery_school, member_of)
    trigger: in_force(wages_withheld, withholder = wissenland_treasury)   # optional
    nature: origin                              # origin (read as of raising) | environment (read now)
    category: organisation
    layer: faq                                  # optional: overrides the package's layer

events:                                         # world history: stored as content
  - event: [Spinach grows in Averland, averland_spinach]
    kind: spinach_harvest
    roles: {where: averland}
    period: [2400, 2524]                        # (start, end)

log:                                            # same shape; appended to the log as event entries on deploy
  - event: [Wages withheld, wages_withheld_2524]
    kind: wages_withheld
    roles: {withholder: wissenland_treasury}
    period: [2524]
```

**Conditions** (scopes, triggers, named-scope queries) are written as §17's nodes:
- `reaches(nuln, raised_at > in*)` — one thing; `*` means "any number of times";
- `reaches(any title, serves > under*)` — any thing of a kind;
- `reaches(siege_of_nuln, participated_in, ever)` — "ever" instead of "as of";
- `in_force(wages_withheld, withholder = wissenland_treasury)` — an event kind or event key, plus roles;
- `all(…)`, `any(…)`, `not(…)`;
- a bare key is a named scope.

`→` is accepted for `>`. The import review reads every condition back in this one form.

**Edits**: `+1` / `-1` (a bare number is an add, as text-format §2), `=8` with a required target point, `x2`, `at most 3`, `at least 3`. Target point words: `statline`, `inline`, `end` (with or without `@`).

**Keys**: a written key wins. With no key, the label is matched once against deployed items of the same class: one match takes its key; none or several makes a new slug key (several also gives a warning). The rewritten text is shown in the review to copy back. Links have no header: their key is the tuple `from~kind~to~start`.

**Problems** are reported per line (YAML line numbers) and never stop the rest: an item with an error is left out; warnings (missing reference, no category, unknown section) still import.

---

## Owner feedback on the prototype (10 Nov 2026)

Candidates for the next slice brief. None is a design change: each is in the design, outside slice 0's brief.

1. **Swap or pin the order from the card.** The Gunnery School's order matches the design (category decides), but there's no way to change it on the card. Design: pins and category-order edits are the GM fixes (`rules-overlay.md` §12), shown dated in the derivation.
2. **Place or polity?** Nuln is a settlement and a polity. Nuln civic pride's scope targets the thing Nuln by `raised_at > in*` (containment, so effectively the place). Its `category: place` is written on the rule, not taken from the kind. Design (`rules-overlay.md` §6, AGREED tentative): where one thing has several kinds, the author chooses the kind (and so the link followed), and the derivation shows what was chosen. Slice 0 neither asks nor shows it.
3. **Tap a thing to see its tree.** Design (`rules-overlay.md` §13): "any thing has a tree: what it reaches, what reaches it, the rules active there". Slice 0 only gives the tree per rule on a unit card.
4. **Rules on their own.** A list of every rule (scope, trigger, nature, category, layer, package) without opening a unit.
5. **The explanation is wordy.** Fine for now; refine the derivation's wording later.
6. **A guide to the text format.** Done: `build/yaml-guide.md`, with examples checked by a test.
7. **"View rule", with export.** Done: on the unit card, each rule has **View rule**: its text as it would be written for import, with Copy, Export rule and Export package.
8. **The same for every item.** Done: the World tab lists units, things, rules, named scopes, events and packages. Tapping one shows it in words (a thing's links in and out, its events and the rules that name it, directly or through a named scope; a rule read back in plain English; a package's members) and **View text** with the same Copy / Export / Export package. This also covers items 3 and 4 in part: a thing shows the rules that name it, and rules can be opened on their own. Not yet the full tree (what reaches it, worked out at a date).
9. **Keys you don't know.** References (link ends, condition targets, roles) must be keys in slice 0; labels resolve only in headers. Owner asked what happens when you don't know the key. Answered; see the reply in the session. Candidate: resolve references by label as well, writing the key back (`text-format-and-csv.md` §3, the same rule as headers; authoring v2 "resolve on entry").

Added 12 Nov 2026, from checking on a desktop:

10. **A rule should link to the units it lands on.** A rule's page shows the things it names (Nuln), not the units it reaches through them. Slice 1 candidate: at a chosen read date, list the units it **applies** to, each with its route. **Don't list every unit it doesn't match** (owner): that gets out of hand as the world grows. To ask "why not?" about others, pick them directly, or narrow the unit list with a filter (an advanced option) over units and their links (e.g. raised at somewhere in Averland, member of the Gunnery School), then show the tree for those. Design: `rules-overlay.md` §9 (the test view: protagonists affected, grouped by roster), §13.
11. **Things grouped by kind.** The World tab groups items by class; things should also be grouped by kind (settlement, polity, organisation, title), a thing with several kinds under each. Display only, no design question. Design: `world-structure.md` §2 (kinds), §3 (topics are display groupings).
12. **Structural: the package is the only container (most important).** In slice 0 the device holds one flat world: every deployed item and one log. There is no manifest (the WFB stat order and default category order are constants in code), no sandbox, no manifest context and no working context. Every deployed rule is in play for every unit; its scope alone decides who it lands on. A package is only a bundle of items imported together: it records where they came from and sets the default source layer of its rules. It sets no scope, sits at no level, and isn't switched off, superseded or required (none of that is built). The E1 fixture mixes world content (places, organisations, links), system rules and a protagonist in one package only because slice 0 has nowhere else to put them; the design keeps them apart (the world or setting, the system's rules package, a roster registered in the world). **Before more is built on top, a brief needs to decide the containers:** the sandbox (the world), the manifest context or contexts in it, which packages sit in each, and where rosters live. The design docs on the manifest, packages and the library, and sandboxes aren't copied into `design/`; that brief would need to bring them over.

---

## Closing slice 0 (10 Nov 2026)

Slice 0 stops adding features here. Everything in "Owner feedback" above, apart from items done, goes to the slice 1 brief.

**Left for the owner to check on the iPhone** (a failure here is fixed in slice 0; anything else waits):
- [x] Installed from https://grogvgremlin.github.io/WorldBuilder/ (Share → Add to Home Screen)
- [x] Opens with Airplane Mode on
- [x] E1 still there after a few days; Data tab says storage is persistent
- [x] Round trip on the phone: Export → Files → Wipe → import → same values  - user: tested for 2 days
- [x] E1: withdraw / add again flips Ld 7 → 8 → 7, derivation explains it

**To take to the design project:**
- Questions for design 1–8 below (9 decided by the owner).
- The verdict on the YAML text shape (keep / change / drop).
- **First, the containers (feedback 12):** sandbox, manifest context(s), packages, rosters. This shapes everything after it.
- Owner feedback items not done, as slice 1 candidates: a rule's page listing the units it lands on, with a filter for "why not?" (10); things grouped by kind (11); references by label; attach a rule at a thing (§6 shorthand); the full tree at a date (what reaches a thing); pin or swap order from the card; shorter derivation wording; choosing a thing's kind in a scope; fixtures split into world / rules / army / log.

---

## Questions for design

Each is built the way described, so slice 0 runs. None changes E1, E2 or E4.

1. **Target points across steps.** Built as: every statline edit first (origin step, then stationed), then every in-line edit (origin, then stationed), then every end edit. That follows `resolver.md` §5.2 ("statline steps → in-line → end" over the whole path). `rules-overlay.md` §8 lists target point as the first key *within* a step, which could instead mean origin (statline → in-line → end) then stationed (statline → in-line → end). The two differ only for a statline or end edit in the stationed step. Which is meant?
2. **When does a clash notice fire?** Built as: only when nothing decided the order (step 5, the bag) and swapping changes the result. When the category or depth decides a non-commuting pair (E1: Nuln +1 then the School `= 8` → 8; reversed 9), no notice is raised; the derivation shows "swapped with the step before: 9" as information. `resolver.md` §5.6 (1) would raise a notice for any non-commuting pair from different packages. Should a decided order still raise one? (- user: decided order is fine to not raise.  the ordering detail should make it into the derivation text)
3. **"place → organisation / title".** Built as two ranks: place first, then organisation and title sharing a rank. Or is it three ranks: place → organisation → title? (- user: it is three, but mainly because an organisation should grant a title.  As with everything else is should be macro and micro configurable)
4. **Depth when only some rules share a chain.** Built as: depth orders a group only if every rule in it has a route, all routes lie on one chain, and no two depths are equal. Otherwise the whole group goes to the bag. Is a partial ordering wanted instead (depth for the rules that share a chain, the bag for the rest)?
5. **Where sets go in a bag.** `resolver.md` §5.3 says add before multiply and caps and floors after, but not where a set goes. Built as set → add → multiply → cap → floor. (- user: Yes.  As with everything else is should be macro and micro configurable)
6. **Named scopes and depth.** A named scope is treated as "a scope that names no thing" (no depth; straight to category, then the bag). Right? (- user: Yes although need some examples)
7. **"While the Elector holds Grenzstadt" (E4).** §17 has no node for "does X rule Y now?" between two things other than the protagonist. Built as a trigger read through the unit: `reaches(elector_of_averland, raised_at > ruled_by)`. Is that the intended way to write it, or does §17 need a node for a link between two named things? (- user: don't understand. "does X rule Y now?" is a hook and we shoudl have that covered)
8. **Entry status inside the seal.** `infra.md` §5.1 leaves only ID, recorded time, device and host sequence number outside the seal, so status sits inside. In slice 0 status is written once at append ("accepted") and "withdrawn" is derived from withdrawal entries. When the host arrives, how does an entry move from awaiting host to accepted without an edit in place: an acceptance entry, or the host sequence number (outside the seal) itself standing for "accepted"? (user: need a tangible example)
9. **Read date before the raising date.** ~~Should the card say "not yet raised"?~~ **Owner decision (10 Nov):** yes. Read before its raising date, a unit reads nothing from the world: the card says "Not raised until 2520" and shows the printed profile, greyed, with no rules (`UnitResolution.notYetRaised`; tested in E1). To carry back to the design project.

**Still open:** 1 and 4 have no answer yet.

### Examples asked for (12 Nov)

**6. Named scopes and depth.** Two origin rules, both category place, on Handgunners raised at Nuln (Nuln is *in* Wissenland):
- Nuln civic pride `Ld +1`, scope `reaches(nuln, raised_at > in*)`: Nuln is 0 hops up the unit's chain.
- Wissenland discipline `Ld = 7 @inline`, scope written **directly** as `reaches(wissenland, raised_at > in*)`: Wissenland is 1 hop up. Depth decides: Wissenland first, Nuln later → **8**. This is E2.
- Now write Wissenland discipline's scope as a **named scope** "raised in Wissenland" whose query is that same `reaches(…)`. Built as: a named scope names no thing, so it has no depth. The pair falls to the bag (set before add) → still 8 here, **with a clash notice** ("8 as ordered, 7 if reversed").
- The question: should a named scope that is a single `reaches` to one thing carry that thing's depth, so it orders the same as writing it directly?

**7. "While the Elector holds Grenzstadt".** Agreed, it's a hook: "the Elector of Averland rules Grenzstadt". The question is what the hook's **condition** is written with. §17 gives three nodes: `reaches` (starts from the unit), `value(…)` and `in force(…)`. "The Elector rules Grenzstadt" is a link between two named things, and neither is the unit. Ways to write it:
- **(a) Through the unit**, as built: `reaches(elector_of_averland, raised_at > ruled_by)`. It works only because these units were raised at Grenzstadt; a unit raised elsewhere can't use the same hook.
- **(b) As an event in force:** model the holding as a period that holds the link (`world-structure.md` §7: a reign holds a link package), then `in force(elector_rules_grenzstadt)`.
- **(c) A new node** that tests a link between two named things at the date, e.g. `linked(grenzstadt, ruled_by, elector_of_averland)`.
- Which is intended?

**8. Entry status inside the seal.** Bea, a player, is offline. She buys a sword: her device appends an entry, status **awaiting host**, inside the seal. Next day she syncs; the GM's device (the host) accepts it. Where is "accepted" recorded, given nothing is edited in place and status is inside the seal?
- **(a) An acceptance entry:** the host appends a new entry, "accepted Bea's entry X", with its own host sequence number. Bea's entry is never touched; its status is worked out from the entries that follow, as withdrawal is now.
- **(b) The host sequence number:** the host stamps a number on Bea's entry's **envelope** (outside the seal, so no unsealing needed). Having a number means accepted. The sealed part is untouched, but the envelope is changed in place.
- Which is intended?
