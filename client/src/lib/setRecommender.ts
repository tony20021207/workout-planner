/**
 * Auto-recommend sets, reps, and rest for a routine item.
 *
 * Used when the user clicks "Auto-fill sets & reps" in the SplitBuilder.
 * Defaults follow Israetel / Nippard hypertrophy guidance:
 *
 *   • Tier 1 systemic compounds: 3 sets × 6–10 reps. We pick 8 as the
 *     default rep count.
 *   • Tier 2 isolation: 3 sets × 8–15 reps. We pick 12 as the default.
 *   • Calves: 3 sets × 12–20 reps. We pick 15.
 *   • Core abs/obliques: 3 sets × 12–25 reps. We pick 15.
 *
 * Weight defaults to 0 — user fills in their actual training weight.
 * The user can edit any value per set after auto-fill.
 */
import type { RoutineItem, SetDetail } from "@/contexts/WorkoutContext";

const CALVES_NAME_PATTERN = /calf|calves|seated calf|standing calf/i;
const CORE_ISOLATION_PATTERN = /crunch|woodchop|pallof|side bend|v-up|ab wheel/i;

export interface SetRecommendation {
  numSets: number;
  defaultReps: number;
  defaultWeight: number;
  /** Suggested rep range as a string for display. */
  repRangeLabel: string;
  /** Suggested rest in seconds (used by P7 PDF / calendar). */
  restSeconds: number;
}

export function recommendSetsForItem(item: RoutineItem): SetRecommendation {
  const isCompound = item.category === "systemic";
  const isCalves = CALVES_NAME_PATTERN.test(item.exercise);
  const isCore = CORE_ISOLATION_PATTERN.test(item.exercise);

  if (isCompound) {
    return {
      numSets: 3,
      defaultReps: 8,
      defaultWeight: 0,
      repRangeLabel: "6–10",
      restSeconds: 150, // 2.5 min for compounds
    };
  }
  if (isCalves) {
    return {
      numSets: 3,
      defaultReps: 15,
      defaultWeight: 0,
      repRangeLabel: "12–20",
      restSeconds: 60,
    };
  }
  if (isCore) {
    return {
      numSets: 3,
      defaultReps: 15,
      defaultWeight: 0,
      repRangeLabel: "12–25",
      restSeconds: 60,
    };
  }
  // Default: regional / isolation
  return {
    numSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    repRangeLabel: "8–15",
    restSeconds: 75,
  };
}

/**
 * Build a SetDetail[] from a recommendation. Each set gets the same
 * default reps and weight. The user can edit per-set.
 */
export function buildSetsFromRecommendation(rec: SetRecommendation): SetDetail[] {
  return Array.from({ length: rec.numSets }, () => ({
    reps: rec.defaultReps,
    weight: rec.defaultWeight,
  }));
}

/**
 * Apply the auto-recommendation to a routine item, returning a new
 * SetDetail[] without mutating the input.
 */
export function autoRecommendSets(item: RoutineItem): SetDetail[] {
  return buildSetsFromRecommendation(recommendSetsForItem(item));
}
