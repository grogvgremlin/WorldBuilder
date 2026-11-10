# World structure (architecture v2)

_Session 10 (5 Nov 2026), updated session 12 (6 Nov 2026) and **session 14 (8 Nov 2026)**: **world close-out** for the first prototype — protagonists registered in the world (one entity, generic tier, rosters as portions of organisations, §12); a rudimentary **cross-map projection** (§5.1); **standing** between two parties (§6.1); the **first iteration of transmission** for any medium, belief derived (§6.2); information items and mediums with medium inputs (§6.3); bases and personas pointed in (§3, §9); readable start / end dates (§7). Session 12: transit networks, separate geography meshes, levels for drawing, topological (fuzzy relative) geometry, area membership from drawn shapes (§4–5); spread and combine machinery in `foundations/order.md` §4–5. Everything agreed is stated once here; the running discussions are in `foundations/architecture-v2-notes.md` §4–5, `foundations/graph-options.md` and `research/propagation-notes.md` (session 14). **v2 is still exploration**: "agreed" means agreed in discussion, not entered in the decisions log. Game rules are kept out on purpose (user): this is the template the game rules overlay (`foundations/rules-overlay.md`). Reach: `foundations/reach.md`; order: `foundations/order.md`. Techniques named here are listed for the in-app wiki in `research/techniques-register.md`._

Markers: **AGREED** (agreed in discussion) · **AGREED (tentative)** — for the user, "think it's fine" means **give it a go in the prototype** · **PROPOSED** (offered, no objection or not yet answered) · **OPEN**.

**Session 14 status**: the world is **closed for the first prototype**. Tentative items stand as working assumptions to test in the prototype. Deferred to the tail (`authoring/authoring.md` §18): network standing, additive reinforcement and multi-source stacking (§6.1–6.2), projection refinements (§5.1), timing of transmission (simple simulation), conversion of manifest data between systems (§12).

---

## 1. Things

**AGREED**
- **One kind of node**: a *thing* with attributes. Two optional extras:
  - **ports**: named entry points (§4);
  - **contents**: anything is a container as soon as something is *part of* it.
