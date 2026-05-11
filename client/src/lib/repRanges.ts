/**
 * Rep-range presets — four-bucket system.
 *
 * Splitting the old 8-15 "medium" band into two finer buckets gives
 * meaningful programming variety in the hypertrophy zone:
 *
 *   - 5-8   (Low):       strength-flavored, near-failure on stable picks.
 *   - 8-12  (Med-Low):   heavy hypertrophy, compound-default.
 *   - 12-15 (Med-High):  pump hypertrophy, isolation-default.
 *   - 15-30 (High):      endurance / small-mass / slow-twitch.
 *
 * Pre-Set lets the user apply one bucket to a scope (mesocycle / day /
 * single exercise). Opti-fill picks per-exercise via the matrix:
 *
 *   Rule 1: CNS deadlifts            → Low
 *   Rule 2: endurance-class by name  → High
 *   Rule 3: endurance-class by muscle→ High
 *   Rule 4: compound (systemic)      → Med-Low (8-12)
 *   Rule 5: isolation (regional)     → Med-High (12-15)
 *
 * Per the 5-30 reps argument: anything in the 5-30 range pushed close
 * to failure produces comparable hypertrophy. The four buckets trade off
 * load vs cardio vs joint stress vs time-per-set, not raw growth.
 *
 * After applying any preset, the user can still edit individual sets.
 */
export type RepRangeId = "low" | "med-low" | "med-high" | "high";

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
    id: "low",
    label: "Low",
    minReps: 5,
    maxReps: 8,
    defaultReps: 6,
    shortLabel: "5–8",
    defaultSets: 4,
    description:
      "Lower reps, heavier loads. Same growth potential as the higher tiers when pushed to failure. Easier on cardiovascular load, heavier on joint and CNS cost. Best on stable picks where you can load near failure safely.",
  },
  {
    id: "med-low",
    label: "Med-Low",
    minReps: 8,
    maxReps: 12,
    defaultReps: 10,
    shortLabel: "8–12",
    defaultSets: 3,
    description:
      "Heavy hypertrophy zone. Nippard / Israetel default for compound work. Balanced load and time-per-set; moderate CNS cost.",
  },
  {
    id: "med-high",
    label: "Med-High",
    minReps: 12,
    maxReps: 15,
    defaultReps: 14,
    shortLabel: "12–15",
    defaultSets: 3,
    description:
      "Pump hypertrophy zone. Default for isolation work — biceps, triceps, side delts, leg curls. Lighter joint load, more metabolic stress per set.",
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
      "Higher reps, lighter loads. Same growth potential as the lower tiers when pushed to failure. Lower joint stress, higher cardio and time cost. Best for small / endurance muscles (calves, abs, cuff, rear delts).",
  },
];

export const REP_RANGE_BY_ID: Record<RepRangeId, RepRange> = REP_RANGES.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<RepRangeId, RepRange>,
);

/** Find which preset best matches a given reps-per-set number.
 * Boundaries: ≤8 → low, ≤12 → med-low, ≤15 → med-high, else → high. */
export function inferRangeFromReps(reps: number): RepRangeId {
  if (reps <= 8) return "low";
  if (reps <= 12) return "med-low";
  if (reps <= 15) return "med-high";
  return "high";
}

/** Tier index for shifting rep ranges by experience. 0=low … 3=high. */
const RANGE_TIER: Record<RepRangeId, number> = {
  low: 0,
  "med-low": 1,
  "med-high": 2,
  high: 3,
};
const TIER_TO_RANGE: RepRangeId[] = ["low", "med-low", "med-high", "high"];
const MAX_TIER = TIER_TO_RANGE.length - 1;

/**
 * Opti-fill rep range with experience adjustment:
 *   - Beginner: shifts the matrix bucket UP one tier (more reps for skill
 *     mastery). Low → Med-Low, Med-Low → Med-High, Med-High → High,
 *     High → High (clamp).
 *   - Foot in the Door: matrix as-is.
 *   - Experienced: shifts DOWN one tier (heavier loads, fewer reps).
 *     Low → Low (clamp), Med-Low → Low, Med-High → Med-Low,
 *     High → Med-High.
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
    return TIER_TO_RANGE[Math.min(MAX_TIER, baseTier + 1)];
  }
  if (experienceId === "experienced") {
    return TIER_TO_RANGE[Math.max(0, baseTier - 1)];
  }
  return baseRange;
}

/** Back-compat alias — consumers import the function under either name. */
export { optiFillRangeForExperience as smartFillRangeForExperience };

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
 * resolved tags and name. Five rules in the four-bucket world:
 *
 *   1. Conventional / Sumo / Trap-Bar Deadlift → Low (5–8). CNS-heavy
 *      lifts where rep count is ceiling-limited regardless of stretch.
 *      Excludes RDL, stiff-leg, single-leg variants.
 *
 *   2. Endurance class by NAME → High (15–30). Calf raises, crunches,
 *      lateral raises, pallof, face pulls, woodchops, etc.
 *
 *   3. Endurance class by TARGETED MUSCLE → High (15–30). Soleus,
 *      obliques, rear delts, rotator cuff, forearms — smaller mass
 *      and slow-twitch fibers benefit from higher reps.
 *
 *   4. Compound (category === "systemic") → Med-Low (8–12). Heavy
 *      hypertrophy zone; the Nippard / Israetel default for compounds.
 *
 *   5. Isolation (category === "regional", default) → Med-High (12–15).
 *      Pump hypertrophy zone; the default for curls, extensions, flies.
 *
 * The function reads name + targetedMuscles + category. stretchLevel +
 * stability are accepted on the input shape so future revisions can
 * extend the matrix without breaking call sites.
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

  // Rule 2 + 3: Endurance class → High (by name pattern OR targeted muscle)
  if (ENDURANCE_NAME_PATTERN.test(name)) return "high";
  if (item.targetedMuscles.some((m) => ENDURANCE_MUSCLE_PATTERN.test(m))) {
    return "high";
  }

  // Rule 4: Compound → Med-Low (8–12). Default for systemic / multi-joint.
  if (item.category === "systemic") return "med-low";

  // Rule 5: Isolation → Med-High (12–15). Default for regional / single-joint.
  return "med-high";
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
