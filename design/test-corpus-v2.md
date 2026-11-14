# Test corpus: v2 cases

_Session 14 (8 Nov 2026); **session 15**: sections G (Battle close-out and dice) and H (authoring); **session 16**: section I (Campaigns: the consequence → commit loop, money, markets, time); **session 17**: I8–I10 (per-pick numbers, decks, expeditions); **session 18**: F6 (two manifest contexts, make common; replaces v1 D4) and F7 (narrative entries, stubs, reach via events). **Slice 1 (12–14 Nov)**: section J (visibility, J1) and section K (containers and lists, K1–K5; their build test names in brackets). Continues `core/test-corpus.md` (v1 cases A–D, which still hold for target points, bags, rounding, combine rules and money; D4 superseded by F6). Each case: inputs, expected result, deciding docs. These are the **acceptance tests for the first prototype**. Notation as v1; rules written as scope + trigger (`rules-overlay.md` §6, §17)._

---

## E. The overlay

### E1. Handgunners' Ld: 8 or 7
- **Inputs:** Nuln Handgunners, profile Ld 7, raised at Nuln 2520, member of the Gunnery School, serve a commission paid by the Wissenland treasury, stationed at Nuln. Rules: Nuln civic pride `Ld +1` (scope `reaches(Nuln, via raised at → in*)`, origin, category place); Gunnery School `Ld = 8 @inline` (scope `reaches(Gunnery School, via member of)`, origin, category organisation); unpaid wages `Ld −1` (scope named "commissioned by the treasury"; trigger `in force(wages withheld, withholder = Wissenland treasury)`; environment, category title). Read 2525, wages withheld.
- **Expected:** origin step: 7 → 8 (place) → 8 (organisation); stationed step: −1 → **7**. With wages paid: **8**. Derivation shows each scope route, trigger state and what decided order (category).
- **Docs:** `rules-overlay.md` §8, §12–13.

### E2. Order within a step by depth
- **Inputs:** Wissenland discipline `Ld = 7 @inline` (scope raised in Wissenland) and Nuln civic pride `Ld +1` (scope raised in Nuln), both origin, both category place, same source layer.
- **Expected:** depth: nearer applies later → Wissenland then Nuln → **8**. Written `@statline`, the result is 8 in any order.
- **Docs:** `rules-overlay.md` §8.

