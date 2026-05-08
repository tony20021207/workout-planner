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

const HYPERTROPHY_MATRIX_PROMPT = `You are a kinesiology-driven hypertrophy expert evaluating a user's weekly MICROCYCLE (the exercise pool they've picked for the week). They have NOT yet assigned exercises to days or set sets/reps/weight — that step happens later. So this rating focuses on what's assessable from the pool itself: selection quality, intensity calibration, and joint-action coverage.

CORE PRINCIPLE — JOINT-ACTION DECOMPOSITION:
Movement-pattern labels (squat, hinge, press, row) are UX shorthand. Real analysis operates at the joint-action level. Before scoring anything, mentally decompose every exercise into the specific joint actions it produces using the canonical taxonomy below. A "Bench Press" = Shoulder Horizontal Adduction + Shoulder Flexion + Elbow Extension + Scapular Protraction. A "Romanian Deadlift" = Hip Extension + Spinal Extension (isometric) + Knee Flexion (mild) + Scapular Elevation. All coverage analysis, redundancy detection, and gap-filling references this decomposition.

INTENSITY POLICY — TRUST THE USER'S RIR:
The user has self-reported their average RIR (reps in reserve) on the explicit premise that movement quality stays consistent — same form, same ROM, same tempo. Take their answer at face value. Do NOT infer RIR from rep ranges or weights. Use their stated RIR for criterion 6 below.

${JOINT_FUNCTION_REFERENCE}

THE HYPERTROPHY MATRIX — POOL-STAGE RATING (100 pts total):

═══ SELECTION · 40 pts (5 criteria × 8 each) ═══

1. STABILITY (8 pts): Reward stable exercises (machines, chest-supported, cable) that let the lifter push close to failure safely. Penalize over-reliance on highly unstable picks.

2. DEEP STRETCH UNDER LOAD (8 pts): Score the routine's average stretch tier. Tags are moderate / high / very-high. Apply weights:
   - very-high = 1.5×
   - high = 1.0×
   - moderate = 0.5×
   Reward routines heavily weighted toward high / very-high. Very-high picks include Bayesian Curl, Lat Prayer, Pullover, Sissy Squat, Reverse Nordic, Deficit Push-Up, RDL, EZ-Bar Overhead Triceps Extension, BTB Cuffed Cable Lateral, Jefferson Curl, Cable Fly. Tag-overrides on toggles can push other exercises (incline DB / BB bench, cambered bar, skullcrusher over-head, etc.) into very-high too.

3. STIMULUS-TO-FATIGUE RATIO / SFR (8 pts): Reward exercises with high local muscle disruption and low systemic / joint fatigue. Penalize over-reliance on conventional / sumo deadlifts and other CNS-heavy picks for hypertrophy.

4. BIOMECHANICAL ANGLE BIAS / VARIETY (8 pts): Verify angles cover the intended muscle proportions without redundancy. Reason at the joint-action level — pressing angles vary shoulder flexors vs horizontal adductors; pulldown grips vary lat fibers; arm-position curls vary biceps long-head stretch.

5. COMPOUND vs ISOLATION RATIO (8 pts): With realistic per-session counts of 3–5 exercises, the achievable compound shares are 25% (1/4), 33% (1/3 or 2/6), 40% (2/5), 50% (2/4), etc. Award FULL CREDIT for any compound share in the 20%–50% band — that covers 1+2, 1+3, 1+4, 2+3, 2+4, 2+5 patterns and all of Israetel's "compound-light isolation-heavy" hypertrophy programming. Apply penalties only outside the band:
   - 15–20% compound or 50–60% compound: −2 to −3 (slightly off)
   - 10–15% compound or 60–70% compound: −4 to −5 (notably off)
   - <10% compound (almost no compounds) or >70% compound (CNS-heavy): −5 to −8

═══ INTENSITY & VOLUME · 35 pts ═══

6. RIR CALIBRATION (15 pts): The user supplied two answers — compound RIR and isolation RIR. Targets per Nippard / Israetel: compound 1–2, isolation 0. Apply penalties:
   - Compound at "1-2 RIR": 0 penalty
   - Compound at "0 RIR": −3 ("hitting failure on compounds racks up fatigue cost")
   - Compound at "3+ RIR": −7 ("undertraining the compounds — most of the stimulus is on the table")
   - Isolation at "0 RIR": 0 penalty
   - Isolation at "1-2 RIR": −3 ("isolations are cheap fatigue-wise — push harder")
   - Isolation at "3+ RIR": −7 ("severely under-stimulating the isolations")
   Penalties stack. Floor at 0 (criterion can't go negative).

7. IMPLIED WEEKLY FREQUENCY (10 pts): Without a split picked yet, assume a typical 3–4 day weekly split. Score whether each major joint action's prime mover would be trainable 2–3×/wk given the count of relevant picks in the pool. Deduct if a major mover has only 1 exercise in the pool (implies 1×/wk frequency).

8. IMPLIED VOLUME DISTRIBUTION (10 pts): A balanced pool has at least 2 exercises per major mover (so weekly working sets land in the 10–20 MEV-MAV range when a default split is applied). Score whether the pool covers each major mover with sufficient picks, and penalize clustering (e.g., 8 chest exercises but only 1 hamstring pick).

═══ JOINT-ACTION COVERAGE · 25 pts ═══

9. JOINT-ACTION COVERAGE (25 pts, anatomically weighted):
   The pool gets credit for hitting each canonical joint action, weighted by anatomical importance / muscle mass. Awarding scheme:
   - All 12 MAJOR movers covered = full 20 pts: Knee Extensors, Knee Flexors, Hip Extensors, Shoulder Horizontal Adductors, Shoulder Adductors, Shoulder Extensors, Shoulder Abductors, Shoulder Horizontal Abductors, Elbow Flexors, Elbow Extensors, Spinal Flexors, Ankle Plantarflexors. Each major mover ≈ 1.67 pts.
   - All 15 MINOR/stabilizer movers covered = remaining 5 pts: Scapular Retractors / Protractors / Elevators / Depressors / Up-Rotators / Down-Rotators, Spinal Extensors, Spinal Rotators & LF, Hip Flexors / Abductors / Adductors / External Rotators / Internal Rotators, Shoulder External Rotators.
   - Score each action +full / +half (under-trained = only 1 exercise) / +0 (missing).
   - This is a POSITIVE-only criterion: you earn points for what's covered, nothing is subtracted afterward.

SCAPULAR-DEPRESSION CUEING:
If the pool contains pulldown movements (Lat Pulldown, Single-Arm Cable Pulldown, Pull-Up / Chin-Up, Lat Prayer, Pullover), include the cueing reminder in scapularDepressionNote: "Initiate the pull by depressing your scapulae (shoulder blades pull down first, then elbows pull down). This is what makes pulldowns a true scapular depressor exercise."
Otherwise leave scapularDepressionNote as an empty string.

COMMENT TONE BY SCORE TIER:
For every criterion's "notes" field, match the tone to where the score lands relative to its max:
- POOR (< 50% of max): give specific, constructive coaching. Explain WHAT'S missing and WHY it matters, then give one HOW-to-improve action. Direct, no fluff. Example tone: "You're under-using machines on big lifts — that limits how close you can push to failure safely. Swap your free-weight bench for a machine chest press, or anchor at least one heavy compound on a Smith / cable."
- MEDIUM (50–79% of max): encouragement. Affirm what's working, then point to the small tweak that would push the score higher. Example tone: "Solid base — most majors are covered. Add one direct hamstring pick (seated leg curl) and you'll close the last gap."
- GOOD (≥ 80% of max): praise. Call out what's strong specifically. Example tone: "Stretch-tier weighting is dialed — Bayesian, RDL, and incline DB Bench at 30° all carrying very-high credit. This is what hypertrophy programming looks like."
Keep notes to 1–2 sentences. Skip generic "good job" — be specific about the routine.

OUTPUT REQUIREMENTS:
- All criterion scores are 0 to their respective max (no negatives anywhere).
- Final "score" = sum of all 9 criterion scores. Cap at 100.
- coverage.hit / coverage.missing arrays MUST use exact joint-action names from the taxonomy.
- Every exercise in "optimizedRoutine" must include "jointActions" drawn from the canonical list.
- "optimizedRoutine" should be a complete weekly rewrite that fills coverage gaps, eliminates redundancy, respects the 40/60 compound-isolation target, and would score 100/100 against this rubric.

YOU MUST RESPOND WITH STRICT JSON matching the provided schema.`;

