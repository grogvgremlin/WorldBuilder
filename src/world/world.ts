// The world as read at a date: things, dated links and events, and the two world-reading
// nodes `reaches` and `in force`.
// Design: design/world-structure.md §1–3 (things, kinds, links), §7 (events are dated things;
// start and end dates are readable); design/rules-overlay.md §17 (reaches(target, via, when),
// in force(thing or kind, roles)); design/infra.md §1 (world state is rebuilt from content and
// the log, never edited).
//
// Pure: builds from content and accepted log entries, does no I/O. The content given is the
// library plus one sandbox (store.contentForSandbox), so keys are unique within it.

import type {
  ContentItem,
  EventRecord,
  Link,
  Manifest,
  ManifestContext,
  NamedScope,
  Package,
  ReachTarget,
  RouteStep,
  Rule,
  Sandbox,
  Thing,
  Unit,
} from "../schema";
import type { AcceptedEntry } from "../log/log";

// An event in force at some time, wherever it was recorded.
export interface WorldEventView extends EventRecord {
  recordedIn: { from: "content" } | { from: "log"; entryId: string };
}

export interface World {
  things: Map<string, Thing>;
  units: Map<string, Unit>;
  links: Link[];
  events: WorldEventView[];
  rules: Rule[];
  scopes: Map<string, NamedScope>;
  packages: Map<string, Package>;
  manifests: Map<string, Manifest>;
  sandboxes: Map<string, Sandbox>;
  contexts: Map<string, ManifestContext>;
  fixes: AcceptedEntry[]; // accepted GM-fix entries (package switches, orders, pins), in log order
}

const FIX_KINDS = new Set(["package_switch", "category_order", "pin"]);

// --- Building the world ----------------------------------------------------

export function buildWorld(content: ContentItem[], entries: AcceptedEntry[]): World {
  const world: World = {
    things: new Map(),
    units: new Map(),
    links: [],
    events: [],
    rules: [],
    scopes: new Map(),
    packages: new Map(),
    manifests: new Map(),
    sandboxes: new Map(),
    contexts: new Map(),
    fixes: [],
  };
  const sorted = [...content].sort((a, b) => a.key.localeCompare(b.key));
  for (const item of sorted) addContentItem(world, item);
  for (const entry of entries) addLogEntry(world, entry);
  return world;
}

function addContentItem(world: World, item: ContentItem): void {
  switch (item.class) {
    case "thing":
      world.things.set(item.key, item);
      break;
    case "unit":
      world.units.set(item.key, item);
      break;
    case "link":
      world.links.push(item);
      break;
    case "event":
      world.events.push({
        key: item.key,
        label: item.label,
        kind: item.kind,
        roles: item.roles,
        start: item.start,
        end: item.end,
        recordedIn: { from: "content" },
      });
      break;
    case "rule":
      world.rules.push(item);
      break;
    case "scope":
      world.scopes.set(item.key, item);
      break;
    case "package":
      // A package local to the sandbox wins over a library package with the same key.
      if (world.packages.get(item.key)?.space !== "library" && world.packages.has(item.key)) break;
      world.packages.set(item.key, item);
      break;
    case "manifest":
      world.manifests.set(item.key, item);
      break;
    case "sandbox":
      world.sandboxes.set(item.key, item);
      break;
    case "context":
      world.contexts.set(item.key, item);
      break;
  }
}

// Event entries add events; GM fixes are kept for the context to read. Withdrawals have
// already done their job.
function addLogEntry(world: World, entry: AcceptedEntry): void {
  if (FIX_KINDS.has(entry.body.content.kind)) world.fixes.push(entry);
  if (entry.body.content.kind !== "event") return;
  const event = entry.body.content.values.event as EventRecord;
  world.events.push({ ...event, recordedIn: { from: "log", entryId: entry.id } });
}

// --- Reading things --------------------------------------------------------

// The label of a thing or unit, or the key if it isn't known.
export function labelOf(world: World, key: string): string {
  return world.things.get(key)?.label ?? world.units.get(key)?.label ?? key;
}

// The kinds of a thing. A unit always has the kind "unit".
export function kindsOf(world: World, key: string): string[] {
  if (world.units.has(key)) return ["unit"];
  return world.things.get(key)?.kinds ?? [];
}

