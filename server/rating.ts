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

const HYPERTROPHY_MATRIX_PROMPT = `You are a kinesiology-driven hypertrophy expert evaluating a user's weekly MICROCYCLE (the exercise pool they've picked for the week).

THIS RATING IS EXERCISE-SELECTION ONLY. Do NOT consider sets, reps,
weight, RIR, frequency, or rest. The user has not picked those yet
and will not pick them until after the split is built. Score and
recommend based purely on which exercises are in the pool:

  - Stability of the picks
  - Stretch profile of the picks
  - SFR (stimulus-to-fatigue ratio) of the picks
  - Compound vs isolation ratio across the pool
  - Major joint-action coverage across the pool
  - Minor joint-action coverage (bonus)
  - Favorite-driven bias

Recommendations (the pair-based diff) should propose EXERCISE swaps /
removes / adds — never set counts, rep ranges, or weights.

CORE PRINCIPLE — JOINT-ACTION DECOMPOSITION:
Movement-pattern labels are UX shorthand. Real analysis operates at the joint-action level. Decompose every exercise into the specific joint actions it produces using the canonical taxonomy below before scoring.

${JOINT_FUNCTION_REFERENCE}

THE HYPERTROPHY MATRIX — POOL-STAGE RATING (100 pts total, 5 criteria × 20 pts each):

1. STABILITY (20 pts): Reward stable exercises (machines, chest-supported, cable) that let the lifter push close to failure safely. Penalize over-reliance on highly unstable picks. A pool dominated by stable picks earns full credit; one with mostly unstable free-weight movements should score 8–12; one with no stable picks at all should score 4–8.

2. DEEP STRETCH UNDER LOAD (20 pts): Score the routine's average stretch tier. Tags are moderate / high / very-high. Apply weights:
   - very-high = 1.5×
   - high = 1.0×
   - moderate = 0.5×
   Compute the weighted average per exercise across the pool, normalize to a 0–20 score where a pool of all very-high picks = 20, all high = 14, all moderate = 7. Mixed pools land in between. Very-high picks include Bayesian Curl, Lat Prayer, Pullover, Sissy Squat, Reverse Nordic, Deficit Push-Up, RDL, EZ-Bar Overhead Triceps Extension, Jefferson Curl, Cable Fly. Tag-overrides on toggles can push other exercises (incline DB / BB bench, cambered bar, skullcrusher over-head, feet-elevated hip thrust / glute bridge, etc.) into very-high too.

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
   - Machine Shoulder Press / Overhead Press / Front Raise → Shoulder Flexors, Shoulder Abductors (depending on plane). Scapular Upward Rotators only score on overhead press WHEN cued for full lockout — see cueingTips.
   - Lateral Raise (Dumbbell / Cable / Machine / Super-ROM / Y-Raise) → Shoulder Abductors AND Scapular Upward Rotators (above ~90° of abduction the scapulo-humeral rhythm forces the scap into upward rotation; it's a real training stimulus, not a stabilizer role).
   - Pulldown / Pull-Up / Chin-Up → Shoulder Extensors / Adductors, Scapular Downward Rotators.
   - Cable Pullover / Lat Prayer / Single-Arm Cable Pulldown → Shoulder Extensors / Adductors, Scapular Downward Rotators or Retractors depending on the line of pull (Single-Arm Cable Pulldown front-anchor = Scap Depression; side-anchor = Scap Downward Rotation; across-front anchor = Scap Retraction). The eccentric stretch at the top is felt, but it's the concentric work that earns the point.
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
  • "Scapular Upward Rotators: on your Machine / Overhead Shoulder Press, drive ALL THE WAY into full lockout each rep — don't park at the 'top' before the elbows lock. Through the last 30° of the press the scapula MUST upwardly rotate around the ribcage to allow the humerus to clear; if you cut the rep short you skip the entire upward-rotation contribution. Lateral raises also count when carried to or above 90° of abduction (the scapulo-humeral rhythm forces upward rotation in the upper range)."
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

═══ RECOMMENDATIONS · pair-based, NOT a flat rewrite ═══
The user already picked their exercises. Don't dump a fresh weekly plan
on top of theirs — instead, produce a PAIRED set of recommendations
that maps cleanly to a left-to-right diff view in the UI:

  current exercise   →   action   →   recommended exercise

For EVERY exercise in the user's current pool, emit exactly one pair
with action ∈ {"keep", "swap", "remove"}:
  - keep:   the current pick is appropriate. recommended = same name.
  - swap:   replace with a different exercise that strictly improves
            one or more rating criteria. recommended = new name.
  - remove: the current pick is harmful or redundant. recommended = null.

For coverage gaps the current pool cannot fill (e.g. zero hip
adduction work, zero direct scapular depressor work), emit "add"
pairs:
  - add:    new exercise to introduce. current = null, recommended =
            new name.

The user identifies current items by their 1-based INDEX in the
serialized routine list. Set "currentIndex" to that number (1, 2, 3,
...) for keep / swap / remove pairs. For add pairs, currentIndex = 0.

EVERY pair needs a "rationale" — one sentence naming the specific
rating criterion (stability, stretch, SFR, compound-iso ratio, MAJOR
joint coverage, minor bonus, OR favorite-bias) driving the change.
Examples:
  - swap, "Hammer Curl → Preacher Curl": "Picks up biceps long-head
    stretch — current pool's stretch score is 11/20, dragging on the
    100. Preacher Curl is a very-high stretch pick."
  - swap, "Conventional Deadlift → Romanian Deadlift": "SFR upgrade:
    drops the CNS-heavy conventional pull (low SFR for hypertrophy)
    while preserving hamstring + glute coverage."
  - add, "Hip Adduction Machine": "Hip Adductors covered 0/full
    today; this lands the major mover for +0.91 coverage points."
  - remove, "Wide-Grip Bench Press": "Redundant with your existing
    Barbell Bench Press; the slot is better spent elsewhere."
  - keep, "Lat Pulldown": "Favorited (locked) AND fills the only
    primary back compound role — no reason to touch this."

FAVORITES: never swap or remove a favorited exercise. Mark them "keep"
with a rationale acknowledging the favorite lock.

GLOBAL RATIONALE: separately, write a 3-5 sentence summary tying the
recommendations together. Lead with the user's weakest criterion(s)
and explain how the proposed changes lift that criterion. End with a
projected score delta. Frame as a WEEKLY MESOCYCLE — the user is
building a week of training, not a single workout.

OUTPUT REQUIREMENTS:
- All criterion scores are 0 to their respective max (no negatives anywhere).
- favoriteBias.delta is an integer in [-5, +5].
- Final "score" = sum of all 5 criterion scores + favoriteBias.delta, capped 0..100. The minorBonus is tracked SEPARATELY and NOT included in "score".
- minorBonus.score is 0 to 1.5, summed across the 5 minor actions at +0.30 each.
- coverage.hit / coverage.missing arrays use exact taxonomy names; coverage tracks MAJORS only. minorBonus.hit / minorBonus.missing track the 5 minor actions only.
- recommendations.pairs MUST emit one pair per current exercise (keep/swap/remove) PLUS any number of "add" pairs for coverage gaps.
- recommendations.globalRationale is the 3-5 sentence mesocycle summary.

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
    "favoriteBias",
    "scapularDepressionNote",
    "recommendations",
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
    favoriteBias: {
      type: "object",
      additionalProperties: false,
      required: ["delta", "goodFavorites", "badFavorites", "reasoning"],
      properties: {
        delta: {
          type: "number",
          description:
            "Integer in [-5, +5]. Added to the criterion sum to produce final score (capped 0..100). +1..+2 per GOOD favorite, -1..-3 per BAD favorite, 0 if no favorites or all neutral.",
        },
        goodFavorites: {
          type: "array",
          items: { type: "string" },
          description:
            "Exact exercise names of favorites that materially improve this routine (fill coverage gaps, anchor weak movers, high-SFR / high-stretch). Empty if no good favorites.",
        },
        badFavorites: {
          type: "array",
          items: { type: "string" },
          description:
            "Exact exercise names of favorites that materially hurt this routine (redundant slots, force other movers undertrained, low-SFR / CNS-heavy). Empty if no bad favorites.",
        },
        reasoning: {
          type: "string",
          description:
            "Per-favorite plaintext explanation. Name each favorite by exact exercise name and state its specific cost or benefit in THIS routine. If no favorites locked: explain the cost of leaving the engine fully unconstrained.",
        },
      },
    },
    scapularDepressionNote: {
      type: "string",
      description: "Empty string if no pulldown movements present. Otherwise the scapular-depression cueing reminder.",
    },
    recommendations: {
      type: "object",
      additionalProperties: false,
      required: ["pairs", "globalRationale"],
      properties: {
        pairs: {
          type: "array",
          description:
            "Pair-based diff against the user's current pool. One pair per current exercise (keep/swap/remove) plus any number of 'add' pairs for coverage gaps. UI renders left-to-right: current → action → recommended.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["action", "currentIndex", "current", "recommended", "category", "rationale"],
            properties: {
              action: {
                type: "string",
                enum: ["keep", "swap", "remove", "add"],
                description:
                  "keep = current pick stays. swap = replace with a different exercise. remove = drop with no replacement. add = introduce a new exercise to fill a coverage gap.",
              },
              currentIndex: {
                type: "number",
                description:
                  "1-based index of the current exercise in the serialized routine list. For 'add' pairs, set to 0.",
              },
              current: {
                type: "string",
                description:
                  "Exact name of the user's current exercise (as it appears in the serialized routine). Empty string for 'add' pairs.",
              },
              recommended: {
                type: "string",
                description:
                  "Exact name of the recommended exercise. For 'keep' = same as current. For 'remove' = empty string. For 'swap' / 'add' = the new pick.",
              },
              category: {
                type: "string",
                enum: ["systemic", "regional"],
                description:
                  "Category of the RECOMMENDED exercise (or the current one for keep / remove). Drives downstream programming defaults.",
              },
              targetedMuscles: {
                type: "array",
                items: { type: "string" },
                description:
                  "Targeted muscles of the recommended exercise. Required for 'add' and 'swap' so the client can build a RoutineItem.",
              },
              rationale: {
                type: "string",
                description:
                  "One sentence naming the specific rating criterion (stability / stretch / SFR / compound-iso ratio / MAJOR joint coverage / minor bonus / favorite-bias) driving this pair. Must reference the user's actual routine context.",
              },
            },
          },
        },
        globalRationale: {
          type: "string",
          description:
            "3-5 sentence mesocycle-level summary tying the pair recommendations together. Lead with the user's weakest criterion(s), explain how the changes lift those criteria, end with a projected score delta.",
        },
      },
    },
  },
};

const lifestyleEnum = z.enum([
  "desk-job",
  "runner",
  "competitive-sports",
  "bed-rot",
  "physical-labor",
]);

const experienceEnum = z.enum(["beginner", "foot-in-door", "experienced"]);

const inputSchema = z.object({
  source: z.enum(["routine", "text", "image"]),
  text: z.string().optional(),
  imageDataUrl: z.string().optional(),
  lifestyle: lifestyleEnum.optional(),
  experience: experienceEnum.optional(),
  /** Exercise NAMES the user marked as favorites. Locked from swaps;
   * triggers favorite-driven bias correction in the score. */
  favorites: z.array(z.string()).optional(),
});

const EXPERIENCE_RATING_GUIDANCE: Record<z.infer<typeof experienceEnum>, string> = {
  beginner:
    "USER EXPERIENCE — BEGINNER (0-6 months training, on/off historically): " +
    "Goal is the SKILL of training before maximum stimulus. Lower set volume (~10 sets/wk per major mover, MEV edge), higher RIR (3+ for compounds, 1-2 for isolations), 2 sets per exercise is fine. " +
    "Do NOT penalize lower set counts as long as movement coverage exists. Praise correct exercise selection and consistent application of basics. " +
    "Verdict tone: encouraging; emphasize that volume and intensity will increase with consistency.",
  "foot-in-door":
    "USER EXPERIENCE — FOOT IN THE DOOR (6 months - 2.5 consistent years): " +
    "Mid-band Nippard / Israetel programming. Aim for ~15 sets/wk per major (mid MEV-MAV), 3 sets per exercise, RIR 1-2 compound / 0 isolation. " +
    "Verdict tone: focus on progressive overload across all movement patterns.",
  experienced:
    "USER EXPERIENCE — EXPERIENCED (>2.5 years consistent training): " +
    "Upper-edge Nippard / Israetel band: ~20 sets/wk per major (MAV edge), 4 sets per exercise, push to limit (1-3 RIR compound / 0 RIR isolation). Higher session caps (8 sets per mover OK). " +
    "Recovery is rate-limiting — penalize >25 sets/wk per major as over-MRV. " +
    "Verdict tone: technical, performance-oriented; assume the lifter executes form well.",
};

function buildExperiencePrefix(experience: z.infer<typeof experienceEnum> | undefined): string {
  if (!experience) return "";
  return EXPERIENCE_RATING_GUIDANCE[experience];
}

const LIFESTYLE_RATING_GUIDANCE: Record<z.infer<typeof lifestyleEnum>, string> = {
  "desk-job":
    "USER CONTEXT — DESK JOB (sits ≥6h/day): Chronic restrictions: rounded thoracic spine, shortened hip flexors, under-active lower trap / serratus, anterior shoulder tightness, weak posterior chain. " +
    "Bias cueingTips toward: Spinal Extensors (active extension cues on RDLs / hip hinges), Scapular Upward Rotators (shoulder press cued for serratus + lower trap drive), Hip Extensors (hip thrust / glute bridge mind-muscle). " +
    "Bias opportunityTips toward: Hip Flexor mobility cues if the user has Hip Flex training, Spinal Rotators / obliques (anti-extension via planks). " +
    "Verdict tone: acknowledge that desk-bound lifters need to actively counter the chronic gaps; be encouraging when they cover Sp Ext, Scap UR / Dep, Hip Ext directly.",
  runner:
    "USER CONTEXT — RUNNER / ENDURANCE: Chronic restrictions: tight ankles / quads / hip flexors, weak glute med (hip stability), hamstring overuse. " +
    "Bias cueingTips toward: Hip Abductors (single-leg or wide-stance cueing), Knee Flexors (full-ROM hamstring work since running shortens them). " +
    "Bias opportunityTips toward: Hip External Rotators (lateral stability), Spinal Rotators (running counter-rotation). " +
    "Verdict tone: praise routines with single-leg work and dedicated glute med / hamstring; flag missed Hip Abductors / Knee Flexors as critical for runners.",
  "competitive-sports":
    "USER CONTEXT — COMPETITIVE SPORTS: Chronic restrictions: asymmetric loading, rotator cuff fatigue, hip / ankle stability under unpredictable forces, connective-tissue stiffness. " +
    "Bias cueingTips toward: Shoulder External Rotators and Scapular Retractors (cuff health), single-side stability cues. " +
    "Bias opportunityTips toward: Spinal Rotators & Lateral Flexors (sport-specific anti-rotation), Hip ER / IR. " +
    "Verdict tone: emphasize injury prevention through cuff and core work; praise routines that include external rotation, anti-rotation core, and unilateral work.",
  "bed-rot":
    "USER CONTEXT — BED-ROT / SEDENTARY: Generalized joint stiffness, both hip flexors AND extensors inhibited, low conditioning, low loading history. " +
    "Bias cueingTips toward: foundational direct movement (don't suggest near-failure intensity yet — emphasize basic activation cues over advanced techniques). " +
    "Bias opportunityTips toward: Spinal Rotators (obliques, deeply de-conditioned), Scap UR and Hip ER (basic stabilizer activation). " +
    "Verdict tone: gentle and encouraging — celebrate any direct coverage; do not over-penalize gaps the lifter isn't ready to fill. Suggest gradual ramp-up.",
  "physical-labor":
    "USER CONTEXT — STANDING / PHYSICAL LABOR: Lower-back fatigue, forearm / grip overuse, calf pump from standing, shoulder asymmetry from repeated lifting / carrying. " +
    "Bias cueingTips toward: Spinal Extensor TECHNIQUE (set extension on RDLs — quality over more stimulus, since the user is already accumulating spinal load at work). " +
    "Bias opportunityTips toward: Hip External Rotators and Scapular Upward Rotators (counter the asymmetric loading from work). " +
    "Verdict tone: acknowledge accumulated workday fatigue; praise routines that emphasize quality and counter-balance over more volume.",
};

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
- favoriteBias.delta is an integer in [-5, +5].
- Final "score" = sum of all 8 criterion scores + favoriteBias.delta, capped 0..100. Does NOT include minorBonus.
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
    "favoriteBias",
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
    favoriteBias: {
      type: "object",
      additionalProperties: false,
      required: ["delta", "goodFavorites", "badFavorites", "reasoning"],
      properties: {
        delta: {
          type: "number",
          description:
            "Integer in [-5, +5]. Added to the criterion sum to produce final score (capped 0..100). +1..+2 per GOOD favorite, -1..-3 per BAD favorite, 0 if no favorites or all neutral.",
        },
        goodFavorites: {
          type: "array",
          items: { type: "string" },
          description:
            "Exact exercise names of favorites that materially improve this routine. Empty if no good favorites.",
        },
        badFavorites: {
          type: "array",
          items: { type: "string" },
          description:
            "Exact exercise names of favorites that materially hurt this routine. Empty if no bad favorites.",
        },
        reasoning: {
          type: "string",
          description:
            "Per-favorite plaintext explanation. Name each favorite and state its specific cost or benefit in THIS routine.",
        },
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
  lifestyle: lifestyleEnum.optional(),
  experience: experienceEnum.optional(),
  /** Exercise NAMES the user marked as favorites. */
  favorites: z.array(z.string()).optional(),
});

const FAVORITES_BIAS_PROMPT = `═══ FAVORITE-DRIVEN BIAS · −5 to +5 ═══
The user can mark up to 4 exercises as "favorites" — committed picks that the
engine cannot swap out under any circumstance. This is the user telling you:
"I'm keeping this lift no matter what." Favorites get the strongest day-match
in the allocator and immunity from the variant-swap engine — but the rating
engine holds them to a HIGHER standard, not a lower one. This is the
"harsh-parent" rule: locking a lift means owning what it costs you.

