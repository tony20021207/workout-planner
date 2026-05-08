/**
 * Kinesiology Workout Builder — Exercise Database
 *
 * Pool sourced from the Jeff Nippard / Mike Israetel hypertrophy compendium.
 * Movement-pattern groupings (squat, hinge, push, pull, etc.) are user-facing
 * UX. The rating engine scores against the canonical 29-action joint taxonomy
 * via the `jointActions` tags on each exercise. `compound`, `stretchEmphasis`,
 * `stability`, and `sfr` tags drive the Hypertrophy Matrix selection criteria.
 */

export type CategoryType = "systemic" | "regional";
export type Difficulty = "hard" | "medium" | "easy";
export type StimulusLevel = "very-high" | "high" | "medium" | "low";

export interface EquipmentOption {
  id: string;
  name: string;
}

export interface AngleOption {
  id: string;
  name: string;
  description: string;
}

export interface WarmupInfo {
  name: string;
  sets: string;
  reps: string;
  instructions: string[];
}

/**
 * Canonical joint actions used by the rating engine. These are the exact
 * strings the rating prompt and coverage check expect. Use these literals
 * when tagging an exercise so coverage analysis works.
 */
export const JOINT_ACTIONS = [
  // Shoulder
  "Shoulder Flexors",
  "Shoulder Extensors",
  "Shoulder Abductors",
  "Shoulder Adductors",
  "Shoulder Horizontal Abductors",
  "Shoulder Horizontal Adductors",
  "Shoulder Internal Rotators",
  "Shoulder External Rotators",
  // Scapula
  "Scapular Retractors",
  "Scapular Protractors",
  "Scapular Elevators",
  "Scapular Depressors",
  "Scapular Upward Rotators",
  "Scapular Downward Rotators",
  // Elbow
  "Elbow Flexors",
  "Elbow Extensors",
  // Spine / Core
  "Spinal Flexors",
  "Spinal Extensors",
  "Spinal Rotators & Lateral Flexors",
  // Hip
  "Hip Flexors",
  "Hip Extensors",
  "Hip Abductors",
  "Hip Adductors",
  "Hip External Rotators",
  "Hip Internal Rotators",
  // Knee
  "Knee Extensors",
  "Knee Flexors",
  // Ankle
  "Ankle Plantarflexors",
  "Ankle Dorsiflexors",
] as const;

export type JointAction = (typeof JOINT_ACTIONS)[number];

export interface Exercise {
  id: string;
  name: string;
  difficulty: Difficulty;
  targetedMuscles: string[];
  /** Joint actions produced by this exercise (drawn from JOINT_ACTIONS). */
  jointActions: JointAction[];
  /** Multi-joint big-rock if true; single-joint isolation if false. */
  compound: boolean;
  /** Loads the muscle in its lengthened position. */
  stretchEmphasis: boolean;
  /** Higher stability = safer to push to / near failure. */
  stability: StimulusLevel;
  /** Stimulus-to-Fatigue Ratio for the prime mover. */
  sfr: StimulusLevel;
  description: string;
  mechanics: string;
  equipment?: EquipmentOption[];
  angles?: AngleOption[];
  /** Placeholder warmup; replaced by the desk-job-aware warmup engine in a later phase. */
  warmup: WarmupInfo;
  /** Coach reasoning from the Nippard / Israetel compendium. */
  coachNotes?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
}

export interface JointFunction {
  id: string;
  name: string;
  muscles: string[];
  subcategories: Subcategory[];
}

export interface ProgrammingParameters {
  sets: string;
  reps: string;
  frequency: string;
  rest: string;
  intensity: string;
  rationale: string;
}

export interface Category {
  id: CategoryType;
  name: string;
  subtitle: string;
  description: string;
  jointFunctions: JointFunction[];
}

const PLACEHOLDER_WARMUP: WarmupInfo = {
  name: "General activation (replaced by daily warmup engine)",
  sets: "1–2",
  reps: "8–10",
  instructions: [
    "5 minutes of light cardio to raise core temperature.",
    "Dynamic stretching for the working muscles.",
    "1–2 ramp-up sets at lighter loads before working sets.",
  ],
};