- Ports and contents can be added later without rebuilding the thing (a gate, a town, a sect gains detail as it's needed).
- **What kinds of thing a world holds** (user's list, refined): places (sites included); people; organisations (forces included; groups such as *Averland nobility*); political entities and **titles**; faiths (separate from their organisations, with sects); objects and artefacts; periods and events (§7); **area things** (`reach.md` §7); relations that need links of their own (a feud with levels, `order.md` §4; standing, §6.1); **information items** (§6.3); **protagonists registered from rosters** (§12); **personas** (§9).
- **Attributes on a thing are objective facts without direction** (width, roughness), on **neutral scales** the world defines once (roughness 7/10); each system converts them.
- **Same thing or separate?** A guideline, not enforced: keep things separate when merging would wrongly spread reach (a boat passing Kleindorf counted as *in* it), break one-to-one pairing, or blur facts ("Kleindorf burned" ≠ "the river burned"). Nuln the city and Nuln the state are one identity in the fiction; a town and its river are not.
- **What moves**: people and forces (armies are actors with a location). **Organisations and classes don't move**: they are membership; their members move.

## 2. Kinds, templates and statuses

**AGREED**
- **Several kinds per thing** (Nuln: *settlement* + *polity*; a ferry-town: *settlement* + *crossing*).
- **Kinds set expectations; the app warns rather than blocks.** A kind's fields are **offered, not exclusive**: any attribute can be added; a notice offers *keep as a one-off / add to the kind / add a kind that has it*.
- **Kinds are world content, extendable by patches** (homebrew adds fields to *settlement*).
- **Link kinds declare what they expect at each end** (*rules*: title → place), with the same warn-not-block checks.
- **Fields are named per kind** (`settlement.population` ≠ `polity.population`; the city and the state genuinely differ); **separate by default, shared only where declared** (e.g. name).
- **Templates** are packages of *likely* fields, formats, ports, contents and **open slots** applied to a thing ("coaching inn": rooms, stables, yard gate, an *innkeeper* slot → *the Red Moon*); each thing gets its own copies of the template's contents, keyed so they can be changed individually. **Follow / pin / copy** when the template changes (lean: follow by default). A template ("a peasant") is not a collective ("the peasants of Nuln"). **Generation** (make me a village) is a tool on top, not structure.
- **Statuses and titles** are one mechanism: a **package of links with a holder slot** and a **holder limit** — *limited to N* (one Elector of Averland; twelve Elector Counts) or unlimited (*noble*, *Averlander*, *claims Solland descent*). Display differs: a title is a big item on the card, a trait a tag. Statuses **nest** (*Elector of Averland* includes *Elector Count*). A setting has a **book of titles and statuses**.

**PROPOSED**
- Kinds (what's expected), templates (what it was made from) and statuses (what it holds, for a period) may be one mechanism — a package applied to a thing — differing in display and lifetime.

## 3. Links

**AGREED**
- **One graph; hierarchy is a kind of link with stricter rules.** Each link kind is declared once:

| Property | Choices |
|---|---|
| Direction | one-way (*serves*) or both ways (*feud*, *allied*) |
| Hierarchical | no; one parent (a tree); several parents (no loops) |
| Carries | nothing; a value (loyalty +2, debt 4000 crowns); a kind (fear, love, kinship type) |
| Many-to-many | e.g. one title rules several places; one place ruled by several titles |

- **Politics runs over titles, not places**: titles reach places by *rules*, people reach titles by *holds*; geography and politics never fight over one parent. One parent per single-parent link kind **at a time**, many over time; different views (geography, politics) are different link kinds.
- **A link that needs links of its own becomes a thing**: layered claims ("for myself and my Count"), crossings, docks, treaties, reigns, feuds with levels.
- **Links of the same kind can repeat, and different kinds stack**: a river segment is *ruled by* Fred's title (Empire law by climbing the title tree), *sacred to* Sigmar (the Church's rules for clergy and pilgrims, exceptions for them), *domain of* Taal (no god acts in another's domain). The segment holds no laws; each authority's laws carry their own selectors. (Precedence declared *at* a segment is either an authority's scoped rule or setting content: `order.md` §6.2.)
- **Claims** are things: claimant, on behalf of, basis, status (disputed), **recognised by** ("ownership in the eyes of the Empire"). **Privileges** (the Church's pilgrim exemption) are claims too (`order.md` §6).
- **Bases** (session 13, `rules-overlay.md` §15): authorities with their own law packages (the Empire with its province, district and lordship layers; the Church; Marienburg). Every rule carries its base. **Recognition = embedding** another base's law at your root, by reference, with provenance; lower layers switch portions off or on. A base is an ordinary thing (organisation or polity) that holds a law package; the claim (above) stays the world's record of who claims what.
- **Relations target the whole or any part** (Hans → feud −1 → the Church; → feud −4 → Sect A).
- **Membership works bottom-up**: a member of a child sect is a member of its parent sect and of the Church. **Excommunication**: a separate organisation with *claims to be part of* / *excommunicated* links (per-side recognition later, §9).
- **Organisations have no ports**; *speaks for* is a relation.
- **Topics** are display groupings only: a link kind may sit in several; topics are world content, user-addable, toggled like map layers; they never decide propagation. The user's authoring model — "build a geography map, a politics map, organisation structures, then draw links as to how these connect" — is this: maps are topics; one thing can sit on several (Nuln on geography and politics is one thing with two kinds); every link drawn has a kind, which decides what flows.
- **Link packages**: links grouped into packages ("Count of Averland" brings titles, seat, holdings, command), as rules are; templates with a holder slot; nesting allowed.

## 4. Space: places, transit networks and ports

**AGREED**
- **Containment** (places inside places; districts and loose buildings inside a town) is a tree link kind.
- **Transit networks** (session 12, tentative — "I guess"): rivers and roads are one kind of structure, a **transit network**, laid over the place map, with a **flavour**: river, road, skyway, the Underdeep's tunnels, thermal updrafts, a town's streets, a fortress's stairs and shafts. As many separate networks as needed. Each has its own points (source, mouth, confluence, crossroads, landing); **segments** between them; *part of* (segment → stretch → network); each segment also a **route** (mode, speed by direction, tolls, seasons). What differs is **declared per network kind**: direction (rivers *flow into*, one-way, no loops: tributaries join, deltas split; updrafts only rise), speed by direction (upstream / downstream; up a stair vs down), seasons, modes. A river stays a physical feature too (width, floods, *sacred to*). *Passes* / *borders* links connect segments to places at any level.
- **Networks interlace at places**: a place *sits on* a segment at a **measured position** (linear referencing: mile 12, east bank; the segment isn't split; split on demand for journeys); *at* a network point (Nuln at the Reik–Aver confluence; common, not required); *port at*, *crossing at*. **Crossings** (bridges, fords) are junction things linking a point on each network; a place on two networks is an **interchange** (the road meets the river at Nuln's docks). Minor points can simply be a segment's end. Geography needs **scale, distance and nuance** → measured positions.
- **Non-specific over distance**: link lengths can be stated, approximate or absent (missing lengths: none → equal; one → equal to it; several → the average, `order.md` §4.5); measured positions are optional.
- **Ports**: a thing may expose named entry points (Nuln's north gate, docks, bridge; a segment's ends and *mile 12, east bank*). Links attach port to port, or to the whole thing when no detail is wanted.
- **Delegation**: a container's boundary port is **wired to something inside** (north gate → the end of Kaiserstrasse in Northgate district), or to nothing yet. **External links attach to the container's port; promotion only rewires the inside**: the gatehouse becomes a site (contained in Northgate district), the port is wired to its outer gate, its inner gate joins the streets. Each level knows only its own edge.
- **Zoom falls out**: road → Nuln / north gate / street → building. A town's streets are the same network model at a smaller scale.
- **All physical containers** work this way (provinces with border crossings, towns, districts, buildings and rooms — Warhammer Quest doors — ships, river stretches, fortresses). **Ports are optional**; adding them later prompts ("attach this road to the north gate?"), never silently moves links.
- **Reach follows containment**: a garrison at the gatehouse gets Nuln's stationed rules; a traveller on the road doesn't until through the port. **Transit links carry travel, not rules.**

**AGREED (session 12, tentative — "I guess", "I think"): height and separate meshes**
- **Above and below are not a structural distinction.** The Underdeep is **its own geography mesh** (its own containment and transit networks), connecting to the surface at points (a fortress's deep gate, a mine). No *beneath / above* link is needed:
  - surface rules don't leak because Underdeep places are **not *in*** surface provinces, and transit links carry no rules; a **switch-off at a connection** remains available where something is deliberately linked both ways;
  - **the Empire can rule or claim parts of the Underdeep**: politics runs over titles (*rules*), independent of geography;
  - **scope does the rest**: a surface-only plague has no Underdeep places in its scope.
- **A mountain fortress** with an upper site and deep halls is a **container with parts**, like a city's districts: the upper site sits *in* its surface province; the deep halls are *part of* the fortress (one parent at a time); the deep gate is a **port** wired to the Underdeep network. **Travel between levels needs a transit link** (stair, shaft, lift: a segment of the fortress's inner network, length possibly unmeasured, speed by direction); an ordinary link carries no travel. Rules for "the Underdeep" as a whole can reach the deep halls through an **area thing**.
- **Elevation** is an optional neutral attribute on places and network points (cold, sight lines, updrafts) — distinct from **level** (a drawing layer, §5).

**PROPOSED (session 12)**
- **Adjacency without travel**: a mine directly under a town has no route between them but may carry mediums (tremors, noise, seepage): a plain *adjacent to* link with a length, walked only by the mediums that declare it.
- **Secret connections**: hidden tunnels between meshes are non-public facts (`reach.md` §5); a viewer's maps and reach show only the connections they know.

**AGREED: areas of effect**
- Areas of effect are **area things** linked by *in area* (`reach.md` §7), many-to-many, spanning levels and meshes ("prone to earthquakes" covers surface and deep places). "Tags on places" is only how this displays. (Reverses "tags on nodes — not adopted", 2 Nov; log when v2 settles.)
- **Membership** by hand, or **computed from a drawn shape** (§5.1).

**PROPOSED**
- A port that gains owners, events or laws is **promoted to a site**.
- The ports + delegation pattern could fix a battle map to the world (the map's north road edge = the road segment's port).

## 5. Maps

**AGREED**
- **Abstract for anything** by default (as Battle); optionally **pin** things to a pre-drawn map (an image, or one built in the tool).
- **Abstract views zoom by containment** (zoomed out: provinces; in: towns, districts); layout uses link lengths where given, otherwise children cluster near parents. Background owns the look.
- **Drawn maps are in-world artefacts, hand-drawn and unreliable for scale** (think Mercator). **Metric geometry** (distances, exact shapes) is only a standing suggestion, never imposed; **stated link lengths are what mechanics use**. Several maps at different zooms and dates; a thing may appear on several.
- **Topological geometry is reliable enough to use** (session 12, user, tentative — "I think"; the user's "fuzzy relative"): a drawn map preserves inside / outside, order and neighbours while distorting distances and shapes. User's case: places really on a circle (one outside it), drawn on the edge of a square — a shape with a kink around the outlier still captures the right ones. Terms: *topological* vs *metric*; topology is nicknamed "rubber-sheet geometry"; a **schematic map** (the London Underground map) is the everyday example.
- **Levels are for drawing** (session 12): needed only to pin and draw. The surface is level 0; the Underdeep shares map coordinates at −1 (styled dotted or frosted). The sea tunnel: level on its **network points** (ends at 0, middle at −1), so the segment between draws as underneath.
- **Views and layer groups**: the Underdeep on its own map or on a surface map; a view picks and groups layers ("for this view: 0, 1, −1 to −5"). Layer groups are **view presets** (display settings, not world data). **Generic collections** (§12) use the same view presets.

### 5.1 Area membership from drawn shapes (session 12; projection session 14)

**AGREED (user's steps)**
- A place **pinned** on a map inside an area **drawn** on that map is **captured automatically**; the area carries a **level range**, matched against the pin's level.
- A **non-pinned** place can be added to the scope by hand.
- A pinned place can be **excluded** by conditional rules (on the area or the place) or **toggled off / removed** by the GM.
- If a place shouldn't really be captured, fix the cause: **move the pin** (wrong place; update the map), **change the area** (its drawing or its scope), or **amend the place's attributes** (it's not actually in Averland).
- **Pins and shapes are stored per map, in that map's own coordinates.** Capture reads pins on the map the area is drawn on — real pins, and **projected pins** from other maps (below).
- **Explicit beats computed**: hand additions and GM exclusions win over the shape; an exclusion that no longer matters (the pin moved out) is flagged as **stale**.
- **Computed membership changes are notices** to validation / the GM queue ("Kleindorf is now in the earthquake zone (from the campaign map)"), dated, so a growing plague zone keeps its history.
- **The drawn area is the area**: a province 95% inside the shape has its **pinned places inside** captured; the province itself isn't (an earlier per-area overlap rule was withdrawn as overruling intent).
- **Overlap prompt** (user): compare the drawn area with existing collections whose coordinates **materially overlap** and offer: "You materially overlap the places in Averland — did you mean all of Averland?" → include the whole collection / keep as drawn / something else. Warn, don't block.
  - **Material** = share of the collection's pinned members inside the shape; **80% to start**, easily changed.
  - **Near misses** (an edge passing close to a few members) are **flagged**; counting them towards the threshold is optional, **default off** ("recalculate with near misses").
- Note: this partly reverses "geometry is never imposed" — **for area membership only**, and only topologically; log when v2 settles.

**AGREED (session 14, user): cross-map projection, rudimentary version** (refinement in the tail)
- **Control points**: places pinned on several maps (pinning across different sources) line the maps up. **The number of shared pins required is config — default 4**, because three always fit exactly and coherence can't be tested.
- **The fit**: a least-squares **affine** fit (stretch, rotate, shift) between two maps over their shared pins; **chained** through intermediate maps where two maps share no pins (the error adds up along the chain and is shown). This allows **projecting all places onto one map**.
- **Incoherent → flagged**: leftover (residual) error at the control points above a threshold; control points roughly in a line; or a **mirrored** fit (one map drawn flipped). The flag names the worst-fitting pins.
- **Drawing an area projects all places onto the map being drawn on**, shown as **ghost pins**, distinct from real pins.
- **A projected place clearly inside is captured** (a dated notice, like any computed membership). **A projected place that is cuspy for the shape becomes a suggestion**: "cuspy" = within a margin of the edge set by the fit's own error (e.g. 2 × the residual, config), so a badly fitting map gives wider margins and more suggestions.
- **Precedence**: a real pin beats a projection; hand additions and exclusions beat both.
- **Tail**: bending fits (thin-plate splines, local fits), confidence shading.

**PROPOSED**
- A drawn map can itself be an artefact with a maker and source.

## 6. Spread and spillover

**AGREED**
- **Distance is graph distance**: links carry lengths; distance = shortest path; no coordinates or direction needed (true separation lies between |a−b| and a+b; a direct link can state it).
- **Distances live on links, not nodes**: road segments carry miles, affinity links their own lengths.
- **A medium** (rumour, fame, plague, a grievance) declares **which links carry it and how well (conductance)**, **gain** at nodes (towns boost rumours; a monastery damps them) and **decay**. The goat path exists physically but carries almost no rumour.
- **Strength comes from** the medium (its formula reading facts such as traffic), the **instance** (this rumour's credibility: an outlandish one fades fast even through busy towns), and the **network** facts; **hand tweaks** at any level are ordinary patches (shown in the derivation; clash notice).
- **Conductance can differ by direction** (slums → nobles' district low, nobles → slums higher), set by hand or calculated — **definable and a formula** (session 12).
- **Inside containers** a medium spreads over the inner network from the entry port, so a rumour can be back on the road out before it reaches the slums.
- **A container's value = a weighted average of its parts**, **weights user-defined** per medium (rumour: population; political news: influence); rolls up; rules about one part read that part. Session 12: **layered inclusion** — parts with values are averaged, parts without take that average. **Session 14 (user): a reached part at 0 counts by default** (Nuln with the walled-off nobles' quarter at 0: 5.7, not 6.8); the **option to ignore 0s** is kept; PROPOSED: the derivation lists parts excluded by the option (`order.md` §5).
- **Spillover**: one relation aimed at Sect A with a declared spillover to its containers, decaying by distance, ending with it. Session 12: spillover can also go **down**, with **halts** where inheritance takes over, and functions from a shared **library** (`order.md` §4).
- **Timing**: changes populate instantly for now; transmission lag, adoption delay and notification are **simple simulation**, in the tail (`pillars/gm-aids.md` §5).
- **The combine machinery** (general and specific levels, cumulative / absolute mark, function library, metrics walking declared link kinds, affinity links, halts, branch functions, direct beats inherited, roll-up vs inherit-down) is in **`order.md` §4–5**.

**Superseded (session 14)**: "boosters plus loops → strongest single path" — loops are prevented by working out each value per source and never sending back the way it came (§6.2).

**Resolved (session 12)**
- ~~On Sect A itself, do the general −1 and the specific −4 combine (−5) or does the specific win (−4)?~~ → the feud is one thing with two levels, marked **cumulative** or **absolute** (`order.md` §4).

### 6.1 Standing between two parties (session 14)

**AGREED (user)** — replaces `rules-overlay.md` §15.6's proposal.
- **Standing** is a relation value from one entity to another (the Church's standing towards Fred), built from **dated events**: each event adds a **block** with an **impact**.
- **Asymmetric** by default (Fred hates Sect A; Sect A doesn't care about him either way); **any event can optionally write both ways**.
- **Each block has its own decay**, which can differ between blocks; **the default decay is keyed to the event type** (a levy fades over two years, a gift over one), overridable per event; decay uses `order.md`'s function library.
- **The current value = the sum of the decayed blocks** as of the date read — arithmetic, not simulation. Worked case: spring 2524 Fred levies the Templars (Church → Fred −3, fading to 0 over two years); spring 2525 he funds a cathedral bell (+2, fading over one year); read in spring 2525: −1.5 + 2 = **+0.5**.
- **The feud is the special case** with named levels (`order.md` §4).
- **Party to party only** for the prototype: no propagation. Rules read standing only through `value(standing, holder, target)` (`rules-overlay.md` §17).
- **Split**: Campaigns logs the event and its impact; the world computes the current value; GM aids may propose a response.

**Tail — network standing**: standing spreading over relation links (emotional distance as an asymmetric conductance, a distance metric, the holder's **care** about the event type); derived standing spreads; loops excluded by working per source block; spread modes strongest path / all paths attenuated (Katz) / energy conservation (Appleseed, lean default); signed links (structural balance) open. Detail: `research/propagation-notes.md` §2. Structural assumption: rules read standing only through `value(…)`.

### 6.2 Transmission: first iteration for any medium (session 14)

**AGREED (user)**: **general settings for any transmission object** (rumours, messages, law changes, any medium), each optional and configurable per medium, with defaults.
1. **Outward only, worked out per source**; never sent back the way it came. This is what prevents loops.
2. **One source per item**: an information item has one origin.
3. **Currency: the stronger wins.** An arriving version is compared with the currency **as it stands now, after fading**; if stronger it **replaces** (never adds). Talabheim: 10% left by week 5 loses to an arriving 25% → 25%. A currency hook can rise again (one GM notice on the state change).
4. **Belief is derived**: a configurable formula of the incoming strength and a **susceptibility** on the place (a named number, like a medium input, §6.3), recalculated on each arrival; optional further inputs (the teller's credibility; the number of independent routes heard through). **The GM can hand-set belief** as an override. (Belief was recorded only; §9 and `reach.md` §5 now read it as derived by default.)
5. **Relay formula**: what a place passes on = a formula of what came in and the place's own values, belief included. **Default: pass-through.** Example `out = in × (0.8 + 0.4 × belief)`: a credulous village (belief 70%) passes 40 on as 43; a sceptical city (belief 20%) as 35. **A cap per medium** stops a chain of credulous places amplifying without limit.
6. **Re-transmit on improvement, above a threshold**: a place passes on a better version when its value improves by at least the threshold; below it, the place's own value updates but nothing is re-sent. **Threshold modes**: points · percent of current · either (more than 10 points **or** more than 20%) · both (more than 10 points **and** more than 20%); default points. Ends because sends follow improvements only and values are capped.
- The first arrival isn't necessarily the strongest (the village version first, the more credible city version days later) — handled by 3–6.

**Tail**: reinforcement that **adds** (two routes of one source, or several items treated as the same rumour); multi-source stacking. Structural assumption: rules read medium values only through `value(…)`.

### 6.3 Information items and mediums (session 13, carried in)

**AGREED (user)** — from `rules-overlay.md` §4; applies to any propagation mechanism.
- **Information items are things**, linked to each other: a notice posted *sparks* a rumour; a rumour *mutates into* another.
- At a place, an item has three separate values: **spread** (how far it has reached: the medium's value), **currency** (how much it is being discussed; fades with time since arrival), **belief** (how strongly holders hold it; derived, §6.2).
- **Mutation likelihood** ("80% likely to have mutated") is a formula over time and distance; **the act of changing is the GM's**, recorded as a new item *mutated from* the original (or proposed by GM aids). **The original persists until cancelled or too weak.**
- **Medium inputs**: any medium can define and name **any number of numerical inputs with defaults** (urgency for messages; susceptibility at a place), read by its formulas.

## 7. Time

**AGREED**
- **World history** is a nominally fixed timeline of events (sources may place events differently). The graph at a date is a **snapshot**; **from / to belong to library content**, not only campaigns. An **era** (TOW vs WFB) is a snapshot date used as a campaign baseline.
- **Periods and events are one kind of thing**: a thing with a **when**, which may be a pure banner (*the age of madness*), **hold** a link package for its span (the war: Nuln and Averland *at war*; the reign: the Elector title, the palace, the state troops, the Runefang — ending together), **contain** sub-events (*part of*), and have **participants with roles**, **causes** (*led to* / *caused by*) and **recorded consequences**. A battle is the same shape with a short span; a journey can have a **path** (Rocco's long march).
- **When** is either dates or a **named period**; a period holds its own dates — known, approximate, unknown, or **different by source**. Intervals can be open-ended or fixed-length.
- **Start and end dates are readable** on any dated thing or link (session 13, `rules-overlay.md` §17), so elapsed time is plain arithmetic: `read date − start(stationed at here) > 2 days`.
- **Relative dates, explicit**: type-ahead reference (*the Great Plague*, start or end) + delta (−1y, +1m); changing the anchor moves linked dates; **break link** selectively or in bulk (freeze to absolute); **re-anchor** to a driver entry; loops are errors.
- **Source variants**: one driver, but timeline views (even in a sandbox) show alternatives side by side; linked dates shift with the viewed variant.
- **Consequences are recorded, not computed**: links stated by the GM or author to existing things and log entries. Creating an event may **scaffold inert drafts** (a stub truce) marked *to verify* for the GM queue; no automatic chains. Simulation stays in GM aids.
- **The campaign log overlays the world timeline**: changes stay in the sandbox unless integrated; a change in the past flags later clashes for the GM; compare world with / without overlays, or overlay vs overlay. Reasons are attached text.
- **Timelines of things are visualisations** (rulers of Nuln as a family tree; a feud's strength over time).
- **Two clocks (requirement)**: every entry carries **play sequence** (always forward) and **world date** (can jump back); "as of" = (iteration, date); views sort by either. Storage with two clocks is **infra** (session 14), with withdrawing a mistaken entry (links-register V7).
- **Time loops**: a loop entry resets the world date and starts a new **iteration** (an overlay from that snapshot); the previous iteration's changes are kept and comparable; **carried-over** protagonists keep their state and knowledge; the loop declares **replace** or **coexist** for earlier selves (and duplicated objects); checks run per iteration. A loop is a timeline rule.

**PROPOSED**
- **Calendars** (timeline folders): one internal day count; calendars convert (units, named months and days, festival days, epochs — Imperial, dwarf, elf…); dates display in the context's calendar; relative deltas use the anchor's calendar; **date precision** (day / month / year / decade, circa).

**OPEN**
- Can a period with no dates be placed **only relative** to others (before, during, overlapping)?

## 8. Identity over time

**AGREED**
- **Same thing changing = same node with dated changes** (Mordheim after the comet: its attributes and contents changed; a feud's levels changing, `order.md` §4.2).
- **Solland broken up**: the region stays (geography untouched); its places' *rules* links end and new owners' begin; the polity and its title end their span, so their packages stop applying; **history = the ended links**. **"Ex-Solland"** = membership of a *former Solland* group (a status) that can carry traits.
- **No *succeeds* mechanism**: a government in exile = the same title living on with links changed (rule ended, claims begun); a refounded order = a new organisation with a **claim**. Plain lineage ("founded on the ruins of") is an ordinary relation or text.
- **Promotion keeps the ID** (session 14): a generic protagonist promoted to a proper actor is the same thing with its tier changed (§12).

## 9. Knowledge and belief

**AGREED (user: "think so")**
- Three layers kept apart: **sources** (out of fiction: books disagree — §7), **viewers** (out of fiction: what a player sees — Visibility pillar), **knowledge and belief** (in fiction).
- **A belief is a thing**: holder (a person, organisation or a place's population) → a **statement** about a fact or link, possibly false ("the Countess is 56"; truth 49) → strength, source, period (until corrected). **Knowledge** = a belief matching the truth (derived). Some beliefs have no truth to check ("the river is a god").
- **Session 14**: for beliefs carried by a medium, **strength is derived** (§6.2) — a formula of the incoming strength and the holder's susceptibility — with a GM override; a belief stated directly (a captain told them outright) is recorded as before.
- **Public stance vs private belief** (the Emperor recognises Fred's claim, privately doubts it); recognition is a public stance. **Stance wins over belief** where both exist (`rules-overlay.md` §10).
- **Facts public by default**; **secret** facts are known only to holders of a matching belief. **Reasons and provenance can be public or secret like any fact** (`secret-acting.md` §3).
- **"As seen by X"** = truth, overridden by X's beliefs, secrets X doesn't hold hidden.
- Rumours = beliefs spreading by the media machinery; a loop's future knowledge = beliefs about later-dated events. Effects of belief on play are rules.

**AGREED (session 13, tentative): personas** (`foundations/secret-acting.md`)
- A **persona** is its own thing with its **own ID** and links, tied to the real person by a **secret alias link** (*alias of*), a non-public fact. **Reach doesn't cross the alias link**; each alias has its own guest list. Acts reach the world only through the public identity, with secret reasons (optionally a public cover reason).

## 10. Names

**PROPOSED (no objection)**
- Each thing has a **list of names**: language or culture, era, kind (official, common, epithet), source. Each context or viewer has a display rule; search uses every name.
- A persona's name is a separate thing's name, not an alias in the name list (§9) — name masking on a shared ID was rejected (`parked/parked-ideas-v2.md`).

## 11. Integrity checks

**AGREED**
- In-fiction consistency only. **Errors only where the structure can't be walked** (containment loops, broken references, date loops); everything else **warnings or notices**, markable **intended**, with **exemptions by status** (*undead*: Vlad von Carstein acts after death).
- **Checks are limited.** Default core: broken structure; **uniqueness and holder limits** (one Runefang; one Elector of Averland); **one place at a time** (applies to the **real person**, so a persona and its alias can't be in two places at once in truth — markable *intended* for magical cases); **sandbox changes contradicting later history**. Everything else opt-in (completeness, before-birth, setting-declared). Findings go to a **GM queue**; repeats grouped; *intended* silences.
- Run on edit, on push from a sandbox, and in a health view; at a snapshot date or across all time; per loop iteration.
- Session 12 adds notices for: computed area membership changes, stale exclusions and overlap prompts (§5.1); structural changes that move spread values, cumulative levels moving, defiance and disputes (`order.md`). Session 14 adds: incoherent map projections (§5.1).

## 12. Protagonists in the world: one entity (session 14)

_Replaces session 10's "a roster stays outside the world, linked" with registration in the world. Builds on identity links (`roster/lifecycle-and-history.md` §4) and the v2 identity shape (`architecture-v2-notes.md` §3)._

**AGREED (user)**
- **One entity, one common history**: protagonists are **registered at the world level**, so a protagonist's history is shared across systems, and actors / personages can **become units or fill slots**.
- **What registers**: **rosters, sub-rosters, units (including characters), sub-units, slots and draws** — all already logged for the manifest with instance IDs. **Not every model.**
- **A roster is the manifestation of a portion of an organisation.** The Averland state army is a grand theoretical construct, a world organisation; in a manifest its possible forces are defined by an **army list**. The first roster pulled from it — **Captain Theo's exploratory company** — is a defined organisation, a portion of that potentially infinite whole. **Rosters become items in the organisation**, which lets rules pass down through it (Averland soldiers get extra rations; the treasury isn't paying). The army list is the manifest's definition; the state army is the world thing, so it exists in systems with no army list (WFRP).
- **Generic tier**: every unit is registered with its link; a thing can be marked **generic** (*Handgunner regiment 3*, *Captain 2*). **Generic is a view setting**: it collapses what's shown and limits the read. WFRP sees Theo's company as **Commander Theo, Brandt's Marines, and one generic collection covering all other units**, which it can open for the detail. The mark sits on each thing; **the collection is a view, not a stored thing** (containment zoom and view presets, §5).
- **Slots and characters** can **stay a manifest instance, link to an existing actor** (*filled by*: the general's slot filled by the Countess), **or create a proper actor**. The Mordheim henchman — a slot in his unit of one — can become an actor though he's a lowly grunt in the game.
- **Promotion keeps the ID** (generic → proper is a change of tier on the same thing; no history to stitch).
- **Manifest specifics are passed up, but their values are hived off into a manifest-specific view**: another system reads the roster's **composition, history and effects**, and leaves points and stats at home. Effects reach another system through **hook objects** (`rules-overlay.md` §5): WFRP sees that "the treasury isn't paying" holds and applies its own bound rule; it never reads TOW's Ld −1.
- **Conversion of manifest data is deferred** (tail): a protagonist appearing in another system **carries its last resolved unit card forward** until something changes.

**PROPOSED**
- The carried card is a **read-only snapshot**, flagged "unconverted (TOW card)"; the first change made in the other system creates that system's own record (by hand) — where conversion would later sit.
- Units and rosters are always at least generic, because scopes need them in the world to have a guest list (*raised at*, *stationed at*); slots and characters may stay manifest-only.
- Linking a slot to an existing actor retires the slot's generic entry, if any, with an identity link.

**Structural assumption** (for the tail): neutral facts live on the world thing; system data lives in separate records tied to it by identity links.

## 13. Worked examples

**Nuln and the Countess**
- Places: Nuln → in → Wissenland → in → the Empire. Titles: Elector of Wissenland → under → Emperor. Elector of Wissenland → *rules* → Wissenland, Nuln. The Countess → *holds* → Elector of Wissenland, during *her reign* (a period asserting the Elector package).
- The Runefang → *belongs to* → the Elector title; → *held by* → the Countess.
- The Countess ↔ *feud −3* ↔ the Elector of Averland; → *loyalty +2* → Karl Franz; → *owes 4000* → a Marienburg bank.
- Nuln's ports: north gate (wired to Kaiserstrasse, later to the gatehouse), docks, bridge.

**A stretch of the Reik**
- Segments → *part of* → the lower Reik → the Reik; *flows into* the next; the Aver joins at Nuln.
- On the segment: names (with languages and eras); width, roughness 7/10, keel limit; state *in flood* (dated).
- Kleindorf → *sits on* → the segment at mile 12, east bank. The Aver ford → a crossing linking the river (mile 30) and the road.
- *Ruled by* Fred's title; *sacred to* Sigmar; *domain of* Taal. Fred's claim → *recognised by* → the Emperor.
- Rumour medium: the river road carries rumours well; the goat path barely; Nuln's market doubles them; slums → nobles' district resists.

**Hans and the Church** (revised session 12, `order.md` §4)
- One feud thing: holder Hans; general level −1 (the Church), specific level −4 (Sect A), marked absolute or cumulative; a spillover function over membership affinity (Sect A 0, Blue Boots 1, Order of the Torch 3, Church core 6), halting at Sect A downward by default; disowning groups outside the Church: 0.

**The Battle of the Aver Ford**
- When: week 6 (or *during the Nuln–Averland war*). Where: the Aver ford. Participants: Nuln's state troops *attacker*, Averland's levy *defender*, the Cult of Sigmar *mediator*. Part of the war. Caused by the toll dispute. Recorded consequences: ended Averland's toll rights; opened a truce (a stub treaty, *to verify*); led to the rumour "Averland's levy fled".

**A mountain fortress and the Underdeep** (session 12)
- The fortress → *in* → its surface province (upper site, level 0); its deep halls → *part of* → the fortress; the deep gate (a port) wired to an Underdeep tunnel network (level −1 on the map). Stairs and shafts: the fortress's inner transit network. The Empire's title *rules* one Underdeep hall; Empire law reaches it by *rules*, not by containment. An earthquake zone (area thing) spans surface and deep places.

**The unpaid-wages rumour reaches Talabheim** (session 14)
- One item, source Nuln. Day 2: the village version arrives (currency 40%, belief 30%). Day 5: the city version (more credible teller) lifts belief to 65%; currency 45% > the faded 38% → replaces. Week 5: currency has faded to 10%; a version via a long route arrives at 25% → replaces (25%); belief is recalculated. Talabheim's relay passes on an improvement only if it clears the medium's threshold.

**Captain Theo's exploratory company** (session 14)
- The Averland state army (world organisation; TOW army list defines what it can field) ← *part of* ← Theo's company (a roster, registered as an organisation) ← *member of* ← Commander Theo (proper actor), Brandt's Marines (proper unit; Sgt Brandt a proper actor filling the champion slot), Handgunner regiment 3 and the rest (generic). In WFRP the company shows as Theo, Brandt's Marines and one generic collection; Brandt carries his last TOW card forward, read-only, until WFRP makes his own record.

## 14. Next
- World structure, reach, order, the overlay and secret acting are closed for the first prototype (session 14). Next in the user's work order: Battle close-out → dice engine → authoring v2 and loose ends → Campaigns → infra → Visibility → implementation (`research/propagation-notes.md` §5; next handover).
