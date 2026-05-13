/**
 * Resolves a demo-video URL for an exercise (or specific variant).
 *
 * Specificity ladder — most specific match wins, falls through if not
 * set. Curators only author URLs at the level where the variant is
 * meaningfully different (e.g. behind-the-back cable lateral raise
 * gets its own URL; rope-vs-handle does not).
 *
 *    angle.videoUrl
 *      ↓ falls through if undefined
 *    equipment.videoUrl
 *      ↓ falls through if undefined
 *    exercise.videoUrl
 *      ↓ falls through if undefined
 *    youtubeSearch(name + equipment + angle)
 *      ← guaranteed fallback so EVERY exercise has a clickable link
 *
 * IP-safe: we only LINK to public-platform pages, we don't host or
 * embed. Linking is universally permitted and the video creator keeps
 * full ad revenue + view count.
 */
import { categories, type Exercise, type EquipmentOption, type AngleOption } from "./data";

/**
 * Build a YouTube search URL for an exercise, optionally narrowing by
 * equipment + angle. Used as the universal fallback when no curated
 * URL exists.
 */
function youtubeSearchUrl(parts: string[]): string {
  const q = parts.filter((s) => s && s.trim().length > 0).join(" ") + " demonstration";
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/**
 * Look up a video URL for the given exercise + optional equipment + angle.
 *
 * `equipmentName` and `angleName` are the user-facing names (matching
 * what RoutineItem stores), not the IDs. We resolve them against the
 * exercise's `equipment` / `angles` arrays by name to find the override
 * URL if any.
 *
 * If `exercise` is null (e.g. the routine item has a custom exercise
 * not in the catalog), returns a YouTube search URL using just the
 * provided name + variant strings.
 */
export function resolveExerciseVideoUrl(
  exercise: Exercise | null,
  exerciseName: string,
  equipmentName?: string,
  angleName?: string,
): string {
  if (exercise) {
    // Most specific: angle override
    if (angleName) {
      const ang = exercise.angles?.find((a) => a.name === angleName);
      if (ang?.videoUrl) return ang.videoUrl;
    }
    // Next: equipment override
    if (equipmentName) {
      const eq = exercise.equipment?.find((e) => e.name === equipmentName);
      if (eq?.videoUrl) return eq.videoUrl;
    }
    // Base exercise URL
    if (exercise.videoUrl) return exercise.videoUrl;
  }
  // Fallback: YouTube search using whatever names we have
  return youtubeSearchUrl([exerciseName, equipmentName ?? "", angleName ?? ""]);
}

// ============================================================
// CATALOG LOOKUP (name → Exercise)
// ============================================================

let _byName: Map<string, Exercise> | null = null;
function exerciseByName(name: string): Exercise | null {
  if (!_byName) {
    _byName = new Map();
    for (const c of categories) {
      for (const jf of c.jointFunctions) {
        for (const sub of jf.subcategories) {
          for (const ex of sub.exercises) {
            _byName.set(ex.name, ex);
          }
        }
      }
    }
  }
  return _byName.get(name) ?? null;
}

/**
 * Convenience wrapper for RoutineItem-shaped data — pulls the catalog
 * Exercise by name, then resolves the URL. Used by UI components that
 * only have a RoutineItem reference.
 */
export function videoUrlForRoutineItem(item: {
  exercise: string;
  equipment?: string;
  angle?: string;
}): string {
  const ex = exerciseByName(item.exercise);
  return resolveExerciseVideoUrl(ex, item.exercise, item.equipment, item.angle);
}

/**
 * Re-export the resolver name pattern used by other helpers (e.g.
 * FinisherCatalogPick → URL when needed).
 */
export { exerciseByName as findCatalogExerciseByName };
