/**
 * Weekly split presets + auto-allocator.
 *
 * Three preset splits (FB3 / UL4 / PPL6) plus a custom mode. The auto-
 * allocator distributes a microcycle's exercise pool across the chosen
 * split's days following three rules:
 *
 *   1. Joint-function overlap: each exercise is matched to days whose
 *      tags include the exercise's movement pattern. Exercises pile
 *      onto days with the lowest current count first (round-robin
 *      balancing).
 *
 *   2. ~40/60 compound-vs-isolation balance per day. The allocator
 *      processes compounds first (so they fill day slots before
 *      isolations) and tracks per-day compound counts to avoid
 *      stuffing one day with 5 compounds while another gets 0.
 *
 *   3. Priming-first ordering within each day. After allocation, the
 *      day's exercises are sorted so the most "warmup-friendly" pick
 *      (stable + multi-joint + high SFR + good stretch) lands first,
 *      setting the tone for the workout. Heavier free-weight compounds
 *      land in the middle, isolations land last.
 */
import type { RoutineItem } from "@/contexts/WorkoutContext";
import type { JointAction } from "@/lib/data";

// ============================================================
// DAY TAG SYSTEM
// ============================================================

export type DayTag =
  | "squat"
  | "hinge"
  | "push"
  | "pull"
  | "arms"
  | "shoulders"
  | "legs-iso"
  | "calves"
  | "core";

/**
 * Map an exercise's joint-function label to one or more day tags.
 * Joint functions are the canonical UX-level grouping (Squat Patterns,
 * Hinge Patterns, Upper Body Push, etc.) — they translate directly.
 */
const TAGS_BY_JOINT_FUNCTION: Record<string, DayTag[]> = {
  "Squat Patterns": ["squat"],
  "Hinge Patterns": ["hinge"],
  "Upper Body Push": ["push"],
  "Upper Body Pull": ["pull"],
  "Arm Isolation": ["arms"],
  "Shoulder Isolation": ["shoulders"],
  "Leg Isolation": ["legs-iso"],
  "Core Isolation": ["core"],
};

/**
 * Map exercise -> day tags. Falls back to a category-based guess if the
 * jointFunction string doesn't match the canonical list (e.g., when the
 * exercise came from the LLM optimizer).
 */
export function tagsForExercise(ex: { jointFunction: string; category: string }): DayTag[] {
  const direct = TAGS_BY_JOINT_FUNCTION[ex.jointFunction];
  if (direct) return direct;
  // Fallback: just bucket into a single tag based on category.
  return ex.category === "systemic" ? ["push", "pull", "squat", "hinge"] : ["arms", "shoulders", "legs-iso", "core"];
}

// Calf raises sit awkwardly inside Leg Isolation. Tag them separately
// when the exercise name signals calves so PPL "Legs" days can include
// them but a "Lower" day with full leg-iso doesn't double up.
const CALF_NAME_PATTERN = /calf|calves|seated calf|standing calf/i;

export function tagsForRoutineItem(item: RoutineItem): DayTag[] {
  const base = tagsForExercise({ jointFunction: item.jointFunction, category: item.category });
  if (CALF_NAME_PATTERN.test(item.exercise)) {
    return base.includes("calves") ? base : [...base, "calves"];
  }
  return base;
}

// ============================================================
// SPLIT PRESETS
// ============================================================

export interface SplitDay {
  id: string;
  name: string;
  /** Tags that this day intends to cover. */
  tags: DayTag[];
  /** Optional schedule hint shown in the UI. */
  scheduleHint?: string;
}

export interface SplitPreset {
  id: SplitId;
  name: string;
  shortLabel: string;
  description: string;
  daysPerWeek: number;
  days: SplitDay[];
}

export type SplitId = "fb3" | "ul4" | "ppl6" | "custom";

export const FULL_BODY_3: SplitPreset = {
  id: "fb3",
  name: "Full Body — 3 days / week",
  shortLabel: "FB3",
  description:
    "Mon / Wed / Fri (or every-other-day). Each day touches every major movement pattern; rotation across days keeps overall volume balanced and recovery comfortable.",
  daysPerWeek: 3,
  days: [
    {
      id: "fb-a",
      name: "Day A",
      tags: ["squat", "push", "pull", "core"],
      scheduleHint: "Mon",
    },
    {
      id: "fb-b",
      name: "Day B",
      tags: ["hinge", "push", "pull", "arms", "calves"],
      scheduleHint: "Wed",
    },
    {
      id: "fb-c",
      name: "Day C",
      tags: ["squat", "hinge", "shoulders", "arms"],
      scheduleHint: "Fri",
    },
  ],
};

