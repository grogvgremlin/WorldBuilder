# Design docs (copies, read-only)

Copied from the design project on 10 Nov 2026 (session 20) for slice 0; the rules, package and roster docs added on 12 Nov 2026 for slice 1 parts A–B. The design project is the source of truth; these copies are not edited here. If the build disagrees with one, write it under "Questions for design" in `build/build-log.md`.

The folder is flat, but the docs refer to each other by their project paths. Read those references as follows:

| Reference in the docs | File here |
|---|---|
| `foundations/infra.md` | `infra.md` |
| `foundations/rules-overlay.md` | `rules-overlay.md` |
| `foundations/world-structure.md` | `world-structure.md` |
| `foundations/glossary-v2.md` | `glossary-v2.md` |
| `foundations/v2-reconciliation.md` | `v2-reconciliation.md` |
| `core/resolver.md` | `resolver.md` |
| `core/test-corpus-v2.md` | `test-corpus-v2.md` |
| `authoring/text-format-and-csv.md` | `text-format-and-csv.md` |
| `rules/manifest.md` | `manifest.md` (slice 1) |
| `rules/army-lists.md` | `army-lists.md` (slice 1) |
| `rules/races-and-units.md` | `races-and-units.md` (slice 1) |
| `rules/options-items-and-rules.md` | `options-items-and-rules.md` (slice 1) |
| `rules/patches.md` | `patches.md` (slice 1) |
| `core/items-packages-and-library.md` | `items-packages-and-library.md` (slice 1) |
| `core/validation-and-fixes.md` | `validation-and-fixes.md` (slice 1) |
| `roster/rosters.md` | `rosters.md` (slice 1) |

Any other doc they mention is not copied yet. Slice 1 parts C–E need `core/identity-and-versioning.md`, `pillars/visibility.md`, `pillars/campaign-loop.md` and `pillars/battle.md`; they are copied before those parts start. Ask for it through the build log if it turns out to matter.

## Reading notes
- **Precedence:** where a v1-shaped doc (`resolver.md`, `text-format-and-csv.md`) disagrees with a v2 doc, the v2 doc wins. `v2-reconciliation.md` §1 lists exactly what is superseded.
- **`resolver.md`**: §5.2–5.7 (target points, bags, rounding, combine rules, clash notice) is current. Its §3 step 2, §5.1, §7, §11 and §12–13 are partly superseded by `rules-overlay.md`; see the reconciliation rows.
- **v1 rules docs** (`manifest.md`, `army-lists.md`, `races-and-units.md`, `options-items-and-rules.md`, `patches.md`, `items-packages-and-library.md`, `validation-and-fixes.md`, `rosters.md`): v1 in shape. Where they speak of **nodes, attachment and working contexts**, read the slice 1 brief §2.1 (library, sandbox, manifest context, roster). Where they speak of a **path** or **flavour** deciding order, the overlay (`rules-overlay.md` §6–8, §12) wins: see `v2-reconciliation.md` §1.
- **`text-format-and-csv.md`**: v1 in shape. Session-15 v2 additions (quick text for scopes, v2 CSV classes) are listed in `v2-reconciliation.md` §3. No text shape exists yet for world things, links, events or scope + trigger rules; slice 0 proposes one.
- **Markers:** AGREED and AGREED (tentative) are to be built; tentative means "try it in the prototype". PROPOSED is uncontested and can be built as written.
