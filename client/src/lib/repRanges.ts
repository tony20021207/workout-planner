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
export type RepRangeId = "low" | "medium" | "high";

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

// Per the 5–30 reps argument: anything in the 5–30 range pushed close
// to failure produces comparable hypertrophy. The three buckets just
// trade off load vs cardio vs joint stress vs time-per-set, not raw
// growth potential.
export const REP_RANGES: RepRange[] = [
  {
    id: "low",
    label: "Low",
    minReps: 5,
    maxReps: 8,
    defaultReps: 6,
    shortLabel: "5–8",
    defaultSets: 4,
    description:
      "Lower reps, heavier loads. Same growth potential as Medium / High when pushed to failure. Easier on cardiovascular load, heavier on joint and CNS cost. Best on stable picks where you can load near failure safely.",
  },
  {
    id: "medium",
    label: "Medium",
    minReps: 8,
    maxReps: 15,
    defaultReps: 12,
    shortLabel: "8–15",
    defaultSets: 3,
    description:
      "Default rep band. Balanced load and time-per-set, moderate recovery cost. The most common bucket for compound and isolation work alike.",
  },
  {
    id: "high",
    label: "High",
    minReps: 15,
    maxReps: 30,
    defaultReps: 20,
    shortLabel: "15–30",
    defaultSets: 2,
    description:
      "Higher reps, lighter loads. Same growth potential as Low / Medium when pushed to failure. Lower joint stress, higher cardio and time cost. Best for small / endurance muscles (calves, abs, cuff, rear delts).",
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
  if (reps <= 8) return "low";
  if (reps <= 15) return "medium";
  return "high";
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
  // Calves + core + small-mass cuff/rotator work → high reps
  if (
    /calf|calves|crunch|woodchop|pallof|side bend|v-up|ab wheel|face pull|external rotation/.test(
      name,
    )
  ) {
    return "high";
  }
  // Stretch-bias compounds + heavy hinges → low reps
  if (
    /romanian deadlift|stiff[- ]leg|conventional deadlift|sumo deadlift|deadlift|bayesian|sissy squat|jefferson curl|nordic|bulgarian|good morning/.test(
      name,
    )
  ) {
    return "low";
  }
  // Lateral raises + side delts in lengthened range → high reps
  if (/lateral raise|cable y/.test(name)) return "high";
  // Default: medium band
  return "medium";
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
