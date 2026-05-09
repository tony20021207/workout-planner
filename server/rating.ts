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

const HYPERTROPHY_MATRIX_PROMPT = `You are a kinesiology-driven hypertrophy expert evaluating a user's weekly MICROCYCLE (the exercise pool they've picked for the week). They have NOT yet assigned exercises to days or set sets/reps/weight. This rating focuses on what's assessable from the pool itself: selection quality, compound balance, and joint-action coverage.

CORE PRINCIPLE — JOINT-ACTION DECOMPOSITION:
Movement-pattern labels are UX shorthand. Real analysis operates at the joint-action level. Decompose every exercise into the specific joint actions it produces using the canonical taxonomy below before scoring.

${JOINT_FUNCTION_REFERENCE}

THE HYPERTROPHY MATRIX — POOL-STAGE RATING (100 pts total, 5 criteria × 20 pts each):

1. STABILITY (20 pts): Reward stable exercises (machines, chest-supported, cable) that let the lifter push close to failure safely. Penalize over-reliance on highly unstable picks. A pool dominated by stable picks earns full credit; one with mostly unstable free-weight movements should score 8–12; one with no stable picks at all should score 4–8.

2. DEEP STRETCH UNDER LOAD (20 pts): Score the routine's average stretch tier. Tags are moderate / high / very-high. Apply weights:
   - very-high = 1.5×
   - high = 1.0×
   - moderate = 0.5×
   Compute the weighted average per exercise across the pool, normalize to a 0–20 score where a pool of all very-high picks = 20, all high = 14, all moderate = 7. Mixed pools land in between. Very-high picks include Bayesian Curl, Lat Prayer, Pullover, Sissy Squat, Reverse Nordic, Deficit Push-Up, RDL, EZ-Bar Overhead Triceps Extension, BTB Cuffed Cable Lateral, Jefferson Curl, Cable Fly. Tag-overrides on toggles can push other exercises (incline DB / BB bench, cambered bar, skullcrusher over-head, etc.) into very-high too.

3. STIMULUS-TO-FATIGUE RATIO / SFR (20 pts): Reward exercises with high local muscle disruption and low systemic / joint fatigue. Penalize over-reliance on conventional / sumo deadlifts and other CNS-heavy picks for hypertrophy. A pool of high-SFR machines + cables = 18–20; a pool relying on heavy free-weight compounds = 8–12.

4. COMPOUND vs ISOLATION RATIO (20 pts): With realistic per-session counts of 3–5 exercises, achievable compound shares are 25% (1/4), 33% (1/3 or 2/6), 40% (2/5), etc. Award FULL CREDIT (20) for any compound share in the 20–45% band. 50%+ ratios (3C+3I out of 6, 2C+2I out of 4) get a small penalty (CNS-heavy). Penalty curve:
   - 45–55% compound: −2 to −5 (slightly compound-heavy)
   - 15–20% or 55–65%: −5 to −8
   - 10–15% or 65–75%: −10 to −13
   - <10% compound (almost none) or >75% compound (very CNS-heavy): −13 to −18

5. JOINT-ACTION COVERAGE (20 pts, anatomically weighted, POSITIVE-only):
   The pool earns credit for hitting each canonical joint action, weighted by anatomical importance / muscle mass.
   - All 12 MAJOR movers covered = full 16 pts: Knee Extensors, Knee Flexors, Hip Extensors, Shoulder Horizontal Adductors, Shoulder Adductors, Shoulder Extensors, Shoulder Abductors, Shoulder Horizontal Abductors, Elbow Flexors, Elbow Extensors, Spinal Flexors, Ankle Plantarflexors. Each major ≈ 1.33 pts.
   - All 15 MINOR/stabilizer movers covered = remaining 4 pts: Scapular Retractors / Protractors / Elevators / Depressors / Up-Rotators / Down-Rotators, Spinal Extensors, Spinal Rotators & LF, Hip Flexors / Abductors / Adductors / External Rotators / Internal Rotators, Shoulder External Rotators.
   - Score each action +full / +half (under-trained = only 1 exercise) / +0 (missing).
   - Earn points for what's covered. Nothing subtracted afterward.

SCAPULAR-DEPRESSION CUEING:
If the pool contains pulldown movements (Lat Pulldown, Single-Arm Cable Pulldown, Pull-Up / Chin-Up, Lat Prayer, Pullover), populate scapularDepressionNote with: "Initiate the pull by depressing your scapulae (shoulder blades pull down first, then elbows pull down). This is what makes pulldowns a true scapular depressor exercise." Otherwise leave it empty.

COMMENT TONE BY SCORE TIER:
For every criterion's "notes" field, match the tone to where the score lands relative to its max:
- POOR (< 50% of max): specific constructive coaching — what's missing, why it matters, one HOW-to-improve action.
- MEDIUM (50–79%): encouragement + the small tweak that would push higher.
- GOOD (≥ 80%): specific praise calling out what's strong about the routine.
Keep notes to 1–2 sentences. Skip generic "good job" — be specific.

OUTPUT REQUIREMENTS:
- All criterion scores are 0 to their respective max (no negatives anywhere).
- Final "score" = sum of all 5 criterion scores. Cap at 100.
- coverage.hit / coverage.missing arrays MUST use exact joint-action names from the taxonomy.
- Every exercise in "optimizedRoutine" must include "jointActions" drawn from the canonical list.
- "optimizedRoutine" should be a complete weekly rewrite that fills coverage gaps, eliminates redundancy, respects the 20–45% compound-isolation band, and would score 100/100 against this rubric.

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
    "coverageBreakdown",
    "scapularDepressionNote",
    "optimizedRoutine",
  ],
  properties: {
    score: { type: "number", description: "Final score 0-100, summed from all 5 criteria" },
    verdict: { type: "string", description: "One-sentence verdict on the microcycle" },
    selectionBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["stability", "stretch", "sfr", "compoundIsolationRatio"],
      properties: {
        stability: { ...breakdownEntry, properties: { score: { type: "number", description: "0-20" }, notes: breakdownEntry.properties.notes } },
        stretch: { ...breakdownEntry, properties: { score: { type: "number", description: "0-20" }, notes: breakdownEntry.properties.notes } },
        sfr: { ...breakdownEntry, properties: { score: { type: "number", description: "0-20" }, notes: breakdownEntry.properties.notes } },
        compoundIsolationRatio: {
          ...breakdownEntry,
          properties: {
            score: { type: "number", description: "0-20. Full credit for 20-45% compound; 50%+ small penalty; outside the band scaled penalty." },
            notes: { type: "string", description: "Report actual compound% / isolation% and where it falls in the band." },
          },
        },
      },
    },
    coverageBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["score", "hit", "missing", "notes"],
      properties: {
        score: { type: "number", description: "0-20, anatomically weighted across 12 major (16 pts) + 15 minor (4 pts) joint actions." },
        hit: { type: "array", items: { type: "string" }, description: "Joint actions well covered (exact taxonomy names)." },
        missing: { type: "array", items: { type: "string" }, description: "Joint actions missed or under-trained." },
        notes: { type: "string", description: "Tone-matched coaching comment (poor/medium/good per the score tier)." },
      },
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
});

// ============================================================
// POST-SPLIT RATING — runs after split + sets/reps are configured
// ============================================================

const POST_SPLIT_PROMPT = `You are a kinesiology-driven hypertrophy expert evaluating a user's FINALIZED weekly training plan. The user has picked a split, distributed exercises across days, and assigned sets/reps/weight. Your rating considers the full daily picture.

