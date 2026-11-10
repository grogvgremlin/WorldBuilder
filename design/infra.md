# Infra: storage, identity, sync and secrets

_Session 17 (9 Nov 2026), opened from `handover-session-17.md`; running notes `session-17-notes.md` §3 (history). Statement of record for **infra**: the cross-cutting foundations under every pillar. Closed for the first prototype. Decisions summarised in `foundations/decisions-log-v2.md` (session 17); withdrawn ideas in `parked/parked-ideas-v2.md`._

Markers: **AGREED** · **AGREED (tentative)** (try in the prototype) · **PROPOSED** (offered, not contested) · **OPEN**.

**One line**: an append-only log of entries plus content is the truth; everything else is derived; every device holds everything, secrets are sealed per person; one host orders the shared log; every player write is a submission the host accepts.

---

## 1. Stored vs derived — AGREED

| Stored (the truth) | Derived (computed, cached, never edited) |
|---|---|
| Log entries — incl. dated link changes, lots, draws and shuffles with their order, sign-offs, reveals (key grants), withdrawals | Resolved values, guest lists, cards, deck state, track balances |
| Content — packages, patches, templates, calendars, decks | Notices and hook states |
| Draft batches (outside the log until commit; travel in sync bundles) | Views — POV timelines, agenda, histories, audit view |

- **Corrections are inserted entries**; nothing is edited in place.
- **World state is rebuilt from dated link records.** A snapshot is only ever a **cache**, never a second truth.
- **Speed decides the caching** (user): if resolving or viewing a change is too slow (a minute is unacceptable), implementation adds **snapshot caches** keyed by (thing, in-world date, log position) and **point-specific recompute** (only what a change touches).
- **What keeps that option open**: every derived value can say **what it read** (the derivation, `rules-overlay.md` §13) and every entry says **what it touches** (targets, `campaign-loop.md` §9). Together they are the **dependency record** that invalidation, integrity notices and proposed fixes all use.

## 2. Mistaken entries (V7) — AGREED
- **Correction** (it happened with the wrong value: gold +35 not +53) = an inserted entry.
- **Withdrawal** (it never happened: a duplicate, the wrong warband) = an entry marking the original **withdrawn**. The original stays, shown in an **audit view**, skipped by every derivation and ordinary view.
- **No hard delete of committed entries.** Discarding draft-batch items is the only real delete.
- **Privacy purge**: a player leaving can have owner-only field content purged; the entry stays as a **stub** (ID, kind, stamps, "content purged by owner") so the log's shape and dependents hold.
- Supersedes Mordheim Manager's soft delete as the model (`research/links-register.md` §4).

## 3. After any change: re-derive, check, propose — AGREED
- Accept, decline, withdraw and back-dated correction all end the same way: **re-derive → ordinary checks → integrity notices where something breaks → fixes proposed into a draft batch**. Nothing cascades silently; no notice is raised where nothing broke.
- **The thresholds are the ordinary checks**: holding types' **"can go negative"** (default off), roster **legality / validation**, **sequence checks**, "one place at a time".
- The dependency record **explains and proposes** ("gold −20 since the week 6 loot was declined" → drop the purchase / sell something / a loan as a claim lot).
- **Integrity notice** is the name; the overlay's **clash notice** stays reserved for rule order (`rules-overlay.md` §12).
- Case: Bea, offline, buys a sword with gold from an entry the GM later declines. With other gold to cover it: nothing raised. Without: integrity notice, fixes proposed into her batch.

## 4. Who uses the app — AGREED
- **Local-first: each person their own full copy, syncing.** Also supported: **several people on one device** (log in / out), **sharing over a local network**, **taking a copy away offline** and syncing on return.
- **Internet**: not needed now; included where the overhead is small. The log and merge model are the same whatever the transport; the internet adds a **relay**, **authentication** over an untrusted network and **encryption in transit**. **Sync is transport-agnostic**: local network, file hand-off, relay later.
- **Identities**: **person** (actor, signer, owner, login) · **device** (where an entry was recorded) · **entered by** (a person acting for another). Kept distinct on every entry.

