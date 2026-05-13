/**
 * Calves + Abs finisher engine.
 *
 * Philosophy: calves (slow-twitch, small mass) and rectus abdominis
 * (small mass, frequency-tolerant) grow best with high frequency at
 * lower magnitude per session — train them a little bit every day
 * rather than concentrating volume in 1-2 dedicated sessions.
 *
 * The finisher frequency dropdown on SplitBuilder lets the user set
 * an explicit per-week day count for either muscle. When set:
 *
 *   - The allocator's default mass-weighted volume math is BYPASSED
 *     for that muscle.
 *   - Each day in the user's split gets the experience-profile's
 *     default isolation set count (2 / 3 / 4 for beg / FID / exp).
 *   - The finisher exercise(s) come from the user's existing routine.
 *     0 in routine -> caller pops the modal picker (UI concern).
 *     1 in routine -> that single exercise fills all N slots.
 *     2+ in routine -> exercises rotate evenly across the N days.
 *
 * Abs = STRICTLY rectus abdominis (catalog subcategories upper-rectus,
 * lower-rectus). Obliques are tracked separately as a minor bonus
 * muscle and not part of the abs finisher.
 *
 * This same applyFinisherToAllocation function will later power the
 * Check-in page's day-of "add finisher to today" / "drop finisher
 * today" buttons (instance-level overrides). The split-level dropdown
 * just calls it across the whole week.
 */
import { categories, type Difficulty, type StretchLevel, type StimulusLevel } from "./data";
import type { RoutineItem } from "@/contexts/WorkoutContext";
import type { SplitPreset } from "./splitPresets";
import type { ExperienceProfile } from "./experience";

// ============================================================
// SUBCATEGORY DETECTION (which catalog exercises count as finisher fodder)
// ============================================================

const CALF_SUBCATEGORIES = new Set(["calves"]);
const RECTUS_SUBCATEGORIES = new Set(["upper-rectus", "lower-rectus"]);

let _calfExerciseNames: Set<string> | null = null;
let _rectusExerciseNames: Set<string> | null = null;

function buildSubcatIndexes() {
  if (_calfExerciseNames && _rectusExerciseNames) return;
  _calfExerciseNames = new Set();
  _rectusExerciseNames = new Set();
  for (const c of categories) {
    for (const jf of c.jointFunctions) {
      for (const sub of jf.subcategories) {
        const targetSet = CALF_SUBCATEGORIES.has(sub.id)
          ? _calfExerciseNames
          : RECTUS_SUBCATEGORIES.has(sub.id)
            ? _rectusExerciseNames
            : null;
        if (!targetSet) continue;
        for (const ex of sub.exercises) targetSet.add(ex.name);
      }
    }
  }
}

export function isCalfExercise(exerciseName: string): boolean {
  buildSubcatIndexes();
  return _calfExerciseNames!.has(exerciseName);
}
export function isRectusAbsExercise(exerciseName: string): boolean {
  buildSubcatIndexes();
  return _rectusExerciseNames!.has(exerciseName);
}

/**
 * Catalog entry the modal picker uses to construct a RoutineItem when
 * the user picks a finisher exercise from the picker. Carries enough
 * fields for both the rendering (name, description) and for building
 * the eventual RoutineItem (jointFunction, category, etc.).
 */
export interface FinisherCatalogPick {
  name: string;
  description: string;
  category: "systemic" | "regional";
  jointFunction: string;
  targetedMuscles: string[];
  difficulty: Difficulty;
  stretchLevel: StretchLevel;
  stability: StimulusLevel;
}

function gatherPicks(subcatPredicate: (subId: string) => boolean): FinisherCatalogPick[] {
  const out: FinisherCatalogPick[] = [];
  for (const c of categories) {
    for (const jf of c.jointFunctions) {
      for (const sub of jf.subcategories) {
        if (!subcatPredicate(sub.id)) continue;
        for (const ex of sub.exercises) {
          out.push({
            name: ex.name,
            description: ex.description,
            category: ex.compound ? "systemic" : "regional",
            jointFunction: jf.name,
            targetedMuscles: ex.targetedMuscles,
            difficulty: ex.difficulty,
            stretchLevel: ex.stretchLevel,
            stability: ex.stability,
          });
        }
      }
    }
  }
  return out;
}