CORE PRINCIPLE — JOINT-ACTION DECOMPOSITION (same as pool stage):
Decompose every exercise into the joint actions it produces using the canonical taxonomy below.

${JOINT_FUNCTION_REFERENCE}

THE HYPERTROPHY MATRIX — POST-SPLIT RATING (100 pts total):
The 5 pool-stage criteria are compressed proportionally to 70 pts (14 each). Three new add-ons worth 10 pts each (30 total) score the daily detail that wasn't visible at the pool stage. Final score = sum of all 8 criteria, capped at 100.

═══ COMPRESSED POOL-STAGE CRITERIA · 70 pts (5 × 14) ═══

1. STABILITY (14 pts): Reward stable picks (machines, chest-supported, cables) that allow safe near-failure work. Penalize over-reliance on highly unstable picks.

2. DEEP STRETCH (14 pts): Average stretchLevel weighted (very-high 1.5×, high 1×, moderate 0.5×). All very-high = 14, all high ≈ 9.3, all moderate ≈ 4.7. Mixed pools land in between.

3. SFR (14 pts): Stimulus-to-fatigue ratio. Penalize over-reliance on CNS-heavy lifts (conventional/sumo deadlifts, anything systemic-heavy without clear hypertrophy benefit).

4. COMPOUND vs ISOLATION RATIO (14 pts): WEEKLY ratio. Full credit for 20–45%. 45–55% = small penalty (CNS-heavy). Outside the band scale up:
   - 45–55%: −2 to −4
   - 15–20% or 55–65%: −5 to −7
   - <10% or >75%: −10 to −12

5. JOINT-ACTION COVERAGE (14 pts): Anatomically weighted across the 27-action taxonomy. 12 major movers up to ~11 pts, 15 minors up to ~3 pts. Positive-only — earn points for what's covered.

═══ POST-SPLIT ADD-ONS · 30 pts (3 × 10 each) ═══

6. SESSION CAPS (10 pts): Junk-volume check. Each joint-action prime mover should get no more than 6–8 working sets in a single session.
   - All sessions ≤6 sets per mover: full 10 pts
   - Occasional 7–8 set sessions: −1 to −3
   - Multiple sessions at 9–12 sets per mover: −4 to −7
   - Any session at 13+ sets for one mover: −7 to −10 (severe junk volume)

