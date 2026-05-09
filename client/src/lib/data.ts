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
/**
 * Loaded-stretch tier. `moderate` = baseline lengthening under load (most
 * lifts have at least this). `high` = a primary stretch-focused movement.
 * `very-high` = exceptional stretch loading (Nippard / Israetel "best
 * stretch" picks like Bayesian curl, lat prayer, sissy squat, deficit
 * push-up, incline DB bench, etc.).
 */
export type StretchLevel = "moderate" | "high" | "very-high";

/**
 * Optional tag overrides applied when a specific equipment / angle option
 * is selected. The rating engine resolves these on top of the exercise's
 * base tags, so the toggle looks like a harmless choice on the surface
 * while quietly modifying the rating-relevant attributes underneath.
 */
export interface TagOverrides {
  stretchLevel?: StretchLevel;
  stability?: StimulusLevel;
  sfr?: StimulusLevel;
  /** Joint actions to ADD to the exercise's base list. */
  addJointActions?: JointAction[];
  /** Joint actions to REMOVE from the exercise's base list. */
  removeJointActions?: JointAction[];
}

export interface EquipmentOption {
  id: string;
  name: string;
  tagOverrides?: TagOverrides;
}

export interface AngleOption {
  id: string;
  name: string;
  description: string;
  tagOverrides?: TagOverrides;
}

/**
 * Canonical joint actions used by the rating engine. Trimmed by user spec:
 * Shoulder Internal Rotators removed (over-trained incidentally; external
 * rotation is the under-trained one we care about). Ankle Dorsiflexors
 * removed (minimal muscle, trained alongside other lifts).
 */
