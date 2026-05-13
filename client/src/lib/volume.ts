/**
 * Training-volume profiles.
 *
 * Decoupled from experience. Volume controls how much load lands on the
 * lifter per week — weekly sets per major mover, sets per exercise,
 * RIR targets, session caps. Experience separately controls things tied
 * to technique proficiency (SFR / Stability / Compound-Iso modulators,
 * coaching tone).
 *
 * Default volume tracks experience (beginner → low, FID → med, experienced
 * → high) so a single picker is usually enough. Users who want to dial
 * volume independently of technique level — e.g. a returning experienced
 * lifter starting at low volume to manage soreness, or a confident
 * intermediate who wants to push beyond their tier — set volume directly.
 */
import type { ExperienceId } from "./experience";

export type VolumeId = "low" | "med" | "high";

export interface VolumeProfile {
  id: VolumeId;
  name: string;
  blurb: string;
  /** Weekly working sets per major mover — the SOURCE OF TRUTH that
   *  drives the allocator's sets/instance math. Per-muscle target is
   *  this × MUSCLE_MASS_WEIGHT[muscle]. */
  weeklyVolumePerMajor: number;
  /** RIR self-report target per exercise type. */
  rir: { compound: string; isolation: string };
  /** Which experience level naturally fits this volume. UI shows it as
   *  "Recommended for: ..." */
  recommendedFor: ExperienceId;
  description: string;
}

export const VOLUME_PROFILES: VolumeProfile[] = [
  {
    id: "low",
    name: "Low Volume",
    blurb: "10 sets/wk per major. Higher RIR. Room left in the tank.",
    weeklyVolumePerMajor: 10,
    rir: { compound: "3+", isolation: "1-2" } as const,
    recommendedFor: "beginner",
    description:
      "Conservative weekly load. Built for beginners building the skill of training first, " +
      "or experienced lifters in a recovery / deload block. " +
      "Hits MEV without chasing MAV — leaves headroom for technique work.",
  },
  {
    id: "med",
    name: "Medium Volume",
    blurb: "15 sets/wk per major. RIR 1–2 compounds / 0 isolation.",
    weeklyVolumePerMajor: 15,
    rir: { compound: "1-2", isolation: "0" } as const,
    recommendedFor: "foot-in-door",
    description:
      "Standard hypertrophy band — the Nippard / Israetel default. Most lifters live here. " +
      "Enough volume to drive progress, low enough to recover from week to week.",
  },
  {
    id: "high",
    name: "High Volume",
    blurb: "20 sets/wk per major. Pushed close to failure (1–3 RIR comp / 0 RIR iso).",
    weeklyVolumePerMajor: 20,
    rir: { compound: "1-2", isolation: "0" } as const,
    recommendedFor: "experienced",
    description:
      "Upper-edge MAV. Pushed to failure (1–3 RIR compound, 0 RIR isolation). " +
      "Maximizes weekly stimulus; recovery becomes the rate-limiter. Built for experienced lifters " +
      "who have the technique and recovery capacity to absorb it.",
  },
];

export const VOLUME_BY_ID: Record<VolumeId, VolumeProfile> = Object.fromEntries(
  VOLUME_PROFILES.map((p) => [p.id, p]),
) as Record<VolumeId, VolumeProfile>;

export function getVolume(id: VolumeId | null | undefined): VolumeProfile | null {
  if (!id) return null;
  return VOLUME_BY_ID[id] ?? null;
}

/**
 * What volume tier naturally matches an experience level. Used to set
 * the default volume so most users don't have to pick twice. The user
 * can override by picking a different volume explicitly.
 */
export function defaultVolumeForExperience(experience: ExperienceId | null | undefined): VolumeId {
  if (experience === "beginner") return "low";
  if (experience === "experienced") return "high";
  return "med";
}
