/**
 * Auto-recommend sets, reps, and rest for a routine item.
 *
 * Used when the user clicks "Auto-fill sets & reps" in the SplitBuilder.
 * Defaults follow Israetel / Nippard hypertrophy guidance, scaled by the
 * user's experience profile:
 *
 *   • Beginner — fewer sets, mid reps, RIR on the safer side (3+ compound,
 *     1–2 isolation). The skill of training comes before maximum stimulus.
 *   • Foot-in-the-door — Nippard / Israetel mid-band: 3 sets, 1–2 RIR
 *     compound / 0 RIR isolation.
 *   • Experienced — upper-edge volume with the same RIR band.
 *
 * Calves and core ranges pin to higher reps regardless of experience —
 * those movers need more reps for an effective stimulus.
 *
 * Weight defaults to 0 — user fills in their actual training weight.
 */
import type { RoutineItem, SetDetail } from "@/contexts/WorkoutContext";
import { getExperience, type ExperienceId, type ExperienceProfile } from "@/lib/experience";

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
  /** RIR target for this set type. */
  rirLabel: string;
}

/** Default to mid-band (foot-in-the-door) when the user hasn't picked yet. */
function resolveExperience(id: ExperienceId | null | undefined): ExperienceProfile {
  return getExperience(id) ?? getExperience("foot-in-door")!;
}

export function recommendSetsForItem(
  item: RoutineItem,
  experienceId?: ExperienceId | null,
): SetRecommendation {
  const exp = resolveExperience(experienceId);
  const isCompound = item.category === "systemic";
  const isCalves = CALVES_NAME_PATTERN.test(item.exercise);
  const isCore = CORE_ISOLATION_PATTERN.test(item.exercise);

  if (isCompound) {
    return {
      numSets: exp.setsPerExercise.compound,
      defaultReps: exp.repsCompound,
      defaultWeight: 0,
      repRangeLabel: "6–10",
      restSeconds: 150,
      rirLabel: exp.rir.compound,
    };
  }
  if (isCalves) {
    return {
      numSets: exp.setsPerExercise.isolation,
      defaultReps: 15,
      defaultWeight: 0,
      repRangeLabel: "12–20",
      restSeconds: 60,
      rirLabel: exp.rir.isolation,
    };
  }
  if (isCore) {
    return {
      numSets: exp.setsPerExercise.isolation,
      defaultReps: 15,
      defaultWeight: 0,
      repRangeLabel: "12–25",
      restSeconds: 60,
      rirLabel: exp.rir.isolation,
    };
  }
  // Default: regional / isolation
  return {
    numSets: exp.setsPerExercise.isolation,
    defaultReps: exp.repsIsolation,
    defaultWeight: 0,
    repRangeLabel: "8–15",
    restSeconds: 75,
    rirLabel: exp.rir.isolation,
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
export function autoRecommendSets(item: RoutineItem, experienceId?: ExperienceId | null): SetDetail[] {
  return buildSetsFromRecommendation(recommendSetsForItem(item, experienceId));
}
