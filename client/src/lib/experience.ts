/**
 * Experience profiles. The user picks one alongside their lifestyle profile
 * after rating the pool.
 *
 * The profile drives:
 *   - Auto-recommend (sets / reps / RIR per exercise) — beginners get fewer
 *     sets at higher RIR, experienced get more sets pushed closer to failure
 *     (1–3 RIR compounds, 0 RIR isolations per the Nippard / Israetel rule).
 *   - Auto-allocator (session caps + total weekly volume per major mover) —
 *     beginners get the lower edge of MEV–MAV (10 sets/wk per major), experienced
 *     get the upper edge (20 sets/wk per major) and can absorb more sets per
 *     session before junk-volume kicks in.
 *   - Rating prompts (so the LLM judges the routine in light of the lifter's
 *     ability, e.g. doesn't penalize a beginner for low set count or expect
 *     pinpoint mind-muscle on every rep).
 */
export const EXPERIENCE_PROFILES = [
  {
    id: "beginner",
    name: "Beginner",
    blurb: "0–6 months training, on and off over the years, never been too serious.",
    /** Sets per exercise (working sets only). */
    setsPerExercise: { compound: 2, isolation: 2 },
    /** Default rep target inside the recommended range. */
    repsCompound: 10,
    repsIsolation: 12,
    /** RIR self-report target per exercise type. */
    rir: { compound: "3+", isolation: "1-2" } as const,
    /** Per-session cap for any single joint-action prime mover. */
    sessionCapPerMover: 4,
    /** Weekly working sets per major mover (within 10–20 MEV–MAV band). */
    weeklyVolumePerMajor: 10,
    /** Total weekly working-sets budget across the entire pool. */
    weeklyTotalSetsCap: 50,
    description:
      "Lower volume, higher RIR, focus on movement quality and consistency. " +
      "Goal: build the skill of training before chasing maximum stimulus.",
  },
  {
    id: "foot-in-door",
    name: "Foot in the Door",
    blurb:
      "6 months – 2.5 consistent years. Decent but still growing understanding of the body.",
    setsPerExercise: { compound: 3, isolation: 3 },
    repsCompound: 8,
    repsIsolation: 12,
    rir: { compound: "1-2", isolation: "0" } as const,
    sessionCapPerMover: 6,
    weeklyVolumePerMajor: 15,
    weeklyTotalSetsCap: 80,
    description:
      "Mid-range volume, intensity in the prescribed Nippard / Israetel band. " +
      "Goal: progressive overload across all movement patterns.",
  },
  {
    id: "experienced",
    name: "Experienced",
    blurb: ">2.5 years consistent training, proficient in most exercise movements.",
    setsPerExercise: { compound: 4, isolation: 4 },
    repsCompound: 8,
    repsIsolation: 12,
    rir: { compound: "1-2", isolation: "0" } as const,
    sessionCapPerMover: 8,
    weeklyVolumePerMajor: 20,
    weeklyTotalSetsCap: 110,
    description:
      "Upper-edge volume pushed close to failure (1–3 RIR compound, 0 RIR isolation). " +
      "Goal: maximize stimulus within the MEV–MAV band; recovery is rate-limiting.",
  },
] as const;

export type ExperienceProfile = (typeof EXPERIENCE_PROFILES)[number];
export type ExperienceId = ExperienceProfile["id"];

export function getExperience(id: ExperienceId | null | undefined): ExperienceProfile | null {
  if (!id) return null;
  return EXPERIENCE_PROFILES.find((p) => p.id === id) ?? null;
}
