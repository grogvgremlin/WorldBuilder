// A manifest context as the resolver reads it: which packages are in play, the category order
// per step and the bag order (with where each came from), and the pins.
// Design: build/slice-1-brief.md §1.2 (macro: orders are content in the manifest, overridable
// per context; micro: pins), §2.1 (a rule is in play only if its package is switched on in the
// unit's context); design/rules-overlay.md §12 (category-order edits and pins are dated GM
// fixes, shown in the derivation); design/items-packages-and-library.md §4 (packages, requires,
// conflicts), §10 (switch-offs).
//
// Pure: reads the World (content plus accepted entries), does no I/O.

import type {
  CategoryOrderValues,
  CategoryRanks,
  EditKind,
  Manifest,
  ManifestContext,
  PackageSwitchValues,
  PinValues,
} from "../schema";
import type { World } from "../world/world";
import type { FoldStepName } from "./derivation";

// Used only when a sandbox has no context or its manifest is missing: slice 0's behaviour.
const FALLBACK_ORDER: CategoryRanks = [["place"], ["organisation"], ["title"]];
const FALLBACK_BAG: EditKind[] = ["set", "add", "multiply", "cap", "floor"];

export interface PackageState {
  key: string;
  on: boolean;
  note: string; // "on by default in WFB 6th" / "switched off by owner, 2026-11-12"
  entryId: string | null; // the switch entry, if a GM switched it
}

export interface StepOrder {
  ranks: CategoryRanks;
  note: string; // "WFB 6th default" / "set for this context by owner, 2026-11-12"
  entryId: string | null; // the override entry, if the GM set one
}

export interface Pin extends PinValues {
  note: string; // "owner, 2026-11-12"
  entryId: string;
}

export interface ContextView {
  context: ManifestContext | null;
  manifest: Manifest | null;
  packages: PackageState[]; // in order: the context's list, then any switched on later
  categoryOrder: Record<FoldStepName, StepOrder>;
  bagOrder: EditKind[];
  pins: Pin[];
  warnings: string[]; // missing manifest, missing packages, requires / conflicts
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
  const manifestName = manifest?.label ?? "built-in";

  const view: ContextView = {
    context,
    manifest,
    packages: [],
    categoryOrder: {
      origin: { ranks: manifest?.categoryOrder.origin ?? FALLBACK_ORDER, note: manifestName + " default", entryId: null },
      stationed: { ranks: manifest?.categoryOrder.stationed ?? FALLBACK_ORDER, note: manifestName + " default", entryId: null },
    },
    bagOrder: manifest?.bagOrder ?? FALLBACK_BAG,
    pins: [],
    warnings,
  };
  if (!context) return view;

  const contextName = context.label;
  view.packages = context.packages.map((key) => ({ key, on: true, note: "on by default in " + contextName, entryId: null }));

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

function applySwitch(view: ContextView, values: PackageSwitchValues, note: string, entryId: string): void {
  const text = (values.on ? "switched on by " : "switched off by ") + note;
  const existing = view.packages.find((p) => p.key === values.package);
  if (existing) {
    existing.on = values.on;
    existing.note = text;
    existing.entryId = entryId;
  } else {
    view.packages.push({ key: values.package, on: values.on, note: text, entryId });
  }
}

// items-packages §4: requires missing or conflicts both on are warnings, never blocks.
function checkPackages(world: World, view: ContextView): void {
  const on = new Set(view.packages.filter((p) => p.on).map((p) => p.key));
  for (const state of view.packages) {
    const pkg = world.packages.get(state.key);
    if (!pkg) {
      view.warnings.push("package " + state.key + " isn't in the library");
      continue;
    }
    if (!state.on) continue;
    for (const needed of pkg.requires) if (!on.has(needed)) view.warnings.push(pkg.label + " requires " + needed + ", which is off");
    for (const clash of pkg.conflicts) if (on.has(clash)) view.warnings.push(pkg.label + " conflicts with " + clash);
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
