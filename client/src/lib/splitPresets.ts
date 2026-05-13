/**
 * Weekly split presets + Opti-split engine.
 *
 * Five preset splits (FB3 / UL4 / PPL6 / Bro5 / UL+PPL5) plus a custom
 * mode. Opti-split distributes a microcycle's exercise pool across the
 * chosen split's days following these rules:
 *
 *   1. Muscle-group day-intent matching. Each day declares the major
 *      muscle groups it intends to cover (chest / back / shoulders /
 *      biceps / triceps / quads / glutes / hams / calves / core). An
 *      exercise can only land on a day whose tags overlap with the
 *      muscle groups the exercise trains. This kills the old upper-on-
 *      lower bug.
 *
 *   2. Same-exercise repetition. The auto-allocator will repeat an
 *      exercise across multiple days to hit weekly volume targets per
 *      major muscle group (12-20 sets/wk depending on experience). User-
 *      flagged favorite exercises get priority for repetition.
 *
 *   3. Per-day cap of 6 exercises. No day exceeds 6 picks.
 *
 *   4. FB3 bi/tri rotation. Full-body days alternate which arm group
 *      they emphasize so each gets meaningful volume across the week.
 *
 *   5. Priming-first ordering within each day. Stable compounds first,
 *      free-weight compounds mid, isolations last.
 */
import type { RoutineItem } from "@/contexts/WorkoutContext";
import type { JointAction } from "@/lib/data";
import { resolveProfile, type ExperienceId, type ExperienceProfile } from "@/lib/experience";
import { type VolumeId } from "@/lib/volume";
import { sortDayExercises } from "./dayOrdering";
import { applyFinisherToAllocation } from "./finisher";

// ============================================================
// MUSCLE-GROUP TAG SYSTEM
// ============================================================

/**
 * Muscle-group tags that a day intends to cover (or that an exercise trains).
 * Maps directly onto the 6-bucket UX nav with arms / legs split into
 * sub-tags so the allocator can distinguish bi vs tri and quads vs glutes
 * vs hams.
 */
export type MuscleTag =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "glutes"
  | "hams"
  | "calves"
  | "core"
  // Routing tag — NOT a muscle, just a gate. Days that should accept
  // heavy CNS-taxing hinges (Conventional / Sumo / Trap-Bar Deadlift,
  // Good Morning, Jefferson Curl) carry this tag. UL "Lower" days do
  // NOT carry it, since they happen 2x/week and stacking heavy hinges
  // is too CNS-demanding. Allocator enforces: if an exercise has
  // `heavy-hinge`, the day must also have it.
  | "heavy-hinge";

/** Anatomical-mass weights — used to scale weekly volume targets per muscle. */
export const MUSCLE_MASS_WEIGHT: Record<MuscleTag, number> = {
  chest: 1.0,
  back: 1.2,        // Lats + traps + rhomboids = larger combined mass
  shoulders: 0.8,   // Side / rear delts are smaller individually
  biceps: 0.7,      // Smaller mass, recovers fast
  triceps: 0.8,     // Slightly bigger than biceps
  quads: 1.2,
  glutes: 1.1,
  hams: 1.0,
  calves: 0.6,      // Small mass; calf hypertrophy needs less than majors
  core: 0.5,        // Already trained as a stabilizer in many compounds
  "heavy-hinge": 0, // Routing-only tag, contributes no volume target
};

/** Tags that gate eligibility rather than contributing to weekly volume. */
const ROUTING_ONLY_TAGS = new Set<MuscleTag>(["heavy-hinge"]);

/**
 * Patterns for heavy CNS-taxing hinges that should only land on Leg days
 * (not on UL "Lower" days). RDL / stiff-leg / single-leg variants are
 * deliberately EXCLUDED — they're lighter on CNS and fit any lower-body
 * slot.
 */
const HEAVY_HINGE_PATTERN = /(?:\bdeadlift\b|good morning|jefferson curl)/i;
const NOT_HEAVY_HINGE_PATTERN = /romanian|stiff[- ]leg|single[- ]leg/i;

/** Heuristic mapping: targetedMuscle string -> primary muscle tag(s). */
const MUSCLE_NAME_TO_TAGS: Array<{ pattern: RegExp; tags: MuscleTag[] }> = [
  { pattern: /pec|chest/i, tags: ["chest"] },
  { pattern: /lat|teres|rhomboid|mid trap|lower trap|upper back|erector|spinal|back/i, tags: ["back"] },
  { pattern: /trap|trapezius/i, tags: ["back"] },
  { pattern: /rear delt|posterior delt/i, tags: ["shoulders"] },
  { pattern: /front delt|anterior delt/i, tags: ["shoulders"] },
  { pattern: /medial delt|side delt|lateral delt/i, tags: ["shoulders"] },
  { pattern: /\bdelt\b|deltoid|shoulder/i, tags: ["shoulders"] },
  { pattern: /biceps|brachialis|brachioradialis/i, tags: ["biceps"] },
  { pattern: /triceps/i, tags: ["triceps"] },
  { pattern: /quad|rectus femoris|vastus/i, tags: ["quads"] },
  { pattern: /glute/i, tags: ["glutes"] },
  { pattern: /hamstring|biceps femoris|semitendinosus|semimembranosus/i, tags: ["hams"] },
  { pattern: /adductor/i, tags: ["glutes"] }, // bucket adductors with glutes for split-day targeting
  { pattern: /abductor|tensor fasciae/i, tags: ["glutes"] }, // glute med = glutes lane
  { pattern: /calves|calf|gastrocnemius|soleus/i, tags: ["calves"] },
  { pattern: /rectus abdominis|abdominals|abs|obliques|core/i, tags: ["core"] },
];

