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

5. JOINT-ACTION COVERAGE (20 pts, MAJORS only, anatomically weighted, POSITIVE-only):
   The pool earns credit for hitting each canonical MAJOR joint action. The 5 MINOR / stabilizer actions are tracked SEPARATELY as a bonus pool (see "MINOR COVERAGE BONUS" below). Bonus points are added on top of the 100 — they never deduct.

   22 MAJOR movers — collectively up to 20 pts (~0.91 each, half-credit ~0.45):
     Knee Extensors, Knee Flexors, Hip Extensors, Hip Abductors, Hip Adductors, Shoulder Flexors, Shoulder Extensors, Shoulder Abductors, Shoulder Adductors, Shoulder Horizontal Adductors, Shoulder Horizontal Abductors, Shoulder External Rotators, Elbow Flexors, Elbow Extensors, Spinal Flexors, Spinal Extensors, Ankle Plantarflexors, Scapular Retractors, Scapular Protractors, Scapular Downward Rotators, Scapular Depressors, Scapular Upward Rotators.

   NOTE: Scapular Depressors (lower trap), Scapular Upward Rotators (lower trap + serratus), and Hip Adductors are MAJOR — sizeable muscles that desk-bound lifters or those with hip/groin asymmetries chronically under-train.

   For each action: +full (covered directly by 2+ exercises) / +half (covered directly by exactly 1 exercise) / +0 (not directly covered).

   DIRECT COVERAGE ONLY — indirect / stabilizer / passive-stretch involvement does NOT count toward the score:
   An exercise covers a joint action ONLY when it is the dynamic prime mover or an obvious co-mover doing concentric or eccentric work through a meaningful range. Stabilizer roles, isometric bracing, and passive loaded stretch do NOT score points by default — those become the basis for cueingTips instead (see below).

   What counts as DIRECT and earns points:
   - Squat / Hack / Leg Press → Knee Extensors, Hip Extensors. (NOT Spinal Ext, NOT Hip stabilizers, NOT Ankle PF — those are stabilizer / stretch roles.)
   - Romanian DL / Conventional DL → Hip Extensors, Knee Flexors (RDL emphasis).
   - Sumo Deadlift → Hip Extensors, Hip Adductors (active concentric).
   - Calf Raise / Standing Calf / Seated Calf → Ankle Plantarflexors.
   - Machine Shoulder Press / Overhead Press / Front Raise → Shoulder Flexors, Shoulder Abductors (depending on plane).
   - Pulldown / Pull-Up / Chin-Up → Shoulder Extensors / Adductors, Scapular Downward Rotators.
   - Cable Pullover / Lat Prayer / Single-Arm Cable Pulldown (Facing Away) → Shoulder Extensors, Scapular Downward Rotators (concentric pull). The eccentric stretch at the top is felt, but it's the concentric work that earns the point.
   - Chest Press / Incline Press / Push-Up / Dip → Shoulder Horizontal Adductors + Scapular Protractors (lockout phase = direct concentric).
   - Row → Shoulder Extensors / Horizontal Abductors, Scapular Retractors.
   - Face Pull (rope at face level, thumbs rotating back) → Shoulder Horizontal Abductors, Scapular Retractors, AND Shoulder External Rotators (the rotation is part of the standard movement pattern, not an optional cue).
   - Cable / DB External Rotation, Cuban Press, Reverse-Grip External Rotation → Shoulder External Rotators (direct).
   - Hip Thrust / Glute Kickback → Hip Extensors.
   - Hip Abduction Machine / Cable Abduction → Hip Abductors.
   - Hip Adduction Machine / Cable Adduction → Hip Adductors.
   - Plank / Pallof Press / Side Plank → Spinal Extensors / Spinal Rotators & Lateral Flexors (anti-rotation / anti-extension is a direct training stimulus for these).
   - Leg Curl / Glute-Ham Raise → Knee Flexors.

   What does NOT count as direct (and therefore goes into cueingTips when undertrained):
   - Squat-as-spinal-extensor (it's a stabilizer role only).
   - Squat-as-hip-stabilizer (Abd / Add / IR / ER are bracing only).
   - Squat-as-ankle-plantarflexor (passive stretch, not a training stimulus).
   - Pressing-as-scapular-stabilizer beyond protraction.
   - Any "the antagonist is also working" claim.

   Earn points for what's covered DIRECTLY. Nothing subtracted afterward.

CUEING TIPS FOR UNDER-COVERED MAJOR ACTIONS — recovery bridge for the 100-pt score:
Because indirect / stabilizer / stretch roles no longer auto-credit, the routine WILL lose points whenever a MAJOR joint action is only "indirectly" present. cueingTips[] is how the user can recover that gap consciously — by upgrading a stabilizer role into deliberate, direct training through cueing.

For every MAJOR joint action that scored 0 or half-credit, populate cueingTips[] (limit to the 4 most impactful tips) with concrete advice tying the under-trained action to a specific exercise the user already has. Each tip should explain HOW the user can intentionally engage that action via controlled movement, breath, or set-up — turning what was previously stabilizer work into a real training stimulus. Examples:
  • "Spinal Extensors: during your Romanian Deadlift, set your back into hard extension before each rep and hold it actively under load — don't let the spine pass through neutral on autopilot. Held tension under bar load = direct stimulus."
  • "Scapular Upward Rotators: during your Machine Shoulder Press, deliberately let the shoulder blades rotate up and around the ribcage at lockout instead of shrugging straight up. The serratus and lower trap drive the motion when cued this way."
  • "Shoulder External Rotators: if you don't have face pulls or a dedicated rotator-cuff exercise, finish your last set of any rear-delt or rowing movement with 8–10 strict external rotations using a light dumbbell or band."
  • "Hip Adductors: switch your usual squat or leg press to a wider stance for one set per session — the adductors take over a meaningful share of the work as your knees track wider than your hips."
  • "Ankle Plantarflexors: at the bottom of your Barbell Squat, drive through the balls of your feet and feel the calves load up before standing — that's the difference between passive stretch and an actual stimulus."

If a MAJOR action is truly missing AND no exercise in the routine can plausibly train it via cueing, suggest a small substitute — e.g. "Add a single set of Lat Pulldowns to cover Scapular Downward Rotators."

Skip cueingTips entirely (empty array) only if every MAJOR action is at full credit.

═══ MINOR COVERAGE BONUS · up to +1.5 (separate from the 100) ═══
The 5 MINOR / stabilizer actions are tracked here as bonus points awarded ON TOP of the 100. They are NEVER deducted — a routine that ignores all 5 still hits 100/100 if the majors are clean.

5 MINOR actions, +0.30 each (full direct coverage by 2+ exercises) / +0.15 each (half-credit, 1 direct exercise) / +0 each (not directly covered):
  - Scapular Elevators (upper trap, levator scapulae)
  - Spinal Rotators & Lateral Flexors (obliques)
  - Hip Flexors (iliopsoas, rectus femoris, TFL)
  - Hip External Rotators (piriformis, glute max)
  - Hip Internal Rotators (glute med/min, TFL)

Maximum bonus: 5 × 0.30 = +1.5.

For each minor action that is NOT at full credit, give an OPPORTUNITY TIP (separate field minorBonus.opportunityTips[]) — a short suggestion for how the user could grab the bonus by adding light direct work or cueing an existing exercise. Cap at 3 tips. Examples:
  • "Spinal Rotators & Lateral Flexors: hold a single DB on one side during your Walking Lunge — the obliques fire isometrically against the asymmetric load."
  • "Hip External Rotators: a single set of Clamshells or Banded Hip ER before squats both warms the cuff and grabs +0.30 bonus."
  • "Scapular Elevators: light DB Shrugs once a week is enough to hit this minor at full credit."
Skip the array (empty) only if all 5 minors are at full credit.

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
- Final "score" = sum of all 5 criterion scores. Cap at 100. The minorBonus is tracked SEPARATELY and NOT included in "score".
- minorBonus.score is 0 to 1.5, summed across the 5 minor actions at +0.30 each.
- coverage.hit / coverage.missing arrays use exact taxonomy names; coverage tracks MAJORS only. minorBonus.hit / minorBonus.missing track the 5 minor actions only.
- Every exercise in "optimizedRoutine" must include "jointActions" drawn from the canonical list.
- "optimizedRoutine" should be a complete weekly rewrite that fills coverage gaps, eliminates redundancy, respects the 20–45% compound-isolation band, and would score 100/100 against this rubric (with bonus minorBonus on top wherever feasible).

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
    "minorBonus",
    "scapularDepressionNote",
    "optimizedRoutine",
  ],
  properties: {
    score: { type: "number", description: "Final score 0-100, summed from all 5 criteria. Does NOT include minorBonus." },
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
      required: ["score", "hit", "missing", "notes", "cueingTips"],
      properties: {
        score: { type: "number", description: "0-20. MAJORS only. 22 major movers, ~0.91 each (half-credit ~0.45)." },
        hit: { type: "array", items: { type: "string" }, description: "MAJOR joint actions well covered (exact taxonomy names)." },
        missing: { type: "array", items: { type: "string" }, description: "MAJOR joint actions missed or under-trained." },
        notes: { type: "string", description: "Tone-matched coaching comment (poor/medium/good per the score tier)." },
        cueingTips: {
          type: "array",
          items: { type: "string" },
          description: "1-4 concrete cueing tips for under-trained MAJOR joint actions, each naming a specific exercise the user already has and how to consciously engage the under-trained action. Empty if every major action is at full credit.",
        },
      },
    },
    minorBonus: {
      type: "object",
      additionalProperties: false,
      required: ["score", "hit", "missing", "notes", "opportunityTips"],
      properties: {
        score: { type: "number", description: "Bonus 0 to 1.5, summed across the 5 minor actions at +0.30 each (full) or +0.15 (half). Added on top of the 100." },
        hit: { type: "array", items: { type: "string" }, description: "Minor joint actions covered directly (exact taxonomy names from the 5-minor list)." },
        missing: { type: "array", items: { type: "string" }, description: "Minor joint actions not covered." },
        notes: { type: "string", description: "Brief note on which minors were grabbed and which are easy bonus pickups." },
        opportunityTips: {
          type: "array",
          items: { type: "string" },
          description: "0-3 short suggestions for grabbing missed bonus points by adding light direct work or cueing existing exercises. Empty if all minors at full credit.",
        },
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

5. JOINT-ACTION COVERAGE (14 pts, MAJORS only): 22 major movers up to 14 pts (~0.64 each, half-credit ~0.32). The 5 minors are tracked separately as a bonus (max +1.05) and never deducted from the 100. Direct coverage only — same rule as the pool stage.
   MAJOR (22): Knee Extensors, Knee Flexors, Hip Extensors, Hip Abductors, Hip Adductors, Shoulder Flexors, Shoulder Extensors, Shoulder Abductors, Shoulder Adductors, Shoulder Horizontal Adductors, Shoulder Horizontal Abductors, Shoulder External Rotators, Elbow Flexors, Elbow Extensors, Spinal Flexors, Spinal Extensors, Ankle Plantarflexors, Scapular Retractors, Scapular Protractors, Scapular Downward Rotators, Scapular Depressors, Scapular Upward Rotators.
   MINOR (5, bonus track): Scapular Elevators, Spinal Rotators & Lateral Flexors, Hip Flexors, Hip External Rotators, Hip Internal Rotators.
   DIRECT COVERAGE ONLY — same rule as the pool stage. Indirect involvement (squat-as-spinal-extensor, squat-as-hip-stabilizer, squat-as-ankle-PF-via-stretch, press-as-scapular-stabilizer beyond protraction) does NOT score points. The user can recover those points by following the cueingTips. Each action: +full (covered directly by 2+ exercises across the week) / +half (1 direct exercise) / +0 (not directly covered). Positive-only.

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

CUEING TIPS FOR UNDER-COVERED MAJOR ACTIONS — recovery bridge for the 100-pt score (same rule as the pool prompt):
For every MAJOR action that scored 0 or half-credit, give a concrete tip naming a specific exercise the user already has across the week and explaining HOW to consciously upgrade that stabilizer / stretch role into intentional direct training (e.g., "Spinal Extensors: during your RDL, set hard back extension before each rep and hold it under load — that turns a stabilizer role into a direct stimulus"). Cap at 4 tips. If an action is truly missing AND no plausible cue exists in the routine, suggest a small substitute exercise instead.

═══ MINOR COVERAGE BONUS · up to +1.05 (separate from the 100) ═══
The 5 MINOR actions are bonus points awarded ON TOP of the 100. Same direct-coverage rule.
+0.21 each (full direct coverage by 2+ exercises across the week) / +0.105 each (half) / +0 each (not directly covered). Maximum bonus: 5 × 0.21 = +1.05.
The 5 MINOR actions: Scapular Elevators, Spinal Rotators & Lateral Flexors, Hip Flexors, Hip External Rotators, Hip Internal Rotators.
Populate minorBonus.opportunityTips[] (cap 3) with short suggestions for grabbing missed bonus points by adding light direct work or cueing existing exercises. Skip (empty array) only if all 5 minors at full credit.

SCAPULAR-DEPRESSION CUEING:
If pulldown movements present (Lat Pulldown, Single-Arm Cable Pulldown, Pull-Up / Chin-Up, Lat Prayer, Pullover), populate scapularDepressionNote with the cueing reminder. Otherwise empty string.

OUTPUT REQUIREMENTS:
- Final "score" = sum of all 8 criterion scores (capped at 100). Does NOT include minorBonus.
- minorBonus.score is 0 to 1.05.
- coverage.hit / coverage.missing track MAJORS only. minorBonus.hit / minorBonus.missing track the 5 minor actions only. All names must be exact taxonomy names.
- "optimizedDailyPlan" should re-write the entire week's split + sets/reps to score 100/100 (with the +1.05 minor bonus where feasible).

YOU MUST RESPOND WITH STRICT JSON matching the provided schema.`;

const postSplitRatingSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "verdict",
    "selectionBreakdown",
    "coverageBreakdown",
    "minorBonus",
    "postSplitAddOns",
    "scapularDepressionNote",
    "optimizedDailyPlan",
  ],
  properties: {
    score: { type: "number", description: "Final score 0-100, summed from all 8 criteria. Does NOT include minorBonus." },
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
      required: ["score", "hit", "missing", "notes", "cueingTips"],
      properties: {
        score: { type: "number", description: "0-14. MAJORS only. 22 major movers, ~0.64 each (half ~0.32)." },
        hit: { type: "array", items: { type: "string" }, description: "MAJOR joint actions covered directly across the week." },
        missing: { type: "array", items: { type: "string" }, description: "MAJOR joint actions missed or under-trained." },
        notes: { type: "string" },
        cueingTips: {
          type: "array",
          items: { type: "string" },
          description: "1-4 concrete cueing tips for under-trained MAJOR joint actions, naming a specific exercise the user already has and how to engage the action via controlled movement. Empty if every major action is at full credit.",
        },
      },
    },
    minorBonus: {
      type: "object",
      additionalProperties: false,
      required: ["score", "hit", "missing", "notes", "opportunityTips"],
      properties: {
        score: { type: "number", description: "Bonus 0 to 1.05, summed across the 5 minor actions at +0.21 each (full) or +0.105 (half). Added on top of the 100." },
        hit: { type: "array", items: { type: "string" }, description: "Minor joint actions covered directly (exact taxonomy names from the 5-minor list)." },
        missing: { type: "array", items: { type: "string" }, description: "Minor joint actions not covered." },
        notes: { type: "string", description: "Brief note on which minors were grabbed and which are easy bonus pickups." },
        opportunityTips: {
          type: "array",
          items: { type: "string" },
          description: "0-3 short suggestions for grabbing missed bonus points by adding light direct work or cueing existing exercises. Empty if all minors at full credit.",
        },
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