### E3. The truce
- **Inputs:** P5 Old grudge `grant Hatred (Averland)` (scope raised in Nuln, origin). T1 truce `switch off P5` (scope `reaches(any party to the truce, via serves → under*)`, trigger `in force(the truce)`), signed 2523. The Countess's mercenaries are raised in Nuln and serve her as a person.
- **Expected:** Handgunners read 2522: Hatred; read 2524: no Hatred ("Old grudge, switched off by the truce"). Mercenaries keep Hatred (outside T1's scope). A 2525 decree switching P5 back on (between bases) wins by chronology until something newer. A new "Nuln war memorial" granting Hatred (Averland) is not caught; the test view shows it against the Handgunners and **suggests** extending the truce.
- **Docs:** `rules-overlay.md` §9.

### E4. Grenzstadt spinach
- **Inputs:** Grenzstadt Spearmen raised 2520 at Grenzstadt (then *in* Averland). Spinach `S +1` (scope `reaches(Averland, via raised at → in*)`, origin). Grenzstadt passes to Stirland 2523; blight ends the spinach 2524. A patrol drawn from them in 2525; recruits from a Stirland village join in 2524 as a contingent.
- **Expected:** the Spearmen keep +1 S in 2525 (origin read as of 2520); the patrol keeps it (copies keep the raising date); the Stirland contingent doesn't. Battlefield state default majority: 12 recruits vs 8 veterans → recruits' profile; average → +0.4 rounded by the manifest; individual → two profile lines. A rule written "+1 Ld **while** the Elector holds Grenzstadt" is environment and stops in 2523.
- **Docs:** `rules-overlay.md` §7.

### E5. Templars, Fred and the lord
- **Inputs:** Church law: Templars exempt from lords' levies; the Empire embeds Church law at its root. Fred's edict levies one in ten from armed bands in his lands. 2524: Fred passes "in my lands the Church's privileges hold". 2525: his lord switches the Church portion off for the province.
- **Expected:** before 2525: Templars exempt; no flags. 2525: nearest standing law wins → Templars still exempt in Fred's lands; flag "Fred's 2524 law now conflicts with his lord's 2525 decree"; no flag against Fred for merely inheriting before 2524. If Fred had added nothing, he inherits his lord's defiance (shown, not flagged). Fred actually levying is play (logged; standing impact recorded).
- **Docs:** `rules-overlay.md` §15.

### E6. Marienburg structural clash
- **Inputs:** a Reik stretch with a Marienburg toll-levy; Templars passing; Marienburg doesn't embed Church law.
- **Expected:** both rules stand; **structural clash** flagged with nothing extra declared; parked by GM dismissal or an in-fiction accommodation thing.
- **Docs:** `rules-overlay.md` §15.2, §15.5.

### E7. Veterans of the Siege of Nuln
- **Inputs:** unit with a *participated in* link to the siege. Rule: `reaches(Siege of Nuln, via participated in, ever)`. Later recruits as a contingent; a patrol drawn from the veterans.
- **Expected:** veterans and the patrol qualify (history through identity links); the recruits' contingent doesn't. Read now → Here view. `count(reaches(any battle, via participated in, ever)) ≥ 3` works the same way.
- **Docs:** `rules-overlay.md` §17.

### E8. Foul water (WFRP)
- **Inputs:** `read date − start(stationed at here) > 2 days`.
- **Expected:** true from day 3 of the stay; resets on a new *stationed at* link.
- **Docs:** `rules-overlay.md` §17.

### E9. Fred the cultist's levy: player vs GM view
- **Inputs:** cult directive "tax the Templars" reaches the persona the Masked Hand (alias of Fred). Fred writes his own levy law with a secret reason (link to the directive) and the cover reason "war levy".
- **Expected:** player view: an ordinary Fred law, "Fred's levy against Church law" flagged, provenance "war levy". GM / truth view: the same law with "enacted because of the cult directive, by the Masked Hand, alias of Fred". Persona and Fred can't be in two places at once in truth (integrity notice).
- **Docs:** `secret-acting.md` §3, §5.

### E10. Graded effect
- **Inputs:** hook object "word that Wissenland won't pay", declared value: currency of the unpaid rumour where the unit is. TOW binding `Ld −floor(currency / 25)`; WFRP binding Fellowship −1 per 10%. Currency 60%.
- **Expected:** TOW −2; WFRP −6. The hook object lists both bindings' reads and formulas. Currency moving 60 → 70 raises no hook notice (quiet "conditions changed"); the hook switching off raises one.
- **Docs:** `rules-overlay.md` §4–5.

## F. The world

### F1. Standing
- **Inputs:** spring 2524 Fred levies the Templars: Church → Fred −3, decay linear to 0 over two years. Spring 2525 Fred funds a cathedral bell: +2, linear over one year. Hook `value(standing, holder Church, target Fred) < 0`.
- **Expected:** read spring 2525: −1.5 + 2 = **+0.5** → hook false. Read autumn 2525: −0.75 + 1 = +0.25. Read spring 2526: 0 + 0 = 0. Sect A's standing towards Fred is unaffected (asymmetric; no propagation).
- **Docs:** `world-structure.md` §6.1.

### F2. The unpaid-wages rumour at Talabheim
- **Inputs:** one item, source Nuln; reinforcement off; susceptibility at Talabheim set; relay pass-through; re-transmit threshold 10 points.
- **Expected:** day 2 the village version arrives (currency 40%, belief derived from it); day 5 the more credible city version: belief rises; currency 45% vs the faded value → replaces if stronger. Week 5: currency faded to 10%; a version via a long route at 25% → **25%** (replace, never add). Talabheim re-sends only when its value improves by ≥ 10 points. Nothing is ever sent back the way it came.
- **Docs:** `world-structure.md` §6.2.

### F3. A 0 counts
- **Inputs:** Nuln districts weighted by population: Market 2,000 at 8; Docks 3,000 at 6; Slums 10,000 no value; Nobles 1,000 reached at 0.
- **Expected:** default **5.7** (slums take 5.7); with ignore-0s **6.8**, the nobles keep their 0 and the derivation lists them as excluded.
- **Docs:** `world-structure.md` §6; `order.md` §5.

### F4. Cross-map projection
- **Inputs:** campaign map and old Empire map share Averheim, Grenzstadt, Streissen and Heideck (4 pins). Kleindorf is pinned only on the Empire map. A plague zone is drawn on the campaign map.
- **Expected:** an affine fit; Kleindorf shown as a ghost pin; well inside → captured (dated notice); within 2 × residual of the edge → suggestion. With only 3 shared pins and a minimum of 4: no projection, flagged. One map drawn mirrored → flagged, naming the worst pins. A real pin of Kleindorf on the campaign map beats the projection.
- **Docs:** `world-structure.md` §5.1.

### F5. Captain Theo's company across systems
- **Inputs:** the Averland state army (organisation) with Theo's company (roster, registered); Commander Theo and Brandt's Marines proper; Handgunner regiment 3 and the rest generic. Sgt Brandt appears in a WFRP session.
- **Expected:** Averland rations and the treasury hook reach the company's units through the organisation. WFRP shows Theo, Brandt's Marines and one generic collection (expandable); points and stats aren't shown. Brandt's TOW card shows read-only, "unconverted (TOW card)", until WFRP makes his record. Promoting Handgunner regiment 3's champion (already a stub actor in his slot, session 18) to proper keeps his ID and history.
- **Docs:** `world-structure.md` §12; `pillars/background-and-narrative.md` §2.

### F6. Two manifest contexts in one sandbox: winds of magic (session 18; replaces v1 D4)
- **Inputs:** one sandbox with a TOW context and a 6th context. In TOW, Grom dies in a battle in week 6. The TOW GM adds "winds blow strong at Region 5: +1 to cast" as a TOW rule with make common on (default) and no hook; a second TOW house rule "TOW Bretonnians re-roll Virtue tests at Region 5" with make common off. In week 9 the TOW GM ends the winds rule.
- **Expected:** Grom's death is one dated event; the 6th context reads it (his 6th record shows him dead) with no sync. The winds rule is **wrapped in a hook object** automatically; the 6th context gets a **cross-context notice** ("*Winds blow strong* (TOW, Region 5) has an effect in TOW — take a look"), linking to the rule. The house rule raises nothing (private). The 6th GM binds the hook (+1 power dice) → the notice clears; from then on the hook switching on or off reaches both contexts. Variant: the 6th GM dismisses instead → nothing further until the TOW rule's next version, which raises the notice again (PROPOSED). No TOW FAQ or army-list patch raises a notice. Nothing is converted automatically.
- **Docs:** `pillars/conversion.md` §2–3; `rules-overlay.md` §5.

### F7. A journal entry, stubs and who knows whom (session 18)
- **Inputs:** Bea writes an in-world journal entry dated week 7: "@Karl and @Hans held the ford against @Grom." Karl exists (a stub actor in a slot of her warband); Hans doesn't; Grom does. She attaches a real-world photo of her painted Karl. The ford battle's record lists Karl and Grom as participants. Later she edits the prose and removes "@Hans" before syncing; a week later, after commit, she mentions Hans again in another entry and then deletes that entry's mention.
- **Expected:** autofill finds Karl and Grom; for Hans it offers "new: person?" → a **stub**, generic, as quick local content in Bea's draft batch (a submission to the host). Removing @Hans before the commit drops the stub with the draft item. After commit, removing the mention leaves Hans in place with **no notice**, listed under **"stubs with no references"** (keep / link elsewhere / withdraw). Editing the entry's prose is a content edit, not a correction entry. Karl's **appearances** list the entry and the ford battle. Karl's **reach** shows Grom "via the Battle of the Ford" (participation as a route). **Make link** over the entry's mentions lets Bea add "rival of" Karl → Grom with text "since the ford". On promote-as-new the entry travels (in-world); the photo is stripped unless kept (real-world).
- **Docs:** `pillars/background-and-narrative.md` §2, §4–5.

## G. Battle and dice (session 15)

### G1. The battle lock holds against a back-dated change
- **Inputs:** Grom's Orcs (20 Boyz) fight in week 7. Played Saturday; entered Monday with effective time Saturday 14:00; snapped Monday. Wednesday: the GM enters a week-6 ambush killing 5 Boyz, effective time Friday.
- **Expected:** *as locked*: 20 Boyz (recorded after the snap). The record carries a **permanent out-of-sync flag**; the notice can be dismissed, the mark stays. The parallel recompute shows 15 Boyz and its victory points; the recorded outcome is unchanged. Variant: the ambush was agreed Friday and entered Sunday with effective time Friday, **before** the snap → inside the lock: 15 Boyz from the start, no flag.
- **Docs:** `pillars/battle.md` §8.1.

### G2. Opponent reference
- **Inputs:** Nuln Handgunners with *Old grudge* = `opponent(in contact)` reaches Averland via *raised at → in*. Opposing side: an Averland levy (raised in a village in Averland) and Stirland mercenaries. T2: combat with the mercenaries; T3: combat with the levy; T4: the levy changes battle roster to the Handgunners' side.
- **Expected:** T2 no Hatred; T3 Hatred ("opponent in contact reaches Averland"); from T4 the levy is no longer an opponent → no Hatred against it.
- **Docs:** `pillars/battle.md` §8.2; `rules-overlay.md` §17 (as amended).

### G3. Position correction
- **Inputs:** deployment entered roughly; at T2 the map shows Black Orcs 8.2" from the Halberdiers; the table says 8"; charge range 8".
- **Expected:** measuring notice "8.2" measured, 8" allowed" offers "match the table"; a 0.2" correction entry on the chosen unit. The charge then reads 8". The correction appears in the log, not in the narrative; "inches marched" stats and "didn't move" checks ignore it; later moves start from the corrected position.
- **Docs:** `pillars/battle.md` §8.3.

### G4. Counted conditions
- **Inputs:** Bleeding (add), Fatigued (highest), Ablaze (once). T1 Bleeding 1, T2 Bleeding 1; T1 Fatigued 1, T3 Fatigued 2; T2 Ablaze, T3 Ablaze again.
- **Expected:** Bleeding 2; Fatigued 2; Ablaze on, with the notice "Ablaze applied at T3, already on since T2".
- **Docs:** `pillars/battle.md` §8.4.

### G5. Carried items
- **Inputs:** Halberdiers hold a standard (transferable) and a bearer pick; Mordheim warbands with wyrdstone. Siege: the crossbow unit is wiped out at T3.
- **Expected:** at the start the standard is a carried piece on the Halberdiers, effect via the bearer rule. Crossbows (not flagged) are made a piece by an entry at T3, picked up by the Halberdiers, equipped → they shoot. Mordheim: shard picked up T2, carrier out of action T4 → drop offered, Ogre picks up T5. Outcome feed proposes only changes ("Halberdiers hold crossbows"; "Ogre's warband +1 shard"); 27 unchanged standards need no confirmation; nothing written to rosters until Campaigns commits.
- **Docs:** `pillars/battle.md` §8.5; `battle-outputs-and-matchup.md` §3.

### G6. Underdog
- **Inputs:** Grom's warband rating 140, Ann's 210; edition formula "lower rating is underdog".
- **Expected:** Grom's side underdog (derived); outcome feed carries it. With a side input override set by the campaign's pairing to Ann → Ann's side.
- **Docs:** `pillars/battle.md` §8.6.

### G7. Dice: choose, override, sets
- **Inputs:** break test Ld 8 on 2D6, app rolls 3 + 4; Mordheim exploration 7D6 choose 6.
- **Expected:** tapping the 4 and setting 6 → 3 (app) + 6 (typed) = 9, failed; the entry keeps the app's original 7. Exploration: user keeps 1, 3, 3, 3, 5, 6 → sets node finds a triple → chart lookup; sum used for the next table. A self-coded function isn't offered (tail).
- **Docs:** `tools/dice-engine.md` §1–2, §4.

## H. Authoring (session 15)

### H1. Drawing links and presets
- **Inputs:** the Countess, Elector of Wissenland, Nuln on the canvas; a road drawn Nuln → Kleindorf → Averheim with the road tool, preset *paved* + *uphill* (first click at the river); GM adds `−1` up for winter.
- **Expected:** Countess → Elector offers *holds / claims / serves*, *rules* greyed ("expects title → place"); Countess → Nuln suggests her title *rules* Nuln. The hill segment: 6 × 0.7 = 4.2 up, 6.6 down; with `−1` → 3.2 up; reordering the `−1` before the multiply gives 3.5 and a clash notice; a later change to *paved* follows, the `−1` survives ("overridden locally").
- **Docs:** `authoring/authoring-v2.md` §1.1–1.3.

### H2. Branching a world
- **Inputs:** the shared world at week 9; the user branches as of week 7, freezing all rumours, leaving standing unfrozen.
- **Expected:** the born world shows week-7 state; the unpaid-wages rumour stays at its week-7 currency (shown "frozen at branch"); Fred's standing keeps fading by the new world's clock; a rumour started in play spreads normally; changes in the shared world after the branch don't arrive; the birth record reproduces the branch point.
- **Docs:** `authoring/authoring-v2.md` §1.4.

### H3. Scope entry and resolution
- **Inputs:** `handgunners@raised in@averland.grenzstadt` typed in 2520; Grenzstadt passes to Stirland in 2523; an alias "Nuln-on-Reik" typed in another scope.
- **Expected:** the scope stores IDs, reads back "Handgunners raised in Grenzstadt (Averland)" in 2520 and `stirland.grenzstadt` after 2523, still matching; the alias resolves to Nuln (city), shown "Nuln-on-Reik → Nuln (city)"; a player who doesn't hold a secret name can't resolve it.
- **Docs:** `authoring/authoring-v2.md` §2.1.

### H4. Defiance as a metric
- **Inputs:** Fred re-enables the Church's privileges in 2525 against Ruprecht (care 1.5; −1 per season while in force); backs down spring 2526; linear fade over two years.
- **Expected:** `value(defiance, Ruprecht, Fred)` = −6 after a year; standing's derivation lists defiance as an input (not a second block); a value fed by the same distance via defiance and a rumour raises a shared-input notice.
- **Docs:** `authoring/authoring-v2.md` §3.2–3.3.

### H5. A class added on the fly
- **Inputs:** a *relic* class (holiness, origin shrine) added to the ruleset; a CSV with `key, label, holiness, origin shrine, carried by`.
- **Expected:** *relic* uploadable at once; mapping *origin shrine* → *enshrined at* and *carried by* → *held by*, saved as a profile that maps itself next time; an entry form and default card appear; the library browser lists relics, filtered in context.
- **Docs:** `authoring/authoring-v2.md` §4–5.

### H6. Replacements: contingent or size
- **Inputs:** campaign; Grom's Boyz take 8 replacements in 2524 at Mad Dog Pass; the GM has switched the setting off on Skarsnik's Night Goblins, who take 10.
- **Expected:** Boyz gain the contingent "Mad Dog Pass recruits, 2524" with its own origin; Night Goblins' size rises by 10; the derivation shows which level decided; a player can't change the setting.
- **Docs:** `authoring/authoring-v2.md` §6.2.

## I. Campaigns (sessions 16–17)

### I1. Post-battle commit (Mordheim)
- **Inputs:** Bea's Reikland Rangers vs Cal's Clan Skaar. Outcome feed + post-battle procedure propose 31 items; 24 change nothing. Shown: Karl dies; a shard passes from Cal's Ogre to Bea's Scout; wyrdstone +2 (explore); gold +35; XP to three heroes. Bea changes wyrdstone to +3 (re-roll from *Lucky*).
- **Expected:** "24 unchanged" hidden with "show all"; bulk accept takes gold and XP but not Karl's death or the shard (sensitive kinds); Bea ticks both; one commit writes the entries; the wyrdstone entry shows "proposed +2 (explore) · committed +3 by Bea · re-roll from *Lucky*"; the shard entry records "signed off by Bea"; nothing reaches the log before commit; the preview showed the card without Karl.
- **Docs:** `pillars/campaign-loop.md` §1.3, §7.

### I2. Lasting, scheduled and conditional consequences
- **Inputs:** week 7, border town: bodies in the water (−1 T −1 S to units stationed there, necromancer check +1) for 3 weeks; reports reach Nuln in week 8 (scheduled); Averland pays 200 crowns if Nuln releases Captain Haas by week 9 (conditional); Karl's back pay due week 10 (scheduled); Karl dies in week 8.
- **Expected:** one event *the fouled water*, weeks 7–10; both rules on while it's in force, off from week 10 with no end entries; ending it in week 9 = one date change. Reports land automatically in week 8 with a GM notice. Haas released in week 9 → the 200 crowns land automatically, notice. Karl's back pay **doesn't land**: "couldn't land: target gone"; the GM redirects it to the stash.
- **Docs:** `pillars/campaign-loop.md` §1.1, §1.4.

### I3. Money
- **Inputs:** Averland's chest: 300 crowns (week 2, taxes) and 120 crowns (week 7, loot, secretly counterfeit). Wages of 150 paid FIFO, then LIFO. Bea borrows 100 from a moneylender at 10%, due week 9. A Stirland shilling is worth face in Stirland but 0.8 in Nuln, where the belief "Stirland clips its coins" is 60%.
- **Expected:** FIFO pays from the tax lot; LIFO passes 120 counterfeit + 30 clean; the counterfeit property is hidden from Averland's player and shown to the GM; spending it in a market runs the seller's detection roll, proposing consequences. Bea's gold +100; the moneylender holds a claim lot (due week 9, interest scheduled); Bea's gold never goes negative unless the holding type allows it. The shilling's worth is read from the belief at the place.
- **Docs:** `pillars/campaign-loop.md` §3.

### I4. Grain shortage as truth and news
- **Inputs:** event template "Harvest failure" filled for Averland (severity 50%, 8 weeks); Averheim grain 1,000 sacks; the news item reaches Nuln at 30%; base price 10p.
- **Expected:** standing content created (event, hook, TOW upkeep rule, grain-price rule); proposed into the batch: Averheim grain −50% and the news item; the GM trims the stock hit to −40% and commits. Suggested prices: Averheim from stock, Nuln 10p × (1 + 0.5 × 0.30) = 11.5p from news; Nuln's stock untouched; the GM sets 12p and 15p for Stirlanders. The pre-set knock-on "bread riots" sits in the batch as a conditional consequence and lands only if adopted and its condition holds.
- **Docs:** `pillars/campaign-loop.md` §4–5.

### I5. Time: turns, order key, sequence, night
- **Inputs:** a WFB campaign in weeks and a WFRP group in days in one sandbox. WFB week 8: Averland raises 12 units (table ≤ 20 → 3 weeks); the player enters a move in week 8; a battle at day 3, 21:00. A WFRP entry on day 50 falls inside WFB week 8. The calendar defines night by season.
- **Expected:** the raising ends week 11; the move raises a sequence warning ("levy not raised until week 11"); entries in the week sort by order key (muster → move → battle); the battle sorts by its time; the night-fighting rule applies at Battle-ready (`during(night)`, sunset from the season); the WFRP entry is flagged mid-turn to the WFB GM; with no shared steps the order falls back to effective then recorded time. Advancing week 7 → 8 lands scheduled items in date order. "In 3 turns" shows "date unknown" until the third turn opens.
- **Docs:** `pillars/campaign-loop.md` §8.

### I6. Calendars
- **Inputs:** a sandbox core in days; an Imperial flavour calendar with 8-day weeks, months of 32–33 days and festival days outside the months; Sigmar's holy days as a calendar package; a player schedules "in 1 week".
- **Expected:** weeks run on across month ends by default; festival days skipped by the week count where the calendar says so; holy days fall by their recurrence rules; the player's entry reads "in 1 week (Imperial)", stored on sandbox core dates with its originating calendar; another context reading the same date sees it in its own calendar.
- **Docs:** `pillars/campaign-loop.md` §8.4.

### I7. Promote as new
- **Inputs:** the Nuln campaign ends; the GM promotes it as "Empire 2522 after the Averland famine". It holds the counterfeit lot, Bea's private notes, Grom's warband (TOW roster with injuries and advances), and the campaign's price lists.
- **Expected:** a branch published as a release; history and the log travel read-only; the counterfeit property stays secret; Bea's notes (real-world) and GM notices are stripped; in-world journal entries travel; Grom's warband travels as a marker (where it stands) plus a TOW manifest component with its card locked; price lists travel as a separate component a taker can leave out; dormant flavours (Averland origin rules) need relinking in the taker's world.
- **Docs:** `pillars/campaign-loop.md` §10; `pillars/background-and-narrative.md` §5.

### I8. A pick's own numbers (session 17; stress test B4)
- **Inputs:** a Frostgrave wizard (verify) knows *Elemental Bolt* (casting number 12) and *Leap* (8) as picks. On levelling, the player improves *Elemental Bolt* by 1; a house rule "all Elementalist spells −1 casting number" sits in the campaign.
- **Expected:** a patch whose selector reaches **that pick** edits its casting number: *Elemental Bolt* 12 → 11 (level-up) → 10 (house rule); *Leap* 8 → 7 (house rule only). The derivation shows both patches on the pick; removing the level-up entry restores 11. If the selector can't reach a pick's own fields, this case fails and B4 reopens.
- **Docs:** `pillars/campaign-loop.md` §12.5; `rules-overlay.md` §6.

### I9. Decks (session 17)
- **Inputs:** a Warcry-style battleplan from three decks (deployment, victory, twist); a Warhammer Quest event deck in battle; a campaign event removes *Plague* from the event deck and adds *Famine* in week 9.
- **Expected:** shuffles record their orders; one draw from each battleplan deck forms the scenario. A drawn Quest event is **returned shuffled into the top 3**; replaying the log gives the same deck state. A player's hand shows to them and hides from the opponent. The *Plague*/*Famine* change lands in week 9 through a commit; reads before week 9 see *Plague*. A deck set to always return at once rolls like a table.
- **Docs:** `pillars/campaign-loop.md` §12.2.

### I10. Expedition: one open-ended battle, then linked battles (session 17)
- **Inputs:** Warhammer Quest heroes enter a dungeon: one battle record, tiles placed by entries as rooms open. Between two dungeons with no settlement visit the group rests (a defined break): the dungeons are two linked battles inside one expedition event. The Barbarian (W 10) ends the first dungeon with 6 wounds taken and his healing potion used. A settlement visit ends the expedition.
- **Expected:** the first dungeon's rooms share one log, so state carries with no extra entries. Post-battle proposes *Wounded 6* (counted condition on the model, in force during the expedition) and the potion gone; on commit, the second battle's set-up seeds him at 4/10 with no potion. Setting the expedition's end date (settlement) retires *Wounded 6* with no extra entry; the potion stays gone (an ordinary inventory change).
- **Docs:** `pillars/campaign-loop.md` §12.4; `pillars/battle.md` §8.4–8.5.

## J. Visibility (slice 1)

### J1. The curse, sealed until set-up
- **Inputs:** E1's world, wages paid. The GM adds a curse on the Handgunners, `Ld −1`, **sealed for the GM role**, with its reveal set to battle set-up. Bea (player) owns the roster.
- **Expected:** Bea's login reads **Ld 8**; her derivation has no trace of the curse (no "can't tell"). The GM's view reads **7**; the GM viewing as Bea sees 8. When the set-up entry for a battle including the unit is accepted, a reveal entry grants Bea the curse: her view reads **7**, the derivation shows the curse "revealed at set-up, date".
- **Docs:** `pillars/visibility.md` §1, §4, §6.

## K. Containers and lists (slice 1)

### K1. A package switched off in a context (build: C1) ✓ built
- **Inputs:** E1's world in a sandbox with one WFB 6th context. The unpaid-wages rule in its own campaign package; Nuln civic pride and the Gunnery School in another. Read 2525, wages withheld.
- **Expected:** both packages on → **7**. Campaign package switched off in this context → **8**; the derivation lists the wages rule as "not in play: package off in this context" (who, when), not as a scope or trigger failure. Back on → **7**.
- **Docs:** `core/items-packages-and-library.md` §4 with `v2-reconciliation.md` §1 (build rows).

### K2. Category order and pins (build: C2) ✓ built
- **Inputs:** K1, wages withheld; the context overrides the origin order to organisation → place.
- **Expected:** origin: School `= 8` then Nuln +1 → 9; stationed −1 → **8**, derivation "order organisation → place, set for this context by the GM, date". Withdraw the override → **7**. Pin Nuln before the School on this unit → **7**, "pinned" in the derivation.
- **Docs:** `rules-overlay.md` §8, §12.

### K3. A pick-up list with no world (build: L1)
- **Inputs:** a practice roster from the WFB 6th Empire list: Handgunners ×10 with champion and musician, plus one other unit; one category limit broken.
- **Expected:** points per unit, per category and in total from the list's costs; the broken limit shows as an issue; Ld **7** (printed; no world rules). Nothing is written to any log.
- **Docs:** `pillars/visibility.md` §3; `rules-overlay.md` §7; `roster/rosters.md`.

### K4. The same list, registered (build: L2)
- **Inputs:** K3's units as a registered roster in E1's sandbox: Handgunners raised at Nuln 2520, member of the Gunnery School, stationed at Nuln.
- **Expected:** read 2525: **7** with wages withheld, **8** paid; the derivation starts from the army-list base, then the world steps.
- **Docs:** `world-structure.md` §12; E1.

### K5. Racial deltas (build: L3)
- **Inputs:** races Human, Orc, Black Orc *extends* Orc, each with the rank axis; units entered as printed.
- **Expected:** Handgunners: Human base → unit delta → Ld 7. Their champion: Human → champion tier step → the printed champion line. A homebrew "Brutal Orcs: S +1 to race Orc" switched on: Orc Boyz and Black Orcs S 4 → 5 ("race Orc, homebrew"); narrowed to "Orc only", Black Orcs stay 4. Switched off: as printed.
- **Docs:** `rules/races-and-units.md` §1–2.

---

## Consistency check procedure (v2)
1. Walk each case through the named docs; confirm the expected result with no contradiction or missing step.
2. Check v1 docs only through `foundations/v2-reconciliation.md` (superseded sections) before flagging a disagreement.
3. Record disagreements in the next handover and fix them in one batch.