// Is a dated link (or event) on at `date`? Start is inclusive, end exclusive.
export function isOnAt(item: { start: number; end: number | null }, date: number): boolean {
  return item.start <= date && (item.end === null || date < item.end);
}

// Has it ever been on, up to and including `date`?
export function wasEverOnBy(item: { start: number }, date: number): boolean {
  return item.start <= date;
}

// --- reaches(target, via, when) ------------------------------------------------

export interface RouteHop {
  link: Link;
  to: string; // the thing reached by this hop
}

// One way the protagonist reaches the target.
export interface Route {
  start: string; // the protagonist
  hops: RouteHop[];
  // Depth for the fold: hops climbed after the entry link (raised at -> Nuln is 0;
  // -> in -> Wissenland is 1). Design: rules-overlay.md §8 "Depth".
  depth: number;
}

export interface ReachResult {
  reached: boolean;
  routes: Route[]; // every route found, shortest first
}

// Walks from `start` along the route pattern and returns every route ending at a thing
// matching `target`, shortest first. With when = "as_of" only links on at `date` are walked;
// with "ever", any link that had started by `date`. Breadth-first, so each (thing, step)
// is visited once, by its shortest route.
export function reaches(
  world: World,
  start: string,
  target: ReachTarget,
  via: RouteStep[],
  when: "as_of" | "ever",
  date: number,
): ReachResult {
  const routes: Route[] = [];
  const queue: WalkState[] = [{ at: start, stepIndex: 0, hops: [] }];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const state = queue.shift()!;
    const seenKey = state.at + "|" + state.stepIndex;
    if (seen.has(seenKey)) continue; // stops loops
    seen.add(seenKey);

    if (state.stepIndex === via.length) {
      if (state.hops.length > 0 && matchesTarget(world, state.at, target)) {
        routes.push({ start, hops: state.hops, depth: state.hops.length - 1 });
      }
      continue;
    }
    queue.push(...nextStates(world, state, via, when, date));
  }
  return { reached: routes.length > 0, routes };
}

interface WalkState {
  at: string;
  stepIndex: number; // which step of the pattern we are on
  hops: RouteHop[];
}

// The states one move on from `state`.
function nextStates(world: World, state: WalkState, via: RouteStep[], when: "as_of" | "ever", date: number): WalkState[] {
  const step = via[state.stepIndex];
  const next: WalkState[] = [];
  // A repeating step (`in*`) may be walked zero times: move on to the next step where we stand.
  if (step.repeat) next.push({ ...state, stepIndex: state.stepIndex + 1 });
  for (const link of linksFromAt(world, state.at, step.link, when, date)) {
    next.push({
      at: link.to,
      stepIndex: step.repeat ? state.stepIndex : state.stepIndex + 1,
      hops: [...state.hops, { link, to: link.to }],
    });
  }
  return next;
}

function linksFromAt(world: World, from: string, kind: string, when: "as_of" | "ever", date: number): Link[] {
  return world.links.filter(
    (link) =>
      link.from === from &&
      link.kind === kind &&
      (when === "as_of" ? isOnAt(link, date) : wasEverOnBy(link, date)),
  );
}

function matchesTarget(world: World, key: string, target: ReachTarget): boolean {
  if (target.by === "thing") return key === target.key;
  return kindsOf(world, key).includes(target.kind);
}

// Route as text: "Nuln Handgunners —raised at→ Nuln —in→ Wissenland".
export function describeRoute(world: World, route: Route): string {
  let text = labelOf(world, route.start);
  for (const hop of route.hops) text += " —" + hop.link.kind.replace(/_/g, " ") + "→ " + labelOf(world, hop.to);
  return text;
}

// --- in force(thing or kind, roles) ----------------------------------------------

export interface InForceResult {
  inForce: boolean;
  events: WorldEventView[]; // the events that make it true
}

// Is an event in force at `date` that is the thing `what` (by key) or of the kind `what`,
// with every given role filled by the given thing?
export function inForce(world: World, what: string, roles: Record<string, string>, date: number): InForceResult {
  const matching = world.events.filter(
    (event) =>
      (event.key === what || event.kind === what) &&
      Object.entries(roles).every(([role, thing]) => event.roles[role] === thing) &&
      isOnAt(event, date),
  );
  return { inForce: matching.length > 0, events: matching };
}