export const categories: Category[] = [
  // ============================================================
  // TIER 1 — SYSTEMIC / MULTI-JOINT
  // ============================================================
  {
    id: "systemic",
    name: "Tier 1: Systemic / Multi-Joint",
    subtitle: "The Big Rocks",
    description:
      "Multi-joint compounds that recruit large muscle masses. High systemic and CNS fatigue, demand longer recovery, and form the base of weekly volume.",
    jointFunctions: [
      // ---------- 1. SQUAT PATTERNS ----------
      {
        id: "squat-patterns",
        name: "Squat Patterns",
        muscles: ["Quadriceps", "Glutes", "Adductors", "Spinal Erectors"],
        subcategories: [
          {
            id: "squat-quad-biased",
            name: "Quad-Biased",
            description:
              "Upright torso and high forward knee travel maximize quadriceps loading through deep knee flexion.",
            exercises: [
              {
                id: "upright-squat",
                name: "Barbell Back Squat",
                difficulty: "hard",
                targetedMuscles: ["Quadriceps", "Glutes", "Adductors", "Spinal Erectors"],
                jointActions: ["Knee Extensors", "Hip Extensors", "Spinal Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "High-bar barbell back squat with an upright torso. Biases the quadriceps through full knee flexion.",
                mechanics:
                  "Upright torso lengthens the moment arm at the knee and shortens it at the hip, shifting demand to the quads. Heel elevation can deepen knee travel further.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard rates high-bar squats S-tier. Israetel recommends heel elevation for deeper knee travel.",
              },
              {
                id: "hack-pendulum-squat",
                name: "Hack Squat",
                difficulty: "medium",
                targetedMuscles: ["Quadriceps", "Glutes", "Adductors"],
                jointActions: ["Knee Extensors", "Hip Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Plate-loaded hack or pendulum machine squat. Built-in stability with full ROM and a natural arc.",
                mechanics:
                  "The fixed track removes balance demand and lets the lifter sit deeper while loading the quads with constant tension. Pendulum's arc closer mirrors a natural squat path.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard's single best quad exercise. Israetel: feet-low stance for quad bias.",
              },
              {
                id: "belt-squat",
                name: "Belt Squat",
                difficulty: "medium",
                targetedMuscles: ["Quadriceps", "Glutes", "Adductors"],
                jointActions: ["Knee Extensors", "Hip Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Hip-belt-loaded squat that removes axial spinal compression. Allows deep paused reps with tension on the quads.",
                mechanics:
                  "Load is hung from the hips rather than the spine, eliminating systemic recovery cost from axial loading. Stable platform allows long-set training near failure.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel highlights belt squats for quads with low systemic fatigue.",
              },
              {
                id: "leg-press",
                name: "45° Leg Press",
                difficulty: "easy",
                targetedMuscles: ["Quadriceps", "Glutes", "Adductors"],
                jointActions: ["Knee Extensors", "Hip Extensors"],
                compound: true,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Plate- or selectorized-machine leg press. Highly stable and progressive, with foot position controlling bias.",
                mechanics:
                  "Backrest support eliminates balance demand and lets the lifter focus on knee extension. ROM is the primary limitation.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier; main limitation is ROM.",
              },
              {
                id: "quad-split-squat",
                name: "Bulgarian Split Squat (Quad-Biased, Dumbbell)",
                difficulty: "medium",
                targetedMuscles: ["Quadriceps", "Glutes", "Adductors"],
                jointActions: ["Knee Extensors", "Hip Extensors", "Hip Abductors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Bulgarian split squat or short-step lunge with the front shin biased forward to load the quads unilaterally.",
                mechanics:
                  "Unilateral loading combines a strong quad stretch in the lengthened position with precise activation. Short stance amplifies knee flexion.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier for quad-biased unilateral loading.",
              },
            ],
          },
          {
            id: "squat-glute-adductor",
            name: "Glute & Adductor-Biased",
            description:
              "Forward torso lean and a higher hip hinge shift loading toward the glutes and adductors.",
            exercises: [
              {
                id: "long-stride-lunge",
                name: "Walking Lunge (Dumbbell)",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Adductors", "Quadriceps"],
                jointActions: ["Hip Extensors", "Knee Extensors", "Hip Adductors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Walking or step-out lunge with a long stride and forward lean to bias the lower glutes.",
                mechanics:
                  "The long stride increases hip flexion and creates a deep glute stretch in the bottom position. Forward torso amplifies hip-extension demand.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard highlights walking lunges for the lower-glute stretch under load.",
              },
              {
                id: "ffe-lunge",
                name: "Front-Foot-Elevated Lunge (Dumbbell)",
                difficulty: "hard",
                targetedMuscles: ["Glutes", "Adductors", "Quadriceps"],
                jointActions: ["Hip Extensors", "Knee Extensors", "Hip Adductors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Lunge with the front foot on a 4–6 inch plate to deepen the glute stretch in the bottom position.",
                mechanics:
                  "Elevation increases hip flexion at the bottom, creating a maximal glute and adductor stretch under load.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Both coaches: deep glute stretch under high tension.",
              },
              {
                id: "glute-split-squat",
                name: "Bulgarian Split Squat (Glute-Biased, Dumbbell)",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Adductors", "Quadriceps"],
                jointActions: ["Hip Extensors", "Knee Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Bulgarian split squat with a deep forward torso lean to shift loading to the glutes.",
                mechanics:
                  "Forward lean lengthens the hip moment arm and shortens the knee moment arm, biasing the glute and adductor groups while still loading unilaterally.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: forward-lean BSS for glute-focused unilateral work.",
              },
              {
                id: "sit-back-squat",
                name: "Barbell Low-Bar Squat",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Adductors", "Quadriceps", "Erectors"],
                jointActions: ["Hip Extensors", "Knee Extensors", "Spinal Extensors"],
                compound: true,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Low-bar or feet-forward Smith squat with a medium-wide stance and hips pushed back.",
                mechanics:
                  "The hip-dominant pattern lengthens the hip moment arm and shortens the knee one, shifting load to the posterior chain.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel & Nippard: glute-biased squat patterning.",
              },
              {
                id: "high-step-up",
                name: "Dumbbell High Step-Up",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Quadriceps", "Adductors"],
                jointActions: ["Hip Extensors", "Knee Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "medium",
                description:
                  "Step-up onto a high box (knee-height or above). Targets the upper glutes through deep hip flexion.",
                mechanics:
                  "High box forces deep hip flexion at the start, pre-stretching the glute max. Less ideal for quad work because of stability and limited eccentric.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: useful upper-glute work but limited for quad hypertrophy.",
              },
            ],
          },
        ],
      },
      // ---------- 2. HINGE PATTERNS ----------
      {
        id: "hinge-patterns",
        name: "Hinge Patterns",
        muscles: ["Hamstrings", "Glutes", "Erectors", "Adductors"],
        subcategories: [
          {
            id: "hinge-hamstring",
            name: "Hamstring-Biased",
            description:
              "Straighter legs and minimal knee bend keep tension on the hamstrings through hip extension.",
            exercises: [
              {
                id: "rdl",
                name: "Barbell Romanian Deadlift",
                difficulty: "hard",
                targetedMuscles: ["Hamstrings", "Glutes", "Adductors", "Erectors"],
                jointActions: ["Hip Extensors", "Spinal Extensors", "Knee Flexors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Loaded hip hinge with minimal knee bend. The hamstrings load eccentrically through deep hip flexion.",
                mechanics:
                  "Pushing the hips back against the load creates a maximal hamstring stretch. Bar stays close to the legs to keep the moment arm efficient.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: deep hamstring stretch from sit-back hip hinge.",
              },
              {
                id: "good-morning",
                name: "Barbell Good Morning",
                difficulty: "hard",
                targetedMuscles: ["Hamstrings", "Glutes", "Erectors"],
                jointActions: ["Hip Extensors", "Spinal Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "low",
                sfr: "medium",
                description:
                  "Bar across the upper back, hinge forward keeping a neutral spine. High-stimulus posterior chain hinge.",
                mechanics:
                  "Hinge produces hip extension through the hamstrings while the erectors resist spinal flexion isometrically.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: pair with RDLs as hamstring hinges.",
              },
              {
                id: "pull-through",
                name: "Cable Pull-Through",
                difficulty: "easy",
                targetedMuscles: ["Glutes", "Hamstrings"],
                jointActions: ["Hip Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Standing hip hinge with cable resistance pulled between the legs. Beginner-friendly hinge pattern.",
                mechanics:
                  "Cable line keeps tension consistent through the hip-extension arc. Lower fatigue than barbell hinging.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: beginner-friendly hinge for glute focus.",
              },
            ],
          },
          {
            id: "hinge-glute",
            name: "Glute-Biased",
            description:
              "Significant knee bend and hip-thrust position emphasize peak glute contraction.",
            exercises: [
              {
                id: "machine-hip-thrust",
                name: "Machine Hip Thrust",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Hamstrings"],
                jointActions: ["Hip Extensors"],
                compound: true,
                stretchEmphasis: false,
                stability: "high",
                sfr: "very-high",
                description:
                  "Glute thrust machine. Maximum stability, comfortable setup, easy to overload.",
                mechanics:
                  "Fixed pad path lets the lifter focus purely on hip extension. Setup time is minimal vs barbell version.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: top middle-glute option.",
              },
              {
                id: "barbell-hip-thrust",
                name: "Barbell Hip Thrust",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Hamstrings"],
                jointActions: ["Hip Extensors"],
                compound: true,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "high",
                description:
                  "Barbell hip thrust against a bench. Heavy free-weight loading at the cost of more setup and balance demand.",
                mechanics:
                  "Bar across the hips creates a moment arm that the glutes resist and overcome through hip extension.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: hard shortened-position glute contraction.",
              },
              {
                id: "glute-bridge",
                name: "Barbell Glute Bridge",
                difficulty: "easy",
                targetedMuscles: ["Glutes", "Hamstrings"],
                jointActions: ["Hip Extensors"],
                compound: true,
                stretchEmphasis: false,
                stability: "high",
                sfr: "medium",
                description:
                  "Bridge from the floor — easier setup than a full hip thrust with reduced ROM.",
                mechanics:
                  "Same pattern as the hip thrust but starting from the floor reduces hip-flexion ROM.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: beginner-friendly hip-thrust alternative.",
              },
              {
                id: "deadlift",
                name: "Conventional Barbell Deadlift",
                difficulty: "hard",
                targetedMuscles: ["Glutes", "Hamstrings", "Adductors", "Erectors"],
                jointActions: [
                  "Hip Extensors",
                  "Spinal Extensors",
                  "Knee Extensors",
                  "Scapular Retractors",
                ],
                compound: true,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "low",
                description:
                  "Floor-pull deadlift. Builds glutes and hamstrings but carries a high systemic recovery cost.",
                mechanics:
                  "Whole-body extension lift. Sumo shifts more demand to adductors and quads; conventional emphasizes hamstrings and erectors.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: useful but fatiguing — not a top pure-hypertrophy pick.",
              },
            ],
          },
          {
            id: "hinge-lumbar",
            name: "Lumbar Extension & Spinal Robustness",
            description:
              "Direct loading of the lumbar erectors and the posterior chain through controlled spinal motion.",
            exercises: [
              {
                id: "back-extension",
                name: "Back Extension (45°)",
                difficulty: "easy",
                targetedMuscles: ["Glutes", "Erectors", "Hamstrings"],
                jointActions: ["Hip Extensors", "Spinal Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "45° back-extension bench loaded with weight or dumbbells. Trains glutes and erectors through both lengthened and shortened positions.",
                mechanics:
                  "Pad supports the body, allowing controlled hip extension under load. Easy to progress with weight or reps.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier for glutes; full-ROM lumbar extension.",
              },
              {
                id: "good-morning-lumbar",
                name: "Barbell Good Morning (Lumbar Focus)",
                difficulty: "hard",
                targetedMuscles: ["Hamstrings", "Glutes", "Erectors"],
                jointActions: ["Hip Extensors", "Spinal Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "low",
                sfr: "medium",
                description:
                  "Barbell good morning emphasizing lumbar extension. Same pattern as the hamstring entry, scored under spinal robustness.",
                mechanics:
                  "Hinge produces hip extension through the hamstrings while the erectors resist spinal flexion isometrically.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel pairs with stiff-leg deadlifts; lumbar erectors trained isometrically.",
              },
              {
                id: "jefferson-curl",
                name: "Barbell Jefferson Curl",
                difficulty: "medium",
                targetedMuscles: ["Erectors", "Hamstrings"],
                jointActions: ["Spinal Extensors", "Hip Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "low",
                sfr: "low",
                description:
                  "Light, controlled spinal-flexion roll-down. Used for lumbar mobility and graded loading of the spine.",
                mechanics:
                  "Sequential vertebral flexion under light load builds back tolerance through full spinal flexion ROM.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: very light, gradual loading for back resilience.",
              },
            ],
          },
        ],
      },
      // ---------- 3. UPPER BODY PUSH ----------
      {
        id: "upper-push",
        name: "Upper Body Push",
        muscles: ["Pectorals", "Front Delts", "Triceps", "Side Delts"],
        subcategories: [
          {
            id: "push-chest",
            name: "Chest-Biased (Horizontal Push)",
            description:
              "Horizontal pressing with elbows flared targets the pectorals through shoulder horizontal adduction.",
            exercises: [
              {
                id: "machine-chest-press",
                name: "Machine Chest Press",
                difficulty: "medium",
                targetedMuscles: ["Pectorals", "Front Delts", "Triceps"],
                jointActions: [
                  "Shoulder Horizontal Adductors",
                  "Shoulder Flexors",
                  "Elbow Extensors",
                  "Scapular Protractors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Selectorized or plate-loaded chest press machine. Smooth resistance with deep stretch and full-ROM contraction.",
                mechanics:
                  "Fixed handle path eliminates balance demand and lets the lifter push close to failure safely.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: his overall best chest builder.",
              },
              {
                id: "barbell-bench-press",
                name: "Barbell Bench Press",
                difficulty: "medium",
                targetedMuscles: ["Pectorals", "Front Delts", "Triceps"],
                jointActions: [
                  "Shoulder Horizontal Adductors",
                  "Shoulder Flexors",
                  "Elbow Extensors",
                  "Scapular Protractors",
                ],
                compound: true,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "high",
                description:
                  "Flat barbell bench press. Heavy compound chest pattern; the bar stops at chest level, capping bottom-range stretch.",
                mechanics:
                  "Bar arcs from chest to lockout. Bar contact with the chest limits how lengthened the pec gets compared to DB or cambered-bar versions.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Heavy load potential; less stretch than DB.",
              },
              {
                id: "dumbbell-bench-press",
                name: "Dumbbell Bench Press",
                difficulty: "medium",
                targetedMuscles: ["Pectorals", "Front Delts", "Triceps"],
                jointActions: [
                  "Shoulder Horizontal Adductors",
                  "Shoulder Flexors",
                  "Elbow Extensors",
                  "Scapular Protractors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Flat dumbbell bench press. Independent dumbbells let the chest stretch deeper at the bottom.",
                mechanics:
                  "DBs travel below chest level for a deep stretch; the lifter pays for it with reduced stability vs a machine or barbell.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: deeper bottom stretch than barbell bench.",
              },
              {
                id: "incline-press",
                name: "Incline Dumbbell Press",
                difficulty: "medium",
                targetedMuscles: ["Upper Pectorals", "Front Delts", "Triceps"],
                jointActions: [
                  "Shoulder Flexors",
                  "Shoulder Horizontal Adductors",
                  "Elbow Extensors",
                  "Scapular Protractors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "15°–30° incline dumbbell press. Biases the clavicular pec and front delt; DBs allow a deeper bottom stretch than the barbell version.",
                mechanics:
                  "Incline shifts the line of pull more vertical, increasing shoulder flexion demand. Independent DBs reach below the chest line for max stretch.",
                angles: [
                  { id: "15", name: "15° Incline", description: "Slight upper-chest bias with strong mid-chest involvement." },
                  { id: "30", name: "30° Incline", description: "Stronger clavicular pec bias." },
                  { id: "45", name: "45° Incline", description: "Heavy front-delt bias; treat as a shoulder press." },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: incline pressing for upper chest. Israetel: incline DB for max stretch.",
              },
              {
                id: "deficit-pushup",
                name: "Deficit Push-Up (Push-Up Handles)",
                difficulty: "medium",
                targetedMuscles: ["Pectorals", "Front Delts", "Triceps"],
                jointActions: [
                  "Shoulder Horizontal Adductors",
                  "Elbow Extensors",
                  "Scapular Protractors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Push-up with hands on handles or blocks, allowing the chest to drop below the hands.",
                mechanics:
                  "Elevated hands extend the bottom ROM, creating a deep pec stretch under bodyweight (or weighted) load.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: ultra-deep chest stretch.",
              },
              {
                id: "chest-dip",
                name: "Parallel Bar Dip (Chest-Focused)",
                difficulty: "medium",
                targetedMuscles: ["Lower Pectorals", "Front Delts", "Triceps"],
                jointActions: [
                  "Shoulder Adductors",
                  "Shoulder Horizontal Adductors",
                  "Elbow Extensors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Parallel-bar or assisted-machine dip with a slight forward lean to bias the chest.",
                mechanics:
                  "Forward lean shifts the line of pull so the pec drives shoulder adduction and horizontal adduction simultaneously.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier chest. Israetel: forward lean for chest.",
              },
              {
                id: "cable-fly",
                name: "Seated Cable Fly",
                difficulty: "easy",
                targetedMuscles: ["Pectorals", "Front Delts"],
                jointActions: ["Shoulder Horizontal Adductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Single-joint shoulder horizontal adduction against a cable. Constant tension and a deep stretch in the lengthened position.",
                mechanics:
                  "Cable maintains tension throughout the arc, especially at end-range stretch where free weights would lose load.",
                angles: [
                  { id: "high", name: "High-to-Low (decline)", description: "Lower-chest bias." },
                  { id: "mid", name: "Mid (horizontal)", description: "Sternal mid-chest bias." },
                  { id: "low", name: "Low-to-High (incline)", description: "Upper-chest bias." },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: seated cable fly S-tier; constant tension at deep stretch.",
              },
              {
                id: "machine-fly",
                name: "Machine Fly (Pec Deck)",
                difficulty: "easy",
                targetedMuscles: ["Pectorals"],
                jointActions: ["Shoulder Horizontal Adductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Pec-deck machine that fixes the arms in an arc and removes balance demand.",
                mechanics:
                  "Shoulder horizontal adduction along a machine-fixed path. Stable and easy to progress.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier; stable, focused chest tension.",
              },
              {
                id: "db-fly",
                name: "Flat Dumbbell Fly",
                difficulty: "medium",
                targetedMuscles: ["Pectorals"],
                jointActions: ["Shoulder Horizontal Adductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Free-weight horizontal adduction with dumbbells. Big stretch but loads drop off at lockout.",
                mechanics:
                  "Tension peaks at the bottom of the arc where the dumbbells are furthest from the shoulder; minimal load at the top.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier; Israetel: deep stretch + strong contraction.",
              },
            ],
          },
          {
            id: "push-vertical",
            name: "Vertical / Overhead Push",
            description:
              "Pure shoulder flexion / abduction. Front delts and triceps dominate; chest contributes minimally.",
            exercises: [
              {
                id: "machine-shoulder-press",
                name: "Machine Shoulder Press",
                difficulty: "medium",
                targetedMuscles: ["Front Delts", "Side Delts", "Triceps"],
                jointActions: [
                  "Shoulder Flexors",
                  "Shoulder Abductors",
                  "Elbow Extensors",
                  "Scapular Upward Rotators",
                ],
                compound: true,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Selectorized or plate-loaded shoulder press machine. Stable vertical press from shoulder height to lockout.",
                mechanics:
                  "Fixed handle path eliminates balance demand and isolates the front delts under load.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A+ for front delts.",
              },
              {
                id: "db-overhead-press",
                name: "Dumbbell Overhead Press",
                difficulty: "medium",
                targetedMuscles: ["Front Delts", "Side Delts", "Triceps"],
                jointActions: [
                  "Shoulder Flexors",
                  "Shoulder Abductors",
                  "Elbow Extensors",
                  "Scapular Upward Rotators",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Seated dumbbell overhead press. Independent DBs allow a deeper bottom and more shoulder external rotation.",
                mechanics:
                  "DB independence increases stretch at the bottom and recruits the rotator cuff for stability.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: seated DB press A-tier.",
              },
              {
                id: "close-grip-press",
                name: "Close-Grip Bench Press",
                difficulty: "medium",
                targetedMuscles: ["Triceps", "Front Delts", "Pectorals"],
                jointActions: [
                  "Elbow Extensors",
                  "Shoulder Flexors",
                  "Shoulder Horizontal Adductors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Narrow-grip bench press or JM press. Compound triceps work.",
                mechanics:
                  "Elbows tracking forward concentrate the load on elbow extension while the chest and shoulders assist.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier compound triceps.",
              },
              {
                id: "triceps-dip",
                name: "Parallel Bar Dip (Triceps-Focused, Vertical Torso)",
                difficulty: "medium",
                targetedMuscles: ["Triceps", "Front Delts", "Lower Pectorals"],
                jointActions: ["Elbow Extensors", "Shoulder Flexors", "Shoulder Adductors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Dip with vertical torso and narrow grip to isolate the triceps within a compound pattern.",
                mechanics:
                  "Vertical torso minimizes pec contribution; narrow grip puts elbow extension under heavy bodyweight load.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: vertical-torso narrow-grip dip for triceps.",
              },
            ],
          },
        ],
      },
      // ---------- 4. UPPER BODY PULL ----------
      {
        id: "upper-pull",
        name: "Upper Body Pull",
        muscles: ["Lats", "Rhomboids", "Mid Traps", "Biceps", "Rear Delts"],
        subcategories: [
          {
            id: "pull-lat",
            name: "Lat-Biased",
            description:
              "Elbows tucked toward the sides, pulling toward the hip. Trains shoulder adduction (lats) and elbow flexion.",
            exercises: [
              {
                id: "lat-pulldown",
                name: "Cable Lat Pulldown (Neutral Grip)",
                difficulty: "easy",
                targetedMuscles: ["Lats", "Teres Major", "Biceps"],
                jointActions: [
                  "Shoulder Adductors",
                  "Elbow Flexors",
                  "Scapular Downward Rotators",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Cable pulldown to the upper chest. Easier to track than pull-ups for hypertrophy progression.",
                mechanics:
                  "Cables maintain tension at the top stretch; close/neutral grip with elbows pulling straight down biases the lats.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier; preferred over pull-ups for tracking.",
              },
              {
                id: "single-arm-cable-pulldown",
                name: "Single-Arm Cable Pulldown",
                difficulty: "easy",
                targetedMuscles: ["Lats", "Teres Major"],
                jointActions: ["Shoulder Adductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Single-arm cable pulldown executed with minimal elbow flexion to isolate shoulder adduction. Hand-on-handle cable line keeps tension on the lat through the full stretched range.",
                mechanics:
                  "Reduced elbow involvement turns the pulldown into a near-isolation lat exercise; the cable maintains tension in the deep stretch.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Elbow tucked / minimal flexion = pure lat work.",
              },
              {
                id: "db-row-lat",
                name: "Single-Arm Dumbbell Row (Elbow-Tucked)",
                difficulty: "medium",
                targetedMuscles: ["Lats", "Teres Major", "Biceps"],
                jointActions: ["Shoulder Extensors", "Elbow Flexors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "One-arm dumbbell row with the elbow drawn close to the torso. Elbow-tucked path biases the lats over the mid back.",
                mechanics:
                  "Less elbow-to-torso angle keeps the line of pull along the lat, emphasizing shoulder extension and adduction over horizontal abduction.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Tucked elbow = lat focus.",
              },
              {
                id: "lat-prayer",
                name: "Cable Lat Prayer (Straight-Arm Pulldown)",
                difficulty: "easy",
                targetedMuscles: ["Lats", "Teres Major"],
                jointActions: ["Shoulder Extensors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Single-joint shoulder extension against a cable. Forward lean creates a deep lat stretch.",
                mechanics:
                  "Removing elbow flexion isolates the lats; the lengthened position is loaded heavily by the cable.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: leaning forward maximizes lat stretch. Nippard: smooth cable progression.",
              },
              {
                id: "pullover",
                name: "Cable Pullover",
                difficulty: "medium",
                targetedMuscles: ["Lats", "Teres Major", "Long Head Triceps"],
                jointActions: ["Shoulder Extensors", "Shoulder Adductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Arc pullover loading the lats in their deepest stretched position.",
                mechanics:
                  "Shoulder moves through extension while the lat is loaded at its longest length.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: better as a lat exercise than a chest one.",
              },
            ],
          },
          {
            id: "pull-upper-back",
            name: "Upper Back & Rhomboid",
            description:
              "Horizontal rows with elbows flared outward. Trains scapular retraction and shoulder extension.",
            exercises: [
              {
                id: "chest-supported-row",
                name: "T-Bar Chest-Supported Row",
                difficulty: "easy",
                targetedMuscles: ["Rhomboids", "Mid Traps", "Lats", "Rear Delts"],
                jointActions: [
                  "Shoulder Extensors",
                  "Scapular Retractors",
                  "Elbow Flexors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Row with the chest supported on a pad — T-bar, machine, or incline-bench DB row.",
                mechanics:
                  "Chest support eliminates spinal stability demand and torso swing, isolating the back through full ROM.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: best all-around back exercise.",
              },
              {
                id: "cable-row",
                name: "Seated Cable Row (Wide Grip, Elbow-Flared)",
                difficulty: "easy",
                targetedMuscles: ["Rhomboids", "Mid Traps", "Lats", "Rear Delts"],
                jointActions: [
                  "Shoulder Horizontal Abductors",
                  "Scapular Retractors",
                  "Elbow Flexors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Seated horizontal cable row pulled with a greater elbow-to-torso angle (elbows flared outward) to bias the rhomboids and mid traps.",
                mechanics:
                  "Wide-elbow path turns the row into shoulder horizontal abduction + scapular retraction; cable maintains tension at the deep stretch.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier horizontal row.",
              },
              {
                id: "barbell-row",
                name: "Barbell Pendlay Row",
                difficulty: "hard",
                targetedMuscles: ["Lats", "Rhomboids", "Traps", "Erectors"],
                jointActions: [
                  "Shoulder Extensors",
                  "Scapular Retractors",
                  "Elbow Flexors",
                  "Spinal Extensors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "low",
                sfr: "medium",
                description:
                  "Bent-over barbell row. Heavy compound back work; deficit Pendlay version increases stretch.",
                mechanics:
                  "Hinged torso position requires lumbar isometric stability. Loading is high but recovery cost is significant.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: deficit barbell row for big stretch. Nippard: A-tier deficit Pendlay.",
              },
              {
                id: "meadows-row",
                name: "Landmine Meadows Row",
                difficulty: "medium",
                targetedMuscles: ["Lats", "Rhomboids", "Rear Delts"],
                jointActions: [
                  "Shoulder Extensors",
                  "Scapular Retractors",
                  "Elbow Flexors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Single-arm landmine row. Isolateral setup with a long stretch through the lat.",
                mechanics:
                  "Landmine arc allows a deep stretch and natural pull pattern with one arm at a time.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier; isolateral stretch.",
              },
              {
                id: "inverted-row-face",
                name: "Smith Inverted Row to Face/Throat",
                difficulty: "easy",
                targetedMuscles: ["Rear Delts", "Rhomboids", "Mid Traps"],
                jointActions: [
                  "Shoulder Horizontal Abductors",
                  "Scapular Retractors",
                  "Elbow Flexors",
                ],
                compound: true,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "high",
                description:
                  "Inverted row pulled toward the face/throat instead of the chest. Strong rear-delt and upper-back contraction.",
                mechanics:
                  "High pull line emphasizes shoulder horizontal abduction and scapular retraction over lat involvement.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: face/throat pull line for rear-delt-heavy row.",
              },
              {
                id: "single-arm-db-row",
                name: "Single-Arm Dumbbell Row (Bench-Supported, Elbow-Flared)",
                difficulty: "medium",
                targetedMuscles: ["Rhomboids", "Mid Traps", "Rear Delts"],
                jointActions: [
                  "Shoulder Horizontal Abductors",
                  "Scapular Retractors",
                  "Elbow Flexors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Bench-supported single-arm DB row with the elbow drawn outward (greater elbow-to-torso angle) to bias mid back and rhomboids.",
                mechanics:
                  "Elbow-flared path shifts the line of pull into horizontal abduction; bench support reduces lumbar demand.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Flared elbow = mid-back / rhomboid focus.",
              },
              {
                id: "cable-face-pull-rhomboid",
                name: "Cable Face Pull (Rhomboid)",
                difficulty: "easy",
                targetedMuscles: ["Rhomboids", "Mid / Lower Traps", "Rear Delts"],
                jointActions: [
                  "Shoulder Horizontal Abductors",
                  "Scapular Retractors",
                  "Elbow Flexors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Cable face pull executed with elbow flexion and a strong scapular retraction at the end range. Mid-back focused.",
                mechanics:
                  "Distinct from the rear-delt face pull (which keeps elbows high and minimizes scap retraction). This version drives the rhomboids and mid traps through full retraction.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Companion to the rear-delt face pull, but mid-back biased.",
              },
            ],
          },
          {
            id: "pull-bicep-row",
            name: "Bicep-Biased Pull",
            description:
              "Underhand / supinated pulls shift more demand to the biceps while still loading the lats.",
            exercises: [
              {
                id: "pullup",
                name: "Chin-Up (Underhand)",
                difficulty: "hard",
                targetedMuscles: ["Lats", "Teres Major", "Biceps", "Upper Back"],
                jointActions: [
                  "Shoulder Adductors",
                  "Shoulder Extensors",
                  "Elbow Flexors",
                  "Scapular Downward Rotators",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Bodyweight (or weighted) vertical pull. Underhand / chin-up grip increases biceps contribution while still loading the lats.",
                mechanics:
                  "Free-hanging position requires controlled scapular and shoulder mechanics; supinated grip recruits the elbow flexors heavily through the pull.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: unbeatable for lats. Nippard: less smooth resistance than pulldown but strong elbow-flexor recruitment.",
              },
              {
                id: "supinated-pulldown",
                name: "Cable Underhand Pulldown",
                difficulty: "easy",
                targetedMuscles: ["Lats", "Biceps", "Teres Major"],
                jointActions: ["Shoulder Adductors", "Elbow Flexors"],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Underhand-grip cable pulldown. Increases biceps contribution while preserving lat loading.",
                mechanics:
                  "Supination opens the elbow joint to greater flexion ROM and increases biceps recruitment.",
                warmup: PLACEHOLDER_WARMUP,
              },
              {
                id: "supinated-row",
                name: "Cable Underhand Row",
                difficulty: "easy",
                targetedMuscles: ["Biceps", "Lats", "Rhomboids"],
                jointActions: [
                  "Shoulder Extensors",
                  "Elbow Flexors",
                  "Scapular Retractors",
                ],
                compound: true,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Underhand-grip horizontal row that loads elbow flexors while progressing the upper back.",
                mechanics:
                  "Supinated grip turns the row into a hybrid back / biceps lift with smooth progression.",
                warmup: PLACEHOLDER_WARMUP,
              },
            ],
          },
        ],
      },
    ],
  },
  // ============================================================
  // TIER 2 — REGIONAL / SINGLE-JOINT
  // ============================================================
  {
    id: "regional",
    name: "Tier 2: Regional / Single-Joint",
    subtitle: "The Sand",
    description:
      "Single-joint isolation work. Lower systemic fatigue and high stimulus-to-fatigue ratio. Fills coverage gaps and trains specific muscle heads.",
    jointFunctions: [
      // ---------- 1. ARM ISOLATION ----------
      {
        id: "arm-isolation",
        name: "Arm Isolation",
        muscles: ["Biceps", "Brachialis", "Triceps"],
        subcategories: [
          {
            id: "biceps-lengthened",
            name: "Biceps — Lengthened Bias",
            description:
              "Elbows positioned behind the torso to pre-stretch the biceps long head.",
            exercises: [
              {
                id: "bayesian-curl",
                name: "Single-Arm Cable Bayesian Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps Long Head", "Biceps Short Head"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Cable curl with the arm pulled behind the torso. Peak tension in the deep stretch.",
                mechanics:
                  "Arm-behind-body pre-stretches the biceps long head while cable line keeps tension highest in the bottom.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard's #1 biceps exercise.",
              },
              {
                id: "incline-curl",
                name: "Incline Dumbbell Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps Long Head", "Brachialis"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Lying back on an incline bench so the arms hang behind the torso. Maximal biceps long-head stretch.",
                mechanics:
                  "Bench tilt places the shoulder in extension, lengthening the biceps before the curl begins.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel & Nippard: A-tier deep stretch.",
              },
              {
                id: "lying-curl",
                name: "Lying Cable Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps", "Brachialis"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Curl performed lying flat (clown curl, low-cable lying curl, decline-bench curl). Constant stretch through the set.",
                mechanics:
                  "Lying position fixes the arms in shoulder extension throughout the set.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: clown / lying cable for hard biceps stretch.",
              },
            ],
          },
          {
            id: "biceps-shortened",
            name: "Biceps — Shortened Bias",
            description:
              "Elbows in front of the torso. Strong contraction in the shortened biceps position.",
            exercises: [
              {
                id: "preacher-curl",
                name: "Machine Preacher Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps Short Head", "Biceps Long Head"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Preacher bench curl with elbows fixed forward. Hard stretch at the bottom, peak contraction at the top.",
                mechanics:
                  "Pad locks the elbows in shoulder flexion, eliminating cheating and creating a perfect biceps force curve.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier biceps.",
              },
              {
                id: "cable-curl",
                name: "Standing Cable Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps", "Brachialis"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Standing cable curl. Constant tension and easy load progression.",
                mechanics:
                  "Cable maintains constant biceps tension across the curl arc.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier; Israetel: Superman variant strong.",
              },
              {
                id: "strict-curl",
                name: "Barbell Strict Curl",
                difficulty: "medium",
                targetedMuscles: ["Biceps", "Brachialis"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "high",
                description:
                  "Standing barbell or dumbbell curl performed without hip momentum.",
                mechanics:
                  "Strict form forces the elbow flexors to do the work and standardizes loading for progressive overload.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier; easy progression.",
              },
            ],
          },
          {
            id: "brachialis",
            name: "Brachialis Bias",
            description:
              "Neutral or pronated grip shifts emphasis from the biceps to the brachialis and brachioradialis.",
            exercises: [
              {
                id: "hammer-curl",
                name: "Cross-Body Dumbbell Hammer Curl",
                difficulty: "easy",
                targetedMuscles: ["Brachialis", "Brachioradialis", "Biceps"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "high",
                description:
                  "Neutral-grip curl. Targets brachialis and brachioradialis for arm thickness.",
                mechanics:
                  "Neutral grip aligns brachialis line of pull with the curl arc, shifting load away from the biceps.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier.",
              },
              {
                id: "preacher-hammer",
                name: "Machine Preacher Hammer Curl",
                difficulty: "easy",
                targetedMuscles: ["Brachialis", "Brachioradialis", "Biceps"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Preacher curl performed with a neutral grip. Combines stable preacher mechanics with brachialis bias.",
                mechanics:
                  "Pad-locked elbow plus neutral grip puts brachialis under loaded stretch with max tension.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier brachialis pick.",
              },
              {
                id: "reverse-curl",
                name: "EZ-Bar Reverse Curl",
                difficulty: "easy",
                targetedMuscles: ["Brachialis", "Brachioradialis", "Forearms"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "medium",
                description:
                  "Pronated-grip curl. Heavy brachialis and forearm extensor demand.",
                mechanics:
                  "Pronation shortens the biceps' mechanical advantage, shifting load to brachialis and brachioradialis.",
                warmup: PLACEHOLDER_WARMUP,
              },
            ],
          },
          {
            id: "triceps-long-head",
            name: "Triceps — Long Head Bias",
            description:
              "Arms positioned overhead lengthen the triceps long head for a deep stretch.",
            exercises: [
              {
                id: "overhead-tri-ext",
                name: "EZ-Bar Overhead Triceps Extension",
                difficulty: "easy",
                targetedMuscles: ["Triceps Long Head", "Medial / Lateral Heads"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "EZ-bar overhead triceps extension. Deep stretch on the triceps long head with comfortable wrist alignment.",
                mechanics:
                  "Shoulder flexion lengthens the long head before elbow extension, loading it in its longest position; EZ angles reduce wrist strain vs straight bar.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S+ for long head. Cable variants live under Cable Katana.",
              },
              {
                id: "katana-ext",
                name: "Single-Arm Cable Katana Extension",
                difficulty: "easy",
                targetedMuscles: ["Triceps Long Head"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Single-arm cable extension with the cable line crossing the body at a diagonal overhead angle.",
                mechanics:
                  "Diagonal cable path keeps the long head pre-stretched while the elbow extends.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier long-head cable work.",
              },
              {
                id: "french-press",
                name: "Dumbbell French Press",
                difficulty: "medium",
                targetedMuscles: ["Triceps Long Head"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "medium",
                description:
                  "Seated overhead extension with EZ-bar or dumbbell. Deep long-head loading.",
                mechanics:
                  "Free-weight version of overhead extension; loading drops at the top of the press.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: B-tier; Israetel: solid long-head option.",
              },
            ],
          },
          {
            id: "triceps-short-head",
            name: "Triceps — Lateral / Medial Bias",
            description:
              "Arms tucked at the sides emphasize the lateral and medial heads with stable loading.",
            exercises: [
              {
                id: "triceps-pressdown",
                name: "Cable V-Bar Triceps Pressdown",
                difficulty: "easy",
                targetedMuscles: ["Lateral Head", "Medial Head", "Long Head"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Cable pressdown with bar, V-bar, or rope. Easy progression and stable loading.",
                mechanics:
                  "Cable line keeps the elbow extensors under tension throughout the arc; bar variations bias the lateral head.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: A-tier bar pressdown. Israetel: V-bar for stretch path.",
              },
              {
                id: "skullcrusher",
                name: "EZ-Bar Skullcrusher",
                difficulty: "medium",
                targetedMuscles: ["Triceps Long Head", "Lateral / Medial Heads"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "very-high",
                description:
                  "Lying triceps extension with EZ-bar or dumbbells. Brutal stretch in the bottom position.",
                mechanics:
                  "Allowing the bar to track behind the head deepens the long-head stretch while loading all three heads.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier; Israetel: near-perfect force curve.",
              },
              {
                id: "cable-kickback",
                name: "Single-Arm Cable Kickback",
                difficulty: "easy",
                targetedMuscles: ["Lateral Head", "Medial Head"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Cable kickback for peak triceps contraction at the shortened position.",
                mechanics:
                  "Cable maintains tension in the contracted top range better than dumbbell kickbacks.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier; cable better than DB kickback.",
              },
            ],
          },
        ],
      },
      // ---------- 2. SHOULDER ISOLATION ----------
      {
        id: "shoulder-isolation",
        name: "Shoulder Isolation",
        muscles: ["Medial Delts", "Rear Delts", "Front Delts"],
        subcategories: [
          {
            id: "lateral-contracted",
            name: "Medial Delt — Contracted Bias",
            description:
              "Free-weight or machine raises with the load hardest at the top contraction. Targets the medial (middle) head of the deltoid via shoulder abduction.",
            exercises: [
              {
                id: "db-lateral",
                name: "Lean-In Dumbbell Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Medial Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "medium",
                description:
                  "Standing or seated DB lateral raise. Standard side-delt builder.",
                mechanics:
                  "Free-weight tension is maximal at the top of the abduction arc and drops at the bottom.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: seated strict eccentric. Nippard: lean-in and side-lying highly ranked.",
              },
              {
                id: "super-rom-lateral",
                name: "Dumbbell Super-ROM Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Medial Delts", "Front Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "medium",
                description:
                  "Lateral raise carried above shoulder height for fuller delt development.",
                mechanics:
                  "Going above parallel recruits more upper delt fibers; controlled eccentrics required.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: broader delt development.",
              },
              {
                id: "machine-lateral",
                name: "Selectorized Machine Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Medial Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Selectorized or plate-loaded machine lateral raise. Stable side-delt isolation.",
                mechanics:
                  "Machine arm path eliminates balance demand and keeps tension on the side delt.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: Atlantis A+; clean isolation.",
              },
            ],
          },
          {
            id: "lateral-stretch",
            name: "Medial Delt — Stretch Bias",
            description:
              "Cable raises with constant tension in the bottom stretch position. Targets the medial (middle) head of the deltoid in the lengthened range.",
            exercises: [
              {
                id: "cable-lateral",
                name: "Single-Arm Cable Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Medial Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Single-arm cable lateral raise with the pulley at hand height. Tension peaks early in the stretch.",
                mechanics:
                  "Hand-height pulley line biases peak tension to the lengthened range, opposite of DB raises.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard's #1 side-delt pick.",
              },
              {
                id: "cable-y-raise",
                name: "Dual-Cable Y-Raise",
                difficulty: "medium",
                targetedMuscles: ["Medial Delts", "Lower Traps"],
                jointActions: ["Shoulder Abductors", "Scapular Upward Rotators"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Cable lateral raise carried up into a Y position. Side delts plus lower trap upward rotation.",
                mechanics:
                  "Y-line of pull combines abduction with scapular upward rotation, hitting the lower traps.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier.",
              },
              {
                id: "btb-cable-lateral",
                name: "Behind-the-Back Single-Arm Cuffed Cable Lateral",
                difficulty: "medium",
                targetedMuscles: ["Medial Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Cable lateral raise performed with the cable running behind the body. Maximizes side-delt stretch.",
                mechanics:
                  "Behind-the-back cable line places the side delt in its longest position before abduction.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier; emphasizes stretched side-delt.",
              },
            ],
          },
          {
            id: "rear-delt",
            name: "Rear Delt",
            description:
              "Horizontal abduction without scapular retraction isolates the rear delts.",
            exercises: [
              {
                id: "reverse-pec-deck",
                name: "Single-Arm Cross-Body Reverse Pec Deck",
                difficulty: "easy",
                targetedMuscles: ["Rear Delts"],
                jointActions: ["Shoulder Horizontal Abductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Pec-deck machine reversed. Sideways one-arm version creates a deep rear-delt pre-stretch.",
                mechanics:
                  "Cross-body arm path stretches the rear delt before horizontal abduction begins.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard's best rear-delt pick.",
              },
              {
                id: "reverse-cable-crossover",
                name: "Reverse Cable Crossover (Handles)",
                difficulty: "easy",
                targetedMuscles: ["Rear Delts"],
                jointActions: ["Shoulder Horizontal Abductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Cable crossover reversed. Cross-body cable pull deeply stretches the rear delt.",
                mechanics:
                  "Cables maintain tension while the arms cross the midline, hitting the rear delt at full stretch.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier rear-delt.",
              },
              {
                id: "face-pull",
                name: "Cable Rope Face Pull (Rear Delt)",
                difficulty: "easy",
                targetedMuscles: ["Rear Delts", "Mid / Lower Traps", "Rotator Cuff"],
                jointActions: [
                  "Shoulder External Rotators",
                  "Shoulder Horizontal Abductors",
                  "Scapular Retractors",
                ],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Cable face pull with elbows high. Rear delt + external rotator + scapular retraction.",
                mechanics:
                  "High elbows direct work into the rear delt and external rotators while retracting the scapulae.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: rear-delt + rotator cuff balanced work.",
              },
            ],
          },
          {
            id: "front-delt-iso",
            name: "Front Delt Isolation",
            description:
              "Direct shoulder flexion. Lower priority — most pressing already covers front delts.",
            exercises: [
              {
                id: "front-raise",
                name: "Cable Front Raise",
                difficulty: "easy",
                targetedMuscles: ["Front Delts"],
                jointActions: ["Shoulder Flexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "low",
                description:
                  "Direct shoulder flexion isolation. Generally redundant if pressing volume is sufficient.",
                mechanics:
                  "Single-joint shoulder flexion. Most lifters already get enough front-delt work from pressing.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: D-tier. Include only if pressing volume is low.",
              },
            ],
          },
        ],
      },
      // ---------- 3. LEG ISOLATION ----------
      {
        id: "leg-isolation",
        name: "Leg Isolation",
        muscles: ["Hamstrings", "Quadriceps", "Calves"],
        subcategories: [
          {
            id: "hamstring-lengthened",
            name: "Hamstrings — Lengthened Bias",
            description:
              "Hips flexed (seated) pre-stretches the hamstrings before knee flexion.",
            exercises: [
              {
                id: "seated-leg-curl",
                name: "Seated Leg Curl Machine",
                difficulty: "easy",
                targetedMuscles: ["Hamstrings (esp. biceps femoris short head)"],
                jointActions: ["Knee Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Seated machine hamstring curl. The pre-stretched hip position amplifies the stimulus.",
                mechanics:
                  "Hip flexion pre-stretches the hamstrings; knee flexion then loads them in their longest position.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard's #1 hamstring pick. Lean forward to amplify stretch.",
              },
            ],
          },
          {
            id: "hamstring-shortened",
            name: "Hamstrings — Shortened Bias",
            description:
              "Hips extended (prone or standing) trains the hamstrings in the shortened range.",
            exercises: [
              {
                id: "prone-leg-curl",
                name: "Lying Leg Curl Machine",
                difficulty: "easy",
                targetedMuscles: ["Hamstrings (knee flexor fibers)"],
                jointActions: ["Knee Flexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Lying or standing machine leg curl. Trains hamstrings without pre-stretch.",
                mechanics:
                  "Knee flexion under controlled eccentric. Required for complete hamstring development.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: needed for complete hamstring development.",
              },
            ],
          },
          {
            id: "quadriceps-iso",
            name: "Quadriceps Isolation (Rectus Femoris)",
            description:
              "Hips extended (or extending) lets the rectus femoris stretch and contract through full ROM.",
            exercises: [
              {
                id: "leg-extension",
                name: "Leg Extension Machine",
                difficulty: "easy",
                targetedMuscles: ["Quadriceps", "Rectus Femoris"],
                jointActions: ["Knee Extensors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Seated machine leg extension. Trains all four quad heads with rectus femoris emphasis.",
                mechanics:
                  "Fixed hip lets the rectus femoris stretch and contract under tension; the vasti contribute throughout.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: near-perfect quad iso.",
              },
              {
                id: "reverse-nordic",
                name: "Bodyweight Reverse Nordic Curl",
                difficulty: "medium",
                targetedMuscles: ["Quadriceps", "Rectus Femoris"],
                jointActions: ["Knee Extensors"],
                compound: false,
                stretchEmphasis: true,
                stability: "low",
                sfr: "high",
                description:
                  "Kneeling controlled descent leaning back. Bodyweight quad stretch alternative.",
                mechanics:
                  "Hip extension + knee flexion places the rectus femoris under massive stretch under bodyweight.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Both coaches: massive quad stretch.",
              },
              {
                id: "sissy-squat",
                name: "Sissy Squat (Sissy Bench)",
                difficulty: "hard",
                targetedMuscles: ["Quadriceps", "Rectus Femoris"],
                jointActions: ["Knee Extensors"],
                compound: false,
                stretchEmphasis: true,
                stability: "low",
                sfr: "medium",
                description:
                  "Standing knee-flexion squat with a backward lean. Awkward but provides max quad stretch.",
                mechanics:
                  "Knees track far forward while the hips stay extended, isolating the quads through full lengthening.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: best quad stretching movement (awkward setup).",
              },
            ],
          },
          {
            id: "calves",
            name: "Calves",
            description:
              "Straight-leg variants train the gastrocnemius; bent-knee variants emphasize the soleus.",
            exercises: [
              {
                id: "straight-calf",
                name: "Standing Calf Raise Machine",
                difficulty: "easy",
                targetedMuscles: ["Gastrocnemius", "Soleus"],
                jointActions: ["Ankle Plantarflexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Standing calf raise with knees extended. Belt squat or dip belt versions remove spinal load.",
                mechanics:
                  "Straight knee keeps the gastrocnemius lengthened and primarily loaded.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: deep loaded stretch with pause.",
              },
              {
                id: "seated-calf",
                name: "Seated Calf Raise Machine",
                difficulty: "easy",
                targetedMuscles: ["Soleus", "Gastrocnemius"],
                jointActions: ["Ankle Plantarflexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Seated machine or DB-on-knees calf raise. Bent knee emphasizes the soleus.",
                mechanics:
                  "Bent knee shortens the gastrocnemius, shifting more demand to the soleus.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: useful soleus emphasis.",
              },
            ],
          },
        ],
      },
      // ---------- 4. CORE ISOLATION ----------
      {
        id: "core-isolation",
        name: "Core Isolation",
        muscles: ["Rectus Abdominis", "Obliques"],
        subcategories: [
          {
            id: "upper-rectus",
            name: "Upper Rectus Abdominis",
            description:
              "Loaded spinal flexion. Crunch-pattern work with full ROM and progressive load.",
            exercises: [
              {
                id: "abdominal-crunch-machine",
                name: "Selectorized Abdominal Crunch Machine",
                difficulty: "easy",
                targetedMuscles: ["Upper Rectus Abdominis", "Lower Rectus Abdominis"],
                jointActions: ["Spinal Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Selectorized or plate-loaded crunch machine. Full ROM, lengthened loading, easy progression.",
                mechanics:
                  "Machine arm path traces the spinal-flexion arc, loading the rectus through the entire range.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: best ab option when designed well.",
              },
              {
                id: "cable-crunch",
                name: "Cable Rope Crunch",
                difficulty: "easy",
                targetedMuscles: ["Rectus Abdominis"],
                jointActions: ["Spinal Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Kneeling cable crunch with rope or bar. Full spinal-flexion ROM with constant tension.",
                mechanics:
                  "Cable load resists spinal flexion through the full arc, especially when performed over a rounded surface.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: accessible and loadable.",
              },
              {
                id: "inverted-bench-crunch",
                name: "Decline Bench Crunch (Weighted Plate)",
                difficulty: "medium",
                targetedMuscles: ["Rectus Abdominis"],
                jointActions: ["Spinal Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Decline / inverted bench crunch with weight held at the chest.",
                mechanics:
                  "Inversion loads the rectus through a deeper start position; weight increases progression options.",
                warmup: PLACEHOLDER_WARMUP,
              },
            ],
          },
          {
            id: "lower-rectus",
            name: "Lower Rectus / Hip Flexors",
            description:
              "Pelvic tilt and leg-raise patterns load the lower rectus and hip flexors.",
            exercises: [
              {
                id: "v-up",
                name: "Bodyweight V-Up",
                difficulty: "medium",
                targetedMuscles: ["Rectus Abdominis", "Hip Flexors"],
                jointActions: ["Spinal Flexors", "Hip Flexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "low",
                sfr: "medium",
                description:
                  "Bodyweight V-up combining spinal flexion with hip flexion.",
                mechanics:
                  "Simultaneous spinal and hip flexion loads the rectus and hip flexors together.",
                warmup: PLACEHOLDER_WARMUP,
              },
              {
                id: "ab-wheel",
                name: "Ab Wheel Rollout",
                difficulty: "hard",
                targetedMuscles: ["Rectus Abdominis", "Serratus", "Lats", "Hip Flexors"],
                jointActions: ["Spinal Flexors", "Hip Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "low",
                sfr: "high",
                description:
                  "Kneeling or standing ab wheel rollout. Phenomenal core tension through anti-extension.",
                mechanics:
                  "The rollout demands eccentric resistance to spinal extension; the rectus, lats, and hip flexors all contribute.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: phenomenal tension; harder to progress.",
              },
            ],
          },
          {
            id: "obliques",
            name: "Obliques (Rotation & Lateral Flexion)",
            description:
              "Rotational and anti-rotational loading for the internal and external obliques.",
            exercises: [
              {
                id: "cable-woodchop",
                name: "Cable Woodchop (D-Handle)",
                difficulty: "easy",
                targetedMuscles: ["Internal Obliques", "External Obliques"],
                jointActions: ["Spinal Rotators & Lateral Flexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "medium",
                description:
                  "Cable rotational chop from high to low or low to high. Loaded trunk rotation.",
                mechanics:
                  "Cable resists trunk rotation, loading the obliques through the full rotational arc.",
                angles: [
                  { id: "high-low", name: "High-to-Low", description: "Downward rotation pattern." },
                  { id: "low-high", name: "Low-to-High", description: "Upward rotation pattern." },
                  { id: "horizontal-cw", name: "Horizontal", description: "Pure rotation." },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Coach data limited for obliques; this is a standard rotational option.",
              },
              {
                id: "pallof-press",
                name: "Cable Pallof Press",
                difficulty: "easy",
                targetedMuscles: ["Internal Obliques", "External Obliques", "Transverse Abdominis"],
                jointActions: ["Spinal Rotators & Lateral Flexors"],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "medium",
                description:
                  "Cable anti-rotation press. Isometric oblique loading.",
                mechanics:
                  "Holding the cable's rotational pull while pressing forward forces the obliques to resist rotation.",
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Standard anti-rotation oblique pick.",
              },
              {
                id: "side-bend",
                name: "Dumbbell Side Bend",
                difficulty: "easy",
                targetedMuscles: ["Obliques", "Quadratus Lumborum"],
                jointActions: ["Spinal Rotators & Lateral Flexors"],
                compound: false,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "medium",
                description:
                  "Standing side bend with a dumbbell or cable. Loaded lateral flexion.",
                mechanics:
                  "Unilateral load creates a moment arm the contralateral obliques resist and overcome.",
                warmup: PLACEHOLDER_WARMUP,
              },
            ],
          },
        ],
      },
    ],
  },
];

// ============================================================
// PROGRAMMING HELPERS
// ============================================================

export function getProgrammingParameters(category: CategoryType): ProgrammingParameters {
  if (category === "systemic") {
    return {
      sets: "2–4 sets",
      reps: "5–8 reps (heavy) or 8–12 (hypertrophy)",
      frequency: "2x per week",
      rest: "2–3 minutes",
      intensity: "Push hard — leave 1–2 reps in reserve on compounds",
      rationale:
        "Heavy multi-joint loading with longer rest and lower volume to manage CNS / systemic fatigue.",
    };
  }
  return {
    sets: "3–5 sets",
    reps: "8–15 reps (or 20–30 for metabolic)",
    frequency: "2–3x per week",
    rest: "60–90 seconds",
    intensity: "Push to or near failure — 0–1 reps in reserve on isolation",
    rationale:
      "Higher-volume isolation with shorter rest. Low joint cost lets you push harder and train more frequently.",
  };
}

export function getDefaultSets(_category?: CategoryType): number {
  return 3;
}

export function getDefaultReps(category: CategoryType): number {
  return category === "systemic" ? 6 : 12;
}

export function getDefaultWeight(): number {
  return 0;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================================
// HYPERTROPHY MATRIX TARGETS
// ============================================================

/** Target ratio of compound (Tier 1 multi-joint) volume to total. 40/60 by user spec. */
export const COMPOUND_VOLUME_TARGET = 0.4;

/** All major joint actions that must be hit weekly to avoid coverage penalties. */
export const MAJOR_JOINT_ACTIONS: JointAction[] = [
  "Knee Extensors",
  "Knee Flexors",
  "Hip Extensors",
  "Shoulder Horizontal Adductors",
  "Shoulder Adductors",
  "Shoulder Extensors",
  "Shoulder Abductors",
  "Shoulder Horizontal Abductors",
  "Elbow Flexors",
  "Elbow Extensors",
  "Spinal Flexors",
  "Ankle Plantarflexors",
];
