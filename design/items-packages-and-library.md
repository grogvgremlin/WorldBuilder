# Items, packages, stores and library

_Topic doc (shared core: the overlay machinery). DECIDED unless marked. Applies to the per-edition rules libraries; geography and entities use the same machinery with their own stores (`foundations/architecture.md` §1). Package supersession added in session 7._

## 1. Item kinds

| Kind | Adds beyond the common shape | Detail |
|---|---|---|
| **Content** | a **class**, class-specific fields, optional *extends* | `rules/*` |
| **Patch** | selector, structural edits, number edits (with target points), flavour, optional cost and condition, optional relations (amends, supersedes) | `rules/patches.md` |
| **Logic rule** | name, expression, role (availability, requirement, composition, check), scope, flavour, message, fix hints | `core/logic-rules.md` |
| **Package** | header and an ordered list of member references | §4 |

_"Special rule" (content, e.g. Hatred) and "logic rule" (item kind) are different things; always use the full terms._

## 2. Common item shape

| Field | On | Meaning |
|---|---|---|
| ID | all | `core/identity-and-versioning.md` |
| Kind | all | content / patch / logic rule / package |
| Label | all | display name, free to change |
| Edition | rules items | the manifest it belongs to |
| Class | content only | one node of the manifest's class tree (§3) |
| Tags | all | references to tag items |
| Source | all | structured: type (book, FAQ/errata, journal, other publication, homebrew, narrative entry, none), work, page, reference; narrative entries as an opaque external reference |
| Rule narration | all | the rule in words, used by outputs; may contain parameter placeholders ("Wizard (level *n*)") |
| **Rules as text** | all | **scratch box** for rules not yet transcribed; filled boxes form the to-do list; bulk transcription tool (`authoring/authoring.md` §4) — DECIDED session 6 |
| Notes | all | free, private |
| Based on | optional | clone origin: ID + release |
| History | all | change log (`core/identity-and-versioning.md` §5) |

- **Not on the item:** where it is stored (a property of the store), where it is attached (the node graph), whether it is editable (derived: directly editable if in one of your stores and not released; otherwise patched).
- **Minimum to enter (session 6, F6):** beyond name and meta fields, a **unit** needs stats and points; an **army list** needs its list of units; an **item or spell** needs nothing more. Everything else can start in the rules-as-text box.

## 3. Class and tags

- **Class (content only):** exactly one, a node of the manifest's class tree; sets fields and lets option groups and allowances select by class; a parent class covers its children. Fixed at creation (changing class = a new item *based on* the old one).
- **Tags** are small content items of a reserved class *tag*: label, description, optional **same as** (merge). Referenced by ID, so renaming is one label change and merging is reversible. New tags typed in autofill become tag items. Tags stay flat (hierarchy belongs to the class tree).
- **System tags** written by operations live in a reserved partition (`core/identity-and-versioning.md` §7).

## 4. Packages

| Field | Meaning | Example |
|---|---|---|
| Common shape | as §2 | `tow.faq1` "TOW FAQ v1.2" |
| Edition | the manifest it belongs to | TOW |
| Requires | other packages needed (ID, optional minimum release) | FAQ requires Forces of Fantasy |
| Conflicts | packages it can't be used with | an alternative errata set |
| **Supersedes** (session 7) | optional: other packages it replaces, each with a mode: **replacement** (every member of the old package switched off wherever this one is on) or **cumulative** (only members linked by their own *supersedes*) | FAQ 1.2 supersedes FAQ 1.1, cumulative |
| Core flag | one-time "apply or ignore" wherever the edition is used | the official FAQ |
| Flavour | default flavour for members that don't set their own | environment for "Region 4 conditions" |
| Members | **ordered** member entries: key, reference (followed or pinned), label ("FAQ 1.2, p.4: Orc Boyz shields 1 pt"), display group | 30 errata |
| Display groups | labels for outputs and editing only | "Errata", "Clarifications" |

- **Applying a package:** its **content** first (so a patch can target content defined later in the same package), then its **patches in member order**, each step working on the previous result (the cascade, `core/resolver.md` §5); its logic rules join the rule set.
- **Combos:** a member may be another package, applied **in place at its position** with its own members in their own order ("Ravening Hordes, then the FAQ, then house rules"). Reordering members changes results only where two non-commuting steps touch the same value, and a **clash notice** says so. Cycles are a load error. Switch-offs reach members at any depth by key path (`my_campaign › tow.faq1 › entry 14`).
- **Patch relations** inside and across packages (*amends*, *supersedes*) are set on the patches themselves (`rules/patches.md` §6).
- **Requires** missing → health issue with a fix ("attach Forces of Fantasy"); **conflicts** both in reach → error with fixes. Neither blocks building.
- **The base package** (one per edition: manifest, default logic rules, general rules text, mundane weapons, common special rules, the *body armour* combine rule) is always applied at the root; it can't be removed as a whole, but its members can be switched off.
- **Release** of a package records its header and members, each at its content at that moment (`core/identity-and-versioning.md` §5).

