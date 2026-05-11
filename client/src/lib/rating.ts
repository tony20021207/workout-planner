/**
 * Hypertrophy Matrix Rating — types & helpers.
 * Converts between RoutineItem and the LLM's optimized-routine format,
 * and serializes the current routine to a text the LLM can read.
 */
import type { RoutineItem } from "@/contexts/WorkoutContext";
import { type CategoryType, generateId } from "@/lib/data";

export interface BreakdownEntry {
  score: number;
  notes: string;
}

export interface SelectionBreakdown {
  stability: BreakdownEntry;
  stretch: BreakdownEntry;
  sfr: BreakdownEntry;
  /** Compound-vs-isolation ratio (20-45% band). */
  compoundIsolationRatio: BreakdownEntry;
}

export interface CoverageBreakdown {
  /** Pool stage: 0-20. Post-split: 0-14. MAJORS only — 22 major actions. */
  score: number;
  hit: string[];
  missing: string[];
  notes: string;
  /** 1-4 cueing tips for under-trained MAJOR joint actions, each tied to a specific exercise the user already has. Empty if every major action is at full credit. */
  cueingTips: string[];
}

export interface MinorBonus {
  /** Pool stage: 0 to 1.5 (5 minors × 0.30). Post-split: 0 to 1.05 (5 minors × 0.21). Added ON TOP of the 100, never deducted. */
  score: number;
  /** Minor joint actions covered directly across the week. */
  hit: string[];
  /** Minor joint actions not covered. */
  missing: string[];
  notes: string;
  /** 0-3 short opportunity tips for grabbing missed bonus points. */
  opportunityTips: string[];
}

/**
 * Favorite-driven bias correction — P9.3.5. "Harsh-parent" rule: the
 * user locks an exercise as favorite (immune from variant swap), and the
 * rating engine holds it to a higher standard, applying a -5..+5 delta
 * to the final score. Good favorites (fill coverage gap, anchor weak
 * mover) earn up to +5; bad favorites (redundant slot, force other
 * muscles undertrained) penalize up to -5. Reasoning text names each
 * favorite by exercise name and states its specific cost or benefit.
 */
export interface FavoriteBias {
  /** Integer in [-5, +5]. Included in the final 100-pt score. */
  delta: number;
  /** Names of favorites that materially improve this routine. */
  goodFavorites: string[];
  /** Names of favorites that materially hurt this routine. */
  badFavorites: string[];
  /** Per-favorite plaintext explanation. */
  reasoning: string;
}

export interface OptimizedExercise {
  exercise: string;
  angle?: string;
  equipment?: string;
  sets: number;
  repRange: string;
  rir: string;
  frequency?: string;
  category: CategoryType;
  targetedMuscles: string[];
  jointActions: string[];
  rationale: string;
}

export interface RatingResult {
  /** Final score, 0-100. Sum of all 5 criteria + favoriteBias.delta, capped 0..100. Does NOT include minorBonus. */
  score: number;
  verdict: string;
  selectionBreakdown: SelectionBreakdown;
  coverageBreakdown: CoverageBreakdown;
  minorBonus: MinorBonus;
  favoriteBias: FavoriteBias;
  /** Empty string if no pulldowns; otherwise the scap-depression cueing reminder. */
  scapularDepressionNote: string;
  optimizedRoutine: OptimizedExercise[];
}

// ============================================================
// POST-SPLIT RATING TYPES
// ============================================================

export interface PostSplitAddOns {
  sessionCaps: BreakdownEntry;
  repRangeDistribution: BreakdownEntry;
  totalVolume: BreakdownEntry;
}

export interface OptimizedDailyExercise {
  exercise: string;
  equipment?: string;
  angle?: string;
  sets: number;
  repRange: string;
  rir: string;
  category: CategoryType;
  rationale: string;
}

export interface OptimizedDay {
  dayName: string;
  exercises: OptimizedDailyExercise[];
}

export interface PostSplitRatingResult {
  /** Final score, 0-100. Sum of all 8 criteria + favoriteBias.delta, capped 0..100. Does NOT include minorBonus. */
  score: number;
  verdict: string;
  selectionBreakdown: SelectionBreakdown;
  coverageBreakdown: CoverageBreakdown;
  minorBonus: MinorBonus;
  postSplitAddOns: PostSplitAddOns;
  favoriteBias: FavoriteBias;
  scapularDepressionNote: string;
  optimizedDailyPlan: OptimizedDay[];
}

/**
 * Serialize a finalized week (split + dayAssignments + per-day sets/reps)
 * into a plaintext block the post-split rating prompt can read.
 */