export const JOINT_ACTIONS = [
  // Shoulder
  "Shoulder Flexors",
  "Shoulder Extensors",
  "Shoulder Abductors",
  "Shoulder Adductors",
  "Shoulder Horizontal Abductors",
  "Shoulder Horizontal Adductors",
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
  /** How heavily the exercise loads the muscle in its lengthened position. */
  stretchLevel: StretchLevel;
  /** Higher stability = safer to push to / near failure. */
  stability: StimulusLevel;
  /** Stimulus-to-Fatigue Ratio for the prime mover. */
  sfr: StimulusLevel;
  description: string;
  mechanics: string;
  equipment?: EquipmentOption[];
  angles?: AngleOption[];
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
                stretchLevel: "high",
                stability: "medium",
                sfr: "high",
                description:
                  "Upright-torso squat (high-bar, front, Smith, or heel-elevated) that biases the quadriceps through full knee flexion.",
                mechanics:
                  "An upright torso lengthens the moment arm at the knee and shortens it at the hip, shifting demand to the quads. Heel elevation lets the knees travel further forward for greater quad stretch.",
                equipment: [
                  { id: "barbell-back", name: "Barbell Back Squat (High-Bar)" },
                  { id: "front-bb", name: "Barbell Front Squat" },
                  { id: "smith", name: "Smith Machine Squat" },
                  { id: "heel-elevated", name: "Heel-Elevated Squat" },
                ],
                angles: [
                  {
                    id: "parallel-stance",
                    name: "Parallel Stance",
                    description:
                      "Feet shoulder-width, toes pointing forward. Standard quad/hip-extension pattern.",
                  },
                  {
                    id: "toes-spread",
                    name: "Toes-Spread Stance",
                    description:
                      "Slightly wider stance with toes flared out. Recruits glute medius and hip external rotators alongside the quads.",
                    tagOverrides: {
                      addJointActions: ["Hip Abductors", "Hip External Rotators"],
                    },
                  },
                ],
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
                stretchLevel: "high",
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
                angles: [
                  {
                    id: "parallel-mid-hack",
                    name: "Parallel / Mid Foot",
                    description: "Standard stance with foot mid-platform. Balanced quad-glute bias.",
                  },
                  {
                    id: "low-foot-hack",
                    name: "Low Foot Position",
                    description: "Foot low on the platform. Maximizes knee travel and quad emphasis.",
                  },
                  {
                    id: "high-foot-hack",
                    name: "High Foot Position",
                    description: "Foot high on the platform. Reduces knee travel and biases the glutes / hamstrings.",
                  },
                  {
                    id: "toes-spread-hack",
                    name: "Toes-Spread Stance",
                    description: "Wider stance with toes flared. Adds glute medius and hip external rotation.",
                    tagOverrides: {
                      addJointActions: ["Hip Abductors", "Hip External Rotators"],
                    },
                  },
                  {
                    id: "wide-stance-hack",
                    name: "Wide Stance",
                    description: "Wide foot placement loads the adductors heavily.",
                    tagOverrides: {
                      addJointActions: ["Hip Adductors"],
                    },
                  },
                ],
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
                stretchLevel: "high",
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
                angles: [
                  {
                    id: "parallel-stance-belt",
                    name: "Parallel Stance",
                    description: "Feet shoulder-width, toes forward.",
                  },
                  {
                    id: "toes-spread-belt",
                    name: "Toes-Spread Stance",
                    description: "Wider stance with toes flared. Adds glute medius and hip external rotation.",
                    tagOverrides: {
                      addJointActions: ["Hip Abductors", "Hip External Rotators"],
                    },
                  },
                ],
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
                stretchLevel: "moderate",
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
                angles: [
                  {
                    id: "parallel-mid-lp",
                    name: "Parallel / Mid Foot",
                    description: "Standard stance with foot mid-platform. Balanced quad-glute bias.",
                  },
                  {
                    id: "low-foot-lp",
                    name: "Low Foot Position",
                    description: "Foot low on the platform. Maximizes knee travel and quad emphasis.",
                  },
                  {
                    id: "high-foot-lp",
                    name: "High Foot Position",
                    description: "Foot high on the platform. Reduces knee travel and biases the glutes / hamstrings.",
                  },
                  {
                    id: "toes-spread-lp",
                    name: "Toes-Spread Stance",
                    description: "Wider stance with toes flared. Adds glute medius and hip external rotation.",
                    tagOverrides: {
                      addJointActions: ["Hip Abductors", "Hip External Rotators"],
                    },
                  },
                  {
                    id: "wide-stance-lp",
                    name: "Wide Stance",
                    description: "Wide foot placement loads the adductors heavily.",
                    tagOverrides: {
                      addJointActions: ["Hip Adductors"],
                    },
                  },
                ],
                coachNotes: "Nippard: A-tier; main limitation is ROM.",
              },
              {
                id: "quad-split-squat",
                name: "Quad-Biased Split Squat / Lunge",
                difficulty: "medium",
                targetedMuscles: ["Quadriceps", "Glutes", "Adductors"],
                jointActions: ["Knee Extensors", "Hip Extensors", "Hip Abductors"],
                compound: true,
                stretchLevel: "high",
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
                angles: [
                  {
                    id: "short-stride-quad",
                    name: "Short Stride (Quad)",
                    description: "Front foot close to back. Maximizes knee flexion and quad stretch.",
                  },
                  {
                    id: "ffe-quad",
                    name: "Front-Foot Elevated",
                    description: "Front foot on a 4–6 inch plate. Even deeper quad stretch in the bottom.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                ],
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
                stretchLevel: "high",
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
                stretchLevel: "high",
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
                coachNotes: "Both coaches: deep glute stretch under high tension.",
              },
              {
                id: "glute-split-squat",
                name: "Glute-Biased Split Squat",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Adductors", "Quadriceps"],
                jointActions: ["Hip Extensors", "Knee Extensors"],
                compound: true,
                stretchLevel: "high",
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
                angles: [
                  {
                    id: "long-stride-glute",
                    name: "Long Stride",
                    description: "Front foot far from back foot. Deepens glute stretch via hip flexion.",
                    tagOverrides: {
                      addJointActions: ["Hip Adductors"],
                      stretchLevel: "very-high",
                    },
                  },
                  {
                    id: "ffe-glute",
                    name: "Front-Foot Elevated",
                    description: "Front foot on a plate or step adds glute stretch at the bottom.",
                    tagOverrides: {
                      addJointActions: ["Hip Adductors"],
                      stretchLevel: "very-high",
                    },
                  },
                ],
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
                stretchLevel: "moderate",
                stability: "high",
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
                angles: [
                  {
                    id: "parallel-stance-sb",
                    name: "Parallel Stance",
                    description: "Feet shoulder-width, toes forward.",
                  },
                  {
                    id: "toes-spread-sb",
                    name: "Toes-Spread Stance",
                    description: "Wider stance with toes flared. Adds glute medius and hip external rotation.",
                    tagOverrides: {
                      addJointActions: ["Hip Abductors", "Hip External Rotators"],
                    },
                  },
                ],
                coachNotes: "Israetel & Nippard: glute-biased squat patterning.",
              },
              {
                id: "high-step-up",
                name: "High Step-Up",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Quadriceps", "Adductors"],
                jointActions: ["Hip Extensors", "Knee Extensors"],
                compound: true,
                stretchLevel: "high",
                stability: "medium",
                sfr: "medium",
                description:
                  "Single-leg step-up onto a high box (knee-height or above). Targets the upper glutes through deep hip flexion. Cable-loaded version delivers constant tension at the deep stretch.",
                mechanics:
                  "High box forces deep hip flexion at the start, pre-stretching the glute max. Cable resistance from the front maintains tension at the bottom where free-weight versions deload.",
                equipment: [
                  { id: "db-step", name: "Dumbbell" },
                  { id: "bb-step", name: "Barbell" },
                  { id: "smith-step", name: "Smith Machine" },
                  { id: "bw-step", name: "Bodyweight" },
                  {
                    id: "cable-step",
                    name: "Cable (Single-Leg)",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                ],
                coachNotes:
                  "Nippard: useful upper-glute work. Cable single-leg version maximizes loaded stretch on the front-leg glute.",
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
                targetedMuscles: ["Hamstrings", "Glutes", "Adductors", "Erectors", "Upper Traps"],
                jointActions: [
                  "Hip Extensors",
                  "Spinal Extensors",
                  "Knee Flexors",
                  "Scapular Elevators",
                ],
                compound: true,
                stretchLevel: "very-high",
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
                stretchLevel: "high",
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
                coachNotes: "Israetel: pair with RDLs as hamstring hinges.",
              },
              {
                id: "pull-through",
                name: "Cable Pull-Through",
                difficulty: "easy",
                targetedMuscles: ["Glutes", "Hamstrings"],
                jointActions: ["Hip Extensors"],
                compound: true,
                stretchLevel: "high",
                stability: "high",
                sfr: "high",
                description:
                  "Standing hip hinge with cable resistance pulled between the legs. Beginner-friendly hinge pattern.",
                mechanics:
                  "Cable line keeps tension consistent through the hip-extension arc. Lower fatigue than barbell hinging.",
                equipment: [
                  { id: "cable-rope-pt", name: "Cable Rope" },
                  { id: "band-pt", name: "Band" },
                ],
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
                stretchLevel: "moderate",
                stability: "high",
                sfr: "very-high",
                description:
                  "Glute thrust machine. Maximum stability, comfortable setup, easy to overload.",
                mechanics:
                  "Fixed pad path lets the lifter focus purely on hip extension. Setup time is minimal vs barbell version.",
                equipment: [
                  { id: "thrust-machine", name: "Glute Thrust Machine" },
                ],
                angles: [
                  {
                    id: "standard-mht",
                    name: "Standard Stance",
                    description: "Feet shoulder-width, knees ~90° at the top. Balanced glute / hamstring loading.",
                  },
                  {
                    id: "feet-elevated-mht",
                    name: "Feet Elevated",
                    description: "Feet on a plate / step / box. Hips drop into deeper flexion at the bottom, lengthening the glute under load through a longer ROM.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                  {
                    id: "wide-toes-out-mht",
                    name: "Wide / Toes-Out",
                    description: "Wider stance with toes flared adds glute medius and external rotator engagement.",
                    tagOverrides: {
                      addJointActions: ["Hip Abductors", "Hip External Rotators"],
                    },
                  },
                  {
                    id: "b-stance-mht",
                    name: "B-Stance (Single-Leg Bias)",
                    description: "One foot back as a kickstand — most load goes to the front-leg glute, including glute medius.",
                    tagOverrides: {
                      addJointActions: ["Hip Abductors"],
                    },
                  },
                ],
                coachNotes: "Nippard: top middle-glute option.",
              },
              {
                id: "free-hip-thrust",
                name: "Free-Weight Hip Thrust",
                difficulty: "medium",
                targetedMuscles: ["Glutes", "Hamstrings"],
                jointActions: ["Hip Extensors"],
                compound: true,
                stretchLevel: "moderate",
                stability: "medium",
                sfr: "high",
                description:
                  "Hip thrust against a bench loaded with a barbell, dumbbells, or in a Smith. Heavy free-weight loading at the cost of more setup and balance demand.",
                mechanics:
                  "Bar/weight across the hips creates a moment arm that the glutes resist and overcome through hip extension.",
                equipment: [
                  { id: "bb-ht", name: "Barbell" },
                  { id: "db-ht", name: "Dumbbell" },
                  { id: "smith-ht", name: "Smith Machine" },
                ],
                angles: [
                  {
                    id: "standard-fht",
                    name: "Standard Stance",
                    description: "Feet shoulder-width, knees ~90° at the top.",
                  },
                  {
                    id: "feet-elevated-fht",
                    name: "Feet Elevated",
                    description: "Feet on a plate / step / box. Hips drop into deeper flexion at the bottom for a deeper glute stretch under load.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                  {
                    id: "wide-toes-out-fht",
                    name: "Wide / Toes-Out",
                    description: "Wider stance with toes flared adds glute medius and external rotator engagement.",
                    tagOverrides: {
                      addJointActions: ["Hip Abductors", "Hip External Rotators"],
                    },
                  },
                  {
                    id: "b-stance-fht",
                    name: "B-Stance (Single-Leg Bias)",
                    description: "One foot back as a kickstand — most load goes to the front-leg glute, including glute medius.",
                    tagOverrides: {
                      addJointActions: ["Hip Abductors"],
                    },
                  },
                ],
                coachNotes: "Israetel: hard shortened-position glute contraction.",
              },
              {
                id: "glute-bridge",
                name: "Glute Bridge",
                difficulty: "easy",
                targetedMuscles: ["Glutes", "Hamstrings"],
                jointActions: ["Hip Extensors"],
                compound: true,
                stretchLevel: "moderate",
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
                angles: [
                  {
                    id: "standard-gb",
                    name: "Standard (Floor)",
                    description: "Shoulders and feet on the floor. Reduced hip-flexion ROM compared to a full hip thrust.",
                  },
                  {
                    id: "feet-elevated-gb",
                    name: "Feet Elevated",
                    description: "Feet on a plate / step. Hips drop deeper at the bottom, recovering ROM lost vs the bench-supported hip thrust and adding stretch under load.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                ],
                coachNotes: "Nippard: beginner-friendly hip-thrust alternative.",
              },
              {
                id: "deadlift",
                name: "Conventional / Sumo Deadlift",
                difficulty: "hard",
                targetedMuscles: ["Glutes", "Hamstrings", "Adductors", "Erectors", "Upper Traps"],
                jointActions: [
                  "Hip Extensors",
                  "Spinal Extensors",
                  "Knee Extensors",
                  "Scapular Retractors",
                  "Scapular Elevators",
                ],
                compound: true,
                stretchLevel: "moderate",
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
                angles: [
                  {
                    id: "conventional",
                    name: "Conventional Stance",
                    description: "Narrow stance, hands outside knees. Posterior-chain dominant.",
                  },
                  {
                    id: "semi-sumo",
                    name: "Semi-Sumo Stance",
                    description: "Moderately wide stance with mild toe flare. Adds adductor involvement.",
                    tagOverrides: {
                      addJointActions: ["Hip Adductors"],
                    },
                  },
                  {
                    id: "sumo",
                    name: "Sumo Stance",
                    description: "Wide stance, toes flared, hands inside knees. Heavy adductor and external-rotator load with reduced lumbar shear.",
                    tagOverrides: {
                      addJointActions: ["Hip Adductors", "Hip External Rotators"],
                    },
                  },
                ],
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
                stretchLevel: "high",
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
                coachNotes: "Nippard: S-tier for glutes; full-ROM lumbar extension.",
              },
              {
                id: "good-morning-lumbar",
                name: "Good Morning",
                difficulty: "hard",
                targetedMuscles: ["Hamstrings", "Glutes", "Erectors"],
                jointActions: ["Hip Extensors", "Spinal Extensors"],
                compound: true,
                stretchLevel: "high",
                stability: "low",
                sfr: "medium",
                description:
                  "Bar across the upper back, hinge forward keeping a neutral spine. High-stimulus posterior chain hinge — also a primary lumbar-extension lift.",
                mechanics:
                  "Hinge produces hip extension through the hamstrings while the erectors resist spinal flexion isometrically.",
                equipment: [
                  { id: "bb-gm-l", name: "Barbell" },
                  { id: "ssb-l", name: "Safety Squat Bar" },
                  { id: "smith-gm-l", name: "Smith Machine" },
                ],
                coachNotes:
                  "Israetel pairs with stiff-leg deadlifts; lumbar erectors trained isometrically.",
              },
              {
                id: "jefferson-curl",
                name: "Jefferson Curl",
                difficulty: "medium",
                targetedMuscles: ["Erectors", "Hamstrings"],
                jointActions: ["Spinal Extensors", "Hip Extensors"],
                compound: true,
                stretchLevel: "very-high",
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
                stretchLevel: "high",
                stability: "high",
                sfr: "very-high",
                description:
                  "Selectorized or plate-loaded chest press machine. Smooth resistance with deep stretch and full-ROM contraction.",
                mechanics:
                  "Fixed handle path eliminates balance demand and lets the lifter push close to failure safely. Adjustable seat angle on most machines lets you bias mid- vs upper-chest.",
                equipment: [
                  { id: "select-mcp", name: "Selectorized" },
                  { id: "plate-mcp", name: "Plate-Loaded" },
                ],
                angles: [
                  {
                    id: "flat-mcp",
                    name: "Flat / Mid Seat",
                    description: "Sternal mid-chest bias. Standard horizontal press path.",
                  },
                  {
                    id: "incline-mcp",
                    name: "Incline Seat",
                    description: "Tilted seat biases the clavicular pec and front delt.",
                  },
                ],
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
                stretchLevel: "moderate",
                stability: "medium",
                sfr: "high",
                description:
                  "Barbell bench press, flat or inclined. Heavy compound chest pattern. On a flat bench the bar stops at chest level (capped stretch); incline 30° opens longer ROM.",
                mechanics:
                  "Bar arcs from chest to lockout. Cambered bar drops below chest line for a deeper stretch; 30° incline lengthens the path enough to load the pec near full stretch.",
                equipment: [
                  { id: "bb-bp", name: "Standard Barbell" },
                  { id: "smith-bp", name: "Smith Machine" },
                  { id: "cambered", name: "Cambered Bar (deeper stretch)", tagOverrides: { stretchLevel: "very-high" } },
                ],
                angles: [
                  {
                    id: "flat-bb",
                    name: "Flat Bench",
                    description: "Bar stops at the chest, limiting bottom stretch. Mid-chest bias.",
                  },
                  {
                    id: "15-bb",
                    name: "15° Incline",
                    description: "Slight upper-chest bias; ROM still capped by bar contact.",
                    tagOverrides: { stretchLevel: "high" },
                  },
                  {
                    id: "30-bb",
                    name: "30° Incline",
                    description:
                      "Clavicular pec bias and longer pressing arc — bar travels deeper than flat, giving real stretch under load.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                  {
                    id: "45-bb",
                    name: "45° Incline",
                    description: "Heavy front-delt bias; treat as a shoulder press.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                ],
                coachNotes: "Heavy load potential; flat bench limits stretch — 30° incline or cambered bar opens it back up.",
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
                stretchLevel: "high",
                stability: "medium",
                sfr: "high",
                description:
                  "Dumbbell bench press, flat or inclined. Independent DBs travel below chest line for a deep stretch in any seat angle.",
                mechanics:
                  "DBs reach below chest at the bottom regardless of angle, giving consistent stretch. Incline biases clavicular pec / front delt.",
                equipment: [
                  { id: "db-bp", name: "Dumbbell" },
                ],
                angles: [
                  {
                    id: "flat-db",
                    name: "Flat Bench",
                    description: "Sternal / mid-chest bias with deep DB stretch.",
                  },
                  {
                    id: "15-db",
                    name: "15° Incline",
                    description: "Slight upper-chest bias with strong mid-chest involvement.",
                  },
                  {
                    id: "30-db",
                    name: "30° Incline",
                    description: "Strong clavicular pec bias. Israetel: max stretch incline DB.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                  {
                    id: "45-db",
                    name: "45° Incline",
                    description: "Heavy front-delt bias; treat as a shoulder press.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                ],
                coachNotes: "Israetel: incline DB for max chest stretch.",
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
                stretchLevel: "very-high",
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
                stretchLevel: "high",
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
                coachNotes: "Nippard: A-tier chest. Israetel: forward lean for chest.",
              },
              {
                id: "cable-fly",
                name: "Cable Fly",
                difficulty: "easy",
                targetedMuscles: ["Pectorals", "Front Delts"],
                jointActions: ["Shoulder Horizontal Adductors"],
                compound: false,
                stretchLevel: "very-high",
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
                  {
                    id: "horizontal-cf",
                    name: "Seated (Horizontal)",
                    description: "Pulleys at chest height, arms moving in a horizontal arc. Sternal / mid-chest bias.",
                  },
                  {
                    id: "upper-to-bot-cf",
                    name: "Upper-to-Bottom",
                    description: "Pulleys high, arms sweeping down across the body. Lower-chest bias.",
                  },
                  {
                    id: "bot-to-up-cf",
                    name: "Bottom-to-Up",
                    description: "Pulleys low, arms sweeping up across the body. Upper-chest / clavicular pec bias.",
                  },
                ],
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
                stretchLevel: "high",
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
                angles: [
                  {
                    id: "mid-seat-pd",
                    name: "Mid Seat (Sternal)",
                    description: "Standard seat height. Sternal / mid-chest bias.",
                  },
                  {
                    id: "high-seat-pd",
                    name: "High Seat (Lower-Chest Bias)",
                    description: "Higher seat puts the arc lower, biasing the lower pec.",
                  },
                  {
                    id: "low-seat-pd",
                    name: "Low Seat (Upper-Chest Bias)",
                    description: "Lower seat tilts the arc upward, recruiting clavicular pec and front delt.",
                    tagOverrides: {
                      addJointActions: ["Shoulder Flexors"],
                    },
                  },
                ],
                coachNotes: "Nippard: A-tier; stable, focused chest tension.",
              },
              {
                id: "db-fly",
                name: "Dumbbell Fly",
                difficulty: "medium",
                targetedMuscles: ["Pectorals"],
                jointActions: ["Shoulder Horizontal Adductors"],
                compound: false,
                stretchLevel: "high",
                stability: "medium",
                sfr: "high",
                description:
                  "Free-weight horizontal adduction with dumbbells. Big stretch but loads drop off at lockout.",
                mechanics:
                  "Tension peaks at the bottom of the arc where the dumbbells are furthest from the shoulder; minimal load at the top.",
                equipment: [
                  { id: "flat-fly", name: "Flat Bench" },
                  { id: "incline-fly", name: "Incline Bench", tagOverrides: { stretchLevel: "very-high" } },
                  { id: "janicki", name: "Janicki Setup", tagOverrides: { stretchLevel: "very-high" } },
                ],
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
                stretchLevel: "moderate",
                stability: "high",
                sfr: "high",
                description:
                  "Selectorized or plate-loaded shoulder press machine. Stable vertical press from shoulder height to lockout.",
                mechanics:
                  "Fixed handle path eliminates balance demand and isolates the front delts under load.",
                equipment: [
                  { id: "select-msp", name: "Selectorized" },
                  { id: "plate-msp", name: "Plate-Loaded" },
                ],
                coachNotes: "Nippard: A+ for front delts.",
              },
              {
                id: "free-overhead-press",
                name: "Free-Weight Overhead Press",
                difficulty: "medium",
                targetedMuscles: ["Front Delts", "Side Delts", "Triceps"],
                jointActions: [
                  "Shoulder Flexors",
                  "Shoulder Abductors",
                  "Elbow Extensors",
                  "Scapular Upward Rotators",
                ],
                compound: true,
                stretchLevel: "high",
                stability: "medium",
                sfr: "high",
                description:
                  "Free-weight vertical press (DB, BB, or Smith). DBs allow a deeper bottom stretch than the machine.",
                mechanics:
                  "Independent or barbell loading recruits stabilizers; DB version reaches a deeper start position than machine or BB.",
                equipment: [
                  { id: "db-ohp", name: "Dumbbell" },
                  { id: "bb-ohp", name: "Barbell" },
                  { id: "smith-ohp", name: "Smith Machine" },
                ],
                coachNotes: "Nippard: seated DB press A-tier.",
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
                stretchLevel: "high",
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
                coachNotes: "Nippard: A-tier compound triceps.",
              },
              {
                id: "triceps-dip",
                name: "Triceps Dip (Vertical Torso)",
                difficulty: "medium",
                targetedMuscles: ["Triceps", "Front Delts", "Lower Pectorals"],
                jointActions: ["Elbow Extensors", "Shoulder Flexors", "Shoulder Adductors"],
                compound: true,
                stretchLevel: "high",
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
                  "Scapular Depressors",
                ],
                compound: true,
                stretchLevel: "high",
                stability: "high",
                sfr: "very-high",
                description:
                  "Cable or machine pulldown to the upper chest. Easier to track than pull-ups for hypertrophy progression.",
                mechanics:
                  "Cables maintain tension at the top stretch. Grip width and orientation shift the bias between lats and elbow flexors.",
                equipment: [
                  { id: "machine-pd", name: "Machine Pulldown" },
                ],
                angles: [
                  {
                    id: "wide-grip-pd",
                    name: "Wide Grip",
                    description: "Pronated wide grip lengthens the lat moment arm — maximum lat-width bias.",
                  },
                  {
                    id: "neutral-grip-pd",
                    name: "Neutral Grip",
                    description: "Palms-facing grip is shoulder-friendly with balanced lat / elbow-flexor recruitment.",
                  },
                  {
                    id: "close-grip-pd",
                    name: "Close Grip",
                    description: "Narrow grip emphasizes lat thickness via deeper shoulder adduction; recruits more biceps.",
                    tagOverrides: {
                      addJointActions: ["Shoulder Extensors"],
                    },
                  },
                ],
                coachNotes: "Nippard: S-tier; preferred over pull-ups for tracking.",
              },
              {
                id: "single-arm-cable-pulldown",
                name: "Single-Arm Cable Pulldown",
                difficulty: "easy",
                targetedMuscles: ["Lats", "Teres Major"],
                jointActions: ["Shoulder Adductors", "Scapular Depressors"],
                compound: false,
                stretchLevel: "high",
                stability: "high",
                sfr: "very-high",
                description:
                  "Single-arm cable pulldown executed with minimal elbow flexion to isolate the lat. The line of pull (front / side / opposite side) changes which scapular action drives the rep.",
                mechanics:
                  "Hand-on-handle cable maintains tension through the deep stretch. Three line-of-pull setups recruit different scapular muscles: a front-anchored cable hits scap depression, a side-anchored cable drives downward rotation, and an opposite-side anchor turns the rep into a cross-body pull that retracts the scap.",
                equipment: [
                  { id: "cable-handle-sap", name: "Cable Single Handle" },
                ],
                angles: [
                  {
                    id: "facing-front-sap",
                    name: "Facing the Cable (Straight Down)",
                    description: "Cable anchored in front and overhead. Pull straight down toward the hip with minimal elbow flexion. End-range squeeze depresses the scap. Pure lat focus.",
                  },
                  {
                    id: "from-side-sap",
                    name: "From the Side (Side Anchor)",
                    description: "Cable anchored to your side at or slightly above shoulder height. Arm reaches up and outward, then pulls down and inward toward the hip. The arc carries the scapula through downward rotation as the arm descends — strong rhomboid + lower-trap eccentric.",
                    tagOverrides: {
                      addJointActions: ["Scapular Downward Rotators"],
                    },
                  },
                  {
                    id: "across-front-sap",
                    name: "Across the Front (Opposite-Side Anchor)",
                    description: "Cable anchored on the opposite side at chest height. Arm reaches across the body, then pulls back through the chest plane to the same-side hip. Cross-body line plus the end-range pull-back drives scapular retraction and shoulder horizontal abduction.",
                    tagOverrides: {
                      addJointActions: ["Scapular Retractors", "Shoulder Horizontal Abductors"],
                    },
                  },
                ],
                coachNotes: "Three line-of-pull options give the same lat exercise three different scap targets — pick the one that fills a gap in your routine. Front = depression, Side = downward rotation, Across = retraction.",
              },
              {
                id: "db-row-lat",
                name: "Dumbbell Row (Elbow-Tucked)",
                difficulty: "medium",
                targetedMuscles: ["Lats", "Teres Major", "Biceps"],
                jointActions: ["Shoulder Extensors", "Elbow Flexors", "Scapular Elevators"],
                compound: true,
                stretchLevel: "high",
                stability: "medium",
                sfr: "high",
                description:
                  "One-arm dumbbell row with the elbow drawn close to the torso. Elbow-tucked path biases the lats over the mid back.",
                mechanics:
                  "Less elbow-to-torso angle keeps the line of pull along the lat, emphasizing shoulder extension and adduction over horizontal abduction.",
                equipment: [
                  { id: "db-row-bench", name: "DB on Bench" },
                  { id: "db-row-rack", name: "DB Standing (Rack-Supported)" },
                ],
                coachNotes: "Tucked elbow = lat focus.",
              },
              {
                id: "lat-prayer",
                name: "Straight-Arm Pulldown / Lat Prayer",
                difficulty: "easy",
                targetedMuscles: ["Lats", "Teres Major"],
                jointActions: ["Shoulder Extensors", "Scapular Depressors"],
                compound: false,
                stretchLevel: "very-high",
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
                coachNotes:
                  "Israetel: leaning forward maximizes lat stretch. Nippard: smooth cable progression.",
              },
              {
                id: "pullover",
                name: "Pullover",
                difficulty: "medium",
                targetedMuscles: ["Lats", "Teres Major", "Long Head Triceps"],
                jointActions: ["Shoulder Extensors", "Shoulder Adductors", "Scapular Depressors"],
                compound: false,
                stretchLevel: "very-high",
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
                stretchLevel: "high",
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
                coachNotes: "Nippard: best all-around back exercise.",
              },
              {
                id: "cable-row",
                name: "Cable Row (Elbow-Flared)",
                difficulty: "easy",
                targetedMuscles: ["Rhomboids", "Mid Traps", "Lats", "Rear Delts"],
                jointActions: [
                  "Shoulder Horizontal Abductors",
                  "Scapular Retractors",
                  "Elbow Flexors",
                ],
                compound: true,
                stretchLevel: "high",
                stability: "high",
                sfr: "very-high",
                description:
                  "Seated horizontal cable row pulled with a greater elbow-to-torso angle (elbows flared outward) to bias the rhomboids and mid traps.",
                mechanics:
                  "Wide-elbow path turns the row into shoulder horizontal abduction + scapular retraction; cable maintains tension at the deep stretch.",
                equipment: [
                  { id: "seated-cable-row", name: "Seated Cable Row" },
                  { id: "wide-cable-row", name: "Wide-Grip Cable Row" },
                  { id: "single-cable-row", name: "Single-Arm Cable Row" },
                ],
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
                  "Scapular Elevators",
                ],
                compound: true,
                stretchLevel: "high",
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
                  "Scapular Elevators",
                ],
                compound: true,
                stretchLevel: "high",
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
                stretchLevel: "moderate",
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
                coachNotes:
                  "Israetel: face/throat pull line for rear-delt-heavy row.",
              },
              {
                id: "single-arm-db-row",
                name: "Single-Arm Dumbbell Row (Elbow-Flared)",
                difficulty: "medium",
                targetedMuscles: ["Rhomboids", "Mid Traps", "Rear Delts"],
                jointActions: [
                  "Shoulder Horizontal Abductors",
                  "Scapular Retractors",
                  "Elbow Flexors",
                  "Scapular Elevators",
                ],
                compound: true,
                stretchLevel: "high",
                stability: "medium",
                sfr: "high",
                description:
                  "Bench-supported single-arm DB row with the elbow drawn outward (greater elbow-to-torso angle) to bias mid back and rhomboids.",
                mechanics:
                  "Elbow-flared path shifts the line of pull into horizontal abduction; bench support reduces lumbar demand.",
                equipment: [
                  { id: "db-bench-row", name: "DB on Bench" },
                  { id: "db-rack-row", name: "DB Standing (Rack-Supported)" },
                ],
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
                stretchLevel: "high",
                stability: "medium",
                sfr: "high",
                description:
                  "Cable face pull executed with elbow flexion and a strong scapular retraction at the end range. Mid-back focused.",
                mechanics:
                  "Distinct from the rear-delt face pull (which keeps elbows high and minimizes scap retraction). This version drives the rhomboids and mid traps through full retraction.",
                equipment: [
                  { id: "cable-rope-fpr", name: "Cable Rope" },
                  { id: "cable-bar-fpr", name: "Cable Bar" },
                ],
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
                name: "Pull-Up / Chin-Up",
                difficulty: "hard",
                targetedMuscles: ["Lats", "Teres Major", "Biceps", "Upper Back"],
                jointActions: [
                  "Shoulder Adductors",
                  "Shoulder Extensors",
                  "Elbow Flexors",
                  "Scapular Downward Rotators",
                  "Scapular Depressors",
                ],
                compound: true,
                stretchLevel: "high",
                stability: "medium",
                sfr: "high",
                description:
                  "Bodyweight (or weighted) vertical pull. Underhand / chin-up grip increases biceps contribution while still loading the lats.",
                mechanics:
                  "Free-hanging position requires controlled scapular and shoulder mechanics; supinated grip recruits the elbow flexors heavily through the pull.",
                equipment: [
                  { id: "bw-pu", name: "Bodyweight" },
                  { id: "weighted-pu", name: "Weighted" },
                  { id: "assisted-pu", name: "Assisted Machine" },
                  { id: "underhand-pu", name: "Underhand (Chin-Up)" },
                  { id: "neutral-pu", name: "Neutral Grip" },
                ],
                coachNotes:
                  "Israetel: unbeatable for lats. Nippard: less smooth resistance than pulldown but strong elbow-flexor recruitment.",
              },
              {
                id: "supinated-pulldown",
                name: "Supinated Pulldown",
                difficulty: "easy",
                targetedMuscles: ["Lats", "Biceps", "Teres Major"],
                jointActions: ["Shoulder Adductors", "Elbow Flexors"],
                compound: true,
                stretchLevel: "high",
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
                stretchLevel: "high",
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
                stretchLevel: "very-high",
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
                coachNotes: "Nippard's #1 biceps exercise.",
              },
              {
                id: "incline-curl",
                name: "Incline Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps Long Head", "Brachialis"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchLevel: "high",
                stability: "medium",
                sfr: "high",
                description:
                  "Lying back on an incline bench so the arms hang behind the torso. Maximal biceps long-head stretch.",
                mechanics:
                  "Bench tilt places the shoulder in extension, lengthening the biceps before the curl begins. Lower bench angle = deeper stretch.",
                equipment: [
                  { id: "db-incline-curl", name: "Dumbbell" },
                  { id: "cable-incline-curl", name: "Cable" },
                ],
                angles: [
                  {
                    id: "45-incline",
                    name: "45° Bench",
                    description: "Most reclined position. Maximum shoulder extension and biceps long-head stretch.",
                  },
                  {
                    id: "60-incline",
                    name: "60° Bench",
                    description: "Moderate recline. Strong stretch with slightly easier setup.",
                  },
                  {
                    id: "75-incline",
                    name: "75° Bench",
                    description: "Closer to upright. Less stretch — closer to a standing curl. Stretch tag drops.",
                    tagOverrides: { stretchLevel: "moderate" },
                  },
                ],
                coachNotes: "Israetel & Nippard: A-tier deep stretch (especially at 45°).",
              },
              {
                id: "lying-curl",
                name: "Lying / Flat-Bench Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps", "Brachialis"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchLevel: "high",
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
                stretchLevel: "high",
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
                coachNotes: "Nippard: S-tier biceps.",
              },
              {
                id: "cable-curl",
                name: "Cable Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps", "Brachialis"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchLevel: "moderate",
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
                coachNotes: "Nippard: A-tier; Israetel: Superman variant strong.",
              },
              {
                id: "strict-curl",
                name: "Strict Curl",
                difficulty: "medium",
                targetedMuscles: ["Biceps", "Brachialis"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchLevel: "moderate",
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
                stretchLevel: "moderate",
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
                coachNotes: "Nippard: A-tier.",
              },
              {
                id: "preacher-hammer",
                name: "Preacher Hammer Curl",
                difficulty: "easy",
                targetedMuscles: ["Brachialis", "Brachioradialis", "Biceps"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchLevel: "high",
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
                coachNotes: "Nippard: S-tier brachialis pick.",
              },
              {
                id: "reverse-curl",
                name: "Reverse Curl",
                difficulty: "easy",
                targetedMuscles: ["Brachialis", "Brachioradialis", "Forearms"],
                jointActions: ["Elbow Flexors"],
                compound: false,
                stretchLevel: "moderate",
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
                stretchLevel: "very-high",
                stability: "high",
                sfr: "very-high",
                description:
                  "EZ-bar overhead triceps extension. Deep stretch on the triceps long head with comfortable wrist alignment.",
                mechanics:
                  "Shoulder flexion lengthens the long head before elbow extension, loading it in its longest position; EZ angles reduce wrist strain vs straight bar.",
                equipment: [
                  { id: "ez-ohte", name: "EZ-Bar" },
                ],
                coachNotes: "Nippard: S+ for long head. Cable variants live under Cable Katana.",
              },
              {
                id: "katana-ext",
                name: "Cable Katana Extension",
                difficulty: "easy",
                targetedMuscles: ["Triceps Long Head"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchLevel: "high",
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
                coachNotes: "Nippard: A-tier long-head cable work.",
              },
              {
                id: "french-press",
                name: "French Press",
                difficulty: "medium",
                targetedMuscles: ["Triceps Long Head"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchLevel: "high",
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
                stretchLevel: "moderate",
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
                stretchLevel: "high",
                stability: "medium",
                sfr: "very-high",
                description:
                  "Lying triceps extension with EZ-bar or dumbbells. Brutal stretch in the bottom position.",
                mechanics:
                  "Bar path determines whether the long head is stretched. To-forehead version hits all three heads evenly; over-head path adds shoulder flexion that loads the long head deeply.",
                equipment: [
                  { id: "bb-sk", name: "Barbell" },
                  { id: "ez-sk", name: "EZ-Bar" },
                  { id: "db-sk", name: "Dumbbell" },
                  { id: "smith-sk", name: "Smith Machine" },
                ],
                angles: [
                  {
                    id: "to-forehead",
                    name: "To Forehead",
                    description: "Bar travels straight down to the forehead. Balanced loading across all three heads.",
                  },
                  {
                    id: "over-head",
                    name: "Over-Head Path",
                    description: "Bar continues past the forehead toward the bench, adding shoulder flexion. Deep long-head stretch — equivalent to a JM press path.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                ],
                coachNotes: "Nippard: S-tier; Israetel: near-perfect force curve. Over-head path doubles as long-head work.",
              },
              {
                id: "cable-kickback",
                name: "Cable Kickback",
                difficulty: "easy",
                targetedMuscles: ["Lateral Head", "Medial Head"],
                jointActions: ["Elbow Extensors"],
                compound: false,
                stretchLevel: "moderate",
                stability: "high",
                sfr: "high",
                description:
                  "Cable kickback for peak triceps contraction at the shortened position.",
                mechanics:
                  "Cable maintains tension in the contracted top range better than dumbbell kickbacks.",
                equipment: [
                  { id: "cable-single-kick", name: "Cable Single-Arm" },
                  { id: "cuff-kick", name: "Cable Cuff" },
                  { id: "machine-kick", name: "Machine" },
                ],
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
                name: "Dumbbell Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Medial Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchLevel: "moderate",
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
                coachNotes:
                  "Israetel: seated strict eccentric. Nippard: lean-in and side-lying highly ranked.",
              },
              {
                id: "super-rom-lateral",
                name: "Super-ROM Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Medial Delts", "Front Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchLevel: "moderate",
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
                coachNotes: "Israetel: broader delt development.",
              },
              {
                id: "machine-lateral",
                name: "Machine Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Medial Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchLevel: "moderate",
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
                name: "Cable Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Medial Delts"],
                jointActions: ["Shoulder Abductors"],
                compound: false,
                stretchLevel: "high",
                stability: "high",
                sfr: "very-high",
                description:
                  "Single-arm cable lateral raise with the pulley at hand height. Tension peaks early in the stretch.",
                mechanics:
                  "Hand-height pulley line biases peak tension to the lengthened range, opposite of DB raises.",
                equipment: [
                  { id: "cable-single-lat", name: "Single-Arm Cable" },
                  { id: "cuffed-lat", name: "Cuffed Cable" },
                ],
                coachNotes: "Nippard's #1 side-delt pick.",
              },
              {
                id: "cable-y-raise",
                name: "Cable Y-Raise",
                difficulty: "medium",
                targetedMuscles: ["Medial Delts", "Lower Traps"],
                jointActions: ["Shoulder Abductors", "Scapular Upward Rotators"],
                compound: false,
                stretchLevel: "high",
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
                coachNotes: "Nippard: S-tier.",
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
                stretchLevel: "high",
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
                coachNotes: "Nippard's best rear-delt pick.",
              },
              {
                id: "reverse-cable-crossover",
                name: "Reverse Cable Crossover",
                difficulty: "easy",
                targetedMuscles: ["Rear Delts"],
                jointActions: ["Shoulder Horizontal Abductors"],
                compound: false,
                stretchLevel: "high",
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
                stretchLevel: "moderate",
                stability: "high",
                sfr: "high",
                description:
                  "Cable face pull. Rear delt + external rotator + scapular retraction. Elbow path determines bias.",
                mechanics:
                  "High elbows direct work into the rear delt + external rotators. Horizontal elbows shift toward upper-back. Lower elbow paths recruit lat involvement.",
                equipment: [
                  { id: "cable-rope-fp", name: "Cable Rope" },
                  { id: "cable-bar-fp", name: "Cable Bar" },
                  { id: "trx-fp", name: "TRX" },
                ],
                angles: [
                  {
                    id: "high-elbows-fp",
                    name: "High Elbows (Forehead Level)",
                    description: "Elbows raised level with the forehead. Maximum rear-delt + external-rotator emphasis.",
                  },
                  {
                    id: "horizontal-elbows-fp",
                    name: "Horizontal Elbows (Chest Level)",
                    description: "Elbows pulled straight back at chest height. Shifts toward upper-back / scapular retraction.",
                    tagOverrides: {
                      removeJointActions: ["Shoulder External Rotators"],
                    },
                  },
                ],
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
                stretchLevel: "moderate",
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
                stretchLevel: "high",
                stability: "high",
                sfr: "very-high",
                description:
                  "Seated machine hamstring curl. The pre-stretched hip position amplifies the stimulus.",
                mechanics:
                  "Hip flexion pre-stretches the hamstrings; knee flexion then loads them in their longest position. Leaning the torso further forward deepens the stretch.",
                equipment: [
                  { id: "select-slc", name: "Selectorized" },
                  { id: "plate-slc", name: "Plate-Loaded" },
                ],
                angles: [
                  {
                    id: "upright-slc",
                    name: "Upright Torso",
                    description: "Standard seated position. Already pre-stretches the hamstrings via hip flexion.",
                  },
                  {
                    id: "lean-forward-slc",
                    name: "Lean-Forward Torso",
                    description: "Chest propped forward over the thighs to maximize hip flexion. Nippard's preferred variant — deepest hamstring stretch loadable on a machine.",
                    tagOverrides: { stretchLevel: "very-high" },
                  },
                ],
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
                stretchLevel: "moderate",
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
                stretchLevel: "high",
                stability: "high",
                sfr: "very-high",
                description:
                  "Seated machine leg extension. Trains all four quad heads with rectus femoris emphasis.",
                mechanics:
                  "Fixed hip lets the rectus femoris stretch and contract under tension; the vasti contribute throughout. Toe position subtly biases vastus medialis vs lateralis.",
                equipment: [
                  { id: "select-le", name: "Selectorized" },
                  { id: "plate-le", name: "Plate-Loaded" },
                ],
                angles: [
                  {
                    id: "parallel-toes-le",
                    name: "Toes Parallel",
                    description: "Standard foot position. Balanced loading across all four heads.",
                  },
                  {
                    id: "toes-out-le",
                    name: "Toes-Out",
                    description: "Toes flared outward biases the vastus medialis (VMO).",
                  },
                  {
                    id: "toes-in-le",
                    name: "Toes-In",
                    description: "Toes pointed inward biases the vastus lateralis.",
                  },
                ],
                coachNotes: "Nippard: near-perfect quad iso.",
              },
              {
                id: "reverse-nordic",
                name: "Reverse Nordic Curl",
                difficulty: "medium",
                targetedMuscles: ["Quadriceps", "Rectus Femoris"],
                jointActions: ["Knee Extensors"],
                compound: false,
                stretchLevel: "very-high",
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
                coachNotes: "Both coaches: massive quad stretch.",
              },
              {
                id: "sissy-squat",
                name: "Sissy Squat",
                difficulty: "hard",
                targetedMuscles: ["Quadriceps", "Rectus Femoris"],
                jointActions: ["Knee Extensors"],
                compound: false,
                stretchLevel: "very-high",
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
                stretchLevel: "high",
                stability: "high",
                sfr: "high",
                description:
                  "Standing calf raise with knees extended. Belt squat or dip belt versions remove spinal load.",
                mechanics:
                  "Straight knee keeps the gastrocnemius lengthened and primarily loaded. Toe position subtly biases medial vs lateral gastroc head.",
                equipment: [
                  { id: "belt-calf", name: "Belt Squat" },
                  { id: "standing-calf", name: "Standing Calf Machine" },
                  { id: "dip-belt-calf", name: "Dip Belt Off Ledge" },
                  { id: "lp-calf", name: "Leg Press Calves" },
                ],
                angles: [
                  {
                    id: "parallel-toes-calf",
                    name: "Toes Parallel",
                    description: "Standard. Balanced loading across both gastroc heads.",
                  },
                  {
                    id: "toes-in-calf",
                    name: "Toes-In",
                    description: "Toes pointed inward biases the medial gastroc head.",
                  },
                  {
                    id: "toes-out-calf",
                    name: "Toes-Out",
                    description: "Toes flared outward biases the lateral gastroc head.",
                  },
                ],
                coachNotes: "Israetel: deep loaded stretch with pause.",
              },
              {
                id: "seated-calf",
                name: "Seated Calf Raise",
                difficulty: "easy",
                targetedMuscles: ["Soleus", "Gastrocnemius"],
                jointActions: ["Ankle Plantarflexors"],
                compound: false,
                stretchLevel: "moderate",
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
                stretchLevel: "high",
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
                coachNotes: "Israetel: best ab option when designed well.",
              },
              {
                id: "cable-crunch",
                name: "Cable Crunch",
                difficulty: "easy",
                targetedMuscles: ["Rectus Abdominis"],
                jointActions: ["Spinal Flexors"],
                compound: false,
                stretchLevel: "high",
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
                coachNotes: "Israetel: accessible and loadable.",
              },
              {
                id: "inverted-bench-crunch",
                name: "Inverted Bench Crunch",
                difficulty: "medium",
                targetedMuscles: ["Rectus Abdominis"],
                jointActions: ["Spinal Flexors"],
                compound: false,
                stretchLevel: "high",
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
                stretchLevel: "moderate",
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
              },
              {
                id: "ab-wheel",
                name: "Ab Wheel Rollout",
                difficulty: "hard",
                targetedMuscles: ["Rectus Abdominis", "Serratus", "Lats", "Hip Flexors"],
                jointActions: ["Spinal Flexors", "Hip Flexors"],
                compound: false,
                stretchLevel: "high",
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
                stretchLevel: "moderate",
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
                stretchLevel: "moderate",
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
                coachNotes: "Standard anti-rotation oblique pick.",
              },
              {
                id: "side-bend",
                name: "Weighted Side Bend",
                difficulty: "easy",
                targetedMuscles: ["Obliques", "Quadratus Lumborum"],
                jointActions: ["Spinal Rotators & Lateral Flexors"],
                compound: false,
                stretchLevel: "high",
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

// ============================================================
// TAG RESOLUTION
// ============================================================

export interface ResolvedTags {
  stretchLevel: StretchLevel;
  stability: StimulusLevel;
  sfr: StimulusLevel;
  jointActions: JointAction[];
  /** Which option overrides were applied, for debugging / display. */
  appliedOverrides: string[];
}

/**
 * Resolve an exercise's effective tags given the user's selected equipment
 * and angle. Overrides on the option layer on top of the exercise's base
 * tags. Multiple overrides compose: equipment overrides apply first, then
 * angle overrides on top.
 */
export function resolveEffectiveTags(
  exercise: Exercise,
  selectedEquipmentName?: string,
  selectedAngleName?: string,
): ResolvedTags {
  let stretchLevel = exercise.stretchLevel;
  let stability = exercise.stability;
  let sfr = exercise.sfr;
  const jointActionSet = new Set<JointAction>(exercise.jointActions);
  const applied: string[] = [];

  const apply = (overrides: TagOverrides | undefined, label: string) => {
    if (!overrides) return;
    if (overrides.stretchLevel !== undefined) stretchLevel = overrides.stretchLevel;
    if (overrides.stability !== undefined) stability = overrides.stability;
    if (overrides.sfr !== undefined) sfr = overrides.sfr;
    overrides.addJointActions?.forEach((a) => jointActionSet.add(a));
    overrides.removeJointActions?.forEach((a) => jointActionSet.delete(a));
    applied.push(label);
  };

  if (selectedEquipmentName) {
    const eq = exercise.equipment?.find((e) => e.name === selectedEquipmentName);
    apply(eq?.tagOverrides, `equipment:${selectedEquipmentName}`);
  }
  if (selectedAngleName) {
    const ang = exercise.angles?.find((a) => a.name === selectedAngleName);
    apply(ang?.tagOverrides, `angle:${selectedAngleName}`);
  }

  return {
    stretchLevel,
    stability,
    sfr,
    jointActions: Array.from(jointActionSet),
    appliedOverrides: applied,
  };
}

/** Convenience helper: was this exercise stretch-emphasized in the old
 * binary sense? `high` and `very-high` count, `moderate` doesn't. */
export function hasStretchEmphasis(level: StretchLevel): boolean {
  return level === "high" || level === "very-high";
}

/** Numeric weight for stretch tiers — useful when the rating engine wants
 * to score stretch contribution per-set (very-high counts more than high). */
export const STRETCH_LEVEL_WEIGHT: Record<StretchLevel, number> = {
  moderate: 0.5,
  high: 1,
  "very-high": 1.5,
};
