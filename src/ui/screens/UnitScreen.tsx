// The unit card: values at a read date; tap a value for its derivation (with pin / swap on a
// pair); each rule's "why not?" tree; the events its triggers read, to withdraw or add again.
// Design: design/rules-overlay.md §12 (pins: the GM fix for a single pair), §13 (derivation
// fields; the tree's tests); build/slice-1-brief.md §1.1 (Q2: ordering detail in the
// derivation), §1.2 (pin or swap from the card writes a pin entry), §2.3 (the kind a scope
// read).

import { useEffect, useState } from "react";
import type { EventRecord } from "../../schema";
import type { AppData, Snapshot } from "../app-data";
import type { UnitResolution } from "../../overlay/resolve";
import type { ContextView } from "../../overlay/context";
import type { AppliedStep, RuleCheck, ValueDerivation } from "../../overlay/derivation";
import { Trace, TruthTag } from "../components/Trace";
import { ItemText } from "../components/ItemText";
import { latestDate, ReadDate } from "../components/ReadDate";
import { findByKey, itemRef, type ItemRef } from "../item-ref";

interface Props {
  data: AppData;
  snapshot: Snapshot;
  sandbox: string;
  unitKey: string;
  onBack: () => void;
  onOpenItem: (ref: ItemRef) => void;
  onChanged: () => Promise<void>;
}

