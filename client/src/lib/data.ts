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
                name: "Upright Squat",
                difficulty: "hard",
                targetedMuscles: ["Quadriceps", "Glutes", "Adductors", "Spinal Erectors"],
                jointActions: ["Knee Extensors", "Hip Extensors", "Spinal Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "medium",
                sfr: "high",
                description:
                  "Upright-torso squat (high-bar, front, Smith, or heel-elevated) that biases the quadriceps through full knee flexion.",
                mechanics:
                  "An upright torso lengthens the moment arm at the knee and shortens it at the hip, shifting demand to the quads. Heel elevation lets the knees travel further forward for greater quad stretch.",
                equipment: [
                  { id: "high-bar-bb", name: "Barbell (High-Bar)" },
                  { id: "front-bb", name: "Barbell (Front Squat)" },
                  { id: "smith", name: "Smith Machine" },
                  { id: "heel-elevated", name: "Heel-Elevated" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard rates high-bar squats S-tier and front squats A-tier; Smith stability lets lifters push closer to failure. Israetel recommends heel elevation for deeper knee travel.",
              },
              {
                id: "hack-pendulum-squat",
                name: "Hack / Pendulum Squat",
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
                equipment: [
                  { id: "hack", name: "Hack Squat Machine" },
                  { id: "pendulum", name: "Pendulum Squat Machine" },
                ],
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
                equipment: [
                  { id: "belt-machine", name: "Belt Squat Machine" },
                  { id: "cable-belt", name: "Cable Belt Setup" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel highlights belt squats for quads with low systemic fatigue.",
              },
              {
                id: "leg-press",
                name: "Leg Press",
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
                equipment: [
                  { id: "leg-press-45", name: "45° Leg Press" },
                  { id: "plate-leg-press", name: "Plate-Loaded" },
                  { id: "selectorized-leg-press", name: "Selectorized" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier; main limitation is ROM.",
              },
              {
                id: "quad-split-squat",
                name: "Quad-Biased Split Squat / Lunge",
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
                equipment: [
                  { id: "bulgarian", name: "Bulgarian Split Squat" },
                  { id: "db-split", name: "Dumbbell Split Squat" },
                  { id: "smith-split", name: "Smith Machine Split Squat" },
                ],
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
                name: "Long-Stride Lunge",
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
                equipment: [
                  { id: "walking", name: "Walking Lunge" },
                  { id: "db", name: "Dumbbell" },
                  { id: "bb", name: "Barbell" },
                  { id: "smith-lunge", name: "Smith Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard highlights walking lunges for the lower-glute stretch under load.",
              },
              {
                id: "ffe-lunge",
                name: "Front-Foot-Elevated Lunge",
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
                equipment: [
                  { id: "smith-ffe", name: "Smith Machine" },
                  { id: "db-ffe", name: "Dumbbell" },
                  { id: "bb-ffe", name: "Barbell" },
                  { id: "cable-ffe", name: "Cable-Supported" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Both coaches: deep glute stretch under high tension.",
              },
              {
                id: "glute-split-squat",
                name: "Glute-Biased Split Squat",
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
                equipment: [
                  { id: "bulgarian-glute", name: "Bulgarian Split Squat" },
                  { id: "db-glute-split", name: "Dumbbell Split Squat" },
                  { id: "smith-glute-split", name: "Smith Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: forward-lean BSS for glute-focused unilateral work.",
              },
              {
                id: "sit-back-squat",
                name: "Sit-Back Squat",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Adductors", "Quadriceps", "Erectors"],
                jointActions: ["Hip Extensors", "Knee Extensors", "Spinal Extensors"],
                compound: true,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "high",
                description:
                  "Low-bar or feet-forward Smith squat with a medium-wide stance and hips pushed back.",
                mechanics:
                  "The hip-dominant pattern lengthens the hip moment arm and shortens the knee one, shifting load to the posterior chain.",
                equipment: [
                  { id: "low-bar", name: "Barbell (Low-Bar)" },
                  { id: "smith-feet-fwd", name: "Smith Machine (Feet Forward)" },
                  { id: "box", name: "Box Squat" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel & Nippard: glute-biased squat patterning.",
              },
              {
                id: "high-step-up",
                name: "High Step-Up",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Quadriceps", "Adductors"],
                jointActions: ["Hip Extensors", "Knee Extensors"],
                compound: true,
                stretchEmphasis: true,
                stability: "low",
                sfr: "medium",
                description:
                  "Step-up onto a high box (knee-height or above). Targets the upper glutes through deep hip flexion.",
                mechanics:
                  "High box forces deep hip flexion at the start, pre-stretching the glute max. Less ideal for quad work because of stability and limited eccentric.",
                equipment: [
                  { id: "db-step", name: "Dumbbell" },
                  { id: "bb-step", name: "Barbell" },
                  { id: "smith-step", name: "Smith Machine" },
                  { id: "bw-step", name: "Bodyweight" },
                ],
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
                name: "Stiff-Leg / Romanian Deadlift",
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
                equipment: [
                  { id: "bb-rdl", name: "Barbell" },
                  { id: "db-rdl", name: "Dumbbell" },
                  { id: "smith-rdl", name: "Smith Machine" },
                  { id: "cable-rdl", name: "Cable" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: deep hamstring stretch from sit-back hip hinge.",
              },
              {
                id: "good-morning",
                name: "Good Morning",
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
                equipment: [
                  { id: "bb-gm", name: "Barbell" },
                  { id: "ssb", name: "Safety Squat Bar" },
                  { id: "smith-gm", name: "Smith Machine" },
                ],
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
                stretchEmphasis: false,
                stability: "medium",
                sfr: "medium",
                description:
                  "Standing hip hinge with cable resistance pulled between the legs. Beginner-friendly hinge pattern.",
                mechanics:
                  "Cable line keeps tension consistent through the hip-extension arc. Lower fatigue than barbell hinging.",
                equipment: [
                  { id: "cable-rope-pt", name: "Cable Rope" },
                  { id: "band-pt", name: "Band" },
                ],
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
                id: "hip-thrust",
                name: "Hip Thrust",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Hamstrings"],
                jointActions: ["Hip Extensors"],
                compound: true,
                stretchEmphasis: false,
                stability: "high",
                sfr: "very-high",
                description:
                  "Loaded hip thrust from the floor or a bench, generating peak glute contraction at lockout.",
                mechanics:
                  "The hip-extension moment arm is largest at full lockout, allowing high tension in the shortened glute position.",
                equipment: [
                  { id: "machine-ht", name: "Glute Thrust Machine" },
                  { id: "bb-ht", name: "Barbell" },
                  { id: "db-ht", name: "Dumbbell" },
                  { id: "smith-ht", name: "Smith Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel & Nippard: top middle-glute option, easy to overload.",
              },
              {
                id: "glute-bridge",
                name: "Glute Bridge",
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
                equipment: [
                  { id: "bb-gb", name: "Barbell" },
                  { id: "db-gb", name: "Dumbbell" },
                  { id: "machine-gb", name: "Machine" },
                  { id: "bw-gb", name: "Bodyweight" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: beginner-friendly hip-thrust alternative.",
              },
              {
                id: "deadlift",
                name: "Conventional / Sumo Deadlift",
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
                equipment: [
                  { id: "bb-dl", name: "Barbell" },
                  { id: "trap-dl", name: "Trap Bar" },
                  { id: "db-dl", name: "Dumbbell" },
                ],
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
                equipment: [
                  { id: "bench-45", name: "45° Bench" },
                  { id: "horizontal-bench", name: "Horizontal Bench" },
                  { id: "ghd", name: "Glute-Ham Developer" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier for glutes; full-ROM lumbar extension.",
              },
              {
                id: "jefferson-curl",
                name: "Jefferson Curl",
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
                equipment: [
                  { id: "bb-jc", name: "Barbell" },
                  { id: "db-jc", name: "Dumbbell" },
                  { id: "kb-jc", name: "Kettlebell" },
                ],
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
                id: "chest-press",
                name: "Chest Press",
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
                  "Flat horizontal press — machine, dumbbell, barbell, Smith, or cambered-bar. Constant tension with deep stretch.",
                mechanics:
                  "Bar/handle path arcs from chest to lockout. Cambered bars and DBs allow deeper bottom range; machine provides smooth resistance and stability.",
                equipment: [
                  { id: "machine-cp", name: "Machine Chest Press" },
                  { id: "db-bp", name: "Dumbbell" },
                  { id: "bb-bp", name: "Barbell" },
                  { id: "smith-bp", name: "Smith Machine" },
                  { id: "cambered", name: "Cambered Bar" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: machine chest press is his overall best chest builder.",
              },
              {
                id: "incline-press",
                name: "Incline Press",
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
                  "15°–30° incline press. Biases the clavicular pec and front delt while still building the mid/lower chest.",
                mechanics:
                  "Incline shifts the line of pull more vertical, increasing shoulder flexion demand and clavicular pec involvement.",
                equipment: [
                  { id: "bb-inc", name: "Barbell" },
                  { id: "db-inc", name: "Dumbbell" },
                  { id: "smith-inc", name: "Smith Machine" },
                  { id: "machine-inc", name: "Machine" },
                ],
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
                name: "Deficit Push-Up",
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
                equipment: [
                  { id: "handles", name: "Push-Up Handles" },
                  { id: "db-handles", name: "Dumbbell Handles" },
                  { id: "parallettes", name: "Parallettes" },
                  { id: "blocks", name: "Yoga Blocks" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: ultra-deep chest stretch.",
              },
              {
                id: "chest-dip",
                name: "Chest-Focused Dip",
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
                equipment: [
                  { id: "parallel-bars", name: "Parallel Bars" },
                  { id: "assisted-dip", name: "Assisted Dip Machine" },
                  { id: "plate-dip", name: "Plate-Loaded Dip" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier chest. Israetel: forward lean for chest.",
              },
              {
                id: "cable-fly",
                name: "Cable Fly",
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
                equipment: [
                  { id: "seated-cable", name: "Seated Cable Fly" },
                  { id: "standing-cable", name: "Standing Cable Fly" },
                  { id: "crossover", name: "Cable Crossover" },
                  { id: "press-around", name: "Cable Press-Around" },
                ],
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
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Pec-deck machine that fixes the arms in an arc and removes balance demand.",
                mechanics:
                  "Shoulder horizontal adduction along a machine-fixed path. Stable and easy to progress.",
                equipment: [
                  { id: "pec-deck", name: "Pec Deck" },
                  { id: "plate-fly", name: "Plate-Loaded Fly Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier; stable, focused chest tension.",
              },
              {
                id: "db-fly",
                name: "Dumbbell Fly",
                difficulty: "medium",
                targetedMuscles: ["Pectorals"],
                jointActions: ["Shoulder Horizontal Adductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "low",
                sfr: "medium",
                description:
                  "Free-weight horizontal adduction with dumbbells. Big stretch but loads drop off at lockout.",
                mechanics:
                  "Tension peaks at the bottom of the arc where the dumbbells are furthest from the shoulder; minimal load at the top.",
                equipment: [
                  { id: "flat-fly", name: "Flat Bench" },
                  { id: "incline-fly", name: "Incline Bench" },
                  { id: "janicki", name: "Janicki Setup" },
                ],
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
                id: "ohp",
                name: "Overhead Press",
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
                  "Vertical press from shoulder height to overhead. Machine, DB, BB, or Smith options.",
                mechanics:
                  "Shoulder flexion and abduction drive the bar up while the triceps lock out the elbows. Machine provides the most stability.",
                equipment: [
                  { id: "machine-ohp", name: "Machine Shoulder Press" },
                  { id: "db-ohp", name: "Dumbbell" },
                  { id: "bb-ohp", name: "Barbell" },
                  { id: "smith-ohp", name: "Smith Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: machine shoulder press A+ for front delts.",
              },
              {
                id: "close-grip-press",
                name: "Close-Grip Press",
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
                equipment: [
                  { id: "cgbp", name: "Close-Grip Bench" },
                  { id: "smith-jm", name: "Smith Machine JM Press" },
                  { id: "bb-jm", name: "Barbell JM Press" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier compound triceps.",
              },
              {
                id: "triceps-dip",
                name: "Triceps Dip (Vertical Torso)",
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
                equipment: [
                  { id: "dip-machine", name: "Dip Machine" },
                  { id: "parallel-bars-trip", name: "Parallel Bars" },
                  { id: "assisted-dip-trip", name: "Assisted Dip" },
                ],
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
                name: "Lat Pulldown",
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
                equipment: [
                  { id: "cable-wide", name: "Cable Wide-Grip" },
                  { id: "cable-neutral", name: "Cable Neutral-Grip" },
                  { id: "cable-single", name: "Single-Arm / Half-Kneeling" },
                  { id: "machine-pd", name: "Machine Pulldown" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier; preferred over pull-ups for tracking.",
              },
              {
                id: "pullup",
                name: "Pull-Up / Chin-Up",
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
                  "Bodyweight (or weighted) vertical pull. Full lat stretch at the bottom; chin-up adds elbow-flexor demand.",
                mechanics:
                  "Free-hanging position requires controlled scapular and shoulder mechanics; eccentric loads the lats deeply.",
                equipment: [
                  { id: "bw-pu", name: "Bodyweight" },
                  { id: "weighted-pu", name: "Weighted" },
                  { id: "assisted-pu", name: "Assisted Machine" },
                  { id: "neutral-pu", name: "Neutral Grip" },
                  { id: "underhand-pu", name: "Underhand (Chin-Up)" },
                  { id: "wide-pu", name: "Wide Grip" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: unbeatable for lat development. Nippard: less smooth resistance than pulldown.",
              },
              {
                id: "lat-prayer",
                name: "Straight-Arm Pulldown / Lat Prayer",
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
                equipment: [
                  { id: "cable-rope-prayer", name: "Cable Rope" },
                  { id: "cable-bar-prayer", name: "Cable Straight Bar" },
                  { id: "band-prayer", name: "Band" },
                  { id: "machine-pullover", name: "Machine Pullover" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: leaning forward maximizes lat stretch. Nippard: smooth cable progression.",
              },
              {
                id: "pullover",
                name: "Pullover",
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
                equipment: [
                  { id: "cable-pullover", name: "Cable Pullover" },
                  { id: "db-pullover", name: "Dumbbell Pullover" },
                  { id: "machine-po", name: "Machine Pullover" },
                ],
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
                name: "Chest-Supported Row",
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
                equipment: [
                  { id: "tbar", name: "T-Bar Chest-Supported" },
                  { id: "machine-row", name: "Machine Row" },
                  { id: "incline-db-row", name: "Incline Bench DB Row" },
                  { id: "seal-row", name: "Seal Row" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: best all-around back exercise.",
              },
              {
                id: "cable-row",
                name: "Cable Row",
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
                  "Seated horizontal cable row with smooth resistance through full ROM.",
                mechanics:
                  "Cable maintains tension at the deep stretch where free-weight rows lose load.",
                equipment: [
                  { id: "seated-cable-row", name: "Seated Cable Row" },
                  { id: "wide-cable-row", name: "Wide-Grip Cable Row" },
                  { id: "single-cable-row", name: "Single-Arm Cable Row" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier horizontal row.",
              },
              {
                id: "barbell-row",
                name: "Barbell Row",
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
                equipment: [
                  { id: "bb-row", name: "Barbell Row" },
                  { id: "deficit-pendlay", name: "Deficit Pendlay Row" },
                  { id: "yates", name: "Yates Row" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: deficit barbell row for big stretch. Nippard: A-tier deficit Pendlay.",
              },
              {
                id: "meadows-row",
                name: "Meadows Row",
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
                equipment: [
                  { id: "landmine", name: "Landmine" },
                  { id: "tbar-meadows", name: "T-Bar Setup" },
                  { id: "one-arm-bb", name: "One-Arm Barbell" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier; isolateral stretch.",
              },
              {
                id: "inverted-row-face",
                name: "Inverted Row to Face / Throat",
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
                equipment: [
                  { id: "smith-inv", name: "Smith Machine" },
                  { id: "bb-rack-inv", name: "Barbell in Rack" },
                  { id: "trx-inv", name: "TRX / Suspension" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: face/throat pull line for rear-delt-heavy row.",
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
                id: "supinated-pulldown",
                name: "Supinated Pulldown",
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
                equipment: [
                  { id: "cable-uh-pd", name: "Cable Underhand Pulldown" },
                  { id: "machine-uh-pd", name: "Machine Underhand Pulldown" },
                ],
                warmup: PLACEHOLDER_WARMUP,
              },
              {
                id: "supinated-row",
                name: "Supinated Row",
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
                equipment: [
                  { id: "cable-uh-row", name: "Underhand Cable Row" },
                  { id: "bb-uh-row", name: "Underhand Barbell Row" },
                  { id: "machine-uh-row", name: "Machine Row" },
                ],
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
                name: "Bayesian Curl",
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
                equipment: [
                  { id: "cable-single-bay", name: "Cable Single-Arm" },
                  { id: "cable-bilateral-bay", name: "Cable Bilateral" },
                  { id: "freemotion", name: "FreeMotion Cable" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard's #1 biceps exercise.",
              },
              {
                id: "incline-curl",
                name: "Incline Curl",
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
                equipment: [
                  { id: "db-incline-curl", name: "Dumbbell" },
                  { id: "cable-incline-curl", name: "Cable" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel & Nippard: A-tier deep stretch.",
              },
              {
                id: "lying-curl",
                name: "Lying / Flat-Bench Curl",
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
                equipment: [
                  { id: "clown", name: "Dumbbell Clown Curl" },
                  { id: "low-cable-lying", name: "Low-Cable Lying Curl" },
                  { id: "decline-bench-curl", name: "Decline-Bench Curl" },
                ],
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
                name: "Preacher Curl",
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
                equipment: [
                  { id: "db-preacher", name: "Dumbbell" },
                  { id: "machine-preacher", name: "Machine" },
                  { id: "ez-preacher", name: "EZ-Bar" },
                  { id: "cable-preacher", name: "Cable" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier biceps.",
              },
              {
                id: "cable-curl",
                name: "Cable Curl",
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
                equipment: [
                  { id: "standing-cable-curl", name: "Standing Cable Curl" },
                  { id: "superman-curl", name: "Superman / FreeMotion" },
                  { id: "ez-cable", name: "EZ-Bar Cable" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier; Israetel: Superman variant strong.",
              },
              {
                id: "strict-curl",
                name: "Strict Curl",
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
                equipment: [
                  { id: "bb-strict", name: "Barbell" },
                  { id: "ez-strict", name: "EZ-Bar" },
                  { id: "db-strict", name: "Dumbbell" },
                ],
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
                name: "Hammer Curl",
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
                equipment: [
                  { id: "db-hammer", name: "Dumbbell" },
                  { id: "rope-hammer", name: "Rope Cable" },
                  { id: "machine-hammer", name: "Machine" },
                  { id: "cross-body", name: "Cross-Body" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier.",
              },
              {
                id: "preacher-hammer",
                name: "Preacher Hammer Curl",
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
                equipment: [
                  { id: "db-preacher-h", name: "Dumbbell" },
                  { id: "machine-preacher-h", name: "Machine" },
                  { id: "cable-preacher-h", name: "Cable" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier brachialis pick.",
              },
              {
                id: "reverse-curl",
                name: "Reverse Curl",
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
                equipment: [
                  { id: "ez-reverse", name: "EZ-Bar" },
                  { id: "bb-reverse", name: "Barbell" },
                  { id: "cable-reverse", name: "Cable" },
                  { id: "db-reverse", name: "Dumbbell" },
                ],
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
                name: "Overhead Triceps Extension",
                difficulty: "easy",
                targetedMuscles: ["Triceps Long Head", "Medial / Lateral Heads"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Cable, EZ-bar, or DB extension with arms overhead. Deep stretch on the triceps long head.",
                mechanics:
                  "Shoulder flexion lengthens the long head before elbow extension, loading it in its longest position.",
                equipment: [
                  { id: "cable-bar-ohte", name: "Cable Bar" },
                  { id: "cable-rope-ohte", name: "Cable Rope" },
                  { id: "db-ohte", name: "Dumbbell" },
                  { id: "ez-ohte", name: "EZ-Bar" },
                  { id: "machine-ohte", name: "Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S+ for long head.",
              },
              {
                id: "katana-ext",
                name: "Katana Extension",
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
                equipment: [
                  { id: "cable-single-katana", name: "Cable Single-Arm" },
                  { id: "cable-rope-katana", name: "Cable Rope" },
                  { id: "cuff-katana", name: "Cuff Cable" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: A-tier long-head cable work.",
              },
              {
                id: "french-press",
                name: "French Press",
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
                equipment: [
                  { id: "db-fp", name: "Dumbbell" },
                  { id: "ez-fp", name: "EZ-Bar" },
                  { id: "cable-fp", name: "Cable" },
                ],
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
                name: "Triceps Pressdown",
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
                equipment: [
                  { id: "cable-bar-pd", name: "Straight Bar" },
                  { id: "vbar-pd", name: "V-Bar" },
                  { id: "rope-pd", name: "Rope" },
                  { id: "machine-pd-tri", name: "Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Nippard: A-tier bar pressdown. Israetel: V-bar for stretch path.",
              },
              {
                id: "skullcrusher",
                name: "Skullcrusher",
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
                equipment: [
                  { id: "bb-sk", name: "Barbell" },
                  { id: "ez-sk", name: "EZ-Bar" },
                  { id: "db-sk", name: "Dumbbell" },
                  { id: "smith-sk", name: "Smith Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier; Israetel: near-perfect force curve.",
              },
              {
                id: "cable-kickback",
                name: "Cable Kickback",
                difficulty: "easy",
                targetedMuscles: ["Lateral Head", "Medial Head"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "medium",
                description:
                  "Cable kickback for peak triceps contraction at the shortened position.",
                mechanics:
                  "Cable maintains tension in the contracted top range better than dumbbell kickbacks.",
                equipment: [
                  { id: "cable-single-kick", name: "Cable Single-Arm" },
                  { id: "cuff-kick", name: "Cable Cuff" },
                  { id: "machine-kick", name: "Machine" },
                ],
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
        muscles: ["Lateral Delts", "Rear Delts", "Front Delts"],
        subcategories: [
          {
            id: "lateral-contracted",
            name: "Lateral Delt — Contracted Bias",
            description:
              "Free-weight or machine raises with the load hardest at the top contraction.",
            exercises: [
              {
                id: "db-lateral",
                name: "Dumbbell Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Lateral Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "medium",
                description:
                  "Standing or seated DB lateral raise. Standard side-delt builder.",
                mechanics:
                  "Free-weight tension is maximal at the top of the abduction arc and drops at the bottom.",
                equipment: [
                  { id: "standing-db-lat", name: "Standing DB" },
                  { id: "seated-db-lat", name: "Seated DB" },
                  { id: "lean-in", name: "Lean-In DB" },
                  { id: "side-lying", name: "Side-Lying DB" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes:
                  "Israetel: seated strict eccentric. Nippard: lean-in and side-lying highly ranked.",
              },
              {
                id: "super-rom-lateral",
                name: "Super-ROM Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Lateral Delts", "Front Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: false,
                stability: "medium",
                sfr: "medium",
                description:
                  "Lateral raise carried above shoulder height for fuller delt development.",
                mechanics:
                  "Going above parallel recruits more upper delt fibers; controlled eccentrics required.",
                equipment: [
                  { id: "db-srom", name: "Dumbbell" },
                  { id: "cable-srom", name: "Cable" },
                  { id: "machine-srom", name: "Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: broader delt development.",
              },
              {
                id: "machine-lateral",
                name: "Machine Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Lateral Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: false,
                stability: "high",
                sfr: "high",
                description:
                  "Selectorized or plate-loaded machine lateral raise. Stable side-delt isolation.",
                mechanics:
                  "Machine arm path eliminates balance demand and keeps tension on the side delt.",
                equipment: [
                  { id: "select-mlr", name: "Selectorized" },
                  { id: "plate-mlr", name: "Plate-Loaded" },
                  { id: "atlantis", name: "Atlantis Standing" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: Atlantis A+; clean isolation.",
              },
            ],
          },
          {
            id: "lateral-stretch",
            name: "Lateral Delt — Stretch Bias",
            description:
              "Cable raises with constant tension in the bottom stretch position.",
            exercises: [
              {
                id: "cable-lateral",
                name: "Cable Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Lateral Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "very-high",
                description:
                  "Single-arm cable lateral raise with the pulley at hand height. Tension peaks early in the stretch.",
                mechanics:
                  "Hand-height pulley line biases peak tension to the lengthened range, opposite of DB raises.",
                equipment: [
                  { id: "cable-single-lat", name: "Single-Arm Cable" },
                  { id: "cuffed-lat", name: "Cuffed Cable" },
                  { id: "btb-cable-lat", name: "Behind-the-Back Cable" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard's #1 side-delt pick.",
              },
              {
                id: "cable-y-raise",
                name: "Cable Y-Raise",
                difficulty: "medium",
                targetedMuscles: ["Lateral Delts", "Lower Traps"],
                jointActions: ["Shoulder Abductors", "Scapular Upward Rotators"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Cable lateral raise carried up into a Y position. Side delts plus lower trap upward rotation.",
                mechanics:
                  "Y-line of pull combines abduction with scapular upward rotation, hitting the lower traps.",
                equipment: [
                  { id: "cable-handles-y", name: "Cable Handles" },
                  { id: "cuffs-y", name: "Cable Cuffs" },
                  { id: "dual-y", name: "Dual Cable" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier.",
              },
              {
                id: "btb-cable-lateral",
                name: "Behind-the-Back Cuffed Cable Lateral",
                difficulty: "medium",
                targetedMuscles: ["Lateral Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchEmphasis: true,
                stability: "high",
                sfr: "high",
                description:
                  "Cable lateral raise performed with the cable running behind the body. Maximizes side-delt stretch.",
                mechanics:
                  "Behind-the-back cable line places the side delt in its longest position before abduction.",
                equipment: [
                  { id: "btb-cuff", name: "Cable Cuff" },
                  { id: "btb-single", name: "Single-Arm Cable" },
                ],
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
                name: "Reverse Pec Deck",
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
                equipment: [
                  { id: "pec-deck-r", name: "Pec Deck" },
                  { id: "rear-machine", name: "Rear-Delt Machine" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard's best rear-delt pick.",
              },
              {
                id: "reverse-cable-crossover",
                name: "Reverse Cable Crossover",
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
                equipment: [
                  { id: "cable-handles-rcc", name: "Cable Handles" },
                  { id: "cable-cuffs-rcc", name: "Cable Cuffs" },
                  { id: "cross-body-rcc", name: "Cross-Body Pull" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: S-tier rear-delt.",
              },
              {
                id: "face-pull",
                name: "Face Pull",
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
                equipment: [
                  { id: "cable-rope-fp", name: "Cable Rope" },
                  { id: "cable-bar-fp", name: "Cable Bar" },
                  { id: "trx-fp", name: "TRX" },
                ],
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
                name: "Front Raise",
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
                equipment: [
                  { id: "db-fr", name: "Dumbbell" },
                  { id: "cable-fr", name: "Cable" },
                  { id: "plate-fr", name: "Plate" },
                  { id: "machine-fr", name: "Machine" },
                ],
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
                name: "Seated Leg Curl",
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
                equipment: [
                  { id: "select-slc", name: "Selectorized" },
                  { id: "plate-slc", name: "Plate-Loaded" },
                ],
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
                name: "Prone / Standing Leg Curl",
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
                equipment: [
                  { id: "lying-lc", name: "Lying Leg Curl" },
                  { id: "standing-lc", name: "Standing Leg Curl" },
                  { id: "ankle-cuff-lc", name: "Cable Ankle Cuff" },
                ],
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
                name: "Leg Extension",
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
                equipment: [
                  { id: "select-le", name: "Selectorized" },
                  { id: "plate-le", name: "Plate-Loaded" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Nippard: near-perfect quad iso.",
              },
              {
                id: "reverse-nordic",
                name: "Reverse Nordic Curl",
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
                equipment: [
                  { id: "bw-rn", name: "Bodyweight" },
                  { id: "band-rn", name: "Band-Assisted" },
                  { id: "weighted-rn", name: "Weighted" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Both coaches: massive quad stretch.",
              },
              {
                id: "sissy-squat",
                name: "Sissy Squat",
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
                equipment: [
                  { id: "bw-ss", name: "Bodyweight" },
                  { id: "ss-bench", name: "Sissy Squat Bench" },
                  { id: "trx-ss", name: "TRX-Assisted" },
                ],
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
                name: "Straight-Leg Calf Raise",
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
                equipment: [
                  { id: "belt-calf", name: "Belt Squat" },
                  { id: "standing-calf", name: "Standing Calf Machine" },
                  { id: "dip-belt-calf", name: "Dip Belt Off Ledge" },
                  { id: "lp-calf", name: "Leg Press Calves" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: deep loaded stretch with pause.",
              },
              {
                id: "seated-calf",
                name: "Seated Calf Raise",
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
                equipment: [
                  { id: "machine-sc", name: "Seated Calf Machine" },
                  { id: "db-on-knees", name: "Dumbbell on Knees" },
                  { id: "smith-sc", name: "Smith Machine Seated" },
                ],
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
                name: "Abdominal Crunch Machine",
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
                equipment: [
                  { id: "select-acm", name: "Selectorized" },
                  { id: "plate-acm", name: "Plate-Loaded" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: best ab option when designed well.",
              },
              {
                id: "cable-crunch",
                name: "Cable Crunch",
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
                equipment: [
                  { id: "rope-cc", name: "Cable Rope" },
                  { id: "bar-cc", name: "Cable Bar" },
                  { id: "round-cc", name: "Rounded Surface" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Israetel: accessible and loadable.",
              },
              {
                id: "inverted-bench-crunch",
                name: "Inverted Bench Crunch",
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
                equipment: [
                  { id: "decline-ibc", name: "Decline Bench" },
                  { id: "plate-ibc", name: "Weighted Plate / DB" },
                ],
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
                name: "V-Up",
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
                equipment: [
                  { id: "bw-vu", name: "Bodyweight" },
                  { id: "weighted-vu", name: "Weighted" },
                  { id: "bench-vu", name: "Bench Variation" },
                ],
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
                equipment: [
                  { id: "ab-wheel-eq", name: "Ab Wheel" },
                  { id: "bb-rollout", name: "Barbell Rollout" },
                  { id: "stability-ball", name: "Stability Ball" },
                ],
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
                name: "Cable Woodchop",
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
                equipment: [
                  { id: "cable-d-handle", name: "D-Handle" },
                  { id: "cable-rope-cw", name: "Rope" },
                ],
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
                name: "Pallof Press",
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
                equipment: [
                  { id: "cable-pp", name: "Cable D-Handle" },
                  { id: "band-pp", name: "Band" },
                ],
                warmup: PLACEHOLDER_WARMUP,
                coachNotes: "Standard anti-rotation oblique pick.",
              },
              {
                id: "side-bend",
                name: "Weighted Side Bend",
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
                equipment: [
                  { id: "db-sb", name: "Dumbbell" },
                  { id: "cable-sb", name: "Cable" },
                ],
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

/** Target ratio of compound (Tier 1 multi-joint) volume to total. 80/20 by user spec. */
export const COMPOUND_VOLUME_TARGET = 0.8;

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
