// A manifest context as the resolver reads it: which packages are in play (the manifest's core,
// then books, FAQs, house rules and campaign packages), the category order per step and the
// bag order (with where each came from), and the pins.
// Design: build/slice-1-brief.md §1.2 (macro and micro configurable; pins), §2.1 (a rule is in
// play only if its package is switched on in the unit's context); design/rules-overlay.md §12
// (the category order is shipped in the setting, editable per campaign or context; edits and
// pins are dated GM fixes, shown in the derivation); design/manifest.md §1 (editions are
// mutually exclusive); design/items-packages-and-library.md §4 (the base package is always
// applied; requires, conflicts), §10 (switch-offs). Owner decisions of 14 Nov (build log): the
// category order belongs to the world; a context's packages are grouped.
//
// Pure: reads the World (content plus accepted entries), does no I/O.

import { CONTEXT_GROUPS, type CategoryOrderValues, type CategoryRanks, type EditKind, type Manifest, type ManifestContext, type PackageSwitchValues, type PinValues } from "../schema";
import type { World } from "../world/world";
import type { FoldStepName } from "./derivation";

// Used when neither the context nor its sandbox sets an order, or the manifest is missing.
const FALLBACK_ORDER: CategoryRanks = [["place"], ["organisation"], ["title"]];
const FALLBACK_BAG: EditKind[] = ["set", "add", "multiply", "cap", "floor"];

export type PackageGroup = "core" | "books" | "faqs" | "house" | "campaign";

export interface PackageState {
  key: string;
  group: PackageGroup;
  on: boolean;
  locked: boolean; // the manifest's core: always on (items-packages §4)
  note: string; // "core of WFB 6th" / "on by default in WFB 6th" / "switched off by owner, 2026-11-12"
  entryId: string | null; // the switch entry, if a GM switched it
}

export interface StepOrder {
  ranks: CategoryRanks;
  note: string; // "E1 Nuln default" / "set for this context by owner, 2026-11-12"
  entryId: string | null; // the override entry, if the GM set one
}

export interface Pin extends PinValues {
  note: string; // "owner, 2026-11-12"
  entryId: string;
}

export interface ContextView {
  context: ManifestContext | null;
  manifest: Manifest | null;
  packages: PackageState[]; // in order: core, books, FAQs, house rules, campaign, then any switched on later
  categoryOrder: Record<FoldStepName, StepOrder>;
  bagOrder: EditKind[];
  pins: Pin[];
  warnings: string[]; // missing manifest or packages; requires, conflicts, edition and layer mismatches
}

// "owner, 2026-11-12": who made the fix and the real-world day it was recorded.
function fixNote(actor: string, recordedTime: string): string {
  return actor + ", " + recordedTime.slice(0, 10);
}

// The context a unit is read in: its own, or the sandbox's first.
export function contextFor(world: World, unitContext: string | null): ManifestContext | null {
  if (unitContext && world.contexts.has(unitContext)) return world.contexts.get(unitContext)!;
  const all = [...world.contexts.values()];
  return all.length > 0 ? all[0] : null;
}

export function readContext(world: World, context: ManifestContext | null): ContextView {
  const warnings: string[] = [];
  const manifest = context ? (world.manifests.get(context.manifest) ?? null) : null;
  if (context && !manifest) warnings.push("manifest " + context.manifest + " isn't in the library: built-in defaults used");

  const view: ContextView = {
    context,
    manifest,
    packages: [],
    categoryOrder: { origin: startingOrder(world, context, "origin"), stationed: startingOrder(world, context, "stationed") },
    bagOrder: manifest?.bagOrder ?? FALLBACK_BAG,
    pins: [],
    warnings,
  };
  if (!context) return view;

  view.packages = listedPackages(context, manifest);
  for (const fix of world.fixes) {
    const values = fix.body.content.values as Record<string, unknown>;
    if (values.context !== context.key) continue;
    const note = fixNote(fix.body.identity.actor, fix.recordedTime);
    switch (fix.body.content.kind) {
      case "package_switch":
        applySwitch(view, values as unknown as PackageSwitchValues, note, fix.id);
        break;
      case "category_order": {
        const order = values as unknown as CategoryOrderValues;
        view.categoryOrder[order.step] = { ranks: order.order, note: "set for this context by " + note, entryId: fix.id };
        break;
      }
      case "pin":
        view.pins.push({ ...(values as unknown as PinValues), note, entryId: fix.id });
        break;
    }
  }
  checkPackages(world, view);
  return view;
}