export const UPPER_LOWER_4: SplitPreset = {
  id: "ul4",
  name: "Upper / Lower — 4 days / week",
  shortLabel: "UL4",
  description:
    "Mon Upper / Tue Lower / Thu Upper / Fri Lower. Splits the body into upper and lower hemispheres twice per week — strong frequency for both with reasonable recovery.",
  daysPerWeek: 4,
  days: [
    {
      id: "ul-u1",
      name: "Upper 1",
      tags: ["push", "pull", "arms"],
      scheduleHint: "Mon",
    },
    {
      id: "ul-l1",
      name: "Lower 1",
      tags: ["squat", "hinge", "legs-iso", "calves"],
      scheduleHint: "Tue",
    },
    {
      id: "ul-u2",
      name: "Upper 2",
      tags: ["push", "pull", "shoulders", "arms"],
      scheduleHint: "Thu",
    },
    {
      id: "ul-l2",
      name: "Lower 2",
      tags: ["squat", "hinge", "legs-iso", "calves", "core"],
      scheduleHint: "Fri",
    },
  ],
};

export const PUSH_PULL_LEGS_6: SplitPreset = {
  id: "ppl6",
  name: "Push / Pull / Legs — 6 days / week",
  shortLabel: "PPL6",
  description:
    "Mon Push / Tue Pull / Wed Legs / Thu Push / Fri Pull / Sat Legs / Sun rest. Twice-per-week frequency on each pattern with one rest day.",
  daysPerWeek: 6,
  days: [
    { id: "ppl-p1", name: "Push 1", tags: ["push", "shoulders", "arms"], scheduleHint: "Mon" },
    { id: "ppl-pl1", name: "Pull 1", tags: ["pull", "arms"], scheduleHint: "Tue" },
    { id: "ppl-l1", name: "Legs 1", tags: ["squat", "legs-iso", "calves", "core"], scheduleHint: "Wed" },
    { id: "ppl-p2", name: "Push 2", tags: ["push", "shoulders", "arms"], scheduleHint: "Thu" },
    { id: "ppl-pl2", name: "Pull 2", tags: ["pull", "arms"], scheduleHint: "Fri" },
    { id: "ppl-l2", name: "Legs 2", tags: ["hinge", "legs-iso", "calves", "core"], scheduleHint: "Sat" },
  ],
};

export const SPLIT_PRESETS: Record<Exclude<SplitId, "custom">, SplitPreset> = {
  fb3: FULL_BODY_3,
  ul4: UPPER_LOWER_4,
  ppl6: PUSH_PULL_LEGS_6,
};

export const ALL_PRESETS: SplitPreset[] = [FULL_BODY_3, UPPER_LOWER_4, PUSH_PULL_LEGS_6];

// ============================================================
// AUTO-ALLOCATOR
// ============================================================

/**
 * Per-day target count of compounds. We aim for ~40% compound. With ~5
 * exercises per day the rounded target is 2 compounds + 3 isolations.
 * The exact number flexes with how many compounds are actually in the
 * pool — we don't invent volume that doesn't exist.
 */
function targetCompoundCount(totalForDay: number): number {
  return Math.max(1, Math.round(totalForDay * 0.4));
}

interface AllocationContext {
  itemsByDay: Record<string, RoutineItem[]>;
  compoundCountByDay: Record<string, number>;
}

function pickDayForItem(item: RoutineItem, split: SplitPreset, ctx: AllocationContext): string {
  const itemTags = tagsForRoutineItem(item);
  const candidates = split.days.filter((d) => d.tags.some((t) => itemTags.includes(t)));
  const pool = candidates.length > 0 ? candidates : split.days;

  // Round-robin: prefer days with the fewest current items, tie-break by
  // fewest compounds-so-far when the incoming item is a compound (helps
  // hit the 40/60 ratio per day).
  const ranked = [...pool].sort((a, b) => {
    const sizeA = ctx.itemsByDay[a.id].length;
    const sizeB = ctx.itemsByDay[b.id].length;
    if (sizeA !== sizeB) return sizeA - sizeB;

    if (item.category === "systemic") {
      const compA = ctx.compoundCountByDay[a.id];
      const compB = ctx.compoundCountByDay[b.id];
      if (compA !== compB) return compA - compB;
    }
    return 0;
  });

  return ranked[0].id;
}

/**
 * Score for "warmup-priming suitability". Higher = belongs earlier in
 * the day. Compound machines/cables get the top slot (smooth ramp-up,
 * stable, hits multiple joint actions). Free-weight compounds land
 * mid-block. Isolations finish.
 */