## 5. Stores, game context and working context

- **Game context:** a game and version (an edition): the **manifest** and the **central library** for it (official packages and patches, plus your library homebrew).
- **Working context:** your world or operating folder inside a game context; **both** the **root node** of the graph (global packages attached here; core-package answers stored here) **and** the **one store** for everything made anywhere inside it. Nodes inside never have stores.
- Every item is **stored** in the central library or a working context, and **attached** at nodes, which gives reach. Moving an attachment changes reach, not storage.
- **Store fields:** ID, label, kind (library or working-context store), edition, default namespace, owner (yours: editable; external: released, patched only).
- Working contexts are isolated; sharing goes through the library or the copy, move and merge operations (`core/context-graph.md` §8).
- **Patches are generic; attachment gives reach.** Authoring asks only *who it affects* (the selector); *where* is the node you're working at. A library item takes effect only once attached; content is "in reach" (e.g. for fill by class) only once attached at or above the roster, directly or in a package.

## 6. Using library items: link, pin, copy

| Way | Stored as | Behaviour |
|---|---|---|
| **Link** (default) | a reference, following | later releases flow through; locked rosters show "rules changed: review differences" |
| **Pin** | a reference pinned to a release | stays put until moved |
| **Copy** | a new item in your store, *based on* the original | frozen, yours to edit |

## 7. Save to library — DECIDED (revised session 6)

- Saving an item from a working context to the library **keeps its ID**; it is now stored centrally and usable in every working context of that edition.
- **Edition-agnostic library** (session 7, R4): maps, places, entities and descriptions can be saved there; **saving strips anything edition-linked** (rules-at-places packages go to the edition's library instead). A loaded map's packages stay toggleable at package and patch level.
- Library edits go into the library's own **draft**; **release** publishes a version (`core/identity-and-versioning.md` §5).
- **Saving a package saves its components** (each its own library item, the package referencing them); **dependencies come along**, so nothing in the library points at something missing.
- **Duplicate check** on save: near-identical items (same class, fields equal after ignoring labels and notes) offered as **reuse**, **merge** (if the existing item is yours) or **save as a variant** (*based on* the match).
- Example (geography, same machinery): local marsh regions made in a campaign saved back to the central geography library as an **optional package** for future campaigns.

## 8. Clone

- **Cloning an item** makes a new item (new ID, *based on*) in the current store.
- **Cloning a package is a surface copy:** the clone references the same members; adjust by adding, removing or reordering members and adding your own patches; to change one member's content, copy that member. The dependency tree shows the link.

## 9. Core packages

- A package flagged **core** prompts a one-time **"apply or ignore"** wherever its edition is used. The answer is stored as an attachment or switch-off at the node where it was given (usually the working context).

## 10. Switch-offs and switch-ons

- A node can **switch off** any inherited package, package member (by key path) or item (by ID), for everything below it; a lower node can **switch it back on**. Records say *off* or *on*; the deepest along the path wins; the derivation path shows both ("FAQ 14 off at Lustria, back on at Grom's army").
- Switching off a package switches off all its members. The base package can't be switched off whole.
- **Supersession is applied after switch-offs:** a superseding patch or package only suppresses what it supersedes where it is itself on.
- Shape: target, state (off / on), note.

## 11. Dependency tree and impact

- For any item or package: its *based on* origin and clones, every package including it, every node it's attached at, every roster resolving it, every lock pinning it, and every patch that **amends** or **supersedes** it.
- Shown when a library item changes, with per-branch choices where they apply (follow, keep values, dissociate; `rules/races-and-units.md` §5). Computed from references, relations and attachments; nothing extra stored.

## 12. Test cases
- TOW FAQ, skip one entry: `tow.faq1` attached at the setting; entry 14 switched off there. ✓
- Ravening Hordes + FAQ + house rules as one ordered combo: FAQ "Black Orc shields 2" (as printed, stored +1) then house rule "+1 on shields" → 3, in either order. ✓
- Homebrew magic item made in the Lustria setting, later shared: saved to library with the same ID. ✓
- Your Orc homebrew package cloned for a second setting: surface clone, two members dropped, one patch added. ✓
- Theatre-only marsh rule: stored in the working context, attached at the theatre node. ✓
- Official FAQ v1.3 released: settings following it update; locked rosters show "rules changed"; army lists in reach revalidated. ✓
- Core FAQ in a new setting: prompted once; "ignore" stored as a switch-off at the setting node. ✓
- FAQ 1.2 supersedes FAQ 1.1 (cumulative): only 1.1c, linked by 1.2c, goes off; the rest of 1.1 stays. As **replacement**: all of 1.1 goes off. ✓
