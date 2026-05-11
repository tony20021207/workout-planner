/**
 * Week-2 load/deload per muscle — P9.3.3.
 *
 * Treats the 2-week mesocycle as one budget. For each muscle group:
 *
 *   week2Target_M = max(0.5 × weeklyTarget_M, 2 × weeklyTarget_M − week1Actual_M)
 *
 * The floor (0.5 × weekly) is a true minimum-effective-volume guard —
 * even on a deload week the muscle still gets ~half its normal
 * stimulus, enough to maintain. The 2-week budget anchor means muscles
 * that came in HOT in Week 1 (target = 15, actual = 22) deload toward
 * the floor in Week 2 (target = max(7, 30 − 22) = 8), while muscles
 * that came in LIGHT in Week 1 (actual = 10) get pumped up in Week 2
 * (target = max(7, 30 − 10) = 20). Net biweekly stimulus tracks the
 * 2-week budget for every muscle, regardless of how Week 1 actually
 * landed.
 *
 * Set distribution within Week 2 uses the same "ceil(target / total
 * instances)" approach as `computeMatrixSets` — equal share per
 * session-instance, max across an item's tags, floor of 1.
 */
import type { RoutineItem, SetDetail } from "@/contexts/WorkoutContext";
import {
  getMuscleTagsForItem,
  MUSCLE_MASS_WEIGHT,
  type MuscleTag,
} from "./splitPresets";
import type { ExperienceProfile } from "./experience";

type DayAssignments = Record<string, string[]>;

/** Floor multiplier — Week 2 target never drops below this × weekly target. */
const DELOAD_FLOOR_MULTIPLIER = 0.5;

/**
 * Result type: per-exercise Week-2 sets[] override + per-muscle
 * diagnostics for UI display.
 */
export interface LoadDeloadResult {
  /** itemId -> sets[] for Week 2 (one entry per item assigned to Week 2). */
  week2ExerciseSets: Record<string, SetDetail[]>;
  /** Per-muscle: weekly target, Week 1 actual, Week 2 target. For UI display. */
  perMuscle: Record<MuscleTag, {
    weeklyTarget: number;
    week1Actual: number;
    week2Target: number;
    /** "load" if W2 target > weekly target, "deload" if < weekly target, "match" if ~equal. */
    direction: "load" | "deload" | "match";
  }>;
}

/** Build instance counts: itemId -> how many times it appears across the given week. */
function instanceCounts(week: DayAssignments): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ids of Object.values(week)) {
    for (const id of ids) {
      out[id] = (out[id] ?? 0) + 1;
    }
  }
  return out;
}

/**
 * Compute Week 2's per-exercise sets[] override using the load/deload
 * formula. Pure function — no mutation.
 *
 * @param routine current routine items (their .sets[] is interpreted as Week 1's sets)
 * @param week1 Week 1 day assignments
 * @param week2 Week 2 day assignments
 * @param experience the user's experience profile
 */
