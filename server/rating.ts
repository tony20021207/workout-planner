import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";

/**
 * Canonical kinesiology taxonomy. Every exercise must be decomposed into the
 * specific joint actions it produces, and coverage is scored against this list.
 * Movement-pattern labels (squat, hinge, press) are user-facing UX only — the
 * underlying analysis works at the joint-action level.
 */
const JOINT_FUNCTION_REFERENCE = `CANONICAL JOINT-ACTION TAXONOMY (use these exact action names):

SHOULDER
- Shoulder Flexors: Anterior Deltoid, Upper Pectoralis Major
- Shoulder Extensors: Latissimus Dorsi, Teres Major, Posterior Deltoid
- Shoulder Abductors: Lateral Deltoid, Supraspinatus
- Shoulder Adductors: Latissimus Dorsi, Pectoralis Major, Teres Major
- Shoulder Horizontal Abductors: Posterior Deltoid, Infraspinatus, Teres Minor
- Shoulder Horizontal Adductors: Pectoralis Major, Anterior Deltoid
- Shoulder Internal Rotators: Subscapularis, Latissimus Dorsi, Teres Major, Pectoralis Major
- Shoulder External Rotators: Infraspinatus, Teres Minor, Posterior Deltoid

SCAPULA
- Scapular Retractors: Rhomboids, Middle Trapezius
- Scapular Protractors: Serratus Anterior, Pectoralis Minor
- Scapular Elevators: Upper Trapezius, Levator Scapulae
- Scapular Depressors: Lower Trapezius, Pectoralis Minor
- Scapular Upward Rotators: Upper Trapezius, Lower Trapezius, Serratus Anterior
- Scapular Downward Rotators: Rhomboids, Levator Scapulae, Pectoralis Minor

ELBOW
- Elbow Flexors: Biceps Brachii, Brachialis, Brachioradialis
- Elbow Extensors: Triceps Brachii, Anconeus

SPINE / CORE
- Spinal Flexors: Rectus Abdominis
- Spinal Extensors: Erector Spinae, Multifidus
- Spinal Rotators & Lateral Flexors: Internal Obliques, External Obliques

HIP
- Hip Flexors: Iliopsoas, Rectus Femoris, Tensor Fasciae Latae
- Hip Extensors: Gluteus Maximus, Hamstrings
- Hip Abductors: Gluteus Medius, Gluteus Minimus, Tensor Fasciae Latae
- Hip Adductors: Adductor Longus, Adductor Brevis, Adductor Magnus, Gracilis
- Hip External Rotators: Piriformis, Gluteus Maximus
- Hip Internal Rotators: Gluteus Medius, Gluteus Minimus, Tensor Fasciae Latae

KNEE
- Knee Extensors: Quadriceps (Rectus Femoris, Vastus Lateralis, Vastus Medialis, Vastus Intermedius)
- Knee Flexors: Hamstrings (Biceps Femoris, Semitendinosus, Semimembranosus), Gastrocnemius

ANKLE
- Ankle Plantarflexors: Gastrocnemius, Soleus
- Ankle Dorsiflexors: Tibialis Anterior`;

const HYPERTROPHY_MATRIX_PROMPT = `You are a kinesiology-driven hypertrophy expert evaluating a user's weekly workout routine using the Hypertrophy Matrix Rating System.

CORE PRINCIPLE — JOINT-ACTION DECOMPOSITION:
Movement-pattern labels (squat, hinge, press, row) are UX shorthand for end users. The actual analysis must operate at the level of joint actions. Before scoring anything, mentally decompose every exercise the user listed into the specific joint actions it produces, using the canonical taxonomy below. A "Bench Press" is not just "chest" — it is Shoulder Horizontal Adduction + Shoulder Flexion + Elbow Extension + Scapular Protraction. A "Romanian Deadlift" is Hip Extension + Spinal Extension (isometric). All coverage analysis, redundancy detection, and gap-filling must reference this decomposition.

${JOINT_FUNCTION_REFERENCE}

THE HYPERTROPHY MATRIX RATING SYSTEM:

1. EXERCISE SELECTION (50 Points - 12.5 each):
   - Stability (12.5 pts): High points for stable exercises (machines, supported rows) that allow safe failure. Low points for unstable movements (BOSU, excessive balancing).
   - Deep Stretch Under Load (12.5 pts): High points for exercises that load the muscle in its lengthened position (e.g., RDLs, deficit pushes, Bayesian curls).
   - Stimulus-to-Fatigue Ratio / SFR (12.5 pts): High points for exercises with massive local muscle disruption and minimal systemic/joint fatigue.
   - Biomechanical Angle Bias (12.5 pts): Verify angles target the intended muscles without redundancy. Reason at the joint-action level:
     * Pressing — Flat bench = Horizontal Adduction (sternal pec). 15-30° Incline = Shoulder Flexion bias (clavicular pec / anterior delt). 45-60° = pure Shoulder Flexion (front delt dominant).
     * Pulling — Vertical pulldown = Shoulder Adduction (lat focus). Horizontal row = Shoulder Extension + Scapular Retraction (rhomboid / mid trap focus). 45° downward pull = mixed Adduction/Extension (iliac lat).
     * Arms — Shoulder extended behind body (Bayesian/incline curls) = Elbow Flexion in lengthened position (bicep long head stretch). Arms overhead (French press, OH cable ext) = Elbow Extension with shoulder flexed (tricep long head stretch).

2. INTENSITY & VOLUME (50 Points - 12.5 each):
   - RIR Targets (12.5 pts): Multi-joint compounds at 1-2 RIR. Single-joint isolation at 0 RIR (failure).
   - Rep Ranges (12.5 pts): ~80% of volume in 8-15 rep range. Remaining 20% can be heavy (5-8) or metabolic (20-30).
   - Session Caps (12.5 pts): Strictly deduct points for >6-8 sets PER JOINT-ACTION-PRIME-MOVER in one workout (junk volume).
   - Weekly Frequency (12.5 pts): Each joint action's prime movers should be trained 2-3x per week. Deduct heavily if a major joint action is hit only 1x/week.

3. WEEKLY VOLUME GUIDELINE: 10-20 working sets per joint action's prime mover per week (MEV to MAV).

4. JOINT-ACTION COVERAGE (Pass/Fail Modifier):
   Cross-reference the routine against the full 29-action taxonomy above. Treat the most metabolically and aesthetically impactful actions as MAJOR: Knee Extensors, Hip Extensors, Knee Flexors, Shoulder Horizontal Adductors, Shoulder Adductors/Extensors, Shoulder Abductors, Shoulder Horizontal Abductors, Elbow Flexors, Elbow Extensors, Spinal Flexors, Ankle Plantarflexors. Smaller stabilizers (Scapular Depressors, Hip Internal Rotators, etc.) are MINOR.
   - Major action entirely missed: -10 to -20 from final score.
   - Minor action missed: -2 to -5.
   - Apply the cumulative penalty before reporting the final score.

OUTPUT REQUIREMENTS:
- The "coverage.hit" and "coverage.missing" arrays MUST use the exact joint-action names from the taxonomy (e.g., "Hip Extensors", not "glutes").
- Every exercise in "optimizedRoutine" must include "jointActions" — the joint actions it produces, drawn from the canonical list.
- The optimizedRoutine should be a complete weekly rewrite that fills coverage gaps, eliminates redundancy, and would score 100/100. List exercises in the order they should be performed within the week.

YOU MUST RESPOND WITH STRICT JSON matching the provided schema.`;

const ratingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "verdict", "selectionBreakdown", "volumeBreakdown", "coverage", "optimizedRoutine"],
  properties: {
    score: { type: "number", description: "Final score out of 100 after coverage modifier" },
    verdict: { type: "string", description: "One-sentence verdict on the workout" },
    selectionBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["stability", "stretch", "sfr", "angles"],
      properties: {
        stability: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
        stretch: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
        sfr: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
        angles: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
      },
    },
    volumeBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["rir", "reps", "sessionCaps", "frequency"],
      properties: {
        rir: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
        reps: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
        sessionCaps: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
        frequency: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
      },
    },
    coverage: {
      type: "object",
      additionalProperties: false,
      required: ["hit", "missing"],
      properties: {
        hit: { type: "array", items: { type: "string" }, description: "Muscle groups well covered" },
        missing: { type: "array", items: { type: "string" }, description: "Muscle groups missed or under-trained" },
      },
    },
    optimizedRoutine: {
      type: "array",
      description: "Complete rewritten routine that would score 100/100. Exercises in the order they should be performed within the week.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["exercise", "sets", "repRange", "rir", "category", "targetedMuscles", "jointActions", "rationale"],
        properties: {
          exercise: { type: "string", description: "Exercise name including angle if applicable, e.g. '30° Incline DB Press'" },
          angle: { type: "string", description: "Angle/variation if not in name" },
          equipment: { type: "string", description: "Equipment used" },
          sets: { type: "number" },
          repRange: { type: "string", description: "e.g. '8-12'" },
          rir: { type: "string", description: "e.g. '1-2 RIR' or '0 RIR (to failure)'" },
          frequency: { type: "string", description: "e.g. '2x per week'" },
          category: { type: "string", enum: ["systemic", "regional"] },
          targetedMuscles: { type: "array", items: { type: "string" }, description: "Specific muscles loaded (e.g. 'Lateral Deltoid', 'Vastus Medialis')" },
          jointActions: {
            type: "array",
            items: { type: "string" },
            description: "Joint actions produced, drawn from the canonical 29-action taxonomy (e.g. 'Shoulder Horizontal Adductors', 'Elbow Extensors')",
          },
          rationale: { type: "string", description: "Why this exercise was chosen / what coverage gap it fills" },
        },
      },
    },
  },
};

const inputSchema = z.object({
  source: z.enum(["routine", "text", "image"]),
  text: z.string().optional(),
  imageDataUrl: z.string().optional(),
});

export const ratingRouter = router({
  rateWorkout: publicProcedure
    .input(inputSchema)
    .mutation(async ({ input }) => {
      const userContent: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } }
      > = [];

      if (input.source === "image") {
        if (!input.imageDataUrl) throw new Error("imageDataUrl required for image source");
        userContent.push({
          type: "text",
          text: "Evaluate this weekly workout. Read all exercises, sets, reps, weights and angles from the image, then apply the Hypertrophy Matrix Rating System.",
        });
        userContent.push({
          type: "image_url",
          image_url: { url: input.imageDataUrl, detail: "high" },
        });
      } else {
        if (!input.text) throw new Error("text required for routine/text source");
        const intro =
          input.source === "routine"
            ? "Evaluate the following weekly workout routine (built in the Kinesiology Workout Builder) using the Hypertrophy Matrix Rating System."
            : "Evaluate the following weekly workout (provided by the user as text) using the Hypertrophy Matrix Rating System.";
        userContent.push({ type: "text", text: `${intro}\n\n${input.text}` });
      }

      const result = await invokeLLM({
        messages: [
          { role: "system", content: HYPERTROPHY_MATRIX_PROMPT },
          { role: "user", content: userContent },
        ],
        outputSchema: {
          name: "hypertrophy_rating",
          schema: ratingSchema,
          strict: true,
        },
      });

      const raw = result.choices[0]?.message?.content;
      const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map(p => (p.type === "text" ? p.text : "")).join("") : "";

      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Failed to parse rating response: " + text.slice(0, 200));
      }
    }),
});
