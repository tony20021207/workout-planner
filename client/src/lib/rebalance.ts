/**
 * Week-2 rebalance — P9.3.2.
 *
 * Takes the user's Week-1 day assignments and produces a Week-2 layout
 * that hits the same muscles with different stimulus distribution. Two
 * transformations applied in order:
 *
 *  1. Mirrored day-pair swap. UL4 has Upper 1 / Upper 2 — these mirror
 *     each other. PPL6 has Push 1 / Push 2 and Pull 1 / Pull 2. Swap
 *     their contents so the user trains a given exercise on the
 *     opposite session of the week. (Why: a chest exercise on Monday
 *     vs. Thursday creates different fatigue interaction with adjacent
 *     leg / pull days, breaks the rote pattern, and reseeds order
 *     effects for hypertrophy adaptation.)
 *
 *  2. Leg-day hard-binary pivot. Splits that ship both a "Lower"
 *     (volume-only, no heavy hinge) and a "Leg Day" (heavy-hinge
 *     allowed) get a content pivot: Week 2 puts ALL squat-pattern
 *     exercises on the volume-only Lower day and ALL hinge-pattern
 *     exercises on the Leg Day. Week 1 typically gets these mixed
 *     because Opti-split balances per-day volume across both days;
 *     Week 2 pivots to pure-bias days for variety + recovery
 *     differentiation. (Why hard binary not soft ratio: user chose hard
 *     binary in P9.3.2 design call — cleaner mental model, recovery
 *     differentiation between days is more pronounced.)
 *
 *  Splits NOT affected by transformation #2: FB3 (its day structure
 *  already separates push/quad from pull/hinge by design), Bro5 (one
 *  leg day, nothing to pivot).
 */
import type { RoutineItem } from "@/contexts/WorkoutContext";
import {
  getMuscleTagsForItem,
  SPLIT_PRESETS,
  type MuscleTag,
  type SplitId,
} from "./splitPresets";

type DayAssignments = Record<string, string[]>;

/** dayId pairs whose contents swap in Week 2. */
const MIRROR_PAIRS: Partial<Record<SplitId, Array<[string, string]>>> = {
  ul4: [["ul-u1", "ul-u2"]],
  ppl6: [
    ["ppl-p1", "ppl-p2"],
    ["ppl-pl1", "ppl-pl2"],
  ],
};

/** dayId pair [volumeOnly, heavyHinge] for leg-day pivot. */
const LEG_PIVOT_DAYS: Partial<Record<SplitId, { volumeOnly: string; heavyHinge: string }>> = {
  ul4: { volumeOnly: "ul-l1", heavyHinge: "ul-leg" },
  ppl6: { volumeOnly: "ppl-lower", heavyHinge: "ppl-leg" },
  ulppl5: { volumeOnly: "ulppl-l1", heavyHinge: "ulppl-legs" },
};

/**
 * Classify an exercise as hinge-pattern (goes to Leg Day on Week 2).
 * Anything that loads the posterior chain via hip extension or knee
 * flexion under load. Includes heavy hinges (deadlift / good morning),
 * RDLs, hip thrusts, glute bridges, pull-throughs, leg curls,
 * back extensions, nordic curls.
 */
function isHingePattern(item: RoutineItem, tags: MuscleTag[]): boolean {
  if (tags.includes("heavy-hinge")) return true;
  const name = item.exercise.toLowerCase();
  if (
    /hip thrust|glute bridge|romanian|stiff[- ]leg|pull[- ]through|nordic curl|hip extension|back extension|leg curl|good morning|jefferson curl|deadlift/.test(
      name,
    )
  ) {
    return true;
  }
  // Hamstring-dominant exercises with no quad involvement.
  if (tags.includes("hams") && !tags.includes("quads")) return true;
  return false;
}

/**
 * Classify an exercise as squat-pattern (goes to volume-only Lower on
 * Week 2). Quad-dominant + knee-extension dominant patterns.
 */
function isSquatPattern(item: RoutineItem, tags: MuscleTag[]): boolean {
  if (tags.includes("quads")) return true;
  const name = item.exercise.toLowerCase();
  if (/squat|lunge|step[- ]up|leg press|leg extension|sissy/.test(name)) return true;
  return false;
}

/**
 * Produce Week 2 day assignments from Week 1. Pure function — does not
 * mutate input. Returns a fresh DayAssignments object.
 */
export function rebalanceForWeek2(
  routine: RoutineItem[],
  splitId: SplitId,
  week1: DayAssignments,
): DayAssignments {
  if (splitId === "custom") {
    // Custom splits don't have known day ids; nothing to pivot. Just clone.
    return JSON.parse(JSON.stringify(week1)) as DayAssignments;
  }
  const preset = SPLIT_PRESETS[splitId];
  if (!preset) return JSON.parse(JSON.stringify(week1)) as DayAssignments;

  // Start from a deep clone of Week 1.
  const week2: DayAssignments = {};
  for (const day of preset.days) {
    week2[day.id] = [...(week1[day.id] ?? [])];
  }

  // --- Pass 1: mirrored day-pair swap ---
  const pairs = MIRROR_PAIRS[splitId] ?? [];
  for (const [a, b] of pairs) {
    const tmp = week2[a] ?? [];
    week2[a] = week2[b] ?? [];
    week2[b] = tmp;
  }

  // --- Pass 2: leg-day hard-binary pivot ---
  const pivot = LEG_PIVOT_DAYS[splitId];
  if (pivot) {
    const itemsById = new Map(routine.map((r) => [r.id, r]));
    // Gather all exercise ids currently on either leg-flavor day.
    const pooled = [
      ...(week2[pivot.volumeOnly] ?? []),
      ...(week2[pivot.heavyHinge] ?? []),
    ];

    const squats: string[] = [];
    const hinges: string[] = [];
    const other: string[] = []; // calves / core / abductor isolation

    for (const id of pooled) {
      const item = itemsById.get(id);
      if (!item) continue;
      const tags = getMuscleTagsForItem(item);
      if (isHingePattern(item, tags)) hinges.push(id);
      else if (isSquatPattern(item, tags)) squats.push(id);
      else other.push(id);
    }

    // Split "other" (calves / core / etc) evenly between the two days so
    // neither becomes a one-trick day.
    const otherForVolume = other.filter((_, i) => i % 2 === 0);
    const otherForLeg = other.filter((_, i) => i % 2 === 1);

    week2[pivot.volumeOnly] = [...squats, ...otherForVolume];
    week2[pivot.heavyHinge] = [...hinges, ...otherForLeg];
  }

  return week2;
}
