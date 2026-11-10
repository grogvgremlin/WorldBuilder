# Glossary: architecture v2 terms

_Session 14 (8 Nov 2026); **session 15**: Battle close-out, dice and authoring terms; *two clocks* widened to three stamps; *other side* replaced by the opponent reference; **session 16**: Campaigns, money and time terms; **session 17**: decks, expeditions, infra (storage, sync, sealed secrets); **session 18**: Conversion, Background and Narrative terms; **session 19**: Visibility terms. Terms added by sessions 10–19, alongside `foundations/glossary.md` (v1 terms; where a v1 term is superseded, `foundations/v2-reconciliation.md` says by what). Detail in the doc named in brackets. Seed for the user guide; techniques are explained in `research/techniques-register.md`._

## World structure (`foundations/world-structure.md`)
- **Thing:** the one kind of node; attributes, optional ports and contents.
- **Kind:** what a thing is expected to have (*settlement*, *polity*); several per thing; warns, never blocks.
- **Template:** a package of likely fields, ports, contents and open **slots** applied to a thing; follow / pin / copy.
- **Status / title:** a package of links with a holder slot and a holder limit; statuses nest.
- **Link kind:** declared once: direction, hierarchical (none / tree / several parents), what it carries, many-to-many.
- **Topic:** a display grouping of link kinds, toggled like a map layer; never decides propagation.
- **Transit network:** rivers, roads, tunnels and the like, laid over places; **segments**, **points**, *part of*, routes with speed by direction.
- **Measured position:** a place's position along a segment (mile 12, east bank); linear referencing.
- **Port / delegation:** a named entry point of a thing / a container's port wired to something inside; promotion only rewires the inside.
- **Crossing / interchange:** a junction thing linking two networks / a place on two networks.
- **Mesh:** a separate geography (the Underdeep) joined to others at points.
- **Level / elevation:** a drawing layer / a neutral height attribute.
- **Topological geometry:** trusting inside / outside, order and neighbours on a drawn map, not distances or shapes ("fuzzy relative").
- **Area thing / *in area*:** an area of effect as a thing; places link to it many-to-many.
- **Drawn area, pin, capture:** a shape on a map; a place's position on that map; automatic membership of pinned places inside.
- **Overlap prompt / near miss:** the offer to take a whole collection when a shape materially overlaps it (80%) / members just outside an edge, flagged.
- **Control points / projection / ghost pin / cuspy:** places pinned on several maps used to line maps up / estimating one map's positions on another / a projected position, shown distinct from real pins / near a shape's edge within the fit's error margin, so a suggestion, not a capture.
- **Medium:** anything that spreads (rumour, plague, fame, a grievance): which links carry it (**conductance**), **gain** at nodes, **decay**.
- **Medium inputs:** named numbers a medium defines with defaults (urgency; susceptibility).
- **Roll-up / inherit-down:** a container's value from its parts (weighted average) / a container's value covering its members.
- **Layered inclusion:** parts with values are averaged; parts without take that average. **A 0 counts** by default; **ignore 0s** is an option.
- **Spillover / halt / affinity link:** a relation's value spreading to containers or parts / where spread stops and inheritance takes over / a declared closeness giving a direct value.
- **Cumulative / absolute:** whether a relation's specific level adds to or replaces its general level.
- **Standing:** a relation value from one entity to another, the sum of decayed **blocks** (each event's impact with its own decay, keyed by event type); asymmetric, optionally two-way.
- **Information item:** a rumour, notice or message as a thing; *sparks*, *mutates into*.
- **Spread / currency / belief:** how far an item has reached / how much it is being discussed (fades) / how strongly holders hold it (derived from incoming strength and **susceptibility**).
- **Relay formula:** what a place passes on, from what came in and its own values; default pass-through; capped per medium.
- **Re-transmit threshold:** the improvement needed before a place re-sends (points, percent, either, both).
- **Mutation likelihood:** a formula over time and distance; the change itself is the GM's.
- **Period / event:** one kind of thing with a when; holds link packages for its span; participants with roles; recorded consequences.
- **Two clocks → three stamps** (session 15): every entry carries the **in-world date** (can jump back; with iteration), **recorded time** (real-world entry time, always forward; = "play sequence") and an optional **effective time** (when it was really agreed; blank = recorded time).
- **Iteration:** a time loop's new run from a snapshot.
- **Belief / stance / knowledge:** what a holder thinks true / how it acts / a belief matching the truth.
- **Persona / secret alias link:** a second identity as its own thing / the non-public link to the real person; reach doesn't cross it.
- **Secret reason / cover reason:** a hidden link from an act to its motive / an optional public reason shown instead.
- **Registered protagonist:** a roster, sub-roster, unit, sub-unit, slot or draw recorded in the world.
- **Generic / proper:** a tier mark on a registered thing; **generic collection** = a view folding generic members into one expandable line.
- **Promotion:** generic → proper, same ID.
- **Carried card:** a protagonist's last resolved card shown read-only in another system until that system makes its own record.

## Reach (`foundations/reach.md`)
- **Guest list:** everything a protagonist is connected to, each entry with its **route** and **status**, as of a date. Session 18: participation in an event is a route ("Bea, via the Battle of the Ford").
- **Reach roles:** **chain** (walked onward along the same kind), **entry** (starts a walk from the protagonist), **authority** (hangs off a place in reach and climbs its own chain), **join** (one hop to area things), **relation** (never walked; read only).
- **Onward links:** declared per kind of thing (a person passes nothing on).
- **Commission:** the thing a unit *serves*, carrying payer and terms.
- **Status (of an entry):** certain · believed (strength, source) · stale (hasn't heard) · by stance.
- **Source's view:** a rule reads reach as its source sees it; impersonal sources read the truth.
- **Selection vs landing; presence vs decision:** who a rule picks (source's view) vs whether its effect lands (truth, when it needs presence); decisions follow belief.
- **Nearest holder wins:** a part's own belief beats what it inherits.
- **Base:** an authority with its own law package (Empire, Church, Marienburg).
- ***Sits on*:** a place on a network segment, picking up the segment's authorities.

## Order (`foundations/order.md`)
- **Function library:** flat, linear, exponential, quadratic, step, custom formula — for decay, spillover, conductance.
- **Metric:** the distance a function reads, walking declared link kinds.
- **Nearest own declaration wins.**
- **Claim / privilege / recognition / precedence:** who claims what on what basis / a claim to an exemption / acknowledgement by an authority / a declared ordering, one tool among several.
- **In fiction / out of fiction:** switches and precedence decided inside the story vs by the players (errata, house rules).

## The game-rules overlay (`foundations/rules-overlay.md`)
- **Overlay:** how a game system's rules turn the guest list and world values into effects on its protagonists.
- **Reason (for a rule):** the world thing a rule hangs on (attribute, event, information item). **Untagged effect:** a rule with no reason, shown with a prompt.
- **Hook object:** a plain-words label + a condition reading world values + a hook per system; may **declare the world values it's about**. **Hook:** a system's binding to it, declaring the values it reads and its formula.
- **Hook template / rule template:** the world-side template / the per-system template bound to it.
- **Can't tell:** a hook whose data is missing.
- **Notice statuses:** new · seen · snoozed · resolved · dismissed · superseded.
- **GM flag:** a hook bound to a notice.
- **Scope / trigger:** which protagonists a rule picks (a query over the guest list) / the hook that switches it on.
- **Named scope / status (recorded):** a saved, derived query / a tag set by hand.
- **reaches / value / in force:** the world-reading nodes (`rules-overlay.md` §17). **Target filter**, **route pattern**, **as of / ever / during**; references **protagonist**, **here**, **slots**, **opponent** (session 15; replaces *other side*).
- **Graded effect:** an amount written as an expression over declared world values.
- **Rule nature (origin / environment) and read date:** origin reads as of the **raising date**; environment reads now.
- **Contingent:** a sub-unit with its own origin and date (replacements, merges).
- **Battlefield state:** how a mixed unit fights: original / new / average / majority / individual.
- **Step:** origin · stationed · battle location · battle (views Build · Here · Battle-ready · Battle).
- **Category order:** the declared run order of rule categories within a step; editing it is the bulk GM fix.
- **Source layer:** book → FAQ → house rules → campaign.
- **Switch-off / switch-on:** removing a rule for a scope while a trigger holds / naming the original rule to bring it back.
- **Embedding / structural clash / accommodation:** recognition as adopting another base's law by reference / an override landing where the other base isn't embedded / an in-fiction agreement parking a clash.
- **Inherited defiance / entrenched ("always on"):** complying with a lord who defies his superior / a lower law holding against later changes from above.
- **The tree ("why not?"):** any thing's view of what it reaches, what reaches it and the rules active there, each rule's four booleans shown with inputs and thresholds.
- **Suggested link (test view):** an offer to extend a switch-off to a new rule with the same effect.
- **Clash notice:** rules competing over order (written order changes the result). Not the same as an **integrity notice** (infra).

## Battle and dice (session 15: `pillars/battle.md` §8, `tools/dice-engine.md`)
- **Battle lock:** the record of what actually happened at the table — roster versions, (iteration, battle date), effective-time cut, recorded time at the snap, battle record. Never re-locked.
- **Snap:** the moment all parties agree the state and the lock is taken.
- **Effective time:** an optional real-world time saying when an entry really took effect (agreed before the battle, entered later); blank = recorded time.
- **Out-of-sync flag:** a permanent mark on a battle record when something the battle read has since changed; the notice can be closed, the mark stays.
- **Parallel recompute:** *as locked* vs *current*, shown beside the recorded outcome, never replacing it.
- **Opponent reference:** `opponent(in contact)` · `opponent(role = …)` · `any opponent` — the enemy a rule reads, picked by battle facts.
- **Position correction:** a coordinate delta that makes the map read as the table does; never a move.
- **Match the table:** the shortcut on a measuring notice that writes a correction.
- **Counted condition / stacking rule:** a condition with a count (Bleeding 2) / add · highest · once.
- **Transferable in battle:** a content flag (editable in flight) making an inventory item a **carried piece** on the battle screen.
- **Carried piece / carried by:** an item on the battle map held by a unit / the attachment saying who holds it. **Carrying ≠ using**: an **equip** entry gives the effect.
- **Underdog:** a derived battle fact comparing ratings; a side input can override it.
- **Choose (dice):** roll N, the user picks which K count. **Take** picks automatically.
- **Per-die override:** setting one die to what was actually thrown.
- **Sets (dice):** doubles, triples or any N equal values, as a dice-function node.
- **Decision time:** the database name for effective time; with valid time (in-world) and transaction time (recorded), "tritemporal".
- **Seeding (starting facets)** (session 17): battle set-up taking a unit's damage and counted conditions from world state as of the battle date, as it takes carried pieces from inventory.
- **Open-ended battle** (session 17): a battle whose table keeps extending (crawler rooms as tiles placed by entries) until the participants call it ended.

## Decks (session 17: `pillars/campaign-loop.md` §12.2)
- **Deck tool:** a shared tool beside the dice engine for drawing without replacement.
- **Card / deck:** content at any level (manifest, library, sandbox-bespoke).
- **Draw · discard · reshuffle · play · return:** deck entries; **return** puts a drawn card back (top, bottom, random, at position N, shuffled into the top N).
- **Hand:** cards held by someone, as a holding with field-level visibility.
- **Deck state:** what's left, discarded and held, and in what order — derived from the log; a shuffle records the order it produced.
- **Stacked deck** (tail): a deck whose order the GM set by hand.

## Authoring (session 15: `authoring/authoring-v2.md`)
- **Ends first / kind first:** drawing a link by picking two things (the app offers fitting link kinds) / with a sticky tool for one kind (the road tool).
- **Sticky values:** a tool's values kept until changed.
- **Link preset:** a template for a link or segment (*paved road*, *uphill*); **composed** (worked out from other presets) or **full** (set by hand).
- **Narrowing (a sandbox):** limiting the view to the scope that can be changed, while still following the world.
- **Branching / born world:** a new world made from the current one as of a game date; carried-in moving values **frozen** (fixed as of the branch) or not; then a normal world. **Birth record:** source, date, cut and freeze choices.
- **Sentence builder:** the scope editor — a sentence of drop-downs with a live preview of the units picked.
- **Dot path:** `averland.averheim` — finding a thing by walking down its default links.
- **Quick text:** `handgunners@raised in@averland.averheim` — a typed scope.
- **Resolve on entry:** a path, name, alias or quick text becomes the thing's ID when entered; shown by current path.
- **Law view:** a title's laws in three bands — inherited, embedded, own.
- **Defiance (metric):** how bothered a holder is by a defier; grows while in force, fades after, scaled by **care**; an input to standing.
- **Care:** a holder's named sensitivity to an event type (like susceptibility for rumours).
- **Shared-input notice:** a value fed by the same input along two routes.
- **CSV profile:** a saved mapping of sheet headers to fields and link kinds.
- **Layout preset:** a saved arrangement of a class's fields on forms and cards.
- **Editable by:** who may change a setting (GM / owner / anyone) — session 19: the roles holding its write permission (`pillars/visibility.md` §5).

## Campaigns (session 16: `pillars/campaign-loop.md`)
- **Consequence:** a proposed change following an event; accepted, changed or declined; written only at commit.
- **Draft batch:** the pending consequences of an event, outside the log, editable and previewable; committed in one go. May carry content as well as world changes (session 17).
- **Commit entry:** the entry that writes a batch, listing its declined items.
- **Now / scheduled / conditional:** lands at the current date / arrives at a later date / lands when a hook turns true. Landing is automatic, with a GM notice; **target gone** → doesn't land.
- **Propose instead:** a per-consequence option to bring a landing back as a draft batch.
- **Proposed vs committed:** what the source proposed and what the table committed, kept on a changed item with a reason.
- **Sign-off list:** who signed an entry off (signer, role, time).
- **Sensitive kinds:** consequence kinds excluded from bulk accept (deaths, other players' holdings).
- **Track / lot:** a holding as dated lots, each with a denomination, amount, properties and optional decay; value = sum as of the date read.
- **Reset lot:** a lot cancelling everything before it.
- **Spending policy:** which lots a spend takes: FIFO · LIFO · largest · smallest · worst first · choose.
- **Denomination / rate:** a unit of a holding / its exchange rate, scoped by place and dated.
- **Claim lot:** a holding that is a claim on an issuer (bond, deposit, debt); valued through a hook on the issuer.
- **Can go negative:** a holding-type property allowing a plain overdraft; default off.
- **Market medium / suggested price:** shortages and gluts spreading as information items / a derived price the GM reviews before setting the price list.
- **Event template:** an event kind with its hook templates and each system's rule templates on one page; pre-set options; knock-ons.
- **Knock-on:** a child event template pre-set as a scheduled or conditional consequence.
- **Issuance:** something an event puts out into the world (a news item, a notice).
- **Preset world component / bundle:** a library piece of a world (geography, economy, calendar…) / several tied together; components declare **slots** bound at assembly.
- **Promote as new:** saving a campaign's world and timeline to the library as a new world (branch + release); session 19: a new instance with no information revealed directly to players.
- **Marker:** a protagonist's world thing showing where it is, carried with a promoted world; system data travels as a manifest component.
- **Dormant flavour:** a carried rule or link waiting to be relinked in the new world.
- **Quick local content** (session 17): an item made mid-campaign inside a draft batch; the commit is its deploy into a **campaign-local package**.
- **Expedition** (session 17): several encounters with carry-over; crawler rooms in one open-ended battle, or linked battles across a defined break; carried state written into the world and scoped to the expedition as a dated event.

## Time (session 16: `pillars/campaign-loop.md` §8)
- **Sandbox core timeline:** the one clock everything is stored and run on.
- **Timeline object / core reference timeline:** base unit, named days, subdivisions and blocks, fixed for a sandbox.
- **Block:** a run of days (week, month), defined in any unit; carries on across another block's edge or restarts at it; may skip days.
- **Flavour timeline / POV timeline:** a calendar pinned to the core for a context or culture / a viewer's timeline showing events as they know them (session 19: a dual view — when it happened and when they learnt it).
- **Calendar package:** a collection of periods and events (holy days) on a reference timeline.
- **Recurring period:** a period that repeats (night, winter, festival days), read with `during(…)`; may vary by place by formula.
- **Recurrence rule:** the expression saying when a recurring period falls (like iCalendar's RRULE).
- **Originating calendar:** the calendar an entry was issued in, kept as metadata.
- **Campaign turn:** a period on the clock with an overlaid structure; length by manifest context, variable.
- **Phase / step:** a partition of a turn setting default dates and gating player actions; switchable off.
- **Order key:** period · step · position — orders entries within one date; not time.
- **Per-entry precision:** an entry's own time of day or named part of day, finer than the context's default.
- **Sequence check:** a warning when entries break a required order (moving before being raised).
- **Mid-turn flag:** a GM notice for anything dated or landing inside a turn rather than at a step boundary.

## Infra (session 17: `foundations/infra.md`)
- **Stored vs derived:** log entries, content and draft batches are the truth; everything else is computed and cached.
- **Dependency record:** what each derived value read plus what each entry touches; used for invalidation, integrity notices and proposed fixes.
- **Snapshot cache / point-specific recompute:** speed-ups added in implementation if rebuilds are slow; never a second truth.
- **Correction / withdrawal:** an inserted entry fixing a value / an entry marking another as never having happened, kept for audit.
- **Purge (stub):** removing owner-only content for privacy, keeping the entry's shape.
- **Audit view:** the log including withdrawn and purged entries.
- **Integrity notice:** raised after any change when an ordinary check breaks (holding below 0, roster illegal, sequence); fixes proposed into a draft batch.
- **Person / device / entered by:** who acted / where it was recorded / who typed it on another's behalf.
- **Full sync:** every device holds everything.
- **Sealed (secret):** stored encrypted; readable only by people holding its key.
- **Key grant:** a secret's key wrapped for one more reader; how visibility is enforced. **Reveal** = a key grant entered in the log.
- **Sealed envelope:** the few fields left outside a secret entry for sync (ID, recorded time, device, host sequence number).
- **Recovery key:** the GM's way back in if their password is lost.
- **Host / host sequence number:** the device that orders the shared log — one per sandbox, any sandbox GM's (session 19) / an accepted entry's place in that order.
- **Peers:** an optional host-less mode for GM-less play (detail in the tail).
- **Submission / awaiting host:** a player's commit sent to the host / its status on the player's device until accepted or declined.
- **Auto-accept:** a per-campaign GM setting accepting players' changes to their own holdings on arrival; default off.
- **Sync bundle:** a player's entries and content since their last sync, signed, sent by any means and loaded by the GM; loading twice changes nothing.
- **Acting as a player:** the GM entering a change in a player's name ("entered by GM for Bea").
- **Near-duplicate notice:** the same change arriving by two routes; offers to withdraw one.

## Conversion (session 18: `pillars/conversion.md`)
- **Manifest context:** a system's part of a sandbox (TOW, 6th, WFRP); world facts are shared by all, system data kept per context.
- **Make common:** a flag on each rule (default on for GM rules; session 19: follows the rule's editable by) saying its hook is about the shared world, so other contexts are asked to consider it; off = **private** to the context.
- **Cross-context notice:** "*Winds blow strong* has an effect in TOW — take a look for 6th"; raised in every context with no rule on a common hook; dismissable; clears when bound.
- **Echo guard** (tail): the converter not converting back what was converted from a context, read from *caused by*.

## Background and Narrative (session 18: `pillars/background-and-narrative.md`)
- **World log:** the world's canon history in the ordinary entry shape, coarser than a game log.
- **Stub (actor / thing):** a thing with its fields present but mostly empty, generic by default — every slot holder is one; @ autofill creates them.
- **Name this model:** splitting one rank-and-file model out of a unit's count as a stub actor.
- **Source / reference:** the work cited (book, website, PDF), one bibliography list for rules and lore / the section, page or anchor on the citing item.
- **Cited alternative:** another source's version of an event, kept as a note with its source beside the sandbox's one truth.
- **Appearances:** a thing's derived list of the events and entries that mention it.
- **Entry (narrative):** a thing of kind *entry* — journal note, story, session note, battle report — with text, an optional date link and mention links; not a log entry.
- **Mention link / @:** the link an entry makes to a thing named in it; **@ autofill** finds or creates the thing.
- **Make link:** joining two of an entry's mentioned things with a chosen link kind.
- **Stubs with no references:** a to-do filter listing committed stubs nothing points at (keep / link elsewhere / withdraw).
- **In-world / real-world:** the mark on entries and attachments; real-world material (session notes, model photos) is stripped on promote-as-new by default.
- **Icon / specific image:** a picture on a definition (status, tag, class) / on one instance (this captured standard).

## Visibility (session 19: `pillars/visibility.md`)
- **Owner-private / GM-readable (field):** a field wrapped for its owner only (private notes) / readable by the GM, the read logged (secret objectives); set per field by the template. Anything that touches the world is GM-readable.
- **Practice mode:** playing inside the world with nothing counted — a **practice battle** (outcome feed off) and a **practice roster** (not registered in the world).
- **Role:** a real-world package of permissions held by people, shaped like a status: **sandbox GM**, **context GM**, **player**, **spectator**; many holders; a sandbox GM nests over every context GM.
- **Remit:** what a role may accept — world facts for a sandbox GM; a context's records for its GMs.
- **GM view / player view:** everything the GM role holds / exactly what the player's grants show, recomputed as they would compute it.
- **View-as:** a read-only view through another role's grants (a GM checking what Bea sees).
- **Spectator / shadow:** a read-only view-as grant on a player, a context GM or a sandbox GM / being granted a player's view.
- **Result / cause (field grants):** a value's outcome and the rule behind it, each with its own grant; a cause shows its cover reason, "source hidden" or nothing.
- **Sealed until the last minute; conditional reveal:** a result kept from its owner until a hook-bound reveal lands (or the GM reveals by hand).
- **Player's mark:** a player's own version of something in the world (an inkling), an owner-private draft belief; **pass up** = submit it for GM arbitration.
- **Blurred estimate:** a dice expression over a true value (distribution, skew, tails), rolled once per observation, issued as a message after GM review.
- **Dual view (POV timeline):** an item placed at when it happened and at when the viewer learnt it (the reveal's in-world date).

## Planning (`foundations/tail.md`)
- **Lock-off / the line:** what gets specified before the first prototype.
- **The tail (tail 1):** features below the line, each with its structural assumption; specified after the prototype's features are built (session 18).
- **Simple / trigger simulation:** timing of changes (transmission lag, adoption delay, notification) / event chains and responses.
- **Infra:** cross-cutting foundations under every pillar (`foundations/infra.md`).
