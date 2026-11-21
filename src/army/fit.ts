// Fit on import: the race cell a printed line sits on most closely.
// Design: design/races-and-units.md §2 (book entry: the delta is printed − derived);
// build-log Part B owner decision 10 (when race, tree or rank is left blank, suggest the
// best-fitting cell and the delta it would store; re-fitting after a grid changes is later).
//
// Pure. Ranks cells by how many stats would need a stored delta, then by how big it is.

import type { RaceCell } from "../schema";
import { readStat } from "./cells";
import { STATS, type Line } from "./card";

export interface Fit {
  race: string;
  tree: string;
  rank: string;
  changes: string[]; // the deltas this cell would store: "WS +1"
}

function cellLine(cell: RaceCell, base: Line | null): Line | null {
  const line: Line = {};
  for (const s of STATS) {
    const v = readStat(cell.cells[s]);
    if (v.kind === "absolute") line[s] = v.value;
    else if (v.kind === "none") line[s] = "-";
    else if (v.kind === "delta" && base && typeof base[s] === "number") line[s] = (base[s] as number) + v.value;
    else if (base && base[s] !== undefined) line[s] = base[s];
    else return null;
  }
  return line;
}

// The closest cells for a printed line, best first. Stats printed "-" (a rider's M) don't count.
export function fitLine(cells: RaceCell[], printed: Partial<Line>, limit = 3): Fit[] {
  const fits: (Fit & { size: number })[] = [];
  const bases = new Map<string, Line>();
  for (const cell of cells) {
    const race = cell.cells["Race"] ?? "";
    if ((cell.cells["Tree"] || "Core") === "Core" && (cell.cells["Rank"] || "Base") === "Base") {
      const line = cellLine(cell, null);
      if (line) bases.set(race, line);
    }
  }
  for (const cell of cells) {
    const race = cell.cells["Race"] ?? "";
    const line = cellLine(cell, bases.get(race) ?? null);
    if (!line) continue;
    const changes: string[] = [];
    let size = 0;
    for (const s of STATS) {
      const p = printed[s];
      const d = line[s];
      if (p === undefined || p === "-") continue;
      if (typeof d !== "number") {
        changes.push(s + " = " + p);
        size += 10;
      } else if (d !== p) {
        const diff = (p as number) - d;
        changes.push(s + " " + (diff > 0 ? "+" : "−") + Math.abs(diff));
        size += Math.abs(diff);
      }
    }
    fits.push({ race, tree: cell.cells["Tree"] || "Core", rank: cell.cells["Rank"] || "Base", changes, size });
  }
  fits.sort((a, b) => a.changes.length - b.changes.length || a.size - b.size);
  return fits.slice(0, limit).map(({ race, tree, rank, changes }) => ({ race, tree, rank, changes }));
}

export function describeFit(fit: Fit): string {
  return fit.race + " · " + fit.tree + " · " + fit.rank + (fit.changes.length === 0 ? " (no delta)" : " (" + fit.changes.join(", ") + ")");
}
