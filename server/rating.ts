import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";

const JOINT_FUNCTION_REFERENCE = `CANONICAL JOINT-ACTION TAXONOMY (use these exact action names):

SHOULDER
- Shoulder Flexors: Anterior Deltoid, Upper Pectoralis Major
- Shoulder Extensors: Latissimus Dorsi, Teres Major, Posterior Deltoid
- Shoulder Abductors: Lateral / Medial Deltoid (middle delt), Supraspinatus
- Shoulder Adductors: Latissimus Dorsi, Pectoralis Major, Teres Major
- Shoulder Horizontal Abductors: Posterior Deltoid, Infraspinatus, Teres Minor
- Shoulder Horizontal Adductors: Pectoralis Major, Anterior Deltoid
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

ANATOMICAL VOLUME PRIORITY (rough order, larger muscles need more weekly volume):
Quadriceps > Glutes > Latissimus Dorsi / Erectors > Hamstrings > Pectorals > Trapezius > Deltoids (all heads combined) > Triceps > Biceps > Brachialis > Forearms > Calves > Abdominals > Obliques. Use this when judging whether a major mover is under-served relative to its anatomical size.`;

const HYPERTROPHY_MATRIX_PROMPT = `You are a kinesiology-driven hypertrophy expert evaluating a user's weekly microcycle using the Hypertrophy Matrix Rating System.

CORE PRINCIPLE — JOINT-ACTION DECOMPOSITION:
Movement-pattern labels (squat, hinge, press, row) are UX shorthand for end users. Real analysis must operate at the level of joint actions. Before scoring anything, mentally decompose every exercise the user listed into the specific joint actions it produces using the canonical taxonomy below. A "Bench Press" is Shoulder Horizontal Adduction + Shoulder Flexion + Elbow Extension + Scapular Protraction. A "Romanian Deadlift" is Hip Extension + Spinal Extension (isometric) + Knee Flexion (mild) + Scapular Elevation (bar hold). All coverage analysis, redundancy detection, and gap-filling must reference this decomposition.

INTENSITY POLICY — TRUST THE USER'S RIR:
The user has self-reported their average RIR (reps in reserve) on the explicit premise that movement quality stays consistent — same form, same ROM, same tempo. Take their answer at face value. **Do not** try to infer RIR from rep ranges or weights. Use their stated RIR to apply the intensity penalties in section 2D below.

${JOINT_FUNCTION_REFERENCE}

THE HYPERTROPHY MATRIX RATING SYSTEM (100 pts):

1. EXERCISE SELECTION (50 pts — 12.5 each):
   A. Stability (12.5 pts): High points for stable exercises (machines, supported rows) that allow safe failure. Low points for unstable movements.
   B. Deep Stretch Under Load (12.5 pts): Score the routine's average stretch tier. The data tags exercises as moderate / high / very-high stretch. Very-high picks (Bayesian Curl, Lat Prayer, Pullover, Sissy Squat, Reverse Nordic, Deficit Push-Up, RDL, EZ-Bar Overhead Triceps Extension, BTB Cuffed Cable Lateral, Jefferson Curl, Cable Fly) carry 1.5x the credit of a "high" pick; "moderate" carries 0.5x. Reward routines weighted toward high / very-high stretch.
   C. Stimulus-to-Fatigue Ratio / SFR (12.5 pts): High points for exercises with massive local muscle disruption and minimal systemic / joint fatigue.
   D. Biomechanical Angle Bias (12.5 pts): Verify angles target the intended muscles without redundancy. Reason at the joint-action level (pressing angles vary shoulder flexors vs horizontal adductors; pulldown grips vary lat fibers; arm-position curls vary biceps long head stretch).

2. INTENSITY & VOLUME (50 pts — 12.5 each):
   A. Rep Ranges (12.5 pts): ~80% of working-set volume in 8-15 reps. Remaining ~20% can be heavy (5-8) or metabolic (20-30).
   B. Session Caps (12.5 pts): Strictly deduct points for >6-8 sets per joint-action prime mover in one session (junk volume).
   C. Weekly Frequency (12.5 pts): Each major joint action's prime movers should be trained 2-3x per week. Deduct heavily if a major action is hit only 1x.
   D. Compound vs Isolation Balance + RIR Calibration (12.5 pts):
      - Target ratio: ~40% compound (Tier 1 multi-joint) volume, ~60% isolation (Tier 2 single-joint) volume per Israetel-style hypertrophy programming.
      - Deduct up to 5 pts for being more than 20 percentage points off the target ratio either way.
      - RIR penalties (applied to this 12.5-pt criterion):
        * Compound RIR target = 1-2. User answer "0 RIR" -> -2.5 pts ("excessive fatigue cost on heavy compounds"). User answer "3+ RIR" -> -5 pts ("under-stimulus on compounds — leaving most of the gain on the table").
        * Isolation RIR target = 0. User answer "1-2 RIR" -> -2.5 pts ("isolations are cheap fatigue-wise — push closer to failure"). User answer "3+ RIR" -> -5 pts ("severely under-stimulating isolation work").
      - Penalties stack but cannot drive this criterion below 0.

3. WEEKLY VOLUME GUIDELINE: 10-20 working sets per joint action's prime mover per week (MEV to MAV).

4. JOINT-ACTION COVERAGE (Pass/Fail Modifier):
   Cross-reference against the 27-action taxonomy. **Anatomical-size weighting**: a missing or under-trained MAJOR mover (Knee Ext, Hip Ext, Lats, Hamstrings, Pecs, Shoulder Abductors, Elbow Flexors, Elbow Extensors, Shoulder Horizontal Adductors, Shoulder Horizontal Abductors, Shoulder Adductors, Shoulder Extensors) is much more costly than a missing minor stabilizer (Scapular Depressors / Elevators, Hip External Rotators, Spinal Rotators).
   - Major action entirely missed: -10 to -20 from final score.
   - Major action under-trained relative to its anatomical size: -3 to -8.
   - Minor action missed: -1 to -3.
   - Apply cumulatively before reporting the final score.

5. SCAPULAR-DEPRESSION CUEING NOTE:
   When the routine includes pulldown movements (Lat Pulldown, Single-Arm Cable Pulldown, Pull-Up / Chin-Up, Lat Prayer, Pullover), include in the rating output a brief reminder: "Initiate the pull by depressing your scapulae (pull shoulder blades down before pulling the elbows down). This is what makes pulldowns a true scapular depressor exercise."

OUTPUT REQUIREMENTS:
- "coverage.hit" / "coverage.missing" arrays MUST use exact joint-action names from the taxonomy.
- Every exercise in "optimizedRoutine" must include "jointActions" drawn from the canonical list.
- "optimizedRoutine" should be a complete weekly rewrite that fills coverage gaps, eliminates redundancy, respects 40/60 compound-isolation balance, and would score 100/100.

YOU MUST RESPOND WITH STRICT JSON matching the provided schema.`;

const ratingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "verdict", "selectionBreakdown", "volumeBreakdown", "coverage", "intensityNote", "scapularDepressionNote", "optimizedRoutine"],
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
      required: ["reps", "sessionCaps", "frequency", "compoundIsolationIntensity"],
      properties: {
        reps: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
        sessionCaps: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
        frequency: { type: "object", additionalProperties: false, required: ["score", "notes"], properties: { score: { type: "number" }, notes: { type: "string" } } },
        compoundIsolationIntensity: {
          type: "object",
          additionalProperties: false,
          required: ["score", "notes"],
          properties: {
            score: { type: "number", description: "0-12.5 after compound/isolation ratio + RIR-mismatch penalties" },
            notes: { type: "string", description: "Explain compound/isolation ratio + how user's RIR answers affected the score" },
          },
        },
      },
    },
    coverage: {
      type: "object",
      additionalProperties: false,
      required: ["hit", "missing"],
      properties: {
        hit: { type: "array", items: { type: "string" }, description: "Joint actions well covered (exact taxonomy names)" },
        missing: { type: "array", items: { type: "string" }, description: "Joint actions missed or under-trained relative to anatomical size" },
      },
    },
    intensityNote: {
      type: "string",
      description: "1-3 sentences on whether the user's chosen RIR aligns with the targets (compound 1-2 RIR / isolation 0 RIR), with brief Nippard-style framing about pushing close to failure with consistent movement quality.",
    },
    scapularDepressionNote: {
      type: "string",
      description: "Empty string if no pulldown movements present. Otherwise the scapular-depression cueing reminder.",
    },
    optimizedRoutine: {
      type: "array",
      description: "Complete rewritten routine that would score 100/100. Exercises in the order they should be performed within the week.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["exercise", "sets", "repRange", "rir", "category", "targetedMuscles", "jointActions", "rationale"],
        properties: {
          exercise: { type: "string", description: "Exercise name including angle if applicable" },
          angle: { type: "string", description: "Angle/variation if not in name" },
          equipment: { type: "string", description: "Equipment used" },
          sets: { type: "number" },
          repRange: { type: "string", description: "e.g. '8-12'" },
          rir: { type: "string", description: "Recommended RIR for this exercise — typically 1-2 for compounds, 0 for isolations" },
          frequency: { type: "string", description: "e.g. '2x per week'" },
          category: { type: "string", enum: ["systemic", "regional"] },
          targetedMuscles: { type: "array", items: { type: "string" } },
          jointActions: {
            type: "array",
            items: { type: "string" },
            description: "Joint actions produced, drawn from the canonical taxonomy",
          },
          rationale: { type: "string", description: "Why this exercise was chosen / what gap it fills" },
        },
      },
    },
  },
};

