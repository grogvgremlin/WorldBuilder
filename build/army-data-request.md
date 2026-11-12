# Army data for slice 1, Part B: what to send, and how

Part B (the army list and roster builder) is tested with **L1** and **L2** (slice 1 brief §3.3). They need real numbers from **WFB 6th edition Empire**, "points and profiles as printed in the books". The build won't guess them. This page says **how much** to send and gives **three ways** to send it. Use whichever is quickest.

---

## 1. Scope: what's needed, and what isn't

### Needed for L1 and L2

**The army list's composition rules**, for one points size you actually play (say 2,000):
- the categories (Lords, Heroes, Core, Special, Rare, or whatever the book uses);
- the limits on each, in the book's words, e.g. "at least 2 Core units", "up to 3 Special units", "1 Rare unit".

L1 needs one of these limits broken on purpose, so the exact wording matters.

**Four or five units**, enough to fill a small list and break one limit:

| Unit | Why |
|---|---|
| **Handgunners** | named in L1 and L2 (with a champion and a musician) |
| one more **Core** unit (e.g. Halberdiers or Swordsmen) | a second Core unit |
| one **Special** unit (e.g. Greatswords) | a second category |
| one **Rare** unit (e.g. a Great Cannon or Helblaster) | so a Rare limit can be broken by taking two |
| *(optional)* one **Hero** (e.g. a Captain), on foot | only if you want character limits tested; no magic items, no mount |

**For each unit:**
- its **category** in this list (Core, Special…);
- the **profile**: M WS BS S T W I A Ld (and the champion's profile if it differs);
- **points per model**;
- **unit size**: the minimum, and the maximum if there is one;
- **equipment** it comes with (names only);
- **special rules**: names only. One line of text each is welcome but optional;
- **command**: champion (its name and cost), standard bearer (cost), musician (cost);
- **options**: each one with its cost and whether it's **per model** or **per unit**, and whether a group is **one of** or **any of** (e.g. "may take shields +1 pt per model"; "may choose one of: …");
- the **page number**, if handy.

### Not needed yet (not built in slice 1)

| Leave out | Why |
|---|---|
| Magic items, magic standards, item allowances | magic item allowances aren't built (brief §3.2). If a unit's champion or standard can take items, just write "may take magic items up to __ pts" as text |
| Spells and lores | not in slice 1 |
| Mounts (horses, barded steeds, monsters) | not in slice 1 |
| Detachments | not in slice 1 (draws and links come later) |
| Special characters | not needed for L1 / L2 |
| Full rule text | names are enough; text can go in later |
| Orcs & Goblins, Mordheim | needed later (Part D's I1 uses Mordheim). Not yet |

---

## 2. Way 1: the text format (what the app reads)

Fill in the blanks (`__`). This is the shape Part B will import; it follows `design/text-format-and-csv.md` §2. It's a **proposal**, so don't worry about getting it exactly right: I'll correct it on import.

### a) The army

```yaml
package: [Empire (WFB 6th), wfb6_empire]
edition: wfb6                # the manifest this list belongs to
army_list: [Empire, empire]
source: [Warhammer Armies: Empire, 6th edition]

composition:              # for one points size; the book's words are fine
  points: 2000
  limits:
    - [Lords, "__"]       # e.g. "up to 1 Lord"
    - [Heroes, "__"]
    - [Core, "__"]        # e.g. "at least 2 units"
    - [Special, "__"]
    - [Rare, "__"]
```

### b) A unit

```yaml
units:
  - unit: [Handgunners, handgunners]
    category: core
    page: __
    profile: [__, __, __, __, __, __, __, __, __]   # M WS BS S T W I A Ld
    cost: __                                       # points per model
    size: [__]                                     # minimum, or [minimum, maximum]
    equipment: [__, __]                            # e.g. hand weapon, handgun
    rules: [__]                                    # special rule names; [] if none
    command:
      champion: [__, __]                           # (name, points), e.g. the champion's name
      champion_profile: [__, __, __, __, __, __, __, __, __]   # only if different
      standard: [Standard bearer, __]
      musician: [Musician, __]
    options:
      - group: __                                  # e.g. Armour
        pick: any                                  # any (take several) or one (take one)
        items:
          - [__, __, per model]                    # (name, points, per model / per unit)
          - [__, __, per model]
    notes: |
      Anything that doesn't fit above, in the book's words.
```

### A filled example: made-up numbers, to show the shape only

```yaml
units:
  - unit: [Example Militia, example_militia]
    category: core
    page: 99
    profile: [4, 3, 3, 3, 3, 1, 3, 1, 7]
    cost: 5
    size: [10]
    equipment: [hand weapon]
    rules: []
    command:
      champion: [Sergeant, 8]
      champion_profile: [4, 3, 3, 3, 3, 1, 3, 2, 7]
      standard: [Standard bearer, 8]
      musician: [Musician, 4]
    options:
      - group: Armour
        pick: any
        items:
          - [Light armour, 1, per model]
          - [Shield, 1, per model]
      - group: Weapons
        pick: one
        items:
          - [Spear, 1, per model]
          - [Additional hand weapon, 1, per model]
```

---

## 3. Way 2: plain text

If YAML is a chore, a plain list is fine. I'll convert it and you check the result.

```
Composition at 2000 pts: Lords ___; Heroes ___; Core ___; Special ___; Rare ___

Handgunners (Core, p.__)
  Profile: M _ WS _ BS _ S _ T _ W _ I _ A _ Ld _
  Points: __ per model; unit size __ (max __)
  Equipment: ___
  Special rules: ___
  Command: champion "___" +__ pts (profile if different: ___); standard +__; musician +__
  Options: ___ +__ per model; ___ +__ per unit; one of: ___ +__ / ___ +__
```

---

## 4. Way 3: photos of the pages

A photo or screenshot of the army list pages and the unit entries works too. Attach it in the chat. I'll transcribe it into the text format and show you the result to check before anything is imported.

---

## What happens next

The numbers go into `test/fixtures/` as the Empire army list, and become L1 and L2. The army list is a **library package**: one Empire list, usable from any sandbox or none (pick-up games). Anything that doesn't fit the format gets noted in the build log, not silently dropped.

---

## Addendum (design project, 12 Nov): races for case L3

The brief now has case **L3** (racial deltas, brief §3.1 and §3.3), so Part B also needs:
- the **Human** base profile (the plain trooper line the Empire book's units start from);
- for L3(c), two Orc & Goblin lines only: **Orc Boyz** and **Black Orcs** (profile and points; nothing else from that book yet).

Units are still entered **as printed**; the build works out each unit's delta from its race.