export function computeWeek2LoadDeload(
  routine: RoutineItem[],
  week1: DayAssignments,
  week2: DayAssignments,
  experience: ExperienceProfile,
): LoadDeloadResult {
  const base = experience.weeklyVolumePerMajor;

  // 1. Weekly target per muscle (mirror of computeWeeklyVolumeTargets).
  const weeklyTarget = {} as Record<MuscleTag, number>;
  for (const tag of Object.keys(MUSCLE_MASS_WEIGHT) as MuscleTag[]) {
    weeklyTarget[tag] = Math.max(6, Math.round(base * MUSCLE_MASS_WEIGHT[tag]));
  }

  const w1Inst = instanceCounts(week1);
  const w2Inst = instanceCounts(week2);

  // Cache tags per item.
  const tagsById = new Map<string, MuscleTag[]>();
  for (const r of routine) tagsById.set(r.id, getMuscleTagsForItem(r));

  // 2. Week 1 actual sets per muscle. For each item assigned in Week 1,
  // its contribution to muscle M = item.sets.length × week1Instances if
  // the item's tags include M.
  const week1Actual = {} as Record<MuscleTag, number>;
  for (const tag of Object.keys(MUSCLE_MASS_WEIGHT) as MuscleTag[]) week1Actual[tag] = 0;
  for (const item of routine) {
    const itemInst = w1Inst[item.id] ?? 0;
    if (itemInst === 0) continue;
    const setsPerSession = item.sets.length;
    const totalWeekSets = setsPerSession * itemInst;
    const tags = tagsById.get(item.id) ?? [];
    for (const tag of tags) {
      if (tag === "heavy-hinge") continue; // routing-only
      week1Actual[tag] = (week1Actual[tag] ?? 0) + totalWeekSets;
    }
  }

  // 3. Week 2 target per muscle.
  const week2Target = {} as Record<MuscleTag, number>;
  for (const tag of Object.keys(MUSCLE_MASS_WEIGHT) as MuscleTag[]) {
    const weekly = weeklyTarget[tag];
    const biweeklyBudget = weekly * 2;
    const floor = Math.ceil(weekly * DELOAD_FLOOR_MULTIPLIER);
    const target = Math.max(floor, biweeklyBudget - (week1Actual[tag] ?? 0));
    week2Target[tag] = target;
  }

  // 4. For each item in Week 2, compute sets-per-session via the
  // "ceil(target / total instances for tag)" share, max across tags.
  // Total instances for tag M in Week 2 = sum across items hitting M.
  const week2TotalInstancesForTag = {} as Record<MuscleTag, number>;
  for (const tag of Object.keys(MUSCLE_MASS_WEIGHT) as MuscleTag[]) {
    week2TotalInstancesForTag[tag] = 0;
  }
  for (const item of routine) {
    const inst = w2Inst[item.id] ?? 0;
    if (inst === 0) continue;
    const tags = tagsById.get(item.id) ?? [];
    for (const tag of tags) {
      if (tag === "heavy-hinge") continue;
      week2TotalInstancesForTag[tag] = (week2TotalInstancesForTag[tag] ?? 0) + inst;
    }
  }

  const week2ExerciseSets: Record<string, SetDetail[]> = {};
  for (const item of routine) {
    const inst = w2Inst[item.id] ?? 0;
    if (inst === 0) continue;
    const tags = (tagsById.get(item.id) ?? []).filter((t) => t !== "heavy-hinge");
    if (tags.length === 0) continue;

    let maxNeed = 1;
    for (const tag of tags) {
      const totalInst = week2TotalInstancesForTag[tag];
      if (!totalInst) continue;
      const need = Math.ceil(week2Target[tag] / totalInst);
      if (need > maxNeed) maxNeed = need;
    }

    // Preserve Week 1's reps + weight; just adjust set count.
    const template = item.sets[0] ?? { reps: 10, weight: 0 };
    week2ExerciseSets[item.id] = Array.from({ length: maxNeed }, () => ({
      reps: template.reps,
      weight: template.weight,
    }));
  }

  // 5. Build per-muscle diagnostic.
  const perMuscle = {} as LoadDeloadResult["perMuscle"];
  for (const tag of Object.keys(MUSCLE_MASS_WEIGHT) as MuscleTag[]) {
    if (tag === "heavy-hinge") continue;
    const weekly = weeklyTarget[tag];
    const w1 = week1Actual[tag] ?? 0;
    const w2 = week2Target[tag];
    // Direction: how Week 2 compares to the muscle's WEEKLY target.
    let direction: "load" | "deload" | "match" = "match";
    if (w2 > weekly * 1.1) direction = "load";
    else if (w2 < weekly * 0.9) direction = "deload";
    perMuscle[tag] = { weeklyTarget: weekly, week1Actual: w1, week2Target: w2, direction };
  }

  return { week2ExerciseSets, perMuscle };
}