7. REP RANGE DISTRIBUTION (10 pts): ~80% of working-set volume in 8–15 reps, remaining 20% in heavy (5–8) or metabolic (20–30).
   - 80%+ in 8–15 with sensible heavy/metabolic mix: full 10 pts
   - 60–80% in target range: −2 to −4
   - All sets at 5 reps (powerlifting bias) or all at 25+ (no heavy stimulus): −5 to −9

8. TOTAL WEEKLY VOLUME vs MEV–MAV (10 pts): Per major mover, weekly working sets should land in the 10–20 MEV–MAV range.
   - All majors at 10–20 sets/wk: full 10 pts
   - Some near target, others off: −2 to −5
   - Major movers <10 sets/wk (under-MEV) or >25 sets/wk (over-MRV): −6 to −10

═══ COMMENT TONE BY SCORE TIER ═══

For every criterion's "notes" field, match the tone to where the score lands relative to max:
- POOR (<50%): specific constructive coaching — what's missing and how to fix.
- MEDIUM (50–79%): encouragement + one small tweak suggestion.
- GOOD (≥80%): specific praise calling out what's strong.
Keep notes to 1–2 sentences. Be specific.

SCAPULAR-DEPRESSION CUEING:
If pulldown movements present (Lat Pulldown, Single-Arm Cable Pulldown, Pull-Up / Chin-Up, Lat Prayer, Pullover), populate scapularDepressionNote with the cueing reminder. Otherwise empty string.

OUTPUT REQUIREMENTS:
- Final "score" = sum of all 8 criterion scores (capped at 100).
- coverage.hit / coverage.missing MUST use exact taxonomy names.
- "optimizedDailyPlan" should re-write the entire week's split + sets/reps to score 100/100.

YOU MUST RESPOND WITH STRICT JSON matching the provided schema.`;

const postSplitRatingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "verdict",
    "selectionBreakdown",
    "coverageBreakdown",
    "postSplitAddOns",
    "scapularDepressionNote",
    "optimizedDailyPlan",
  ],
  properties: {
    score: { type: "number", description: "Final score 0-100, summed from all 8 criteria" },
    verdict: { type: "string", description: "One-sentence verdict on the finalized week" },
    selectionBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["stability", "stretch", "sfr", "compoundIsolationRatio"],
      properties: {
        stability: breakdownEntry,
        stretch: breakdownEntry,
        sfr: breakdownEntry,
        compoundIsolationRatio: breakdownEntry,
      },
    },
    coverageBreakdown: {
      type: "object",
      additionalProperties: false,
      required: ["score", "hit", "missing", "notes"],
      properties: {
        score: { type: "number" },
        hit: { type: "array", items: { type: "string" } },
        missing: { type: "array", items: { type: "string" } },
        notes: { type: "string" },
      },
    },
    postSplitAddOns: {
      type: "object",
      additionalProperties: false,
      required: ["sessionCaps", "repRangeDistribution", "totalVolume"],
      properties: {
        sessionCaps: breakdownEntry,
        repRangeDistribution: breakdownEntry,
        totalVolume: breakdownEntry,
      },
    },
    scapularDepressionNote: { type: "string" },
    optimizedDailyPlan: {
      type: "array",
      description: "Day-by-day rewrite of the plan that would score 100/100.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dayName", "exercises"],
        properties: {
          dayName: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["exercise", "sets", "repRange", "rir", "category", "rationale"],
              properties: {
                exercise: { type: "string" },
                equipment: { type: "string" },
                angle: { type: "string" },
                sets: { type: "number" },
                repRange: { type: "string" },
                rir: { type: "string" },
                category: { type: "string", enum: ["systemic", "regional"] },
                rationale: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

const postSplitInputSchema = z.object({
  /** Plain-text serialization of the routine + split + per-day sets/reps. */
  text: z.string(),
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
          text: "Evaluate this weekly workout. Read all exercises, angles, and equipment from the image, then apply the Hypertrophy Matrix Rating System.",
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

  rateFinalizedWeek: publicProcedure
    .input(postSplitInputSchema)
    .mutation(async ({ input }) => {
      const intro =
        "Evaluate the following FINALIZED weekly training plan (split + day-by-day exercise assignments + sets/reps/weight) using the Hypertrophy Matrix Post-Split Rating System.";

      const result = await invokeLLM({
        messages: [
          { role: "system", content: POST_SPLIT_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `${intro}\n\n${input.text}` },
            ],
          },
        ],
        outputSchema: {
          name: "post_split_rating",
          schema: postSplitRatingSchema,
          strict: true,
        },
      });

      const raw = result.choices[0]?.message?.content;
      const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map(p => (p.type === "text" ? p.text : "")).join("") : "";

      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Failed to parse post-split rating response: " + text.slice(0, 200));
      }
    }),
});
