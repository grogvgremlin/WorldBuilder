# Writing world text: a guide

How to write the YAML the app imports in slice 0: every section, every field, what each value means, and examples to try with their expected results.

The examples marked **try** are checked by a test (`test/cases/guide-examples.test.ts`), so they match what the app does.

This is the slice-0 proposal (`build/build-log.md`, "The text shape"). It may change once design has reviewed it.

---

## 1. The shape of a file

One file is one **package**. It is YAML, so indentation matters (use spaces, never tabs) and `#` starts a comment.

```yaml
package: [My house rules, my_house_rules]   # (label, key)
layer: house                                # book | faq | house | campaign

things:  [...]     # places, polities, organisations, titles ...
links:   [...]     # dated links between things
units:   [...]     # protagonists: profile, raising date, their links
scopes:  [...]     # named scopes: saved queries
rules:   [...]     # scope + trigger rules
events:  [...]     # world history (stored as content)
log:     [...]     # events appended to the log when you deploy
```

Every section is optional, in any order. A file can refer to things in another package that's already deployed: refer to them by key.

**Importing never blocks.** A line with a problem is reported (with its line number) and left out; everything else still imports. You review the draft, then **Deploy** or **Discard**.

---

## 2. Keys and labels

Every item has a **label** (what you read) and a **key** (what other lines refer to: lower case, underscores, no spaces).

