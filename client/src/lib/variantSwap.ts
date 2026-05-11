/**
 * Variant swap engine — P9.3.4.
 *
 * Given a Week-2 RoutineItem, produces a biomechanically-similar
 * variant at one of three "sizes":
 *
 *   small  - same subcategory.id. Near-identical stimulus, different
 *            equipment / angle. Barbell Bench -> DB Bench, Cable Fly
 *            -> Machine Fly, Lat Pulldown -> Single-Arm Pulldown.
 *
 *   medium - same subgroupId (the UX muscle bucket like "quads" or
 *            "biceps"), different subcategory.id. Same primary muscle,
 *            different SFR / ROM emphasis. Squat-pattern -> Leg
 *            Extension (both quads), Bayesian Curl -> Preacher Curl
 *            (both biceps, lengthened -> shortened bias).
 *
 *   large  - same muscleGroup bucket (chest / back / shoulders / arms
 *            / legs / core), different subgroupId. Bigger stimulus
 *            shift. Lat Pulldown (lats) -> Cable Row (upper-back),
 *            Leg Extension (quads) -> Hip Thrust (glutes).
 *
 * Favorites are filtered OUT by the caller (this module is pure-data;
 * it doesn't know about favorites). The caller is responsible for
 * skipping favorited items.
 *
 * Swaps stay within the source item's muscle-tag set (so the swap is
 * still legal for the days the original was assigned to).
 */
import { categories, getProgrammingParameters, generateId, type Category, type Exercise, type JointFunction, type Subcategory } from "./data";
import { SUBCATEGORY_MAP, type MuscleGroupId } from "./muscleGroups";
import { getMuscleTagsForItem, type MuscleTag } from "./splitPresets";
import type { RoutineItem, SetDetail } from "@/contexts/WorkoutContext";

export type SwapSize = "small" | "medium" | "large";

interface CatalogEntry {
  category: Category;
  jointFunction: JointFunction;
  subcategory: Subcategory;
  exercise: Exercise;
  muscleGroup: MuscleGroupId;
  subgroupId: string;
}

/** Flattened catalog of all (exercise + provenance) tuples. Built once. */
let _flatCatalog: CatalogEntry[] | null = null;
function flatCatalog(): CatalogEntry[] {
  if (_flatCatalog) return _flatCatalog;
  const out: CatalogEntry[] = [];
  for (const category of categories) {
    for (const jf of category.jointFunctions) {
      for (const sub of jf.subcategories) {
        const target = SUBCATEGORY_MAP[sub.id];
        if (!target) continue;
        for (const ex of sub.exercises) {
          out.push({
            category,
            jointFunction: jf,
            subcategory: sub,
            exercise: ex,
            muscleGroup: target.muscleGroup,
            subgroupId: target.subgroupId,
          });
        }
      }
    }
  }
  _flatCatalog = out;
  return out;
}

/** Find the catalog entry for a RoutineItem by exercise name match. */
function findEntry(item: RoutineItem): CatalogEntry | null {
  const catalog = flatCatalog();
  return catalog.find((c) => c.exercise.name === item.exercise) ?? null;
}

/** Convert a catalog Exercise into the muscle tags it trains. Lighter
 * than getMuscleTagsForItem (no equipment-override etc); good enough
 * for swap-legality checks. */
function tagsFromExercise(exercise: Exercise, jointFunction: JointFunction): MuscleTag[] {
  // Reuse getMuscleTagsForItem by building a synthetic RoutineItem.
  const fake: RoutineItem = {
    id: "fake",
    exercise: exercise.name,
    jointFunction: jointFunction.name,
    category: exercise.compound ? "systemic" : "regional",
    parameters: getProgrammingParameters(exercise.compound ? "systemic" : "regional"),
    sets: [],
    difficulty: exercise.difficulty,
    targetedMuscles: exercise.targetedMuscles,
  };
  return getMuscleTagsForItem(fake);
}

/** Return true if `swap` shares at least one non-routing muscle tag
 * with the source item. Keeps the swap legal for the day it lands on. */
function tagsOverlap(sourceTags: MuscleTag[], swapTags: MuscleTag[]): boolean {
  for (const t of sourceTags) {
    if (t === "heavy-hinge") continue;
    if (swapTags.includes(t)) return true;
  }
  return false;
}

/**
 * Pick a variant for the given item at the requested swap size.
 * Returns null if no legal variant exists.
 *
 * @param item the source RoutineItem
 * @param size small | medium | large
 * @param exclude exercise NAMES already chosen (avoid picking duplicates
 *   across the same swap pass)
 */