export function serializeFinalizedWeekToText(
  routine: import("@/contexts/WorkoutContext").RoutineItem[],
  splitName: string,
  dayAssignments: Record<string, string[]>,
  daysMeta: { id: string; name: string; scheduleHint?: string }[],
): string {
  const itemsById = new Map(routine.map((r) => [r.id, r]));
  const lines: string[] = [];
  lines.push(`Split: ${splitName}`);
  lines.push(`Total exercises: ${routine.length}`);
  lines.push("");

  for (const day of daysMeta) {
    const ids = dayAssignments[day.id] ?? [];
    const items = ids.map((id) => itemsById.get(id)).filter(Boolean) as import("@/contexts/WorkoutContext").RoutineItem[];
    lines.push(`=== ${day.name}${day.scheduleHint ? ` (${day.scheduleHint})` : ""} — ${items.length} exercise${items.length === 1 ? "" : "s"} ===`);
    if (items.length === 0) {
      lines.push("  (no exercises assigned)");
    } else {
      items.forEach((item, idx) => {
        const name = [item.exercise, item.equipment ? `(${item.equipment})` : "", item.angle ? `[${item.angle}]` : ""].filter(Boolean).join(" ");
        lines.push(`  ${idx + 1}. ${name}`);
        lines.push(`     Tier: ${item.category === "systemic" ? "Tier 1 compound" : "Tier 2 isolation"}`);
        lines.push(`     Targets: ${item.targetedMuscles.join(", ")}`);
        const setSummary = item.sets.map((s, i) => `S${i + 1} ${s.reps}r@${s.weight}lb`).join(" ");
        lines.push(`     Sets (${item.sets.length}): ${setSummary}`);
      });
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Convert the user's current routine into a plaintext description for the LLM.
 */
export function serializeRoutineToText(routine: RoutineItem[]): string {
  if (routine.length === 0) return "(empty routine)";
  const lines: string[] = [];
  lines.push(`Total exercises: ${routine.length}`);
  lines.push("");
  routine.forEach((item, idx) => {
    const name = item.angle && !item.exercise.toLowerCase().includes(item.angle.toLowerCase())
      ? `${item.angle} ${item.exercise}`
      : item.exercise;
    lines.push(`${idx + 1}. ${name}`);
    lines.push(`   Joint function / pattern: ${item.jointFunction}`);
    lines.push(`   Category: ${item.category === "systemic" ? "Tier 1 Systemic / Multi-joint" : "Tier 2 Regional / Single-joint"}`);
    lines.push(`   Targeted muscles: ${item.targetedMuscles.join(", ")}`);
    if (item.equipment) lines.push(`   Equipment: ${item.equipment}`);
    if (item.angle) lines.push(`   Angle: ${item.angle}`);
    lines.push(`   Sets (${item.sets.length}): ${item.sets.map((s, i) => `S${i + 1} ${s.reps}reps@${s.weight}lbs`).join(" | ")}`);
    lines.push(`   Frequency: ${item.parameters.frequency}  Rest: ${item.parameters.rest}  Intensity: ${item.parameters.intensity}`);
    lines.push(`   Difficulty: ${item.difficulty}`);
    lines.push("");
  });
  return lines.join("\n");
}

/**
 * Convert an LLM-suggested OptimizedExercise into a RoutineItem ready for the routine.
 */
export function optimizedToRoutineItem(opt: OptimizedExercise): RoutineItem {
  const repsMatch = opt.repRange.match(/(\d+)/);
  const defaultReps = repsMatch ? parseInt(repsMatch[1], 10) : 10;
  const sets = Array.from({ length: Math.max(1, opt.sets) }, () => ({
    reps: defaultReps,
    weight: 0,
  }));

  const exerciseName = opt.angle && !opt.exercise.toLowerCase().includes(opt.angle.toLowerCase())
    ? `${opt.angle} ${opt.exercise}`
    : opt.exercise;

  return {
    id: generateId(),
    exercise: exerciseName,
    jointFunction: opt.targetedMuscles[0] || "Custom",
    category: opt.category,
    parameters: {
      sets: `${opt.sets} sets`,
      reps: `${opt.repRange} reps`,
      frequency: opt.frequency || "2x per week",
      rest: opt.category === "systemic" ? "2–3 minutes" : "60–90 seconds",
      intensity: opt.rir,
      rationale: opt.rationale,
    },
    sets,
    difficulty: "medium",
    targetedMuscles: opt.targetedMuscles,
    equipment: opt.equipment,
    angle: opt.angle,
  };
}
