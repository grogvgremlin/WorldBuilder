# Writing world text: a guide

How to write the YAML the app imports: the three kinds of file, every section and field, what each value means, and examples to try with their expected results.

The examples marked **try** are checked by a test (`test/cases/guide-examples.test.ts`), so they match what the app does.

The format is a proposal (`build/build-log.md`, "The text shape"); it may change once design has reviewed it. Slice 1 changed it: the game, its rules and each world now go in **different files** (owner decisions of 14 Nov, `build/build-log.md`).

---

## 1. Three kinds of file

Where something lives decides which file it goes in:

| File starts with | It is | Holds | Deploys to |
|---|---|---|---|
| `manifest: [label, key]` | a **game** (one per edition) | its statline, bag order, and **core** packages | the **library** |
| `package: [label, key]` | a **rules package** | rules and named scopes, for one game | the **library**, usable by any sandbox; or, with `sandbox: key` under the header, **local to that sandbox** |
| `sandbox: [label, key]` | a **sandbox** (one world) | its category order, the games played in it (contexts), things, links, units, events, and log entries | that sandbox |

How they fit together:

```
library:   game (manifest) ── its core packages, always applied
           rules packages:  books, FAQs, house rules, campaign packages
sandbox:   the world (things, links, events, log) + its category order
           └─ context (one per game played here): the game + the books, FAQs, house rules
              and campaign packages switched on, in order
pick-up game: a game + the packages chosen, no world at all
```

- **A package is not a scope.** A rule is in play for a unit only if its package is **switched on in the unit's context** (or is the game's core). Then the rule's scope decides which units it lands on.
- **A library package is world-agnostic.** Its rules name things by key (`nuln`); each sandbox reads them in its own world, so two sandboxes can each have their own Nuln.
- **The category order belongs to the world**, not the game: it says how places, organisations and titles stack. A pick-up game has no world, so it has no category order.
- Something in the wrong kind of file (world content in a package, rules in a sandbox, a category order in a manifest) is reported on that line and left out.

YAML basics: indentation matters (spaces, never tabs) and `#` starts a comment. **Importing never blocks**: a line with a problem is reported with its line number and left out; everything else still imports. You review the draft, then **Deploy** or **Discard**.

---

## 2. Keys and labels

Every item has a **label** (what you read) and a **key** (what other lines refer to: lower case, underscores, no spaces).

**In headers** (the line that names a new item):

| You write | What happens |
|---|---|
| `[Nuln, nuln]` | label Nuln, key `nuln` |
| `Nuln` | the label is matched against deployed items of the same sort in the same place (the library, or this sandbox). One match: its key. No match: a new key `nuln` |
| `[Nuln, ~, [settlement]]` | `~` means "no key yet" in a tuple with more fields after it |

