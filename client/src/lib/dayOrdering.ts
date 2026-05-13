/**
 * Per-day exercise ordering — applied at the end of the allocator so
 * each day's exercise list lands in a physiologically sensible order.
 *
 * Sort priority (first key with a difference decides):
 *
 *   1. Tier:               systemic (compounds) BEFORE regional (isolations)
 *   2. Heavy-hinge:        within compounds, CNS-taxing hinges first
 *                          (Conv / Sumo / Trap Deadlift, Good Morning,
 *                          Jefferson Curl) — fresh CNS does the heaviest lift
 *   3. Muscle mass:        bigger primary muscle first (mass-weight desc)
 *                          chest/back/quads ahead of biceps/calves/core
 *   4. SFR:                high stimulus-to-fatigue first
 *                          (do productive picks while fresh)
 *   5. Stability:          more stable first
 *                          (load near failure on safe picks first)
 *   6. Stretch level:      higher stretch first
 *                          (within isolations, stretch-emphasis lifts first
 *                          so the lengthened position is felt cleanly)
 *   7. Name:               alphabetical (tie-break for determinism)
 *
 * Applied at: end of allocatePoolToSplit. Re-running the allocator
 * (e.g. "Re-allocate" button) refreshes the sort. Manual drag-drop in
 * the SplitBuilder UI is respected and never auto-overridden.
 */
import { categories, type Exercise } from "./data";
import type { RoutineItem } from "@/contexts/WorkoutContext";
import { MUSCLE_MASS_WEIGHT, getMuscleTagsForItem, type MuscleTag } from "./splitPresets";

// Heavy-hinge name detection (same pattern as splitPresets.ts but local to
// avoid the cross-module dependency).
const HEAVY_HINGE_PATTERN = /(?:\bdeadlift\b|good morning|jefferson curl)/i;
const NOT_HEAVY_HINGE_PATTERN = /romanian|stiff[- ]leg|single[- ]leg/i;

const SFR_VALUE: Record<string, number> = { "high": 3, "medium": 2, "low": 1 };
const STABILITY_VALUE: Record<string, number> = {
  "very-high": 4,
  "high": 3,
  "medium": 2,
  "low": 1,
};
const STRETCH_VALUE: Record<string, number> = {
  "very-high": 3,
  "high": 2,
  "moderate": 1,
};

// ============================================================
// CATALOG LOOKUP (name → Exercise)
// ============================================================

let _byName: Map<string, Exercise> | null = null;
function exerciseByName(name: string): Exercise | null {
  if (!_byName) {
    _byName = new Map();
    for (const c of categories) {
      for (const jf of c.jointFunctions) {
        for (const sub of jf.subcategories) {
          for (const ex of sub.exercises) {
            _byName.set(ex.name, ex);
          }
        }
      }
    }
  }
  return _byName.get(name) ?? null;
}

// ============================================================
// SORT-KEY HELPERS
// ============================================================

function isHeavyHinge(name: string): boolean {
  const lower = name.toLowerCase();
  return HEAVY_HINGE_PATTERN.test(lower) && !NOT_HEAVY_HINGE_PATTERN.test(lower);
}

/**
 * Pick the "primary muscle" for an exercise — the muscle tag with the
 * highest mass weight from the item's resolved tags. Drives the
 * 'bigger muscle first' sort.
 */
function primaryMuscleMass(item: RoutineItem): number {
  const tags = getMuscleTagsForItem(item).filter((t): t is MuscleTag => t !== "heavy-hinge");
  if (tags.length === 0) return 0;
  let max = 0;
  for (const t of tags) {
    const w = MUSCLE_MASS_WEIGHT[t] ?? 0;
    if (w > max) max = w;
  }
  return max;
}

// ============================================================
// MAIN SORT
// ============================================================

// ============================================================
// ANTAGONIST SUPERSET ORDERING
// ============================================================
//
// Per-day toggle. When enabled, the day's exercises interleave
// antagonist pairs: push/pull alternation on upper days, quad/ham
// alternation on leg days. "Other" exercises (lateral raises,
// calves, core) tail-end in their original order.
//
// Useful when a lifter is time-constrained and supersetting opposing
// muscles is efficient (rest the antagonist's primary mover while
// working the agonist). NOT optimal for max hypertrophy on every set
// — that's why it's opt-in per day.