/**
 * Pattern for muscles that count as primary back movers. Erectors and
 * upper traps are NOT included — in squat / leg press / deadlift /
 * good morning / jefferson curl those muscles stabilize the lift but
 * don't take the kind of direct load that produces upper-back
 * hypertrophy. Deadlifts are leg-day lifts only; biceps / lat /
 * rhomboid volume comes from dedicated pulls.
 */
const PRIMARY_BACK_PATTERN =
  /lat\b|latissimus|teres|rhomboid|mid trap|lower trap|upper back/i;

/** Compute the muscle groups an exercise trains (deduped). */
export function getMuscleTagsForItem(item: RoutineItem): MuscleTag[] {
  const tags = new Set<MuscleTag>();
  for (const muscle of item.targetedMuscles) {
    for (const rule of MUSCLE_NAME_TO_TAGS) {
      if (rule.pattern.test(muscle)) {
        for (const t of rule.tags) tags.add(t);
        break;
      }
    }
  }
  // Strip incidental `back` tag from lower-body lifts. Squat / Leg Press
  // / RDL / Conventional Deadlift all list 'Spinal Erectors' or 'Upper
  // Traps' in their targetedMuscles because those stabilize the lift.
  // Without this cleanup, the muscle-tag matcher would tag those as
  // 'back' too, and the allocator would happily land squat on an
  // upper-body day. Only strip when there's NO primary back mover
  // (lat / teres / rhomboid / mid-or-lower trap / upper back) — that
  // preserves rows, pulldowns, shrugs etc.
  const hasLowerBodyTag = tags.has("quads") || tags.has("hams") || tags.has("glutes");
  if (hasLowerBodyTag && tags.has("back")) {
    const hasPrimaryBack = item.targetedMuscles.some((m) =>
      PRIMARY_BACK_PATTERN.test(m),
    );
    if (!hasPrimaryBack) {
      tags.delete("back");
    }
  }
  // Compound back/pull exercises (Upper Body Pull jointFunction) list
  // "Biceps" in targetedMuscles as a secondary mover, but the stimulus
  // isn't enough to count as weekly biceps volume. Strip biceps tag so
  // the allocator doesn't credit pulldowns / rows / pull-ups toward
  // the biceps target — biceps volume must come from dedicated curls.
  if (item.jointFunction === "Upper Body Pull" && tags.has("biceps") && tags.has("back")) {
    tags.delete("biceps");
  }
  // Edge case: exercise name reveals muscle group when targetedMuscles is unhelpful.
  if (tags.size === 0) {
    const name = item.exercise.toLowerCase();
    if (/calf|calves/.test(name)) tags.add("calves");
    else if (/squat|leg press|hack/.test(name)) tags.add("quads");
    else if (/curl/.test(name) && !/leg curl|nordic/.test(name)) tags.add("biceps");
    else if (/leg curl|hamstring/.test(name)) tags.add("hams");
    else if (/hip thrust|glute/.test(name)) tags.add("glutes");
    else if (/press|push|bench|fly|dip/.test(name) && /chest/.test(name)) tags.add("chest");
    else if (/row|pulldown|pull-up|chin-up|pullover|lat prayer/.test(name)) tags.add("back");
    else if (/lateral|delt|shoulder press|overhead press|face pull/.test(name)) tags.add("shoulders");
    else if (/triceps|skullcrusher|kickback|pressdown/.test(name)) tags.add("triceps");
    else if (/crunch|pallof|woodchop|side bend|v-up|ab wheel/.test(name)) tags.add("core");
  }
  // Heavy-hinge routing: add `heavy-hinge` tag for the three CNS-taxing
  // hinges so the allocator only lands them on Leg days (not Lower days).
  const name = item.exercise.toLowerCase();
  if (HEAVY_HINGE_PATTERN.test(name) && !NOT_HEAVY_HINGE_PATTERN.test(name)) {
    tags.add("heavy-hinge");
  }
  return Array.from(tags);
}

// ============================================================
// SPLIT PRESETS
// ============================================================