export function UnitScreen({ data, snapshot, sandbox, unitKey, onBack, onOpenItem, onChanged }: Props) {
  const logDates = snapshot.log.map((e) => e.body.order.inWorldDate).filter((d): d is number => d !== null);
  const [readDate, setReadDate] = useState<number>(() => latestDate(snapshot.content, logDates));
  const [resolution, setResolution] = useState<UnitResolution | null>(null);
  const [context, setContext] = useState<ContextView | null>(null);
  const [openStat, setOpenStat] = useState<string | null>(null);
  const [openRule, setOpenRule] = useState<string | null>(null);

  useEffect(() => {
    void data.resolveUnit(sandbox, unitKey, readDate).then(setResolution);
    void data.contextOfUnit(sandbox, unitKey).then(setContext);
  }, [data, sandbox, unitKey, readDate, snapshot]);

  if (!resolution) return <p className="muted">Resolving…</p>;
  const unitItem = findByKey(snapshot.content, unitKey, sandbox);
  const stats = [...resolution.statOrder.filter((s) => s in resolution.derivations), ...Object.keys(resolution.derivations).filter((s) => !resolution.statOrder.includes(s))];

  const pinPair = async (step: AppliedStep, previous: AppliedStep) => {
    if (!resolution.context) return;
    await data.pin(sandbox, { context: resolution.context.key, unit: unitKey, stat: openStat!, first: step.ruleKey, then: previous.ruleKey });
    await onChanged();
  };
  const removePin = async (entryId: string) => {
    await data.withdrawEntry(sandbox, entryId, "pin removed from the unit card");
    await onChanged();
  };

  return (
    <>
      <button className="link" onClick={onBack}>‹ Back</button>
      <h1>{resolution.label}</h1>
      <p className="muted">
        Raised {resolution.raised} · {unitKey}
        {resolution.context ? " · " + resolution.context.label : ""}
        {resolution.manifest ? " (" + resolution.manifest.label + ")" : ""}
      </p>
      {resolution.contextWarnings.map((w, i) => (
        <p key={i} className="problem-warning">{w}</p>
      ))}
      {unitItem && <ItemText all={snapshot.all} item={unitItem} label="View unit text" />}

      <ReadDate value={readDate} onChange={setReadDate} />

      <h2>Profile at {readDate}</h2>
      {resolution.notYetRaised && (
        <div className="card">
          <p><strong>Not raised until {resolution.raised}.</strong></p>
          <p className="muted">In {readDate} this unit doesn't exist yet. Shown: the printed profile, with no rules read.</p>
        </div>
      )}
      <div className={"stats" + (resolution.notYetRaised ? " faded" : "")}>
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
      {openStat && (
        <DerivationView
          derivation={resolution.derivations[openStat]}
          context={context}
          unitKey={unitKey}
          canPin={resolution.context !== null}
          onPin={pinPair}
          onRemovePin={removePin}
          onOpenRule={(key) => onOpenItem(itemRef({ space: "library", key }))}
        />
      )}

      {resolution.clashes.length > 0 && (
        <div className="card">
          <h3>Clash notices</h3>
          {resolution.clashes.map((clash, i) => (
            <p key={i} className="problem-warning">{clash.message}</p>
          ))}
          <p className="muted">Nothing decided this order. Pin one rule before the other in the derivation to settle it.</p>
        </div>
      )}

      {!resolution.notYetRaised && <h2>Rules in this context</h2>}
      {resolution.rules.map((check) => (
        <div key={check.ruleKey} className="card">
          <button className="list-button bare" onClick={() => setOpenRule(openRule === check.ruleKey ? null : check.ruleKey)}>
            <span>
              {check.ruleLabel} <span className="muted">({check.stat})</span>
            </span>
            {check.applies ? <span className="tag good">applies</span> : <span className="tag bad">doesn't apply</span>}
          </button>
          {openRule === check.ruleKey && <WhyNotTree check={check} />}
          <div className="row">
            {findByKey(snapshot.content, check.ruleKey, sandbox) && (
              <ItemText all={snapshot.all} item={findByKey(snapshot.content, check.ruleKey, sandbox)!} label="View rule" />
            )}
            <button className="link gap-top" onClick={() => onOpenItem(itemRef({ space: "library", key: check.ruleKey }))}>Open rule</button>
          </div>
        </div>
      ))}

      <EventToggles data={data} sandbox={sandbox} snapshot={snapshot} onChanged={onChanged} />
    </>
  );
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

interface DerivationProps {
  derivation: ValueDerivation;
  context: ContextView | null;
  unitKey: string;
  canPin: boolean;
  onPin: (step: AppliedStep, previous: AppliedStep) => void;
  onRemovePin: (entryId: string) => void;
  onOpenRule: (key: string) => void;
}

// rules-overlay.md §13: kind, source, before -> after, base, scope matched (and the kind it read),
// trigger, step and read date, what decided the order, outcome. Losers kept with their reason.
function DerivationView({ derivation, context, unitKey, canPin, onPin, onRemovePin, onOpenRule }: DerivationProps) {
  const pinFor = (a: string, b: string) =>
    context?.pins.find((p) => p.stat === derivation.stat && (p.unit === null || p.unit === unitKey) && ((p.first === a && p.then === b) || (p.first === b && p.then === a)));

  return (
    <div className="card">
      <h3>
        {derivation.stat} = {formatNumber(derivation.final)}
      </h3>
      <p>
        Start: {formatNumber(derivation.base)} <span className="muted">({derivation.baseNote})</span>
      </p>
      <div className="steps">
        {derivation.steps.map((step, i) => {
          const previous = i > 0 ? derivation.steps[i - 1] : null;
          const samePlace = previous !== null && previous.step === step.step && previous.targetPoint === step.targetPoint;
          const pin = previous ? pinFor(step.ruleKey, previous.ruleKey) : undefined;
          return (
            <div key={step.ruleKey} className="step">
              <p>
                <button className="link" onClick={() => onOpenRule(step.ruleKey)}><strong>{step.ruleLabel}</strong></button> {describeEdit(step)}:{" "}
                {formatNumber(step.before)} → <strong>{formatNumber(step.after)}</strong>
              </p>
              <p className="muted">
                {step.step} step, read {step.readDateNote} · {step.sourceLayer} · category {step.category}
                {step.base ? " · base " + step.base : ""}
              </p>
              {step.scopeKind && <p className="muted">Scope target: {step.scopeKind}</p>}
              <p className="muted">Order: {step.decidedByNote}</p>
              {/* Only a pair whose order changes the value can be pinned or swapped. */}
              {canPin && previous && samePlace && !pin && step.ifSwappedWithPrevious !== null && (
                <div className="row">
                  <button className="small" onClick={() => onPin(previous, step)}>Pin this order</button>
                  <button className="small" onClick={() => onPin(step, previous)}>
                    Swap: run before {previous.ruleLabel} (gives {formatNumber(step.ifSwappedWithPrevious)})
                  </button>
                </div>
              )}
              {pin && (
                <button className="small" onClick={() => onRemovePin(pin.entryId)}>Remove pin</button>
              )}
              <Trace trace={step.scope} />
              {step.trigger && <Trace trace={step.trigger} />}
            </div>
          );
        })}
        {derivation.steps.length === 0 && <p className="muted">No rule changes it.</p>}
      </div>
      {derivation.lost.length > 0 && (
        <>
          <h3>Didn't apply</h3>
          {derivation.lost.map((lost) => (
            <div key={lost.ruleKey} className="step">
              <p>
                {lost.ruleLabel}: <span className="problem-warning">{lost.outcome}</span>{" "}
                <span className="muted">(read {lost.readDateNote})</span>
              </p>
              {lost.outcomeNote && <p className="muted">{lost.outcomeNote}</p>}
              <Trace trace={lost.scope} />
              {lost.trigger && <Trace trace={lost.trigger} />}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// rules-overlay.md §13: a rule applies when every test passes.
export function WhyNotTree({ check }: { check: RuleCheck }) {
  return (
    <div className="gap-top">
      <p className="muted">
        {check.nature} rule, {check.step} step, read {check.readDateNote}
      </p>
      {check.tests.map((test) => (
        <div key={test.name} className="step">
          <div>
            <TruthTag value={test.result} /> <strong>{test.name}</strong>
          </div>
          <div className="indent">
            {test.trace && <Trace trace={test.trace} />}
            {test.note && <p className="muted">{test.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Events in the sandbox's log, with withdraw / add again: the quick way to flip a trigger.
function EventToggles({ data, sandbox, snapshot, onChanged }: { data: AppData; sandbox: string; snapshot: Snapshot; onChanged: () => Promise<void> }) {
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
              <button onClick={async () => { await data.withdrawEntry(sandbox, entry.id, "withdrawn from the unit card"); await onChanged(); }}>Withdraw</button>
            ) : (
              <button onClick={async () => { await data.addEvent(sandbox, event); await onChanged(); }}>Add again</button>
            )}
          </div>
        );
      })}
    </>
  );
}
