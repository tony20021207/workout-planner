/**
 * Rep-range presets for the calendar customizer.
 *
 * The auto-recommender (post-split, weekly) gives ONE recommendation per
 * exercise based on category × experience. That stays unchanged.
 *
 * On the calendar, when the user schedules a workout (or picks one for
 * another day), they can apply one of these presets:
 *
 *   THREE-BUCKET:
 *     User assigns each exercise to a rep-range bucket — 5-8 / 8-15 /
 *     15-30. Each bucket gets the corresponding rep target (default
 *     center of the range). Best for the Nippard 80/20 mix where most
 *     work lives in 8-15 with a smaller share heavy and metabolic.
 *
 *   DAY-WIDE PRESET:
 *     User picks ONE range — 5-8 / 8-15 / 15-30 — for the entire day.
 *     Cleanest when the day is a single training intent (e.g. "heavy
 *     compound day").
 *
 *   CUSTOM:
 *     Free per-set edit (existing behaviour).
 *
 * After applying any preset, the user can still edit individual sets.
 */
export type RepRangeId = "heavy" | "hypertrophy" | "metabolic";

export interface RepRange {
  id: RepRangeId;
  label: string;
  minReps: number;
  maxReps: number;
  /** Center of range — used as the default reps per set. */
  defaultReps: number;
  shortLabel: string;
  /** When picking sets for the bucket, this many sets is the default. */
  defaultSets: number;
  description: string;
}

export const REP_RANGES: RepRange[] = [
  {
    id: "heavy",
    label: "Heavy",
    minReps: 5,
    maxReps: 8,
    defaultReps: 6,
    shortLabel: "5–8",
    defaultSets: 4,
    description:
      "Heavy load, lower reps. Best for stretch-bias compounds (RDL, Bayesian, Bulgarian Split Squat) and skill-driven barbell work where heavier weight unlocks the lengthened-position stimulus.",
  },
  {
    id: "hypertrophy",
    label: "Hypertrophy",
    minReps: 8,
    maxReps: 15,
    defaultReps: 12,
    shortLabel: "8–15",
    defaultSets: 3,
    description:
      "Default hypertrophy band. Most isolations and machine compounds live here. Typically 70–80% of weekly working-set volume.",
  },
  {
    id: "metabolic",
    label: "Metabolic",
    minReps: 15,
    maxReps: 30,
    defaultReps: 20,
    shortLabel: "15–30",
    defaultSets: 2,
    description:
      "Higher reps, metabolic stress. Best for calves, core, and small-mass isolations (face pulls, lateral raises) where pump and time-under-tension drive growth.",
  },
];

export const REP_RANGE_BY_ID: Record<RepRangeId, RepRange> = REP_RANGES.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<RepRangeId, RepRange>,
);

/** Find which preset best matches a given reps-per-set number. */
export function inferRangeFromReps(reps: number): RepRangeId {
  if (reps <= 8) return "heavy";
  if (reps <= 15) return "hypertrophy";
  return "metabolic";
}

/**
 * Suggest a sensible default rep-range for an exercise given its name +
 * category. Pure heuristic used to pre-fill the three-bucket UI so the
 * user starts from a reasonable assignment instead of a blank slate.
 */
export function suggestRangeForExercise(
  exerciseName: string,
  category: "systemic" | "regional",
): RepRangeId {
  const name = exerciseName.toLowerCase();
  // Calves + core + small-mass cuff/rotator work → metabolic
  if (
    /calf|calves|crunch|woodchop|pallof|side bend|v-up|ab wheel|face pull|external rotation/.test(
      name,
    )
  ) {
    return "metabolic";
  }
  // Stretch-bias compounds + heavy hinges → heavy
  if (
    /romanian deadlift|stiff[- ]leg|conventional deadlift|sumo deadlift|deadlift|bayesian|sissy squat|jefferson curl|nordic|bulgarian|good morning/.test(
      name,
    )
  ) {
    return "heavy";
  }
  // Lateral raises + side delts in lengthened range → metabolic
  if (/lateral raise|cable y/.test(name)) return "metabolic";
  // Default: hypertrophy band
  return "hypertrophy";
}

/**
 * Apply a single rep range to a list of exercises. Sets count + reps
 * are overwritten with the range's defaults. Weights are preserved.
 *
 * Generic enough to operate on either the SplitBuilder's RoutineItem or
 * the CalendarPage's CalendarExercise — caller passes a getter / setter.
 */
export interface RepRangePatchInput {
  customSets: number;
  customReps: number;
  customWeight: number;
}

export function applyRangeToExercise(
  ex: RepRangePatchInput,
  rangeId: RepRangeId,
): RepRangePatchInput {
  const range = REP_RANGE_BY_ID[rangeId];
  return {
    ...ex,
    customSets: range.defaultSets,
    customReps: range.defaultReps,
    // weight preserved
  };
}

/** Apply day-wide preset: every exercise gets the same range. */
export function applyDayWidePreset<T extends RepRangePatchInput>(
  exercises: T[],
  rangeId: RepRangeId,
): T[] {
  return exercises.map((ex) => applyRangeToExercise(ex, rangeId) as T);
}

/**
 * Same logic as applyRangeToExercise but for the SplitBuilder's
 * RoutineItem shape (item.sets is an array of { reps, weight } pairs).
 * The new sets[] preserves the FIRST existing set's weight across all
 * resized slots — so a user who already filled in 135 lbs doesn't lose
 * it when toggling rep ranges.
 */
export interface RoutineItemLike {
  sets: { reps: number; weight: number }[];
}

export function applyRangeToRoutineSets(
  item: RoutineItemLike,
  rangeId: RepRangeId,
): { reps: number; weight: number }[] {
  const range = REP_RANGE_BY_ID[rangeId];
  const preservedWeight = item.sets[0]?.weight ?? 0;
  return Array.from({ length: range.defaultSets }, () => ({
    reps: range.defaultReps,
    weight: preservedWeight,
  }));
}

/**
 * Apply three-bucket preset: each exercise has been independently
 * assigned to a rangeId via assignments map (exerciseIndex -> rangeId).
 * Indexes not present in the map are left untouched.
 */
export function applyThreeBucketPreset<T extends RepRangePatchInput>(
  exercises: T[],
  assignments: Record<number, RepRangeId>,
): T[] {
  return exercises.map((ex, i) => {
    const rangeId = assignments[i];
    if (!rangeId) return ex;
    return applyRangeToExercise(ex, rangeId) as T;
  });
}
