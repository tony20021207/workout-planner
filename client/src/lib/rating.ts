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

/**
 * Pair-based recommendations — left-to-right diff against the user's
 * current pool. One pair per current exercise (keep / swap / remove)
 * plus any number of 'add' pairs for coverage gaps.
 */
export type RecommendationAction = "keep" | "swap" | "remove" | "add";

export interface RecommendationPair {
  action: RecommendationAction;
  /** 1-based index of the current exercise in the routine; 0 for 'add'. */
  currentIndex: number;
  /** Current exercise name. Empty string for 'add'. */
  current: string;
  /** Recommended exercise name. Same as current for 'keep'. Empty for 'remove'. */
  recommended: string;
  /** Category of the recommended exercise (or current for keep/remove). */
  category: CategoryType;
  /** Targeted muscles of the recommended exercise (needed for swap / add to build a RoutineItem). */
  targetedMuscles?: string[];
  /** One-sentence per-pair rationale naming the rating criterion driving the change. */
  rationale: string;
}

export interface Recommendations {
  pairs: RecommendationPair[];
  /** 3-5 sentence mesocycle summary. */
  globalRationale: string;
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
  recommendations: Recommendations;
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
 * Convert the user's current routine into a plaintext description for the
 * pool-stage rating + recommendations. Sets / reps / weight / RIR /
 * frequency / rest are DELIBERATELY omitted — at this stage the user is
 * evaluating EXERCISE SELECTION (stability, stretch, SFR, compound
 * balance, joint-action coverage), not programming detail. Sets/reps
 * get filled in later, after the split is built.
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
    lines.push(`   Difficulty: ${item.difficulty}`);
    lines.push("");
  });
  return lines.join("\n");
}

/**
 * Convert a swap or add RecommendationPair into a RoutineItem. Used by
 * WorkoutRater when applying an accepted recommendation. Sets[] is
 * intentionally empty — the user fills sets/reps via Opti-fill or
 * Pre-Set after the diff is applied.
 */
export function pairToRoutineItem(pair: RecommendationPair): RoutineItem {
  const targetedMuscles = pair.targetedMuscles ?? [];
  return {
    id: generateId(),
    exercise: pair.recommended,
    // jointFunction is best-effort — the recommendations API doesn't
    // carry it. Use the primary targeted muscle as a stand-in so
    // existing matchers (heavy-hinge cleanup, Upper Body Pull strip)
    // still have something reasonable to read.
    jointFunction: targetedMuscles[0] || "Custom",
    category: pair.category,
    parameters: {
      sets: "3 sets",
      reps: pair.category === "systemic" ? "8-12 reps" : "12-15 reps",
      frequency: "2x per week",
      rest: pair.category === "systemic" ? "2–3 minutes" : "60–90 seconds",
      intensity: pair.category === "systemic" ? "1-2 RIR" : "0 RIR",
      rationale: pair.rationale,
    },
    sets: [],
    difficulty: "medium",
    targetedMuscles,
  };
}
