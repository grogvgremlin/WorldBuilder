# Build log

Running record of the build: technical choices (with one line of why), the text shape proposed for world items, and questions for design.

---

## Slice 0 status (10 Nov 2026)

| Done-when item (brief §5) | State |
|---|---|
| E1 passes as a test | ✓ `test/cases/e1-handgunners.test.ts`: 7 with wages withheld, 8 after the withdrawal entry; derivation shows routes, trigger, order |
| E2 passes as a test | ✓ `test/cases/e2-depth.test.ts`: 8 by depth; 8 in any order when written `@statline` |
| Round trip passes | ✓ `test/cases/round-trip.test.ts`, on both the in-memory and IndexedDB stores |
| E4 (stretch) | ✓ `test/cases/e4-grenzstadt.test.ts`: +1 S kept in 2525; "while the Elector holds" stops in 2523 |
| Installed on the iPhone from the Pages link | **Waiting on the owner**: Pages has to be switched on, and the branch merged to `main` (see "To publish" below) |
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

---

## Questions for design

Each is built the way described, so slice 0 runs. None changes E1, E2 or E4.

1. **Target points across steps.** Built as: every statline edit first (origin step, then stationed), then every in-line edit (origin, then stationed), then every end edit. That follows `resolver.md` §5.2 ("statline steps → in-line → end" over the whole path). `rules-overlay.md` §8 lists target point as the first key *within* a step, which could instead mean origin (statline → in-line → end) then stationed (statline → in-line → end). The two differ only for a statline or end edit in the stationed step. Which is meant?
2. **When does a clash notice fire?** Built as: only when nothing decided the order (step 5, the bag) and swapping changes the result. When the category or depth decides a non-commuting pair (E1: Nuln +1 then the School `= 8` → 8; reversed 9), no notice is raised; the derivation shows "swapped with the step before: 9" as information. `resolver.md` §5.6 (1) would raise a notice for any non-commuting pair from different packages. Should a decided order still raise one?
3. **"place → organisation / title".** Built as two ranks: place first, then organisation and title sharing a rank. Or is it three ranks: place → organisation → title?
4. **Depth when only some rules share a chain.** Built as: depth orders a group only if every rule in it has a route, all routes lie on one chain, and no two depths are equal. Otherwise the whole group goes to the bag. Is a partial ordering wanted instead (depth for the rules that share a chain, the bag for the rest)?
5. **Where sets go in a bag.** `resolver.md` §5.3 says add before multiply and caps and floors after, but not where a set goes. Built as set → add → multiply → cap → floor.
6. **Named scopes and depth.** A named scope is treated as "a scope that names no thing" (no depth; straight to category, then the bag). Right?
7. **"While the Elector holds Grenzstadt" (E4).** §17 has no node for "does X rule Y now?" between two things other than the protagonist. Built as a trigger read through the unit: `reaches(elector_of_averland, raised_at > ruled_by)`. Is that the intended way to write it, or does §17 need a node for a link between two named things?
8. **Entry status inside the seal.** `infra.md` §5.1 leaves only ID, recorded time, device and host sequence number outside the seal, so status sits inside. In slice 0 status is written once at append ("accepted") and "withdrawn" is derived from withdrawal entries. When the host arrives, how does an entry move from awaiting host to accepted without an edit in place: an acceptance entry, or the host sequence number (outside the seal) itself standing for "accepted"?
9. **Read date before the raising date.** A unit read before it was raised still resolves (origin rules read as of raising; environment rules read the earlier date). Should the card say "not yet raised" instead?