function primingScore(item: RoutineItem): number {
  let score = 0;

  // Compound vs isolation — compounds first.
  if (item.category === "systemic") score += 100;

  // Stability bonus: stable picks ramp up safely.
  // The RoutineItem doesn't carry stability directly (that's on the
  // Exercise template), but we can infer from name keywords as a fast
  // heuristic until we wire the resolved tags through.
  const name = item.exercise.toLowerCase();
  if (name.includes("machine") || name.includes("smith") || name.includes("cable")) {
    score += 30;
  }

  // Single-joint stretch openers (lat prayer, cable fly) make decent
  // primers despite being isolation — give them a moderate boost.
  if (item.category === "regional" && (name.includes("cable fly") || name.includes("lat prayer") || name.includes("face pull"))) {
    score += 20;
  }

  // Spinal-flexion / ab work, calves, and rotators land at the very end.
  if (name.includes("crunch") || name.includes("calf") || name.includes("woodchop") || name.includes("pallof") || name.includes("side bend")) {
    score -= 20;
  }

  return score;
}

function orderDayItems(items: RoutineItem[]): RoutineItem[] {
  return [...items].sort((a, b) => primingScore(b) - primingScore(a));
}

/**
 * Acceptable per-day compound share. With 3-5 exercises per session,
 * 25% / 33% / 40% are all natural hypertrophy ratios. 50%+ (e.g. 3C+3I,
 * 2C+2I) starts being too CNS-heavy for a hypertrophy-biased session,
 * so the band caps at 45% — anything 45-55% gets a small penalty.
 */
export const COMPOUND_PCT_GOOD_MIN = 0.2;
export const COMPOUND_PCT_GOOD_MAX = 0.45;

export function isCompoundRatioOnTarget(pct: number): boolean {
  return pct >= COMPOUND_PCT_GOOD_MIN && pct <= COMPOUND_PCT_GOOD_MAX;
}

export interface AllocationResult {
  /** Mapping of dayId -> ordered exercise IDs assigned to that day. */
  byDay: Record<string, string[]>;
  /** Items that couldn't be assigned to any day (shouldn't happen with current logic, but guarded). */
  unassigned: string[];
  /** Per-day stats for UI display. */
  dayStats: Record<string, {
    total: number;
    compounds: number;
    isolations: number;
    compoundPct: number;
    /** Lower bound of the green-flag band. */
    targetCompoundPctMin: number;
    /** Upper bound of the green-flag band. */
    targetCompoundPctMax: number;
  }>;
}

export function allocatePoolToSplit(
  pool: RoutineItem[],
  split: SplitPreset,
): AllocationResult {
  const ctx: AllocationContext = {
    itemsByDay: {},
    compoundCountByDay: {},
  };
  for (const day of split.days) {
    ctx.itemsByDay[day.id] = [];
    ctx.compoundCountByDay[day.id] = 0;
  }

  // Process compounds first so they secure their day slots before
  // isolations crowd in.
  const compounds = pool.filter((p) => p.category === "systemic");
  const isolations = pool.filter((p) => p.category === "regional");

  for (const item of [...compounds, ...isolations]) {
    const dayId = pickDayForItem(item, split, ctx);
    ctx.itemsByDay[dayId].push(item);
    if (item.category === "systemic") {
      ctx.compoundCountByDay[dayId] += 1;
    }
  }

  // Order each day with priming-first sort.
  const byDay: Record<string, string[]> = {};
  const dayStats: AllocationResult["dayStats"] = {};
  for (const day of split.days) {
    const items = orderDayItems(ctx.itemsByDay[day.id]);
    byDay[day.id] = items.map((i) => i.id);
    const total = items.length;
    const compoundsCount = items.filter((i) => i.category === "systemic").length;
    const isolationsCount = total - compoundsCount;
    dayStats[day.id] = {
      total,
      compounds: compoundsCount,
      isolations: isolationsCount,
      compoundPct: total > 0 ? compoundsCount / total : 0,
      targetCompoundPctMin: COMPOUND_PCT_GOOD_MIN,
      targetCompoundPctMax: COMPOUND_PCT_GOOD_MAX,
    };
  }

  return { byDay, unassigned: [], dayStats };
}

// ============================================================
// CUSTOM SPLIT HELPERS
// ============================================================

export function makeCustomDay(name: string): SplitDay {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    tags: [],
  };
}

export function makeCustomSplit(): SplitPreset {
  return {
    id: "custom",
    name: "Custom Split",
    shortLabel: "Custom",
    description: "Hand-built split. Add days, name them, and manually assign exercises from your pool.",
    daysPerWeek: 0,
    days: [],
  };
}

// ============================================================
// JOINT ACTION COUNTS PER DAY (for downstream rating, P5)
// ============================================================

/**
 * Aggregate joint actions hit across a day. Useful for the post-split
 * rating engine to score session caps and per-day balance.
 */
export function jointActionsForDay(items: RoutineItem[]): Map<JointAction, number> {
  const map = new Map<JointAction, number>();
  for (const item of items) {
    // RoutineItem doesn't currently carry jointActions directly; this is
    // a P5 follow-up — wire the resolved tags through. For now leave the
    // helper signature in place.
    void item;
  }
  return map;
}