For each favorite, classify it as GOOD or BAD against this routine specifically:

GOOD favorites materially improve the program:
- Fills a coverage gap nothing else in the routine addresses (e.g., favoriting
  an RDL when hams are otherwise undertrained).
- High-SFR / high-stretch / high-stability pick that fits the user's
  experience level.
- Anchors a major mover that needs frequency (e.g., favoriting a primary
  back compound when back is a weak point).

BAD favorites materially hurt the program:
- Redundant slot — third curl variant when biceps is already at full coverage
  while another muscle group is undertrained.
- Forces the engine to leave a different MAJOR mover under-served because
  this slot is locked.
- Low-SFR / CNS-heavy pick that wastes recovery budget (e.g., favoriting a
  conventional deadlift in a hypertrophy-only program).
- Locks in a movement pattern the user already over-covers.

SCORE DELTA (must fall in [-5, +5]):
- +1 to +2 per GOOD favorite (cap +5 total)
- −1 to −3 per BAD favorite (cap −5 total)
- 0 if no favorites locked OR favorites are neutral

REASONING (mandatory): name each favorite by exact exercise name and state
its specific cost or benefit IN THIS routine. No generic language.

Example reasoning:
"Favorited: Romanian Deadlift (+2): fills the hamstring coverage gap that
no other exercise in the pool addresses; high-SFR posterior-chain pick.
Hammer Curl (−2): biceps is already at full coverage via Bayesian Curl +
Preacher Curl; this third curl variant locks the slot and forces the engine
to leave chest stuck at 8 sets/wk vs. the 15 target. Lat Pulldown (+1):
strong high-SFR primary back movement, anchors twice-weekly back frequency."