export interface SplitDay {
  id: string;
  name: string;
  /** Muscle-group tags this day covers. */
  tags: MuscleTag[];
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

export type SplitId = "fb3" | "ul4" | "ppl6" | "bro5" | "ulppl5" | "custom";

/**
 * Full Body 3 days/week. Every major muscle group gets exactly 2 days
 * of training across the week. Days group by joint-function synergy:
 *
 *   Day A — Push / Quad: chest + shoulders + triceps + quads + glutes + calves + core
 *           Push synergy on the upper, squat synergy on the lower.
 *   Day B — Pull / Hinge (Leg Day): back + biceps + hams + glutes + calves + core
 *           Pull synergy + heavy hinge synergy. heavy-hinge tag enables
 *           Deadlift / Good Morning / Jefferson Curl here.
 *   Day C — Second hits: chest + back + shoulders + triceps + biceps + quads + hams
 *           Mixed second-pass to balance the week without re-stacking heavy
 *           CNS work.
 *
 * Frequency per muscle (exactly 2x/week each):
 *   chest A,C · back B,C · shoulders A,C · triceps A,C · biceps B,C
 *   quads A,C · hams B,C · glutes A,B · calves A,B · core A,B
 */
export const FULL_BODY_3: SplitPreset = {
  id: "fb3",
  name: "Full Body — 3 days / week",
  shortLabel: "FB3",
  description:
    "Mon / Wed / Fri. Every major muscle group hit exactly 2x/week. Day A groups push + squat; Day B is the leg-day (pull + heavy hinge); Day C is mixed second-pass.",
  daysPerWeek: 3,
  days: [
    {
      id: "fb-a",
      name: "Day A — Push / Quad",
      tags: ["chest", "shoulders", "triceps", "quads", "glutes", "calves", "core"],
      scheduleHint: "Mon",
    },
    {
      id: "fb-b",
      name: "Day B — Pull / Hinge (Leg Day)",
      tags: ["back", "biceps", "hams", "glutes", "calves", "core", "heavy-hinge"],
      scheduleHint: "Wed",
    },
    {
      id: "fb-c",
      name: "Day C — Mixed Second-Pass",
      tags: ["chest", "back", "shoulders", "triceps", "biceps", "quads", "hams"],
      scheduleHint: "Fri",
    },
  ],
};

/**
 * Upper / Lower / Upper / Leg — 4 days/week. Second lower day is
 * a true Leg Day (carries heavy-hinge tag) so Deadlift / Good Morning
 * / Jefferson Curl can land there. The first Lower day is volume-only
 * — no heavy CNS hinges (avoids stacking with the upper day fatigue
 * earlier in the week).
 */
export const UPPER_LOWER_4: SplitPreset = {
  id: "ul4",
  name: "Upper / Lower / Upper / Leg — 4 days / week",
  shortLabel: "UL4",
  description:
    "Mon Upper / Tue Lower / Thu Upper / Fri Leg Day. Twice-per-week frequency on upper. Lower 1 (volume-only) + Leg Day (heavy hinges allowed) on the lower hemisphere.",
  daysPerWeek: 4,
  days: [
    {
      id: "ul-u1",
      name: "Upper 1",
      tags: ["chest", "back", "shoulders", "biceps", "triceps"],
      scheduleHint: "Mon",
    },
    {
      id: "ul-l1",
      name: "Lower 1",
      tags: ["quads", "hams", "glutes", "calves", "core"],
      scheduleHint: "Tue",
    },
    {
      id: "ul-u2",
      name: "Upper 2",
      tags: ["chest", "back", "shoulders", "biceps", "triceps"],
      scheduleHint: "Thu",
    },
    {
      id: "ul-leg",
      name: "Leg Day",
      tags: ["quads", "hams", "glutes", "calves", "core", "heavy-hinge"],
      scheduleHint: "Fri",
    },
  ],
};

/**
 * Push / Pull / Lower / Push / Pull / Legs — 6 days/week. The two
 * lower-hemisphere days split into one Lower (no heavy hinges) and one
 * true Leg Day (heavy-hinge tag). The Leg Day comes Saturday so the
 * lifter has had the most cumulative recovery time before the heavy
 * CNS work.
 */
export const PUSH_PULL_LEGS_6: SplitPreset = {
  id: "ppl6",
  name: "Push / Pull / Legs — 6 days / week",
  shortLabel: "PPL6",
  description:
    "Mon Push / Tue Pull / Wed Lower / Thu Push / Fri Pull / Sat Leg Day / Sun rest. Twice-per-week frequency on each pattern. Lower mid-week (no heavy hinge), Leg Day weekend (heavy hinges allowed after maximum recovery).",
  daysPerWeek: 6,
  days: [
    { id: "ppl-p1", name: "Push 1", tags: ["chest", "shoulders", "triceps"], scheduleHint: "Mon" },
    { id: "ppl-pl1", name: "Pull 1", tags: ["back", "biceps"], scheduleHint: "Tue" },
    { id: "ppl-lower", name: "Lower", tags: ["quads", "hams", "glutes", "calves", "core"], scheduleHint: "Wed" },
    { id: "ppl-p2", name: "Push 2", tags: ["chest", "shoulders", "triceps"], scheduleHint: "Thu" },
    { id: "ppl-pl2", name: "Pull 2", tags: ["back", "biceps"], scheduleHint: "Fri" },
    { id: "ppl-leg", name: "Leg Day", tags: ["quads", "hams", "glutes", "calves", "core", "heavy-hinge"], scheduleHint: "Sat" },
  ],
};

/**
 * Classic 5-day body-part 'bro' split. One muscle group focus per day,
 * once per week each. Higher per-session exercise count compensates for
 * the once/week frequency.
 */
export const BRO_SPLIT_5: SplitPreset = {
  id: "bro5",
  name: "Bro Split — 5 days / week",
  shortLabel: "Bro5",
  description:
    "Mon Chest / Tue Back / Wed Shoulders / Thu Arms / Fri Legs. Sat-Sun rest. One body part per day, hit once a week with higher session volume.",
  daysPerWeek: 5,
  days: [
    { id: "bro-chest", name: "Chest", tags: ["chest"], scheduleHint: "Mon" },
    { id: "bro-back", name: "Back", tags: ["back"], scheduleHint: "Tue" },
    { id: "bro-shoulders", name: "Shoulders", tags: ["shoulders", "core"], scheduleHint: "Wed" },
    { id: "bro-arms", name: "Arms", tags: ["biceps", "triceps", "core"], scheduleHint: "Thu" },
    { id: "bro-legs", name: "Leg Day", tags: ["quads", "hams", "glutes", "calves", "core", "heavy-hinge"], scheduleHint: "Fri" },
  ],
};

/**
 * Hybrid Upper-Lower / Push-Pull-Legs split. 5 training days with 2 rest
 * days woven in (one mid-week, one weekend). Each major pattern hit
 * 1.5–2x per week — more recovery margin than PPL6 with more frequency
 * than the bro split.
 */
export const UL_PPL_5: SplitPreset = {
  id: "ulppl5",
  name: "Upper-Lower + PPL — 5 days / week",
  shortLabel: "UL+PPL",
  description:
    "Mon Upper / Tue Lower / Wed rest / Thu Push / Fri Pull / Sat Legs / Sun rest. Hybrid pacing — full-body coverage early in the week, push/pull/legs split later.",
  daysPerWeek: 5,
  days: [
    {
      id: "ulppl-u1",
      name: "Upper",
      tags: ["chest", "back", "shoulders", "biceps", "triceps"],
      scheduleHint: "Mon",
    },
    {
      id: "ulppl-l1",
      name: "Lower",
      tags: ["quads", "hams", "glutes", "calves", "core"],
      scheduleHint: "Tue",
    },
    {
      id: "ulppl-push",
      name: "Push",
      tags: ["chest", "shoulders", "triceps"],
      scheduleHint: "Thu",
    },
    {
      id: "ulppl-pull",
      name: "Pull",
      tags: ["back", "biceps"],
      scheduleHint: "Fri",
    },
    {
      id: "ulppl-legs",
      name: "Leg Day",
      tags: ["quads", "hams", "glutes", "calves", "core", "heavy-hinge"],
      scheduleHint: "Sat",
    },
  ],
};

export const SPLIT_PRESETS: Record<Exclude<SplitId, "custom">, SplitPreset> = {
  fb3: FULL_BODY_3,
  ul4: UPPER_LOWER_4,
  ppl6: PUSH_PULL_LEGS_6,
  bro5: BRO_SPLIT_5,
  ulppl5: UL_PPL_5,
};

export const ALL_PRESETS: SplitPreset[] = [
  FULL_BODY_3,
  UPPER_LOWER_4,
  PUSH_PULL_LEGS_6,
  BRO_SPLIT_5,
  UL_PPL_5,
];

// ============================================================
// AUTO-ALLOCATOR
// ============================================================

/** Per-day exercise cap. */
export const PER_DAY_EXERCISE_CAP = 6;

/** Compound-share band (still used for UI display + rating prompt). */
export const COMPOUND_PCT_GOOD_MIN = 0.2;
export const COMPOUND_PCT_GOOD_MAX = 0.45;
export function isCompoundRatioOnTarget(pct: number): boolean {
  return pct >= COMPOUND_PCT_GOOD_MIN && pct <= COMPOUND_PCT_GOOD_MAX;
}

/**
 * Weekly working-set target per muscle group. Scales by experience level
 * (beginner sits at the lower edge of MEV–MAV, experienced at the upper edge)
 * and is then weighted by anatomical mass. Floor of 6 sets/wk for
 * minor groups (calves / core) so they don't get fully starved.
 */
function computeWeeklyVolumeTargets(experience: ExperienceProfile): Record<MuscleTag, number> {
  const base = experience.weeklyVolumePerMajor;
  const out = {} as Record<MuscleTag, number>;
  for (const tag of Object.keys(MUSCLE_MASS_WEIGHT) as MuscleTag[]) {
    out[tag] = Math.max(6, Math.round(base * MUSCLE_MASS_WEIGHT[tag]));
  }
  return out;
}

/**
 * Sets earned per single exercise instance — muscle-aware formula.
 *
 *   sets/instance = ceil(weeklyTarget / exercisesForMuscle / daysForMuscle)
 *
 * Where:
 *   weeklyTarget        = volume target for the bottleneck muscle this
 *                         exercise drives (volumePerMajor × mass weight)
 *   exercisesForMuscle  = how many exercises in the routine target that
 *                         muscle (so co-targeting exercises split the work)
 *   daysForMuscle       = how many split days train that muscle (so a
 *                         2-day chest split divides the weekly target
 *                         by 2 days, not by 6)
 *
 * Worked example — 2 chest exercises on UL4 (2 upper days), per
 * volume tier:
 *   Low  (target 10): ceil(10/2/2) = 3 sets → week 1 total 12, deload
 *                     week 2 to ~8, meso avg 10 = on target
 *   Med  (target 15): ceil(15/2/2) = 4 sets → week 1 total 16
 *   High (target 20): ceil(20/2/2) = 5 sets → week 1 total 20 = on target
 *
 * Per-session overshoot vs sessionCap is accepted by design — the cap
 * is a soft heuristic, and Week 2's load/deload pass brings the
 * mesocycle average back in line.
 *
 * When the exercise hits multiple muscles, the BOTTLENECK muscle (the
 * one requiring the most sets/instance) wins — that way we hit the
 * tightest muscle's target. Falls back to the experience baseline
 * (2/3/4) if no muscle target applies, e.g. for an exercise with no
 * recognized tags.
 */
function setsPerInstance(
  item: RoutineItem,
  exp: ExperienceProfile,
  ctx?: {
    split: SplitPreset;
    pool: RoutineItem[];
    targets: Record<MuscleTag, number>;
    tagsById: Map<string, MuscleTag[]>;
  },
): number {
  // Fallback baseline when no muscle context applies (no tags, or
  // unrecognized item). Derived from the volume tier's weekly target so
  // it scales appropriately: low→2, med→3, high→4. Matches the old
  // static setsPerExercise field we just removed.
  const baseline = Math.max(1, Math.round(exp.weeklyVolumePerMajor / 5));
  if (!ctx) return baseline;

  const itemTags = ctx.tagsById.get(item.id) ?? [];
  if (itemTags.length === 0) return baseline;

  // For each muscle the exercise hits, compute the per-instance sets
  // count needed to land its weekly volume target. Take the MAX so
  // we hit the bottleneck muscle exactly (others overshoot slightly).
  let bestCount = baseline;
  for (const tag of itemTags) {
    const target = ctx.targets[tag];
    if (!target || target <= 0) continue;
    // How many exercises in the whole pool target this muscle?
    const exercisesForMuscle = ctx.pool.filter((p) =>
      (ctx.tagsById.get(p.id) ?? []).includes(tag),
    ).length;
    if (exercisesForMuscle === 0) continue;
    // How many split days are eligible to train this muscle?
    const daysForMuscle = ctx.split.days.filter((d) =>
      (d.tags as readonly string[]).includes(tag),
    ).length;
    if (daysForMuscle === 0) continue;
    const need = Math.ceil(target / exercisesForMuscle / daysForMuscle);
    if (need > bestCount) bestCount = need;
  }
  return bestCount;
}

interface AllocationContext {
  /** dayId -> ordered exerciseId[]. May contain duplicates (same exercise on multiple days). */
  byDay: Record<string, string[]>;
  /** Tracking volume per muscle group (working sets/week so far). */
  volumeByMuscle: Record<MuscleTag, number>;
  /** itemId -> RoutineItem lookup. */
  itemsById: Map<string, RoutineItem>;
  /** itemId -> muscle tags (cached). */
  tagsById: Map<string, MuscleTag[]>;
  /** itemId -> sets per instance. */
  setsById: Map<string, number>;
}

/**
 * Pick the best day to add a given exercise instance. Returns null if no
 * day matches the exercise's muscle groups OR every matching day is at
 * the per-day cap.
 */
function pickBestDay(
  item: RoutineItem,
  split: SplitPreset,
  ctx: AllocationContext,
  preferEmpty: boolean,
): string | null {
  const itemTags = ctx.tagsById.get(item.id) ?? [];
  if (itemTags.length === 0) return null;

  // Routing-only tags the exercise REQUIRES (e.g. heavy-hinge gates
  // deadlift / good morning / jefferson curl to Leg days only).
  const requiredTags = itemTags.filter((t) => ROUTING_ONLY_TAGS.has(t));

  // Pre-compute exercise names already on each day. If the user happens
  // to have two RoutineItems with the same exercise name + equipment +
  // angle (legitimate variants, or stale duplicates we couldn't dedupe),
  // the original id-only guard (line below) would let both land on the
  // same day. The name-level guard catches that case: even with two
  // distinct ids that resolve to the same exercise name, only one
  // placement per day. Result: cleaner cards, no perceived duplication.
  const itemName = item.exercise;
  const candidates = split.days.filter((d) => {
    if (ctx.byDay[d.id].length >= PER_DAY_EXERCISE_CAP) return false;
    if (ctx.byDay[d.id].includes(item.id)) return false; // same id already here
    // Also reject if another RoutineItem with the same exercise name is
    // already on this day.
    const sameNameAlreadyHere = ctx.byDay[d.id].some((otherId) => {
      const other = ctx.itemsById.get(otherId);
      return other?.exercise === itemName;
    });
    if (sameNameAlreadyHere) return false;
    // Must overlap on at least one muscle tag.
    if (!d.tags.some((t) => itemTags.includes(t))) return false;
    // If exercise has any routing-only tags, day must carry them too.
    if (!requiredTags.every((t) => d.tags.includes(t))) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  // Rank by: (1) day with the most under-target overlap with the item's
  // muscle groups, (2) tie-break by least-loaded day.
  const ranked = [...candidates].sort((a, b) => {
    const scoreA = dayScoreForItem(a, item, ctx);
    const scoreB = dayScoreForItem(b, item, ctx);
    if (scoreA !== scoreB) return scoreB - scoreA;
    if (preferEmpty) return ctx.byDay[a.id].length - ctx.byDay[b.id].length;
    return 0;
  });
  return ranked[0].id;
}

function dayScoreForItem(day: SplitDay, item: RoutineItem, ctx: AllocationContext): number {
  const itemTags = ctx.tagsById.get(item.id) ?? [];
  let score = 0;
  for (const t of itemTags) {
    if (!day.tags.includes(t)) continue;
    if (ROUTING_ONLY_TAGS.has(t)) continue; // routing tags gate placement, not score
    // The lower the current volume for that muscle, the higher the score
    // (under-served muscles attract the next instance).
    score += 1; // base credit for matching at all
    score += Math.max(0, 20 - ctx.volumeByMuscle[t]); // bonus while under target
  }
  return score;
}

function applyExerciseToDay(item: RoutineItem, dayId: string, ctx: AllocationContext): void {
  ctx.byDay[dayId].push(item.id);
  const tags = ctx.tagsById.get(item.id) ?? [];
  const sets = ctx.setsById.get(item.id) ?? 3;
  for (const t of tags) {
    if (ROUTING_ONLY_TAGS.has(t)) continue; // skip routing tags in volume math
    ctx.volumeByMuscle[t] += sets;
  }
}

function findMostUnderservedMuscle(
  ctx: AllocationContext,
  targets: Record<MuscleTag, number>,
  validTags: Set<MuscleTag>,
): MuscleTag | null {
  let worst: MuscleTag | null = null;
  let worstGap = 0;
  for (const tag of Object.keys(targets) as MuscleTag[]) {
    if (!validTags.has(tag)) continue;
    if (ROUTING_ONLY_TAGS.has(tag)) continue; // routing tags have no volume target
    const gap = targets[tag] - ctx.volumeByMuscle[tag];
    if (gap > worstGap) {
      worstGap = gap;
      worst = tag;
    }
  }
  return worst;
}

// Per-day ordering lives in dayOrdering.ts now — sortDayExercises uses
// catalog tags (mass weight + SFR + stability + stretch level) instead
// of the old name-pattern primingScore heuristic.

export interface AllocationResult {
  byDay: Record<string, string[]>;
  unassigned: string[];
  dayStats: Record<string, {
    total: number;
    compounds: number;
    isolations: number;
    compoundPct: number;
    targetCompoundPctMin: number;
    targetCompoundPctMax: number;
  }>;
  /** Weekly muscle-group volume (sets) achieved by the allocation. */
  weeklyVolume: Record<MuscleTag, number>;
  /** Targets used during allocation (for UI feedback). */
  weeklyVolumeTargets: Record<MuscleTag, number>;
}

export interface AllocationOptions {
  /** User experience level — drives technique-side modulators (SFR/Stability
   * penalty, Compound/Iso band, coaching tone). NOT volume; see `volume`. */
  experience?: ExperienceId | null;
  /** User volume tier — drives weekly volume targets, sets per exercise,
   * session caps, RIR targets. null = use the default for the experience
   * tier (low for beginner, med for FID, high for experienced). */
  volume?: VolumeId | null;
  /** Exercise IDs the user marked as favorite (priority for repetition). */
  favoriteIds?: string[];
  /** Calves finisher frequency — days/wk to train calves regardless of
   * mass-weighted volume math. null = off (use default). */
  calvesFrequency?: number | null;
  /** Abs finisher frequency (rectus abdominis only). null = off. */
  absFrequency?: number | null;
  /**
   * Mesocycle week index (0 = week 1, 1 = week 2). When the user has
   * 2+ finisher exercises rotating across days, week 2's offset is
   * used so the rotation starts on the other exercise and total
   * weekly volume balances across the meso. Default 0 (week 1).
   */
  weekIndex?: number;
}

/**
 * Distribute a pool of exercises across a split's days. Allocates each
 * exercise at least once, then repeats exercises across days to hit
 * weekly volume targets per muscle group, capping each day at 6.
 */
export function allocatePoolToSplit(
  pool: RoutineItem[],
  split: SplitPreset,
  options: AllocationOptions = {},
): AllocationResult {
  const exp = resolveProfile(options.experience, options.volume);
  const favoriteSet = new Set(options.favoriteIds ?? []);
  const targets = computeWeeklyVolumeTargets(exp);

  // Build context. setsPerInstance needs the pool + targets + tag map
  // to compute the muscle-aware sets count, so we build tagsById
  // first and pass the ctx-bundle into setsPerInstance().
  const tagsById = new Map(pool.map((p) => [p.id, getMuscleTagsForItem(p)]));
  const setsCtx = { split, pool, targets, tagsById };
  const ctx: AllocationContext = {
    byDay: {},
    volumeByMuscle: {} as Record<MuscleTag, number>,
    itemsById: new Map(pool.map((p) => [p.id, p])),
    tagsById,
    setsById: new Map(pool.map((p) => [p.id, setsPerInstance(p, exp, setsCtx)])),
  };
  for (const day of split.days) ctx.byDay[day.id] = [];
  for (const tag of Object.keys(MUSCLE_MASS_WEIGHT) as MuscleTag[]) ctx.volumeByMuscle[tag] = 0;

  // Phase 1: place each exercise once. Compounds first (they secure prime
  // slots before isolations crowd in). Favorites within each batch first
  // so they get the strongest day match.
  const sortByFavorite = (a: RoutineItem, b: RoutineItem) => {
    const af = favoriteSet.has(a.id) ? 1 : 0;
    const bf = favoriteSet.has(b.id) ? 1 : 0;
    return bf - af;
  };
  const compounds = pool.filter((p) => p.category === "systemic").sort(sortByFavorite);
  const isolations = pool.filter((p) => p.category === "regional").sort(sortByFavorite);

  const unassigned: string[] = [];
  for (const item of [...compounds, ...isolations]) {
    const dayId = pickBestDay(item, split, ctx, true);
    if (dayId) {
      applyExerciseToDay(item, dayId, ctx);
    } else {
      unassigned.push(item.id);
    }
  }

  // Phase 2: repeat exercises until weekly volume targets are met OR
  // every day is at the cap. Prefer favorites first, then any exercise
  // that hits the most under-served muscle group.
  const validTags = new Set<MuscleTag>();
  for (const day of split.days) for (const t of day.tags) validTags.add(t);

  let safety = 200; // bounded loop
  while (safety-- > 0) {
    const allDaysFull = split.days.every((d) => ctx.byDay[d.id].length >= PER_DAY_EXERCISE_CAP);
    if (allDaysFull) break;

    const worst = findMostUnderservedMuscle(ctx, targets, validTags);
    if (!worst) break;
    if (ctx.volumeByMuscle[worst] >= targets[worst]) break;

    // Find an exercise that hits the worst-served muscle. Favorites first.
    const candidates = pool
      .filter((p) => (ctx.tagsById.get(p.id) ?? []).includes(worst))
      .sort((a, b) => {
        const af = favoriteSet.has(a.id) ? 1 : 0;
        const bf = favoriteSet.has(b.id) ? 1 : 0;
        if (af !== bf) return bf - af;
        // Prefer compounds for repetition (better SFR per session)
        const ac = a.category === "systemic" ? 1 : 0;
        const bc = b.category === "systemic" ? 1 : 0;
        return bc - ac;
      });

    let placed = false;
    for (const item of candidates) {
      const dayId = pickBestDay(item, split, ctx, false);
      if (dayId) {
        applyExerciseToDay(item, dayId, ctx);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Couldn't repeat anything for the worst-served muscle without
      // exceeding caps or duplicating onto the same day. Bail to avoid
      // infinite loop — accept that this muscle stays under target.
      // Mark it visited by saturating its volume to its target so the
      // next iteration looks at a different muscle.
      ctx.volumeByMuscle[worst] = targets[worst];
    }
  }

  // Phase 3: order each day priming-first via sortDayExercises (catalog-
  // tag based: compound→heavy-hinge→mass→SFR→stability→stretch).
  const byDay: Record<string, string[]> = {};
  const dayStats: AllocationResult["dayStats"] = {};
  for (const day of split.days) {
    const orderedIds = sortDayExercises(ctx.byDay[day.id], ctx.itemsById);
    const ordered = orderedIds
      .map((id) => ctx.itemsById.get(id))
      .filter(Boolean) as RoutineItem[];
    byDay[day.id] = orderedIds;
    const total = ordered.length;
    const compoundsCount = ordered.filter((i) => i.category === "systemic").length;
    dayStats[day.id] = {
      total,
      compounds: compoundsCount,
      isolations: total - compoundsCount,
      compoundPct: total > 0 ? compoundsCount / total : 0,
      targetCompoundPctMin: COMPOUND_PCT_GOOD_MIN,
      targetCompoundPctMax: COMPOUND_PCT_GOOD_MAX,
    };
  }

  // Phase 4: apply finisher overrides for calves + abs, if the user
  // set explicit frequencies. The applyFinisherToAllocation helper
  // strips existing instances of finisher-eligible exercises and
  // redistributes them across the requested day count. After the
  // override, re-run the per-day sort so the finisher items land in
  // their correct (tail-end) position.
  let finished = byDay;
  // rotationOffset is the week index: week 2 starts the finisher
  // rotation on the other exercise (when 2+ are picked) so the meso's
  // total volume per finisher exercise comes out balanced.
  const rotationOffset = options.weekIndex ?? 0;
  if (options.calvesFrequency != null) {
    finished = applyFinisherToAllocation(finished, pool, split, "calves", options.calvesFrequency, rotationOffset);
  }
  if (options.absFrequency != null) {
    finished = applyFinisherToAllocation(finished, pool, split, "abs", options.absFrequency, rotationOffset);
  }
  if (finished !== byDay) {
    for (const day of split.days) {
      finished[day.id] = sortDayExercises(finished[day.id] ?? [], ctx.itemsById);
    }
    // Refresh dayStats for affected days.
    for (const day of split.days) {
      const ids = finished[day.id] ?? [];
      const items = ids.map((id) => ctx.itemsById.get(id)).filter(Boolean) as RoutineItem[];
      const total = items.length;
      const compoundsCount = items.filter((i) => i.category === "systemic").length;
      dayStats[day.id] = {
        total,
        compounds: compoundsCount,
        isolations: total - compoundsCount,
        compoundPct: total > 0 ? compoundsCount / total : 0,
        targetCompoundPctMin: COMPOUND_PCT_GOOD_MIN,
        targetCompoundPctMax: COMPOUND_PCT_GOOD_MAX,
      };
    }
  }

  return {
    byDay: finished,
    unassigned,
    dayStats,
    weeklyVolume: ctx.volumeByMuscle,
    weeklyVolumeTargets: targets,
  };
}

// ============================================================
// SMART FILL — SETS PER INSTANCE FROM PER-MUSCLE WEEKLY TARGETS
// ============================================================

/**
 * Compute how many sets per session a given routine item should get when
 * Opti-fill runs. Sets come from the experience profile's per-muscle
 * weekly volume target (10 / 15 / 20 sets/wk for beginner / foot-in-door
 * / experienced), scaled by anatomical mass weight, then divided across
 * all session-instances of all exercises hitting that muscle. We round
 * UP per the user's preference: when the math is uneven, give MORE sets
 * rather than under-target.
 *
 * For exercises that train multiple muscle groups, take the MAX
 * "need" across all tags — that guarantees every muscle hits its
 * target even if the others over-shoot slightly.
 *
 * Returns 1 as a floor (always produce at least one working set).
 */
export function computeMatrixSets(
  item: RoutineItem,
  routine: RoutineItem[],
  dayAssignments: Record<string, string[]>,
  experience: ExperienceProfile,
): number {
  const itemTags = getMuscleTagsForItem(item);
  if (itemTags.length === 0) return 1;

  // Cache instance counts per RoutineItem id.
  const instanceCount: Record<string, number> = {};
  for (const ids of Object.values(dayAssignments)) {
    for (const id of ids) {
      instanceCount[id] = (instanceCount[id] ?? 0) + 1;
    }
  }
  const itemInstances = instanceCount[item.id] ?? 0;
  if (itemInstances === 0) {
    // Not yet assigned to any day — fall back to a single instance.
    return 1;
  }

  let maxNeed = 1;
  for (const tag of itemTags) {
    // Mass-weighted target for this muscle.
    const target = Math.round(experience.weeklyVolumePerMajor * MUSCLE_MASS_WEIGHT[tag]);

    // Total session-instances across ALL exercises that hit this muscle.
    let totalInstancesForTag = 0;
    for (const r of routine) {
      const rInstances = instanceCount[r.id] ?? 0;
      if (rInstances === 0) continue;
      const rTags = getMuscleTagsForItem(r);
      if (rTags.includes(tag)) totalInstancesForTag += rInstances;
    }
    if (totalInstancesForTag === 0) continue;

    // Each instance shoulders an equal share, rounded UP.
    const need = Math.ceil(target / totalInstancesForTag);
    if (need > maxNeed) maxNeed = need;
  }

  return maxNeed;
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
// LEGACY TYPE STUBS (kept for back-compat with ratings + helpers)
// ============================================================

/** @deprecated retained for back-compat; not used by the allocator now. */
export type DayTag = MuscleTag;

/** @deprecated tagsForRoutineItem now wraps getMuscleTagsForItem. */
export function tagsForRoutineItem(item: RoutineItem): MuscleTag[] {
  return getMuscleTagsForItem(item);
}

export function jointActionsForDay(items: RoutineItem[]): Map<JointAction, number> {
  // Wired in P5 followups; not yet populated.
  const map = new Map<JointAction, number>();
  void items;
  return map;
}
