// The unit card: values at a read date; tap a value for its derivation; tap a rule for the
// "why not?" tree; add or withdraw the events its rules' triggers read.
// Design: design/rules-overlay.md §13 (derivation fields; the tree's four tests);
// build/slice-0-brief.md §3 "Screens".

import { useEffect, useState } from "react";
import type { EventRecord } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import type { UnitResolution } from "../../overlay/resolve";
import type { AppliedStep, RuleCheck, ValueDerivation } from "../../overlay/derivation";
import { Trace, TruthTag } from "../components/Trace";
import { STAT_ORDER } from "../../import/text-format";
import { ItemText } from "../components/ItemText";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  unitKey: string;
  onBack: () => void;
  onOpenItem: (key: string) => void;
  onChanged: () => Promise<void>;
}

export function UnitScreen({ data, snapshot, unitKey, onBack, onOpenItem, onChanged }: Props) {
  const [readDate, setReadDate] = useState<number>(() => latestDate(snapshot));
  const [resolution, setResolution] = useState<UnitResolution | null>(null);
  const [openStat, setOpenStat] = useState<string | null>(null);
  const [openRule, setOpenRule] = useState<string | null>(null);

  useEffect(() => {
    void data.resolveUnit(unitKey, readDate).then(setResolution);
  }, [data, unitKey, readDate, snapshot]);

  if (!resolution) return <p className="muted">Resolving…</p>;
  const stats = orderedStats(resolution);

  return (
    <>
      <button className="link" onClick={onBack}>
        ‹ Back
      </button>
      <h1>{resolution.label}</h1>
      <p className="muted">Raised {resolution.raised} · {unitKey}</p>
      <ItemText content={snapshot.content} itemKey={unitKey} label="View unit text" />

      <label htmlFor="read-date">Read date</label>
      <div className="row">
        <button onClick={() => setReadDate(readDate - 1)} aria-label="One earlier">−</button>
        <input id="read-date" type="number" inputMode="numeric" value={readDate} style={{ width: 110 }}
          onChange={(e) => e.target.value !== "" && setReadDate(Number(e.target.value))} />
        <button onClick={() => setReadDate(readDate + 1)} aria-label="One later">+</button>
      </div>

      <h2>Profile at {readDate}</h2>
      <div className="stats">
        {stats.map((stat) => {
          const derivation = resolution.derivations[stat];
          const changed = derivation.final !== derivation.base;
          return (
            <button key={stat} className={"card stat" + (changed ? " changed" : "")} onClick={() => setOpenStat(openStat === stat ? null : stat)}>
              <span className="name">{stat}</span>
              <span className="value">{formatNumber(derivation.final)}</span>
            </button>
          );
        })}
      </div>
      <p className="muted">Tap a value to see how it was worked out.</p>
      {openStat && <DerivationView derivation={resolution.derivations[openStat]} />}

      {resolution.clashes.length > 0 && (
        <div className="card">
          <h3>Clash notices</h3>
          {resolution.clashes.map((clash, i) => (
            <p key={i} className="problem-warning">{clash.message}</p>
          ))}
        </div>
      )}

      <h2>Rules</h2>
      {resolution.rules.map((check) => (
        <div key={check.ruleKey} className="card">
          <button className="list-button" style={{ border: "none", padding: 0 }} onClick={() => setOpenRule(openRule === check.ruleKey ? null : check.ruleKey)}>
            <span>
              {check.ruleLabel} <span className="muted">({check.stat})</span>
            </span>
            {check.applies ? <span className="tag good">applies</span> : <span className="tag bad">doesn't apply</span>}
          </button>
          {openRule === check.ruleKey && <WhyNotTree check={check} />}
          <div className="row">
            <ItemText content={snapshot.content} itemKey={check.ruleKey} label="View rule" />
            <button className="link" style={{ marginTop: 8 }} onClick={() => onOpenItem(check.ruleKey)}>Open rule</button>
          </div>
        </div>
      ))}

      <EventToggles data={data} snapshot={snapshot} onChanged={onChanged} />
    </>
  );
}

// The latest date anything starts on, so the card opens "now".
function latestDate(snapshot: Snapshot): number {
  const dates: number[] = [];
  for (const item of snapshot.content) {
    if (item.class === "unit") dates.push(item.raised);
    if (item.class === "link" || item.class === "event") dates.push(item.start, ...(item.end === null ? [] : [item.end]));
  }
  for (const entry of snapshot.log) if (entry.body.order.inWorldDate !== null) dates.push(entry.body.order.inWorldDate);
  return dates.length ? Math.max(...dates) + 1 : 2525;
}

function orderedStats(resolution: UnitResolution): string[] {
  const known = STAT_ORDER.filter((stat) => stat in resolution.derivations);
  const others = Object.keys(resolution.derivations).filter((stat) => !STAT_ORDER.includes(stat));
  return [...known, ...others];
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function describeEdit(step: AppliedStep): string {
  const amount = formatNumber(step.amount);
  switch (step.kind) {
    case "set":
      return "= " + amount + " @" + step.targetPoint;
    case "add":
      return (step.amount >= 0 ? "+" : "−") + formatNumber(Math.abs(step.amount));
    case "multiply":
      return "× " + amount;
    case "cap":
      return "at most " + amount;
    case "floor":
      return "at least " + amount;
  }
}

// rules-overlay.md §13: kind, source, before -> after, base, scope matched, trigger, step and
// read date, what decided the order, outcome. Losers kept with their reason.
function DerivationView({ derivation }: { derivation: ValueDerivation }) {
  return (
    <div className="card">
      <h3>
        {derivation.stat} = {formatNumber(derivation.final)}
      </h3>
      <p>
        Start: {formatNumber(derivation.base)} <span className="muted">({derivation.baseNote})</span>
      </p>
      <div className="steps">
        {derivation.steps.map((step, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <p>
              <strong>{step.ruleLabel}</strong> {describeEdit(step)}: {formatNumber(step.before)} → <strong>{formatNumber(step.after)}</strong>
            </p>
            <p className="muted">
              {step.step} step, read {step.readDateNote} · {step.sourceLayer} · category {step.category}
              {step.base ? " · base " + step.base : ""}
            </p>
            <p className="muted">Order: {step.decidedByNote}</p>
            {step.ifSwappedWithPrevious !== null && (
              <p className="muted">Swapped with the step before: {formatNumber(step.ifSwappedWithPrevious)}</p>
            )}
            <Trace trace={step.scope} />
            {step.trigger && <Trace trace={step.trigger} />}
          </div>
        ))}
        {derivation.steps.length === 0 && <p className="muted">No rule changes it.</p>}
      </div>
      {derivation.lost.length > 0 && (
        <>
          <h3>Didn't apply</h3>
          {derivation.lost.map((lost) => (
            <div key={lost.ruleKey} style={{ marginBottom: 8 }}>
              <p>
                {lost.ruleLabel}: <span className="problem-warning">{lost.outcome}</span>{" "}
                <span className="muted">(read {lost.readDateNote})</span>
              </p>
              <Trace trace={lost.scope} />
              {lost.trigger && <Trace trace={lost.trigger} />}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// rules-overlay.md §13: a rule applies when four tests pass.
function WhyNotTree({ check }: { check: RuleCheck }) {
  return (
    <div style={{ marginTop: 8 }}>
      <p className="muted">
        {check.nature} rule, {check.step} step, read {check.readDateNote}
      </p>
      {check.tests.map((test) => (
        <div key={test.name} style={{ marginBottom: 6 }}>
          <div>
            <TruthTag value={test.result} /> <strong>{test.name}</strong>
          </div>
          <div style={{ marginLeft: 14 }}>
            {test.trace && <Trace trace={test.trace} />}
            {test.note && <p className="muted">{test.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Events in the log, with withdraw / add again: the quick way to flip a trigger.
function EventToggles({ data, snapshot, onChanged }: { data: AppData; snapshot: Snapshot; onChanged: () => Promise<void> }) {
  const events = snapshot.log.filter((entry) => entry.body.content.kind === "event");
  if (events.length === 0) return null;

  // Latest entry per event key: shows whether the event currently stands.
  const latest = new Map<string, (typeof events)[number]>();
  for (const entry of events) latest.set((entry.body.content.values.event as EventRecord).key, entry);

  return (
    <>
      <h2>Events in the log</h2>
      {[...latest.values()].map((entry) => {
        const event = entry.body.content.values.event as EventRecord;
        const standing = entry.status === "accepted";
        return (
          <div key={entry.id} className="card row spread">
            <span className={standing ? "" : "withdrawn"}>
              {event.label}
              <br />
              <span className="muted">
                from {event.start}
                {event.end === null ? "" : " to " + event.end}
              </span>
            </span>
            {standing ? (
              <button onClick={async () => { await data.withdrawEntry(entry.id, "withdrawn from the unit card"); await onChanged(); }}>
                Withdraw
              </button>
            ) : (
              <button onClick={async () => { await data.addEvent(event); await onChanged(); }}>Add again</button>
            )}
          </div>
        );
      })}
    </>
  );
}