If the user has NO favorites locked:
- delta = 0
- goodFavorites = []
- badFavorites = []
- reasoning = "No favorites locked — the engine has full freedom to swap
  exercises. Consider favoriting 1–2 anchor lifts (RDL, primary back
  compound, anchor pressing variant) to make them immune from variant swap
  while taking accountability for their slot."

FINAL SCORE:
- final score = sum of all criterion scores + favoriteBias.delta, capped 0..100.
- favoriteBias is part of the 100, not a separate bonus track like minorBonus.`;

function buildSystemPrompt(
  basePrompt: string,
  lifestyle: z.infer<typeof lifestyleEnum> | undefined,
  experience: z.infer<typeof experienceEnum> | undefined,
): string {
  const blocks: string[] = [];
  const expBlock = buildExperiencePrefix(experience);
  if (expBlock) blocks.push(expBlock);
  if (lifestyle) blocks.push(LIFESTYLE_RATING_GUIDANCE[lifestyle]);
  blocks.push(basePrompt);
  blocks.push(FAVORITES_BIAS_PROMPT);
  return blocks.join("\n\n");
}

/** Build the user-side favorites line. Empty string if no favorites. */
function buildFavoritesLine(favorites: string[] | undefined): string {
  if (!favorites || favorites.length === 0) {
    return "\n\nUSER FAVORITES: (none locked)";
  }
  return `\n\nUSER FAVORITES (LOCKED — engine cannot swap): ${favorites.join(", ")}`;
}

export const ratingRouter = router({
  rateWorkout: publicProcedure
    .input(inputSchema)
    .mutation(async ({ input }) => {
      const userContent: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } }
      > = [];

      const favoritesLine = buildFavoritesLine(input.favorites);
      if (input.source === "image") {
        if (!input.imageDataUrl) throw new Error("imageDataUrl required for image source");
        userContent.push({
          type: "text",
          text: `Evaluate this weekly workout. Read all exercises, angles, and equipment from the image, then apply the Hypertrophy Matrix Rating System.${favoritesLine}`,
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
        userContent.push({ type: "text", text: `${intro}\n\n${input.text}${favoritesLine}` });
      }

      const result = await invokeLLM({
        messages: [
          { role: "system", content: buildSystemPrompt(HYPERTROPHY_MATRIX_PROMPT, input.lifestyle, input.experience) },
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
      const favoritesLine = buildFavoritesLine(input.favorites);

      const result = await invokeLLM({
        messages: [
          { role: "system", content: buildSystemPrompt(POST_SPLIT_PROMPT, input.lifestyle, input.experience) },
          {
            role: "user",
            content: [
              { type: "text", text: `${intro}\n\n${input.text}${favoritesLine}` },
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