type AntagonistCategory = "push" | "pull" | "quad" | "ham" | "other";

function categorizeForAntagonist(item: RoutineItem): AntagonistCategory {
  const tags = getMuscleTagsForItem(item);
  const hasPush = tags.includes("chest") || tags.includes("triceps");
  const hasPull = tags.includes("back") || tags.includes("biceps");
  const hasQuad = tags.includes("quads");
  const hasHam = tags.includes("hams");
  if (hasPush && !hasPull) return "push";
  if (hasPull && !hasPush) return "pull";
  if (hasQuad && !hasHam) return "quad";
  if (hasHam && !hasQuad) return "ham";
  return "other";
}

/** Returns true if the day has at least one usable antagonist pair. */
export function canApplyAntagonist(items: RoutineItem[]): boolean {
  let hasPush = false,
    hasPull = false,
    hasQuad = false,
    hasHam = false;
  for (const item of items) {
    const c = categorizeForAntagonist(item);
    if (c === "push") hasPush = true;
    else if (c === "pull") hasPull = true;
    else if (c === "quad") hasQuad = true;
    else if (c === "ham") hasHam = true;
  }
  return (hasPush && hasPull) || (hasQuad && hasHam);
}

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

/**
 * Reorder items into antagonist-superset display order. Pure function;
 * returns a new array. If the day has no usable antagonist pair, the
 * input order is preserved (no-op).
 */
export function antagonistOrder(items: RoutineItem[]): RoutineItem[] {
  const groups: Record<AntagonistCategory, RoutineItem[]> = {
    push: [],
    pull: [],
    quad: [],
    ham: [],
    other: [],
  };
  for (const item of items) groups[categorizeForAntagonist(item)].push(item);

  const hasPushPull = groups.push.length > 0 && groups.pull.length > 0;
  const hasQuadHam = groups.quad.length > 0 && groups.ham.length > 0;
  if (!hasPushPull && !hasQuadHam) return [...items];

  const result: RoutineItem[] = [];
  if (hasPushPull) {
    result.push(...interleave(groups.push, groups.pull));
  } else {
    result.push(...groups.push, ...groups.pull);
  }
  if (hasQuadHam) {
    result.push(...interleave(groups.quad, groups.ham));
  } else {
    result.push(...groups.quad, ...groups.ham);
  }
  result.push(...groups.other);
  return result;
}

// ============================================================
// PRIMING SORT (default order — compound → mass → SFR → stability → stretch)
// ============================================================

/**
 * Sort a single day's exercise IDs into the priming-first order. Pure
 * function — input array is not mutated; returns a new array.
 *
 * @param ids the day's current exercise IDs
 * @param itemsById id → RoutineItem lookup (from the allocator context
 *   or a Map built by the caller). Exercises with no entry are sorted
 *   to the end so missing-data doesn't break the order.
 */
export function sortDayExercises(ids: string[], itemsById: Map<string, RoutineItem>): string[] {
  type Keyed = { id: string; item: RoutineItem | null; key: number[] };
  const keyed: Keyed[] = ids.map((id) => {
    const item = itemsById.get(id) ?? null;
    if (!item) {
      // Unknown id — sort to the end via huge sentinel values.
      return { id, item: null, key: [99, 99, 0, 0, 0, 0] };
    }
    const ex = exerciseByName(item.exercise);
    const sfr = SFR_VALUE[ex?.sfr ?? "medium"] ?? 2;
    const stability = STABILITY_VALUE[ex?.stability ?? "medium"] ?? 2;
    const stretch = STRETCH_VALUE[ex?.stretchLevel ?? "moderate"] ?? 1;
    const mass = primaryMuscleMass(item);
    const tierKey = item.category === "systemic" ? 0 : 1;
    const hingeKey = item.category === "systemic" && isHeavyHinge(item.exercise) ? 0 : 1;
    // Negate values that should sort DESCENDING (bigger mass / higher
    // SFR / higher stability / higher stretch FIRST).
    return {
      id,
      item,
      key: [tierKey, hingeKey, -mass, -sfr, -stability, -stretch],
    };
  });

  keyed.sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) {
      if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i];
    }
    // Final tie-break: alphabetical by exercise name (deterministic).
    const an = a.item?.exercise ?? "";
    const bn = b.item?.exercise ?? "";
    return an.localeCompare(bn);
  });

  return keyed.map((k) => k.id);
}
