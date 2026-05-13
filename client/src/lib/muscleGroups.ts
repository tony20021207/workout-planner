/**
 * Muscle-group navigation tree — derived at runtime from the existing
 * categories / jointFunctions / subcategories in data.ts.
 *
 * The data file still uses the original Tier 1 (systemic) / Tier 2 (regional)
 * organisation because the rating engine + auto-allocator + setRecommender
 * still consume those facts (compound flag, jointFunction string, etc.).
 *
 * The UX, however, presents the 6 muscle-group buckets that 90% of the
 * lifting community already thinks in:
 *
 *   Chest · Back · Shoulders · Arms · Legs · Core
 *
 * Some buckets have sub-tabs (Arms = Biceps / Triceps; Legs = Quads / Hams /
 * Glutes / Calves; Back = Lats / Upper / Lower; Shoulders = Press / Side /
 * Rear; Core = Upper / Lower / Obliques).
 *
 * This file exposes one function — getMuscleGroupTree() — that walks the
 * existing data and groups exercises into this view. Each leaf carries the
 * origin metadata (sourceCategory + sourceJointFunction) that the rest of
 * the app (auto-allocator, RoutineItem) needs to keep working unchanged.
 */
import { categories, type CategoryType, type Exercise } from "@/lib/data";

export type MuscleGroupId = "chest" | "back" | "shoulders" | "arms" | "legs" | "core";

export interface MuscleGroupExercise {
  /** The exercise as defined in data.ts. */
  exercise: Exercise;
  /** Which Tier the exercise lives under (still used by ratings + allocator). */
  sourceCategory: CategoryType;
  /** The original joint-function string (used by the auto-allocator's day tags). */
  sourceJointFunction: string;
  /** The original subcategory description for ExerciseCard context. */
  sourceSubcategory: string;
}

export interface MuscleGroupSubgroup {
  id: string;
  name: string;
  blurb: string;
  exercises: MuscleGroupExercise[];
}

export interface MuscleGroup {
  id: MuscleGroupId;
  name: string;
  blurb: string;
  subgroups: MuscleGroupSubgroup[];
}

export interface SubcategoryTarget {
  muscleGroup: MuscleGroupId;
  subgroupId: string;
  subgroupName: string;
}

/**
 * Map every existing subcategory id to (muscle group, subgroup) in the new
 * tree. Subcategory ids come from data.ts and are stable.
 */
export const SUBCATEGORY_MAP: Record<string, SubcategoryTarget> = {
  // Tier 1 — Squat / Hinge / Push / Pull
  "squat-quad-biased":   { muscleGroup: "legs",      subgroupId: "quads",      subgroupName: "Quadriceps" },
  "squat-glute-adductor":{ muscleGroup: "legs",      subgroupId: "glutes",     subgroupName: "Glutes & Adductors" },
  "hinge-hamstring":     { muscleGroup: "legs",      subgroupId: "hamstrings", subgroupName: "Hamstrings" },
  "hinge-glute":         { muscleGroup: "legs",      subgroupId: "glutes",     subgroupName: "Glutes & Adductors" },
  "hinge-lumbar":        { muscleGroup: "back",      subgroupId: "lower-back", subgroupName: "Lower Back / Spinal Extension" },
  "push-chest":          { muscleGroup: "chest",     subgroupId: "chest-all",  subgroupName: "Chest" },
  "push-vertical":       { muscleGroup: "shoulders", subgroupId: "press",      subgroupName: "Overhead Press / Front Delt Compounds" },
  "pull-lat":            { muscleGroup: "back",      subgroupId: "lats",       subgroupName: "Lats (vertical pull)" },
  "pull-upper-back":     { muscleGroup: "back",      subgroupId: "upper-back", subgroupName: "Upper Back & Mid-Back (rows)" },
  "pull-bicep-row":      { muscleGroup: "back",      subgroupId: "biceps-row", subgroupName: "Biceps-Driven Pulls" },

  // Tier 2 — Arm / Shoulder / Leg / Core isolation
  "biceps-lengthened":   { muscleGroup: "arms",      subgroupId: "biceps",     subgroupName: "Biceps" },
  "biceps-shortened":    { muscleGroup: "arms",      subgroupId: "biceps",     subgroupName: "Biceps" },
  "brachialis":          { muscleGroup: "arms",      subgroupId: "biceps",     subgroupName: "Biceps" },
  "triceps-long-head":   { muscleGroup: "arms",      subgroupId: "triceps",    subgroupName: "Triceps" },
  "triceps-short-head":  { muscleGroup: "arms",      subgroupId: "triceps",    subgroupName: "Triceps" },
  "lateral-contracted":  { muscleGroup: "shoulders", subgroupId: "side-delt",  subgroupName: "Side Delts" },
  "lateral-stretch":     { muscleGroup: "shoulders", subgroupId: "side-delt",  subgroupName: "Side Delts" },
  "rear-delt":           { muscleGroup: "shoulders", subgroupId: "rear-delt",  subgroupName: "Rear Delts" },
  "front-delt-iso":      { muscleGroup: "shoulders", subgroupId: "front-delt", subgroupName: "Front Delts (Isolation)" },
  "hamstring-lengthened":{ muscleGroup: "legs",      subgroupId: "hamstrings", subgroupName: "Hamstrings" },
  "hamstring-shortened": { muscleGroup: "legs",      subgroupId: "hamstrings", subgroupName: "Hamstrings" },
  "quadriceps-iso":      { muscleGroup: "legs",      subgroupId: "quads",      subgroupName: "Quadriceps" },
  "calves":              { muscleGroup: "legs",      subgroupId: "calves",     subgroupName: "Calves" },
  "upper-rectus":        { muscleGroup: "core",      subgroupId: "rectus",     subgroupName: "Rectus Abdominis" },
  "lower-rectus":        { muscleGroup: "core",      subgroupId: "rectus",     subgroupName: "Rectus Abdominis" },
  "obliques":            { muscleGroup: "core",      subgroupId: "obliques",   subgroupName: "Obliques / Anti-Rotation" },
};