**In references** (a link end, a condition target, a role, a context's packages): write the **key**, or the **label**.
- A label is matched the same way: one match takes its key; several matches are reported ("write the key"); none is a missing reference.
- In conditions, a label with spaces goes in quotes: `reaches("Gunnery School", member_of)`.
- A sandbox file matches against its own world. A package file matches against things in any sandbox.
- A key-like name in a package rule (`nuln`) that no sandbox has yet is accepted quietly: the sandbox may come later.

After import, the review shows **"Text with keys written back"**, with every label replaced by its key. Keep that version: re-importing it edits the same items.

**Re-importing** an item with the same key is an **edit** (or **unchanged**). A file may hold just part of a package or sandbox: the rest stays as it is.

**Getting the text, and the keys, of anything deployed:** tap it on the **World**, **Sandbox** or **Library** tab. The key is shown under its name. **View text** shows it written in this format, with **Copy**, **Export** and **Export package**; **Edit as text** opens that text on the Import tab, ready to change and import.

---

## 3. Games and rules packages

### A game (manifest)

```yaml
manifest: [Warhammer Fantasy Battles 6th edition, wfb6]   # (label, key): one key
stats: [M, WS, BS, S, T, W, I, A, Ld]          # the model statline, in card order
bag_order: [set, add, multiply, cap, floor]    # the order of kinds when nothing else decides
core: [wfb6_base]                              # its core rules packages: always applied, can't be switched off
```

The manifest is the game itself. It doesn't list books, FAQs or campaigns: each sandbox's context chooses those (§4).

### A rules package

```yaml
package: [E1 rules, e1_rules]   # (label, key)
edition: wfb6                   # the game it belongs to (warned if a context of another game switches it on)
layer: book                     # book | faq | house | campaign (default book)
requires: [wfb6_base]           # optional; a warning if one is off where this is on
conflicts: []                   # optional; a warning if both are on

scopes:   [...]                 # named scopes (§6)
rules:    [...]                 # rules (§5)
```

- `layer` is the **source layer** of every rule in the file: `book` → `faq` → `house` → `campaign`, in that run order. A rule can override it with its own `layer:`. A context lists the package under the matching group (books, faqs, house, campaign); a mismatch is warned.
- **Local to a sandbox** (under review): `sandbox: e1` under the header keeps the package with that sandbox instead of the library. The design is being updated: rules belong to a game, so a sandbox-local package should hold world content, not game rules. Don't rely on this yet.
- **Reusing a key moves the item.** Importing a rule or manifest with a key that's already in another package edits that item and moves it here; the review warns "this replaces … moving it here". Use a new key to add a separate one.

---

## 4. Sandbox files

```yaml
sandbox: [E1 Nuln, e1]

category_order:                       # how places, organisations and titles stack in this world
  origin: [place, organisation, title]
  stationed: [place, organisation, title]

contexts:
  - context: [WFB 6th, wfb6]
    manifest: wfb6                          # the game: brings its core
    books: [e1_rules]                       # each list in order
    faqs: []
    house: []
    campaign: [wissenland_campaign_rules]
    # category_order: {...}                 # optional: overrides the world's for this game

things:  [...]      # §4.1
links:   [...]      # §4.2
units:   [...]      # §4.3
events:  [...]      # world history (§7)
log:     [...]      # entries appended to this sandbox's log on deploy (§7)
```

- **category_order**: each step lists categories in run order; categories sharing a rank go in a list: `origin: [place, [organisation, title]]`. Left out, the built-in default is place → organisation → title.
- A **context** is one game played in the sandbox. Its lists are the packages switched on, from the library or local to this sandbox. Leave out any list it doesn't need.
- On the **Sandbox** tab the GM can switch a package off or on, change a game's category order, and remove pins; pins are set from a unit's derivation. All of these are dated entries in the log, which can be withdrawn. The core can't be switched off.

### 4.1 Things

```yaml
things:
  - [Nuln, nuln, [settlement, polity]]      # (label, key, kinds)
  - [Gunnery School, gunnery_school, organisation]
```

Kinds are free words; several per thing are fine. They group things on the World tab, and `reaches(any title, …)` matches by kind.

### 4.2 Links

```yaml
links:
  - [nuln, in, wissenland, 2000]                     # (from, kind, to, start)
  - [grenzstadt, in, averland, 2400, 2523]           # (from, kind, to, start, end)
  - [Gunnery School, in, Nuln, 2400]                 # labels work too
```

- **kind**: a free word with underscores (`raised_at`, `member_of`). It means whatever your conditions follow.
- **start / end**: plain years. **Start counts, end doesn't**: `2400, 2523` is on in 2522, off in 2523. No end: still on.
- A link's key is the tuple `from~kind~to~start`. To end a link later, re-import it with the same from, kind, to and start, plus an end.

| Kind used in the examples | From → to |
|---|---|
| `in` | place → bigger place |
| `raised_at`, `stationed_at` | unit → place |
| `member_of` | unit → organisation |
| `serves` → `paid_by` | unit → commission → treasury |
| `ruled_by` | place → title |

### 4.3 Units

```yaml
units:
  - unit: [Nuln Handgunners, nuln_handgunners]
    raised: 2520                             # required: origin rules read the world as of this date
    context: wfb6                            # optional: default is the sandbox's first context
    profile: [3, 3, 3, 3, 3, 1, 3, 1, 7]     # in the context's manifest stat order, or a map {Ld: 7}
    links:                                   # links FROM this unit: (kind, to, start, end)
      - [raised_at, nuln]                    # start defaults to `raised`
      - [stationed_at, nuln, 2520, 2526]
```

---

## 5. Rules

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
| `effect` | yes | (stat, edit, target point): see below |
| `scope` | yes | **which units**: a condition (§6) |
| `trigger` | no | **when it's on**: a condition. No trigger = on whenever the scope matches |
| `nature` | yes | `origin`: read **as of the unit's raising**, in the origin step. `environment`: read **at the date you're viewing**, in the stationed step |
| `category` | no (warned) | where it runs in the step's category order (`place`, `organisation`, `title` by default). Others run last |
| `layer` | no | overrides the package's source layer |

**How the order is decided** (`rules-overlay.md` §8): target point (statline → in-line → end), then step (origin → stationed), then source layer, then category (the context's order), then **depth** (on one chain, the nearer thing applies later), and otherwise the **bag** (the manifest's bag order). A **pin** set by the GM overrides all of that for one pair. A bag that changes the result when swapped raises a **clash notice**. The derivation says what decided each step, and what reversing it would give.

### Edits: the `effect` tuple

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

**YAML traps:** don't write `*2` for multiply (YAML reads `*` as an alias): use `x2`. Don't start a value with `@`: write `end`, not `@end`.

---

## 6. Conditions: scopes, triggers and named scopes

A condition reads the world. Write it on one line after `scope:`, `trigger:` or `query:`.

**reaches: does the unit get to a thing by following links?**

```
reaches(nuln, raised_at > in*)
reaches("Gunnery School", member_of)
reaches(any title, serves > under*)
reaches(siege_of_nuln, participated_in, ever)
```

- The **target**: a key, a label in quotes, or `any <kind>`.
- The **route**: link kinds separated by `>`. `*` after a kind means "any number of times, including none". `raised_at > in*`: the place it was raised at, or anything that place is in.
- `, ever`: any link that had started by the date, even if it has ended since.

**in_force: is an event on at the date?** `in_force(wages_withheld, withholder = wissenland_treasury)`: an event kind or key, then any number of `role = thing`.

**Combining:** `all(…)`, `any(…)`, `not(…)`.

**Named scopes:** a bare key refers to a saved query.

```yaml
scopes:
  - scope: [commissioned by the treasury, commissioned_by_the_treasury]
    query: reaches(wissenland_treasury, serves > paid_by)
```

**Which date is read?** The rule's `nature`: origin reads the unit's raising date, environment the date on the card.

---

## 7. Events and the log

```yaml
events:                       # in a sandbox file: world history
  - event: [Spinach grows in Averland, averland_spinach]
    kind: spinach_harvest
    roles: {where: averland}
    period: [2400, 2524]      # (start, end); end optional

log:                          # in a sandbox file: appended to its log on deploy
  - event: [Wages withheld, wages_withheld_2524]
    kind: wages_withheld
    roles: {withholder: wissenland_treasury}
    period: [2524]
```

A sandbox file can hold only a `log:` section (with the sandbox's header) to add entries. Log entries can be **withdrawn** later; the original stays in the audit view. An event already logged (same key) isn't added twice.

---

## 8. Try it

Paste each block on **Import**, check the review, **Deploy**, then open the unit. Load the **E1** test world first where it says so.

### try-1: a house rule for the garrison
Needs E1. First the rule, in a package of its own:

```yaml try-1
package: [Garrison pride, garrison_pride]
edition: wfb6
layer: house

rules:
  - rule: [Nuln garrison pride, nuln_garrison_pride]
    effect: [Ld, +1]
    scope: reaches(nuln, stationed_at)
    nature: environment
    category: place
```

Then switch it on in E1's context: on the **Sandbox** tab, pick Garrison pride under "Switch on another package". Or re-import the context with the package added to its house rules:

```yaml try-1b
sandbox: [E1 Nuln, e1]
contexts:
  - context: [WFB 6th, wfb6]
    manifest: wfb6
    books: [e1_rules]
    house: [garrison_pride]
    campaign: [wissenland_campaign_rules]
```

**Expect:** Nuln Handgunners, 2525: **Ld 8**. Origin 7 → 8 → 8. Stationed: garrison pride (house) +1 → 9, then unpaid wages (campaign) −1 → **8**: "campaign runs after house", the source layer decided it.

### try-2: the Handgunners move to Altdorf in 2526
Needs E1 and try-1. Written with labels, to show them being matched:

```yaml try-2
sandbox: [E1 Nuln, e1]

things:
  - [Altdorf, altdorf, [settlement]]

links:
  - [Nuln Handgunners, stationed_at, Nuln, 2520, 2526]
  - [Nuln Handgunners, stationed_at, Altdorf, 2526]
```

**Expect:** the review shows the Nuln stationing as an **edit** (same link, now with an end) and Altdorf and the new stationing as **new**. "Text with keys written back" shows `[nuln_handgunners, stationed_at, nuln, 2520, 2526]`. Read 2525: **Ld 8**. Read 2526: **Ld 7**: garrison pride now shows "scope not matched".

### try-3: a clash
On its own. Two files: the rules, then a small world that switches them on.

```yaml try-3
package: [Middenheim rules, middenheim_rules]
edition: wfb6

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

```yaml try-3b
sandbox: [Middenheim, middenheim_world]

contexts:
  - context: [WFB 6th, wfb6]
    manifest: wfb6
    books: [middenheim_rules]

things:
  - [Middenheim, middenheim, [settlement]]

units:
  - unit: [Middenheim Swordsmen, middenheim_swordsmen]
    raised: 2510
    profile: {S: 3}
    links:
      - [raised_at, middenheim]
```

**Expect:** **S 8** (bag: add before multiply: (3 + 1) × 2) and a clash notice: "S 8 as ordered, 7 if reversed". The context names a game (`wfb6`) that isn't loaded unless E1 is: then the card warns and uses the built-in bag order. The world has no `category_order`, so the built-in one applies.

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
    scope: reaches("Nowhere at all", raised_at)
    nature: origin
    category: place
```

**Expect:** only "Unknown place" imports. Problems: line 3 "things is world content: it belongs in a sandbox file"; line 8 "set needs a target point"; line 14 "scope: the condition ends too early"; line 19 "missing reference Nowhere at all in scope" (a warning: it still imports).

---

## 9. What has no text form yet

Thing attributes, switch-offs (E3), ignore rules, hook objects, `value(…)`, bases, calendars, contingents; FAQ entries tied to what they correct (`corrects`, `amends`, `supersedes`), combo packages, and the army lists and rosters of slice 1 Part B (army data: `build/army-data-request.md`).
