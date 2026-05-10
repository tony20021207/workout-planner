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

/** Tier index for shifting rep ranges by experience. 0=low, 1=medium, 2=high. */
const RANGE_TIER: Record<RepRangeId, number> = { low: 0, medium: 1, high: 2 };
const TIER_TO_RANGE: RepRangeId[] = ["low", "medium", "high"];

/**
 * Opti-fill rep range with experience adjustment:
 *   - Beginner: shifts the matrix bucket UP one tier (more reps for skill
 *     mastery) — Low→Med, Med→High, High→High.
 *   - Foot in the Door: matrix as-is.
 *   - Experienced: shifts DOWN one tier (heavier loads, fewer reps) —
 *     Low→Low, Med→Low, High→Med.
 *
 * The matrix's anatomy logic (calves/abs always start higher than
 * deadlift) is preserved; experience just nudges the result up or down.
 */
export function optiFillRangeForExperience(
  item: RepRangeMatrixInput,
  experienceId: "beginner" | "foot-in-door" | "experienced" | null | undefined,
): RepRangeId {
  const baseRange = optiFillRange(item);
  const baseTier = RANGE_TIER[baseRange];
  if (experienceId === "beginner") {
    return TIER_TO_RANGE[Math.min(2, baseTier + 1)];
  }
  if (experienceId === "experienced") {
    return TIER_TO_RANGE[Math.max(0, baseTier - 1)];
  }
  return baseRange;
}

// Pattern matches for the Opti-fill matrix.
const DEADLIFT_PATTERN =
  /\bdeadlift\b/i; // matches "Conventional Deadlift", "Sumo Deadlift", "Trap Bar Deadlift", "Deadlift"
const NOT_CNS_DEADLIFT_PATTERN =
  /romanian|stiff[- ]leg|single[- ]leg/i; // RDL etc. are NOT CNS-heavy deadlifts
const ENDURANCE_NAME_PATTERN =
  /calf|calves|crunch|woodchop|pallof|side bend|v-up|ab wheel|face pull|external rotation|lateral raise|cable y/i;
const ENDURANCE_MUSCLE_PATTERN =
  /soleus|abdomin|oblique|posterior delt|rear delt|forearm|rotator cuff|infraspinatus|teres minor|supraspinatus/i;

/**
 * Opti-fill matrix — pick a rep range for a routine item given its
 * resolved tags and name. The matrix collapses to three rules in our
 * three-bucket world:
 *
 *   1. Conventional / Sumo / Trap-Bar Deadlift → Low (5–8). CNS-heavy
 *      lifts where rep count is ceiling-limited regardless of stretch.
 *      Excludes RDL, stiff-leg, single-leg variants.
 *
 *   2. Endurance / small-mass / slow-twitch class → High (15–30).
 *      Calves (soleus), abs, obliques, rear delts, cuff, forearms,
 *      face pulls, lateral raises. Smaller mass needs higher reps for
 *      effective hypertrophy stimulus.
 *
 *   3. Everything else → Medium (8–15). Stretch-bias compounds (RDL,
 *      Bayesian, sissy squat) live here in the simplified matrix per
 *      the 5–30-reps-equally-effective framing.
 *
 * The function reads name + targetedMuscles. stretchLevel + stability
 * are accepted on the input shape so future P11+ revisions can extend
 * the matrix without breaking the call sites.
 */
export interface RepRangeMatrixInput {
  exercise: string;
  targetedMuscles: string[];
  category?: "systemic" | "regional";
  stretchLevel?: "moderate" | "high" | "very-high";
  stability?: "very-high" | "high" | "medium" | "low";
}

export function optiFillRange(item: RepRangeMatrixInput): RepRangeId {
  const name = item.exercise.toLowerCase();

  // Rule 1: CNS deadlifts → Low
  if (DEADLIFT_PATTERN.test(name) && !NOT_CNS_DEADLIFT_PATTERN.test(name)) {
    return "low";
  }

  // Rule 2: Endurance class → High (by name pattern OR targeted muscle)
  if (ENDURANCE_NAME_PATTERN.test(name)) return "high";
  if (item.targetedMuscles.some((m) => ENDURANCE_MUSCLE_PATTERN.test(m))) {
    return "high";
  }

  // Rule 3: Default → Medium
  return "medium";
}

/**
 * Calendar-side convenience: name + category only. Loose backward-
 * compatible wrapper around optiFillRange for calendar exercises that
 * don't carry resolved tags.
 */
export function suggestRangeForExercise(
  exerciseName: string,
  category: "systemic" | "regional",
): RepRangeId {
  return optiFillRange({
    exercise: exerciseName,
    targetedMuscles: [],
    category,
  });
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
 *
 * `overrideSetsCount` lets callers provide a custom sets target. Smart
 * Fill at the mesocycle / day / per-exercise scope passes the result of
 * computeMatrixSets (per-muscle weekly volume target divided by
 * total session-instances). Pre-Set callers omit the override and use
 * the rep-range bucket's natural defaultSets.
 */
export interface RoutineItemLike {
  sets: { reps: number; weight: number }[];
}

export function applyRangeToRoutineSets(
  item: RoutineItemLike,
  rangeId: RepRangeId,
  overrideSetsCount?: number,
): { reps: number; weight: number }[] {
  const range = REP_RANGE_BY_ID[rangeId];
  const preservedWeight = item.sets[0]?.weight ?? 0;
  const setsCount = overrideSetsCount ?? range.defaultSets;
  return Array.from({ length: setsCount }, () => ({
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