## 5. Full sync, sealed secrets — AGREED (user's proposal)
- **Every device holds everything.** Each person **logs in**; what they may not see is **stored encrypted**, even offline. No per-device filtering; nobody tracks which device belongs to whom.
- **Envelope encryption**: each secret item or field has its own content key, **wrapped** for each person allowed to read it; a person's key is unlocked by their login (key derived from the password). Public data is plain.
- **Visibility = key grants**: GM-only → wrapped for the GM; owner-only → the owner (+ GM where the audited GM view applies); "known to Bea" → Bea and the GM.
- **A reveal is an entry**: wrapping a secret's key for another person, dated — so POV timelines know when they learnt it.
- **Limits**: no un-reveal (forgetting is play; a changed secret gets a new key); lost password = lost secrets unless recovered (the GM re-wraps for players; the GM's own needs a **recovery key**); a player's login can't compute values whose inputs are sealed from them — they see the **belief view**, and caches of secret-derived values are sealed like their strictest input; a **table-trust** model, not a defence against someone holding the GM's password.

### 5.1 Metadata on secret entries — PROPOSED
- A sealed entry keeps outside only what **sync** needs: **ID, recorded time, device, host sequence number, ciphertext**. In-world date, order key, kind, author, targets and links are **inside** the seal; a player's device can't place it in their timeline.
- Still visible: that *something sealed* was recorded at a real-world time, and roughly its size. **Padding** optional; **decoy entries** → tail.
- A public entry depending on a sealed one shows "depends on a hidden entry" (shape only).

## 6. Ordering and submissions — AGREED
- **Host** (default the GM's device) orders the shared log: a **host sequence number** on each accepted entry. **Peers** (no host, causal merge, notices to all) as an option for GM-less play; detail later.
- **Every player commit is a submission** the host accepts — live over the network, offline, or by file.
  - On the player's device it shows **awaiting host**: provisional, usable for further work.
  - On the host it lands in a **draft batch** and goes through the ordinary commit step (differences only, bulk accept by group, sensitive kinds held back, declined items listed with reasons).
  - Accepted → host-ordered entries. Declined → returned with the reason on next sync; §3 handles what depended on it.
  - **Auto-accept** (per campaign, GM-only, default **off**): players' changes to **their own holdings** accepted on arrival. Never for sensitive kinds or anything touching another player's holdings. Recorded "accepted by host (auto)".
  - Clashes between submissions (Bea and Cal spend the same shard while apart) → integrity notice, fixes proposed (§3).

## 7. Updates from a player working offline — AGREED
1. **Small changes sent in writing** ("add this unit to the army"): the GM **acts as the player** — actor = the player, **entered by = the GM**; the player sees "entered by GM for Bea" on next sync and can raise a correction or withdrawal. No confirmation needed by default. Permissions: the player's, with the GM's override (warned, not gated).
2. **Larger changes**: the player sends **their cut of files** — a **sync bundle** (their entries and content since the last sync, sealed parts still sealed, signed), by any means. The GM loads it; it lands as a draft batch (§6). Loading is **idempotent** (IDs dedupe). Player content (house rules, decks, rosters) travels in the same bundle.
- **Raw files from outside the app** (CSV, other apps' exports) also land as a draft batch, shown as differences against current state.
- **Near-duplicate notice** when routes cross (the GM entered "add Black Orcs" for Bea and her bundle adds them too): same kind, target and values within a date window → offer to withdraw one.

## 8. The log entry, final shape — PROPOSED (extends `campaign-loop.md` §9)
- **Identity**: ID · actor · entered by · device · sign-off list (incl. accepted by host, auto or by hand).
- **Status**: draft (local) → awaiting host → accepted / declined (with reason); withdrawn (by a later entry); purged (stub).
- **Order**: in-world date + iteration + order key · optional time of day · recorded time · optional effective time · host sequence number.
- **Content**: kind · source with proposed vs committed and reason · targets and values · links (commit batch, *caused by*, depends on, withdraws) · originating calendar.
- **Visibility**: key grants per field; sealed envelope as §5.1.

## 9. Closed with existing mechanisms — AGREED
- **Author-defined keys** (session 14): two people creating the same key offline is the existing **import clash** — a rename-or-alias prompt on the item in the host's draft batch.
- **The draft batch as a stored, splittable unit**: covered — bundles carry draft batches; declining some items is the split.
- **The timeline object** (`campaign-loop.md` §8.4): stored as **one day count**; calendars convert. Design as agreed.
- **Lots** (`campaign-loop.md` §3): stored as dated entries; balances derived.
- **Copy-on-write** (branching, promote as new, roster entry): an implementation technique; the stored shape doesn't change.
- **Scope indexing** (`rules-overlay.md` §6): **implementation**, not infra.

## 10. Below the line (added to `foundations/tail.md`)
- **Decoy entries** to hide when secrets are written.
- **Peer mode in detail** (GM-less merge and referee-less clashes), with dual sign-off.
- **Internet relay** (transport only; nothing in the stored shape).