| You write | What happens |
|---|---|
| `[Nuln, nuln]` | label Nuln, key `nuln` |
| `Nuln` | the label is matched against deployed items of the same sort. One match: its key is used. No match: a new key `nuln` is made from the label |
| `[Nuln, ~, [settlement]]` | `~` means "no key yet" in a tuple with more fields after it (an empty slot isn't valid YAML) |

After import, the review shows **"Text with keys written back"**. Keep that version: re-importing it edits the same items instead of making new ones.

**Re-importing** an item with the same key is an **edit** (or **unchanged** if nothing differs). That is how you change something in slice 0.

---

## 3. Package header

```yaml
package: [E1 Handgunners' Ld, e1_handgunners]
layer: book
```

- `package`: (label, key). If you leave it out, the file name is used.
- `layer`: the **source layer** of every rule in the file: `book` → `faq` → `house` → `campaign`, in that run order (`rules-overlay.md` §8). The default is `book`. A rule can override it with its own `layer:`.

---

## 4. Things

```yaml
things:
  - [Nuln, nuln, [settlement, polity]]      # (label, key, kinds)
  - [Gunnery School, gunnery_school, [organisation]]
  - [Elector of Averland, elector_of_averland, title]   # one kind can be a plain word
```

- **Kinds** are free words. Several per thing are fine (Nuln is a settlement and a polity).
- Kinds matter in two places: `reaches(any title, …)` matches things by kind, and a unit always has the kind `unit`.
- Attributes on things have no text form yet.

---

## 5. Links

```yaml
links:
  - [nuln, in, wissenland, 2000]                     # (from, kind, to, start)
  - [grenzstadt, in, averland, 2400, 2523]           # (from, kind, to, start, end)
  - [handgunner_commission, paid_by, wissenland_treasury, 2519]
```

- **from, to**: keys of things or units.
- **kind**: a free word, written with underscores (`raised_at`, `member_of`). Nothing is built in: a link kind means whatever your conditions follow.
- **start / end**: plain years (or day counts). **Start counts, end doesn't**: `2400, 2523` is on in 2522 and off in 2523. No end means "still on".
- A link's key is the tuple itself (`grenzstadt~in~averland~2400`). To end a link later, re-import it with the same from, kind, to and start, plus an end: that's an edit.

Link kinds used in the examples:

| Kind | From → to | Read as |
|---|---|---|
| `in` | place → bigger place | containment |
| `raised_at` | unit → place | where the unit was raised |
| `stationed_at` | unit → place | where it is now |
| `member_of` | unit → organisation | |
| `serves` | unit → commission | |
| `paid_by` | commission → treasury | |
| `ruled_by` | place → title | |

---

## 6. Units

```yaml
units:
  - unit: [Nuln Handgunners, nuln_handgunners]
    raised: 2520
    profile: [3, 3, 3, 3, 3, 1, 3, 1, 7]
    links:
      - [raised_at, nuln]                    # (kind, to) — start = the raising date
      - [stationed_at, nuln, 2520, 2526]     # (kind, to, start, end)
```

- **raised** (required): the raising date. **Origin** rules read the world as of this date.
- **profile** (required): either a list in the order `M WS BS S T W I A Ld` (write `-` for a stat that doesn't apply), or a map: `profile: {Ld: 7, S: 3}`.
- **links**: links *from* this unit, written without the "from". Start defaults to the raising date.

---

## 7. Rules

```yaml
rules:
  - rule: [Unpaid wages, unpaid_wages]
    effect: [Ld, -1]
    scope: commissioned_by_the_treasury
    trigger: in_force(wages_withheld, withholder = wissenland_treasury)
    nature: environment
    category: title
```

| Field | Required | Meaning |
|---|---|---|
| `rule` | yes | (label, key) |
| `effect` | yes | (stat, edit, target point): see §8 |
| `scope` | yes | **which units**: a condition, see §9 |
| `trigger` | no | **when it's on**: a condition. No trigger = on whenever the scope matches |
| `nature` | yes | `origin`: read **as of the unit's raising**, in the origin step. `environment`: read **at the date you're viewing**, in the stationed step |
| `category` | no (warned) | runs the order within a step: `place` first, then `organisation` and `title` together. Anything else, or none, runs last |
| `layer` | no | overrides the package's source layer |

**How the order is decided** (`rules-overlay.md` §8): target point (statline → in-line → end), then step (origin → stationed), then source layer, then category, then **depth** (on one chain, the nearer thing applies later: Nuln after Wissenland), and otherwise a **bag** (set → add → multiply → cap → floor). A bag that changes the result when swapped raises a **clash notice**.

---

## 8. Edits: the `effect` tuple

| Write | Means | Default target point |
|---|---|---|
| `[Ld, +1]` or `[Ld, 1]` | add 1 (a bare number is an add) | in-line |
| `[Ld, -1]` | subtract 1 | in-line |
| `[Ld, =8, inline]` | set to 8 at this point | **must be given** |
| `[WS, =3, statline]` | set the starting value to 3; later edits still apply | **must be given** |
| `[WS, =3, end]` | 3, whatever came before | **must be given** |
| `[M, x0.5]` | multiply (also `×0.5`) | in-line |
| `[WS, at most 2]` | cap | end |
| `[S, at least 2]` | floor | end |

Target points: `statline`, `inline` (or `in-line`), `end`.

**YAML traps:**
- Don't write `*2` for multiply: in YAML `*` starts an alias. Use `x2`.
- Don't write `@end` bare: YAML reserves `@`. Write `end` (or quote it: `"@end"`).

---

## 9. Conditions: scopes, triggers and named scopes

A condition reads the world. Write it on one line after `scope:`, `trigger:` or `query:`.

### reaches: does the unit get to a thing by following links?

```
reaches(nuln, raised_at > in*)
```

- First: the **target**, a key (`nuln`), or `any <kind>` (`any title`).
- Then the **route**: link kinds separated by `>`. A `*` after a kind means "any number of times, including none".
  - `raised_at > in*`: the place it was raised at, or anything that place is in, however far up. Raised at Nuln → reaches Nuln and Wissenland.
  - `member_of`: just one hop.
  - `serves > paid_by`: exactly two hops.
- Optionally `, ever`: any link that had started by the date, even if it has ended since. Without it, only links on **at** the date count.
- The walk starts at the unit and needs at least one hop.

### in_force: is an event on at the date?

```
in_force(wages_withheld, withholder = wissenland_treasury)
```

- First: an event **kind** or an event **key**.
- Then any number of `role = thing key`. The event must have each one.

### Combining

```
all(reaches(nuln, raised_at > in*), not(reaches(steady, holds)))
any(reaches(nuln, stationed_at), reaches(altdorf, stationed_at))
```

### Named scopes

A bare key in a condition refers to a **named scope**: a saved query.

```yaml
scopes:
  - scope: [commissioned by the treasury, commissioned_by_the_treasury]
    query: reaches(wissenland_treasury, serves > paid_by)
```

**Which date is read?** A rule's `nature`. Origin: the unit's raising date. Environment: the date on the card.

---

## 10. Events and the log

```yaml
events:                       # world history
  - event: [Spinach grows in Averland, averland_spinach]
    kind: spinach_harvest
    roles: {where: averland}
    period: [2400, 2524]      # (start, end); end optional

log:                          # appended to the log as event entries on deploy
  - event: [Wages withheld, wages_withheld_2524]
    kind: wages_withheld
    roles: {withholder: wissenland_treasury}
    period: [2524]
```

- Same shape in both. `events:` are part of the world's content. `log:` entries can be **withdrawn** later (Log tab, or the unit card); the original stays in the audit view.
- An event in `log:` whose key is already logged isn't added twice.
- You can also add log events by hand on the **Log** tab.

---

## 11. Try it

Each block is a whole file: paste it on **Import**, check the review, **Deploy**, then open the unit.

### try-1: a house rule for the garrison
Needs **e1-handgunners** deployed first.

```yaml try-1
package: [Garrison pride, garrison_pride]
layer: house

rules:
  - rule: [Nuln garrison pride, nuln_garrison_pride]
    effect: [Ld, +1]
    scope: reaches(nuln, stationed_at)
    nature: environment
    category: place
```

**Expect:** Nuln Handgunners, 2525: **Ld 8**. Origin 7 → 8 → 8; stationed: unpaid wages (book) −1 → 7, then garrison pride (house) +1 → **8**. The garrison step says "house runs after book": the source layer decided it.

### try-2: the Handgunners move to Altdorf in 2526
Needs e1-handgunners and try-1.

```yaml try-2
package: [Handgunners move, handgunners_move]

things:
  - [Altdorf, altdorf, [settlement]]

links:
  - [nuln_handgunners, stationed_at, nuln, 2520, 2526]
  - [nuln_handgunners, stationed_at, altdorf, 2526]
```

**Expect:** the review shows the Nuln stationing as an **edit** (same from, kind, to and start as in E1, now with an end), and Altdorf and the new stationing as **new**. Read 2525: **Ld 8**. Read 2526: **Ld 7**: garrison pride now shows "scope not matched" (no route to Nuln by `stationed_at` in 2526).

### try-3: a clash
On its own, no other world needed.

```yaml try-3
package: [Clash, clash]

things:
  - [Middenheim, middenheim, [settlement]]

units:
  - unit: [Middenheim Swordsmen, middenheim_swordsmen]
    raised: 2510
    profile: {S: 3}
    links:
      - [raised_at, middenheim]

rules:
  - rule: [Ulric's blessing, ulrics_blessing]
    effect: [S, +1]
    scope: reaches(middenheim, raised_at)
    nature: origin
    category: place
  - rule: [Cold forges, cold_forges]
    effect: [S, x2]
    scope: reaches(middenheim, raised_at)
    nature: origin
    category: place
```

**Expect:** **S 8** (bag: add before multiply: (3 + 1) × 2) and a clash notice: "S 8 as ordered, 7 if reversed".

### try-4: mistakes are reported, the rest imports
On its own.

```yaml try-4
package: [Mistakes, mistakes]

things:
  - [Kemperbad, kemperbad, [settlement]]

rules:
  - rule: [Forgot the target point, forgot_point]
    effect: [Ld, =9]
    scope: reaches(kemperbad, raised_at)
    nature: origin
    category: place
  - rule: [Unclosed bracket, unclosed]
    effect: [Ld, +1]
    scope: reaches(kemperbad, raised_at
    nature: origin
    category: place
  - rule: [Unknown place, unknown_place]
    effect: [Ld, +1]
    scope: reaches(nowhere, raised_at)
    nature: origin
    category: place
```

**Expect:** Kemperbad and "Unknown place" import. Problems: line 8 "set needs a target point", line 14 "scope: the condition ends too early", line 17 "missing reference nowhere in scope" (a warning: it still imports; a unit reading it would get "can't tell").

---

## 12. What has no text form yet

Thing attributes, switch-offs, ignore rules, hook objects, `value(…)`, bases, calendars and contingents. Their shapes exist in the schema; their behaviour comes in later slices.
