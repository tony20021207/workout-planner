/**
 * Weekly split presets + auto-allocator.
 *
 * Three preset splits (FB3 / UL4 / PPL6) plus a custom mode. The auto-
 * allocator distributes a microcycle's exercise pool across the chosen
 * split's days following these rules:
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
import { getExperience, type ExperienceId, type ExperienceProfile } from "@/lib/experience";

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
  | "core";

/** Anatomical-mass weights — used to scale weekly volume targets per muscle. */
const MUSCLE_MASS_WEIGHT: Record<MuscleTag, number> = {
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
};

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
 * Full-body 3 days a week. Each day touches every major upper + lower
 * group (chest, back, shoulders, legs) plus core. Arms (bi vs tri)
 * rotates across days so each arm group gets ~2 days/wk on average.
 */
export const FULL_BODY_3: SplitPreset = {
  id: "fb3",
  name: "Full Body — 3 days / week",
  shortLabel: "FB3",
  description:
    "Mon / Wed / Fri (or every-other-day). Each day touches chest, back, shoulders, and legs + core; biceps and triceps rotate across days for balanced arm volume.",
  daysPerWeek: 3,
  days: [
    {
      id: "fb-a",
      name: "Day A",
      tags: ["chest", "back", "shoulders", "quads", "biceps", "core"],
      scheduleHint: "Mon",
    },
    {
      id: "fb-b",
      name: "Day B",
      tags: ["chest", "back", "shoulders", "hams", "glutes", "triceps", "core"],
      scheduleHint: "Wed",
    },
    {
      id: "fb-c",
      name: "Day C",
      tags: ["chest", "back", "shoulders", "quads", "glutes", "calves", "biceps", "core"],
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
      id: "ul-l2",
      name: "Lower 2",
      tags: ["quads", "hams", "glutes", "calves", "core"],
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
    { id: "ppl-p1", name: "Push 1", tags: ["chest", "shoulders", "triceps"], scheduleHint: "Mon" },
    { id: "ppl-pl1", name: "Pull 1", tags: ["back", "biceps"], scheduleHint: "Tue" },
    { id: "ppl-l1", name: "Legs 1", tags: ["quads", "hams", "glutes", "calves", "core"], scheduleHint: "Wed" },
    { id: "ppl-p2", name: "Push 2", tags: ["chest", "shoulders", "triceps"], scheduleHint: "Thu" },
    { id: "ppl-pl2", name: "Pull 2", tags: ["back", "biceps"], scheduleHint: "Fri" },
    { id: "ppl-l2", name: "Legs 2", tags: ["quads", "hams", "glutes", "calves", "core"], scheduleHint: "Sat" },
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
    { id: "bro-legs", name: "Legs", tags: ["quads", "hams", "glutes", "calves", "core"], scheduleHint: "Fri" },
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
      name: "Legs",
      tags: ["quads", "hams", "glutes", "calves", "core"],
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

/** Sets earned per single exercise instance based on category + experience. */
function setsPerInstance(item: RoutineItem, exp: ExperienceProfile): number {
  return item.category === "systemic"
    ? exp.setsPerExercise.compound
    : exp.setsPerExercise.isolation;
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

  const candidates = split.days.filter((d) => {
    if (ctx.byDay[d.id].length >= PER_DAY_EXERCISE_CAP) return false;
    if (ctx.byDay[d.id].includes(item.id)) return false; // already on this day; pick a different day for repetition
    return d.tags.some((t) => itemTags.includes(t));
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
    const gap = targets[tag] - ctx.volumeByMuscle[tag];
    if (gap > worstGap) {
      worstGap = gap;
      worst = tag;
    }
  }
  return worst;
}

/**
 * Score for "warmup-priming suitability". Higher = belongs earlier in
 * the day. Compound machines/cables get the top slot.
 */
function primingScore(item: RoutineItem): number {
  let score = 0;
  if (item.category === "systemic") score += 100;
  const name = item.exercise.toLowerCase();
  if (name.includes("machine") || name.includes("smith") || name.includes("cable")) {
    score += 30;
  }
  if (item.category === "regional" && (name.includes("cable fly") || name.includes("lat prayer") || name.includes("face pull"))) {
    score += 20;
  }
  if (name.includes("crunch") || name.includes("calf") || name.includes("woodchop") || name.includes("pallof") || name.includes("side bend")) {
    score -= 20;
  }
  return score;
}

function orderDayItems(items: RoutineItem[]): RoutineItem[] {
  return [...items].sort((a, b) => primingScore(b) - primingScore(a));
}

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
  /** User experience level — drives sets per exercise + weekly volume target. */
  experience?: ExperienceId | null;
  /** Exercise IDs the user marked as favorite (priority for repetition). */
  favoriteIds?: string[];
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
  const exp = getExperience(options.experience) ?? getExperience("foot-in-door")!;
  const favoriteSet = new Set(options.favoriteIds ?? []);
  const targets = computeWeeklyVolumeTargets(exp);

  // Build context.
  const ctx: AllocationContext = {
    byDay: {},
    volumeByMuscle: {} as Record<MuscleTag, number>,
    itemsById: new Map(pool.map((p) => [p.id, p])),
    tagsById: new Map(pool.map((p) => [p.id, getMuscleTagsForItem(p)])),
    setsById: new Map(pool.map((p) => [p.id, setsPerInstance(p, exp)])),
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

  // Phase 3: order each day priming-first.
  const byDay: Record<string, string[]> = {};
  const dayStats: AllocationResult["dayStats"] = {};
  for (const day of split.days) {
    const items = ctx.byDay[day.id]
      .map((id) => ctx.itemsById.get(id))
      .filter(Boolean) as RoutineItem[];
    const ordered = orderDayItems(items);
    byDay[day.id] = ordered.map((i) => i.id);
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

  return {
    byDay,
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
 * Smart Fill runs. Sets come from the experience profile's per-muscle
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
export function computeSmartFillSets(
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
