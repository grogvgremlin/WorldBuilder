# CLAUDE.md — Warhammer army builder and world (build repo)

_For Claude Code. Read this first, then the current slice brief (`build/slice-1-brief.md`; slice 0's is `build/slice-0-brief.md`)._

## What this is
A personal, local-first app for Warhammer Fantasy armies, battles, campaigns and a shared world.
The design is **done and frozen for the prototype**. It lives in a separate design project; the parts the build needs are copied into `design/`.
Your job is to **build slices against acceptance cases**, not to redesign.

## The rules of the build
1. **The design is frozen.** If the build contradicts a design doc, or hits a gap that changes user-visible behaviour, **stop and write it in `build/build-log.md` under "Questions for design"**. Do not invent new mechanisms.
2. **Purely technical choices are yours.** Make them, then note them in `build/build-log.md` with one line of why.
3. **Acceptance cases are the tests.** Each case in the slice brief becomes a test, written from `design/test-corpus-v2.md`, before the screens.
4. **Write plainly for a Python reader.** The owner reads Python well and TypeScript less well, and reviews rather than edits:
   - short functions and descriptive names;
   - no clever type gymnastics;
   - a comment at the top of each module naming the design doc and section it implements.
5. **Keep the structure guide current.** `build/structure.md` maps each module to its design doc and section.

## Stack (agreed in design, session 20)
- **TypeScript** throughout: core and screens.
- An **installable web app (PWA)**, built to static files and published by **GitHub Pages** on every push to `main`. The test target is iOS Safari, installed to the home screen.
- **Storage**: IndexedDB behind one **storage seam** (`src/store/`). Nothing bypasses it. An in-memory implementation is used for tests.
- **Schema defined once**: zod schemas in `src/schema/`, with **JSON Schema emitted to `schema/`** so the data can be read from Python on a laptop.
- **Tests**: Vitest. **Build**: Vite. **Screens**: React, kept thin.
- **No server yet.** In slices 0–1 the data never leaves the device except by an export the user makes. The design now has **one server the owner runs** (it reads the data; devices keep a full copy and work offline), built in a later slice — so keep sync transport-agnostic and the envelope's order number ready for it (slice 1 brief §1.5).

## Structural seams — real from day one, even when unused
These are expensive to retrofit (design: `design/infra.md`).
- **The truth is stored; everything else is derived.**
  - Stored: an **append-only log** of entries, **content**, and **draft batches**.
  - Derived: resolved values, cards, views and notices. These are recomputed, never edited.
- **No edits in place.**
  - A correction is a new entry.
  - "It never happened" is a **withdrawal** entry; the original stays and is skipped by derivations.
- **The log entry has its full shape** (`design/infra.md` §8): identity, status, order, content and visibility fields. Unused fields may be empty, but they exist.
- **Entry status** runs draft → awaiting host → accepted / declined, with withdrawn alongside. **Derivations read accepted entries only.**
- **One read path.** Every read of a sealable field goes through a single `unseal()` step. Today it is a no-op (no encryption, no grant check). Later it checks grants, then decrypts. **No code reads entry content directly.**
- **The sealed envelope.** Only the ID, recorded time, device and host sequence number sit outside the seal. Never sort, index or sync on fields that sit inside it.
- **The resolver is a pure function**: `(content, accepted entries, read date, viewer) → values + derivation`. It does no I/O.
- **Every derived value can say what it read**: this is the derivation (`design/rules-overlay.md` §13).

## Layout
- `src/schema/` — the data shapes (zod).
- `src/store/` — the storage seam, with IndexedDB and in-memory implementations.
- `src/log/` — appending entries, status, withdrawal, and `unseal()`.
- `src/world/` — things, dated links, and `reaches` / `in force`.
- `src/overlay/` — rules (scope + trigger), the fold, and the derivation.
- `src/import/` — the text format (YAML) into a draft, then deploy.
- `src/ui/` — screens.
- `test/cases/` — the acceptance cases.
- `design/` — copied design docs (read-only here).
- `build/` — slice briefs, the build log and the structure guide.
- `schema/` — the emitted JSON Schema.

## Out of scope until a brief says otherwise
Sync, the server, real encryption, maps, rule and world editors, decks and dice. Their shapes exist in the schema; their behaviour does not. (Multiple logins and submissions come in with slice 1.)
