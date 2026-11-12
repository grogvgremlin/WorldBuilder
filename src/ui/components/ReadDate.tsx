// The read-date control: a year, with one earlier / one later.
// Design: design/rules-overlay.md §7 (environment rules read the date viewed).

export function ReadDate({ value, onChange, label = "Read date" }: { value: number; onChange: (date: number) => void; label?: string }) {
  return (
    <>
      <label htmlFor="read-date">{label}</label>
      <div className="row">
        <button onClick={() => onChange(value - 1)} aria-label="One earlier">−</button>
        <input id="read-date" className="narrow" type="number" inputMode="numeric" value={value}
          onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))} />
        <button onClick={() => onChange(value + 1)} aria-label="One later">+</button>
      </div>
    </>
  );
}

// The latest date anything in view starts or ends on, plus one: the card opens "now".
export function latestDate(content: { class: string; start?: number; end?: number | null; raised?: number }[], logDates: number[]): number {
  const dates: number[] = [...logDates];
  for (const item of content) {
    if (item.class === "unit" && item.raised !== undefined) dates.push(item.raised);
    if ((item.class === "link" || item.class === "event") && item.start !== undefined) {
      dates.push(item.start);
      if (item.end !== null && item.end !== undefined) dates.push(item.end);
    }
  }
  return dates.length ? Math.max(...dates) + 1 : 2525;
}
