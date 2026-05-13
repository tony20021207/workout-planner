/**
 * Lifestyle / activity profiles. The user picks one after rating their pool.
 *
 * The profile is wired into:
 *   - Rating prompts (cueingTips, opportunityTips, verdict tone bias toward
 *     the chronic gaps for that profile).
 *   - Session warmup engine (3 dynamic warmups per training day, biased to
 *     unlock the chronic restrictions of that profile).
 */
export const LIFESTYLE_PROFILES = [
  {
    id: "desk-job",
    name: "Desk Job",
    blurb: "Sit ≥6h/day at a desk or computer.",
    chronicRestrictions: [
      "Thoracic spine extension (rounded mid-back)",
      "Hip flexors (shortened from sitting)",
      "Scapular upward rotators / lower trap (under-active)",
      "Posterior chain weakness (glutes, hamstrings)",
      "Anterior shoulder tightness (pec minor, anterior delt)",
    ],
    warmupBias:
      "Open the thoracic spine, activate lower trap + serratus, mobilize hip flexors, fire glutes.",
    cueBias:
      "Lean cueingTips toward Spinal Extensors (active extension), Scap UR / Lower Trap, and Hip Extensors. Lean opportunityTips toward Hip Flexor mobility and Spinal Rotators (counter-rotation).",
  },
  {
    id: "runner",
    name: "Runner / Endurance",
    blurb: "Running ≥3×/week or sport with significant running volume.",
    chronicRestrictions: [
      "Ankle dorsiflexion mobility",
      "Hip flexor / quad tightness from repetitive striding",
      "Glute medius weakness (poor hip stability)",
      "Hamstring overuse / shortening",
      "Plantar fascia tightness",
    ],
    warmupBias:
      "Ankle mobility, glute med / hip abductor activation, hip flexor mobility, single-leg balance prep.",
    cueBias:
      "Lean cueingTips toward Hip Abductors (single-leg bias) and Knee Flexors (full hamstring ROM). Lean opportunityTips toward Hip External Rotators (lateral stability).",
  },
  {
    id: "competitive-sports",
    name: "Competitive Sports",
    blurb:
      "Field / court sport with lateral cuts, jumps, throws — basketball, soccer, tennis, etc.",
    chronicRestrictions: [
      "Asymmetric loading from dominant side use",
      "Rotator cuff / scapular control under high CNS load",
      "Hip / ankle stability under unpredictable forces",
      "Connective-tissue stiffness from repeated impact",
    ],
    warmupBias:
      "Multi-planar mobility, rotator cuff prep, dynamic single-leg stability, CNS priming via low-load explosive movement (no high-volume jumps).",
    cueBias:
      "Lean cueingTips toward Shoulder External Rotators and Scap Retractors (cuff health). Lean opportunityTips toward Spinal Rotators & Lateral Flexors (sport-specific anti-rotation) and Hip ER / IR.",
  },
  {
    id: "bed-rot",
    name: "Bed-Rot / Sedentary",
    blurb: "Mostly horizontal — gaming, recovery from injury, low daily step count.",
    chronicRestrictions: [
      "Generalized joint stiffness (every joint capsule)",
      "Hip flexors AND hip extensors both shortened/inhibited",
      "Spinal mobility loss across all planes",
      "Cardiovascular conditioning low",
      "Connective tissue fragility (low loading history)",
    ],
    warmupBias:
      "Longer warmup phase (5–8 minutes light cardio first), full-body joint capsule mobilization, gradual ramp-up sets at every exercise.",
    cueBias:
      "Be cautious with cueingTips that suggest near-failure intensity. Emphasize the warmup ramp itself. Lean opportunityTips toward foundational stabilizers (Scap UR, obliques) since those are deeply de-conditioned.",
  },
  {
    id: "physical-labor",
    name: "Standing / Physical Labor",
    blurb:
      "Trades, retail, healthcare, warehouse — on your feet ≥6h/day with manual loading.",
    chronicRestrictions: [
      "Lower back fatigue accumulated across the workweek",
      "Forearm / grip overuse",
      "Calf / lower-leg pump from prolonged standing",
      "Shoulder asymmetry from repeated lifting/carrying",
    ],
    warmupBias:
      "De-load mobility — open the lower back, decompress the spine, mobilize ankles AND release calves. Avoid high-volume warmup that compounds existing fatigue.",
    cueBias:
      "Lean cueingTips toward technique on Spinal Extensors (set extension on RDLs, etc., not adding stimulus they don't need). Lean opportunityTips toward Hip External Rotators and Scapular Upward Rotators (counter the asymmetric loading).",
  },
] as const;

export type LifestyleProfile = (typeof LIFESTYLE_PROFILES)[number];
export type LifestyleId = LifestyleProfile["id"];

export function getLifestyle(id: LifestyleId | null | undefined): LifestyleProfile | null {
  if (!id) return null;
  return LIFESTYLE_PROFILES.find((p) => p.id === id) ?? null;
}
