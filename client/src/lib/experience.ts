/**
 * Experience profiles — TECHNIQUE-RELATED only.
 *
 * Volume-related fields (weekly volume per major, sets per exercise,
 * session cap per mover, RIR targets) have been split into VolumeProfile.
 * Defaults still track experience tier (beginner → low volume, FID →
 * med, experienced → high), but the user can override volume directly.
 *
 * Fields previously bundled here that NO LONGER exist on the profile:
 *   - setsPerExercise: removed. Default sets/instance is derived from
 *     the muscle's weekly volume target ÷ (exercises × days) inside the
 *     allocator. Single-exercise add paths derive a fallback from
 *     weeklyVolumePerMajor instead of reading a static field.
 *   - sessionCapPerMover: removed. Was a soft heuristic that conflicted
 *     with the volume-target-as-source-of-truth model: a routine that
 *     legitimately requires 10 sets of chest in one session (2 exercises
 *     × 5 sets each at high volume) cannot also obey "≤8 sets per
 *     mover per session". Volume math wins; per-session burden is
 *     managed by the Week 2 load/deload pass.
 *
 * This profile retains only the descriptive / technique-side fields
 * used by ExperiencePicker UI + the score modulators in poolScore.ts
 * (which key off ExperienceId, not the profile object).
 */
export const EXPERIENCE_PROFILES = [
  {
    id: "beginner",
    name: "Beginner",
    blurb: "0–6 months training, on and off over the years, never been too serious.",
    /** Default rep target inside the recommended range. */
    repsCompound: 10,
    repsIsolation: 12,
    description:
      "Lower volume, higher RIR, focus on movement quality and consistency. " +
      "Goal: build the skill of training before chasing maximum stimulus.",
  },
  {
    id: "foot-in-door",
    name: "Foot in the Door",
    blurb:
      "6 months – 2.5 consistent years. Decent but still growing understanding of the body.",
    repsCompound: 8,
    repsIsolation: 12,
    description:
      "Mid-range volume, intensity in the prescribed Nippard / Israetel band. " +
      "Goal: progressive overload across all movement patterns.",
  },
  {
    id: "experienced",
    name: "Experienced",
    blurb: ">2.5 years consistent training, proficient in most exercise movements.",
    repsCompound: 8,
    repsIsolation: 12,
    description:
      "Upper-edge volume pushed close to failure (1–3 RIR compound, 0 RIR isolation). " +
      "Goal: maximize stimulus within the MEV–MAV band; recovery is rate-limiting.",
  },
] as const;

export type ExperienceProfileBase = (typeof EXPERIENCE_PROFILES)[number];
export type ExperienceId = ExperienceProfileBase["id"];

export function getExperience(id: ExperienceId | null | undefined): ExperienceProfileBase | null {
  if (!id) return null;
  return EXPERIENCE_PROFILES.find((p) => p.id === id) ?? null;
}

// Module-level imports for volume — keeps the cycle one-directional
// (experience pulls volume values; volume only takes ExperienceId as a
// type). Type-only imports get erased at build time.
import { defaultVolumeForExperience, getVolume, type VolumeId } from "./volume";

/**
 * The MERGED profile downstream code consumes. Combines experience's
 * descriptive fields with volume's load-side fields (weekly volume per
 * major + RIR). Other code paths (allocator, finisher) derive sets per
 * instance from weeklyVolumePerMajor on demand — there's no static
 * "sets per exercise" field anymore.
 */
export interface ExperienceProfile extends ExperienceProfileBase {
  weeklyVolumePerMajor: number;
  rir: { compound: string; isolation: string };
}

/**
 * Effective profile = experience (descriptive + technique) merged with
 * volume profile (load-side). When volume is null, defaults to the
 * experience's natural volume tier so single-picker users still get
 * the expected behavior.
 *
 * The technique-side SFR/Stab penalty multiplier and Compound/Iso band
 * are keyed off ExperienceId directly inside poolScore.ts — they don't
 * read from this profile object.
 */
export function resolveProfile(
  experienceId: ExperienceId | null | undefined,
  volumeId: VolumeId | null | undefined,
): ExperienceProfile {
  const baseExp = getExperience(experienceId) ?? getExperience("foot-in-door")!;
  const effectiveVolumeId = volumeId ?? defaultVolumeForExperience(experienceId);
  const vol = getVolume(effectiveVolumeId) ?? getVolume("med")!;
  return {
    ...baseExp,
    weeklyVolumePerMajor: vol.weeklyVolumePerMajor,
    rir: vol.rir,
  };
}