export function getCalfCatalogPicks(): FinisherCatalogPick[] {
  return gatherPicks((id) => CALF_SUBCATEGORIES.has(id));
}
export function getRectusAbsCatalogPicks(): FinisherCatalogPick[] {
  return gatherPicks((id) => RECTUS_SUBCATEGORIES.has(id));
}

// ============================================================
// FINISHER APPLICATION
// ============================================================

export type FinisherKind = "calves" | "abs";

/**
 * Apply a single finisher (calves OR abs) to a day-assignments map.
 * Pure function — returns a NEW byDay map; does not mutate input.
 *
 * Procedure:
 *   1. Identify the routine items matching this finisher kind
 *      (calves -> isCalfExercise; abs -> isRectusAbsExercise).
 *   2. Strip ALL existing instances of those items from byDay.
 *   3. Pick N target days that accept the relevant muscle tag
 *      ("calves" for calves; "core" for abs).
 *   4. Distribute the finisher exercises across those days, rotating
 *      if 2+ exercises are available.
 *
 * If frequency is null / 0, this is a no-op (returns input cloned).
 * If frequency exceeds the split's daysPerWeek, it's capped.
 * If no matching routine items exist, returns input cloned (caller
 * should have opened the modal picker first).
 */
export function applyFinisherToAllocation(
  byDay: Record<string, string[]>,
  routine: RoutineItem[],
  split: SplitPreset,
  kind: FinisherKind,
  frequency: number | null,
): Record<string, string[]> {
  // Deep-clone input so we never mutate.
  const next: Record<string, string[]> = {};
  for (const day of split.days) next[day.id] = [...(byDay[day.id] ?? [])];

  if (frequency == null || frequency <= 0) return next;

  // Find the finisher exercises in the routine.
  const predicate = kind === "calves" ? isCalfExercise : isRectusAbsExercise;
  const finisherItems = routine.filter((r) => predicate(r.exercise));
  if (finisherItems.length === 0) return next;

  // Eligible days for this finisher kind. Calves -> any day with
  // "calves" tag. Abs -> any day with "core" tag.
  const tag = kind === "calves" ? "calves" : "core";
  const eligibleDays = split.days.filter((d) =>
    (d.tags as readonly string[]).includes(tag),
  );
  if (eligibleDays.length === 0) return next;

  // Cap frequency to eligible day count.
  const N = Math.min(frequency, eligibleDays.length);

  // Strip existing instances of finisher exercises from ALL days.
  const finisherIds = new Set(finisherItems.map((i) => i.id));
  for (const dayId of Object.keys(next)) {
    next[dayId] = next[dayId].filter((id) => !finisherIds.has(id));
  }

  // Distribute N slots across N eligible days. Rotate through the
  // available finisher exercises so each one gets ~equal time when
  // the user has 2+ in their routine.
  const orderedDays = pickEvenlySpacedDays(eligibleDays, N);
  orderedDays.forEach((day, i) => {
    const ex = finisherItems[i % finisherItems.length];
    next[day.id] = [...next[day.id], ex.id];
  });

  return next;
}

/**
 * Spread N picks evenly across the available eligible days. E.g.,
 * if there are 6 eligible days and N=3, pick days 0, 2, 4 (every other).
 * Avoids back-loading the finisher onto consecutive days.
 */
function pickEvenlySpacedDays<T>(days: T[], n: number): T[] {
  if (n >= days.length) return [...days];
  const out: T[] = [];
  const step = days.length / n;
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(i * step);
    out.push(days[idx]);
  }
  return out;
}

/**
 * Per-day sets count for a finisher exercise — driven entirely by
 * the experience profile's isolation setsPerExercise (2 / 3 / 4).
 * Bypasses the mass-weighted weekly volume math by design.
 */
export function finisherSetsPerSession(exp: ExperienceProfile): number {
  return exp.setsPerExercise.isolation;
}