const inputSchema = z.object({
  source: z.enum(["routine", "text", "image"]),
  text: z.string().optional(),
  imageDataUrl: z.string().optional(),
  effort: z
    .object({
      compoundRIR: z.enum(["0", "1-2", "3+"]),
      isolationRIR: z.enum(["0", "1-2", "3+"]),
    })
    .optional(),
});

export const ratingRouter = router({
  rateWorkout: publicProcedure
    .input(inputSchema)
    .mutation(async ({ input }) => {
      const userContent: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } }
      > = [];

      const effort = input.effort ?? { compoundRIR: "1-2" as const, isolationRIR: "0" as const };
      const effortBlock = `\n\nUSER'S SELF-REPORTED EFFORT (assume movement quality is held constant):\n- Compound / multi-joint working sets: ${effort.compoundRIR} RIR (target 1-2)\n- Isolation / single-joint working sets: ${effort.isolationRIR} RIR (target 0)\n\nApply the RIR penalties from section 2D using these values. Do not infer RIR from the load or rep ranges — trust the user's stated answer.`;

      if (input.source === "image") {
        if (!input.imageDataUrl) throw new Error("imageDataUrl required for image source");
        userContent.push({
          type: "text",
          text: `Evaluate this weekly workout. Read all exercises, sets, reps, weights and angles from the image, then apply the Hypertrophy Matrix Rating System.${effortBlock}`,
        });
        userContent.push({
          type: "image_url",
          image_url: { url: input.imageDataUrl, detail: "high" },
        });
      } else {
        if (!input.text) throw new Error("text required for routine/text source");
        const intro =
          input.source === "routine"
            ? "Evaluate the following weekly microcycle (built in the Kinesiology Workout Builder) using the Hypertrophy Matrix Rating System."
            : "Evaluate the following weekly workout (provided by the user as text) using the Hypertrophy Matrix Rating System.";
        userContent.push({ type: "text", text: `${intro}\n\n${input.text}${effortBlock}` });
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
