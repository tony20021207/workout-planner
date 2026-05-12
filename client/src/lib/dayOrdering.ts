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