/** Display order of muscle groups + sub-subgroups. */
const MUSCLE_GROUP_ORDER: MuscleGroupId[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
];

const SUBGROUP_ORDER: Record<MuscleGroupId, string[]> = {
  chest: ["chest-all"],
  back: ["lats", "upper-back", "biceps-row", "lower-back"],
  shoulders: ["press", "side-delt", "rear-delt", "front-delt"],
  arms: ["biceps", "triceps"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
  core: ["rectus", "obliques"],
};

const MUSCLE_GROUP_META: Record<MuscleGroupId, { name: string; blurb: string }> = {
  chest:     { name: "Chest",     blurb: "Pec major / minor — pressing and horizontal adduction work." },
  back:      { name: "Back",      blurb: "Lats, mid-back, rear chain. Pulldowns, rows, pullovers, lower-back work." },
  shoulders: { name: "Shoulders", blurb: "All three deltoid heads. Overhead press, lateral / rear / front delt iso." },
  arms:      { name: "Arms",      blurb: "Biceps, brachialis, triceps. Curls and extensions of every kind." },
  legs:      { name: "Legs",      blurb: "Quads, hamstrings, glutes, calves. Squats, hinges, single-leg, isolation." },
  core:      { name: "Core",      blurb: "Rectus abdominis and obliques. Crunches, leg raises, anti-rotation." },
};

/**
 * Walk the existing categories tree and produce the 6-bucket muscle-group
 * view. Pure function; runs once on first call.
 */
let _cached: MuscleGroup[] | null = null;
export function getMuscleGroupTree(): MuscleGroup[] {
  if (_cached) return _cached;

  const buckets: Record<MuscleGroupId, Map<string, MuscleGroupSubgroup>> = {
    chest: new Map(),
    back: new Map(),
    shoulders: new Map(),
    arms: new Map(),
    legs: new Map(),
    core: new Map(),
  };

  for (const category of categories) {
    for (const jf of category.jointFunctions) {
      for (const sub of jf.subcategories) {
        const target = SUBCATEGORY_MAP[sub.id];
        if (!target) {
          // Unknown subcategory — skip silently; log a console warning so it
          // surfaces during dev, but don't break the page.
          console.warn(`[muscleGroups] no mapping for subcategory id=${sub.id}`);
          continue;
        }
        const groupBuckets = buckets[target.muscleGroup];
        let subgroup = groupBuckets.get(target.subgroupId);
        if (!subgroup) {
          subgroup = {
            id: target.subgroupId,
            name: target.subgroupName,
            blurb: sub.description,
            exercises: [],
          };
          groupBuckets.set(target.subgroupId, subgroup);
        }
        for (const ex of sub.exercises) {
          subgroup.exercises.push({
            exercise: ex,
            sourceCategory: category.id,
            sourceJointFunction: jf.name,
            sourceSubcategory: sub.name,
          });
        }
      }
    }
  }

  // Build the ordered output.
  const out: MuscleGroup[] = MUSCLE_GROUP_ORDER.map((id) => {
    const meta = MUSCLE_GROUP_META[id];
    const order = SUBGROUP_ORDER[id];
    const subBuckets = buckets[id];
    const subgroups: MuscleGroupSubgroup[] = order
      .map((sgid) => subBuckets.get(sgid))
      .filter((sg): sg is MuscleGroupSubgroup => Boolean(sg));
    return {
      id,
      name: meta.name,
      blurb: meta.blurb,
      subgroups,
    };
  });

  _cached = out;
  return out;
}

export function getMuscleGroup(id: MuscleGroupId): MuscleGroup | null {
  return getMuscleGroupTree().find((g) => g.id === id) ?? null;
}