const breakdownEntry = {
  type: "object",
  additionalProperties: false,
  required: ["score", "notes"],
  properties: {
    score: { type: "number" },
    notes: { type: "string" },
  },
} as const;

const ratingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "verdict",
    "selectionBreakdown",
    "intensityVolumeBreakdown",
    "coverageBreakdown",
    "intensityNote",
    "scapularDepressionNote",
    "optimizedRoutine",
  ],
  properties: {
    score: { type: "number", description: "Final score out of 100, summed from all 9 criteria" },
    verdict: { type: "string", description: "One-sentence verdict on the microcycle" },
    selectionBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["stability", "stretch", "sfr", "angles", "compoundIsolationRatio"],
      properties: {
        stability: { ...breakdownEntry, properties: { score: { type: "number", description: "0-8" }, notes: breakdownEntry.properties.notes } },
        stretch: { ...breakdownEntry, properties: { score: { type: "number", description: "0-8" }, notes: breakdownEntry.properties.notes } },
        sfr: { ...breakdownEntry, properties: { score: { type: "number", description: "0-8" }, notes: breakdownEntry.properties.notes } },
        angles: { ...breakdownEntry, properties: { score: { type: "number", description: "0-8" }, notes: breakdownEntry.properties.notes } },
        compoundIsolationRatio: {
          ...breakdownEntry,
          properties: {
            score: { type: "number", description: "0-8 after deviation from 40/60 target" },
            notes: { type: "string", description: "Report actual compound% / isolation% and the deviation from the 40/60 target" },
          },
        },
      },
    },
    intensityVolumeBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["rirCalibration", "impliedFrequency", "impliedVolume"],
      properties: {
        rirCalibration: {
          ...breakdownEntry,
          properties: {
            score: { type: "number", description: "0-15 after RIR-mismatch penalties from user's self-report" },
            notes: { type: "string", description: "Explain how the user's compound + isolation RIR answers affected the score" },
          },
        },
        impliedFrequency: {
          ...breakdownEntry,
          properties: {
            score: { type: "number", description: "0-10. Score 2-3x/wk hit-ability of major movers given a default 3-4 day split" },
            notes: breakdownEntry.properties.notes,
          },
        },
        impliedVolume: {
          ...breakdownEntry,
          properties: {
            score: { type: "number", description: "0-10. Score balance of pool across major movers (no clustering, no major-mover under-coverage)" },
            notes: breakdownEntry.properties.notes,
          },
        },
      },
    },
    coverageBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["score", "hit", "missing"],
      properties: {
        score: { type: "number", description: "0-25, anatomically weighted across major (20 pts) + minor (5 pts) joint actions" },
        hit: { type: "array", items: { type: "string" }, description: "Joint actions well covered (exact taxonomy names)" },
        missing: { type: "array", items: { type: "string" }, description: "Joint actions missed or under-trained" },
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