export function pickSwap(
  item: RoutineItem,
  size: SwapSize,
  exclude: Set<string>,
): CatalogEntry | null {
  const entry = findEntry(item);
  if (!entry) return null;

  const sourceTags = getMuscleTagsForItem(item);
  const catalog = flatCatalog();

  // Pool candidates by swap size.
  let pool: CatalogEntry[];
  if (size === "small") {
    pool = catalog.filter((c) => c.subcategory.id === entry.subcategory.id);
  } else if (size === "medium") {
    pool = catalog.filter(
      (c) =>
        c.muscleGroup === entry.muscleGroup &&
        c.subgroupId === entry.subgroupId &&
        c.subcategory.id !== entry.subcategory.id,
    );
  } else {
    pool = catalog.filter(
      (c) => c.muscleGroup === entry.muscleGroup && c.subgroupId !== entry.subgroupId,
    );
  }

  // Filter out: self, already-picked exercises, swaps that don't share a
  // muscle tag with the source.
  const candidates = pool.filter((c) => {
    if (c.exercise.id === entry.exercise.id) return false;
    if (c.exercise.name === item.exercise) return false;
    if (exclude.has(c.exercise.name)) return false;
    const swapTags = tagsFromExercise(c.exercise, c.jointFunction);
    if (!tagsOverlap(sourceTags, swapTags)) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Deterministic pick: use a hash of the source item's id mixed with the
  // size string so the same source -> same swap on repeated clicks (a
  // re-click on the same size shouldn't shuffle). Index by hash modulo.
  const hash = simpleHash(`${item.id}:${size}`);
  return candidates[hash % candidates.length];
}

/** Convert a CatalogEntry + template SetDetail[] into a fresh RoutineItem. */
export function entryToRoutineItem(
  entry: CatalogEntry,
  templateSets: SetDetail[],
): RoutineItem {
  const isCompound = entry.exercise.compound;
  return {
    id: generateId(),
    exercise: entry.exercise.name,
    jointFunction: entry.jointFunction.name,
    category: isCompound ? "systemic" : "regional",
    parameters: getProgrammingParameters(isCompound ? "systemic" : "regional"),
    sets: templateSets.map((s) => ({ reps: s.reps, weight: s.weight })),
    difficulty: entry.exercise.difficulty,
    targetedMuscles: entry.exercise.targetedMuscles,
    stretchLevel: entry.exercise.stretchLevel,
    stability: entry.exercise.stability,
  };
}

/** Cheap deterministic hash for the modulo pick. */
function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * High-level operation: swap all non-favorited items in Week 2 at the
 * given size. Returns the new week2DayAssignments, plus the array of
 * new RoutineItems (the "week2Routine") that hold the swaps, plus
 * counts for UI feedback.
 */
export interface SwapAllResult {
  /** Week 2 day assignments with swapped ids substituted. */
  newWeek2DayAssignments: Record<string, string[]>;
  /** New RoutineItems created by the swap (the parallel "week2Routine"). */
  swappedItems: RoutineItem[];
  /** oldId -> newId map for migrating week2ExerciseSets etc. */
  idMap: Record<string, string>;
  /** Diagnostics. */
  swappedCount: number;
  unchangedCount: number;
  noVariantCount: number;
}

export function swapAllNonFavoritesWeek2(
  routine: RoutineItem[],
  week2DayAssignments: Record<string, string[]>,
  favoriteIds: Set<string>,
  size: SwapSize,
): SwapAllResult {
  const itemsById = new Map(routine.map((r) => [r.id, r]));

  // Gather unique ids appearing in week 2.
  const idsInWeek2 = new Set<string>();
  for (const ids of Object.values(week2DayAssignments)) {
    for (const id of ids) idsInWeek2.add(id);
  }

  // For each non-favorite id, attempt a swap. Track chosen exercise
  // names so the pass doesn't pick the same swap twice across different
  // sources (e.g. two different push-chest exercises shouldn't both
  // small-swap to the same variant).
  const exclude = new Set<string>();
  // Also pre-populate exclude with FAVORITE exercise names — favorites
  // are locked, so we shouldn't swap something else INTO a favorite's lane.
  for (const id of idsInWeek2) {
    if (favoriteIds.has(id)) {
      const item = itemsById.get(id);
      if (item) exclude.add(item.exercise);
    }
  }

  const idMap: Record<string, string> = {};
  const swappedItems: RoutineItem[] = [];
  let swappedCount = 0;
  let noVariantCount = 0;
  let unchangedCount = 0;

  for (const id of idsInWeek2) {
    if (favoriteIds.has(id)) {
      unchangedCount++;
      continue;
    }
    const item = itemsById.get(id);
    if (!item) {
      unchangedCount++;
      continue;
    }
    const swap = pickSwap(item, size, exclude);
    if (!swap) {
      noVariantCount++;
      continue;
    }
    exclude.add(swap.exercise.name);
    const newItem = entryToRoutineItem(swap, item.sets);
    idMap[id] = newItem.id;
    swappedItems.push(newItem);
    swappedCount++;
  }

  // Build new week2DayAssignments with id substitutions.
  const newWeek2DayAssignments: Record<string, string[]> = {};
  for (const [dayId, ids] of Object.entries(week2DayAssignments)) {
    newWeek2DayAssignments[dayId] = ids.map((id) => idMap[id] ?? id);
  }

  return {
    newWeek2DayAssignments,
    swappedItems,
    idMap,
    swappedCount,
    unchangedCount,
    noVariantCount,
  };
}