// Owner decision, 14 Nov: the category order belongs to the world. The context's own order
// wins, then the sandbox's, then the built-in default. A GM fix entry overrides all of these.
function startingOrder(world: World, context: ManifestContext | null, step: FoldStepName): StepOrder {
  if (context?.categoryOrder) return { ranks: context.categoryOrder[step], note: context.label + " order", entryId: null };
  const sandbox = context ? world.sandboxes.get(context.space) : [...world.sandboxes.values()][0];
  if (sandbox?.categoryOrder) return { ranks: sandbox.categoryOrder[step], note: sandbox.label + " default", entryId: null };
  return { ranks: FALLBACK_ORDER, note: "built-in default", entryId: null };
}

function listedPackages(context: ManifestContext, manifest: Manifest | null): PackageState[] {
  const states: PackageState[] = (manifest?.core ?? []).map((key) => ({
    key,
    group: "core",
    on: true,
    locked: true,
    note: "core of " + manifest!.label,
    entryId: null,
  }));
  for (const { field } of CONTEXT_GROUPS) {
    for (const key of context[field]) {
      states.push({ key, group: field, on: true, locked: false, note: "on by default in " + context.label, entryId: null });
    }
  }
  return states;
}

function applySwitch(view: ContextView, values: PackageSwitchValues, note: string, entryId: string): void {
  const text = (values.on ? "switched on by " : "switched off by ") + note;
  const existing = view.packages.find((p) => p.key === values.package);
  if (existing?.locked) {
    if (!values.on) view.warnings.push(existing.key + " is core: it can't be switched off as a whole");
    return;
  }
  if (existing) {
    existing.on = values.on;
    existing.note = text;
    existing.entryId = entryId;
  } else {
    view.packages.push({ key: values.package, group: "books", on: values.on, locked: false, note: text, entryId });
  }
}

// Warnings, never blocks: requires missing (items-packages §4), conflicts both on, a package
// from another edition (manifest §1: editions are mutually exclusive), a package listed in a
// group that doesn't match its source layer.
function checkPackages(world: World, view: ContextView): void {
  const on = new Set(view.packages.filter((p) => p.on).map((p) => p.key));
  const expected: Record<string, string> = Object.fromEntries(CONTEXT_GROUPS.map((g) => [g.field, g.layer]));
  for (const state of view.packages) {
    const pkg = world.packages.get(state.key);
    if (!pkg) {
      view.warnings.push("package " + state.key + " isn't in the library or this sandbox");
      continue;
    }
    if (!state.on) continue;
    for (const needed of pkg.requires) if (!on.has(needed)) view.warnings.push(pkg.label + " requires " + needed + ", which is off");
    for (const clash of pkg.conflicts) if (on.has(clash)) view.warnings.push(pkg.label + " conflicts with " + clash);
    if (view.manifest && pkg.edition && pkg.edition !== view.manifest.key) {
      view.warnings.push(pkg.label + " is for edition " + pkg.edition + ", not " + view.manifest.key);
    }
    if (state.group !== "core" && expected[state.group] !== pkg.sourceLayer) {
      view.warnings.push(pkg.label + " is listed under " + state.group + " but its layer is " + pkg.sourceLayer);
    }
  }
}

// Is a package in play, and if it's listed but off, why.
export function packageState(view: ContextView, packageKey: string | null): PackageState | null {
  if (packageKey === null) return null;
  return view.packages.find((p) => p.key === packageKey) ?? null;
}

// "place → organisation → title"
export function describeRanks(ranks: CategoryRanks): string {
  return ranks.map((rank) => rank.join(" / ")).join(" → ");
}
