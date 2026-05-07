/**
 * Kinesiology Workout Builder — Biomechanical Database
 * Tier 1: Systemic / Multi-Joint ("The Big Rocks")
 * Tier 2: Regional / Single-Joint ("The Sand")
 * 
 * Each subcategory has exactly 2 exercises with equipment and angle toggles where applicable.
 */

export type CategoryType = "systemic" | "regional";
export type Difficulty = "hard" | "medium" | "easy";

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

export interface Exercise {
  id: string;
  name: string;
  difficulty: Difficulty;
  targetedMuscles: string[];
  description: string;
  mechanics: string;
  equipment?: EquipmentOption[];
  angles?: AngleOption[];
  warmup: WarmupInfo;
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
  {
    id: "systemic",
    name: "Tier 1: Systemic / Multi-Joint",
    subtitle: "The Big Rocks",
    description: "Large mass, high CNS fatigue. These compound movements recruit multiple joints and large muscle groups simultaneously, demanding heavy loads and longer recovery.",
    jointFunctions: [
      {
        id: "squat-patterns",
        name: "Squat Patterns",
        muscles: ["Quadriceps", "Glutes", "Adductors", "Spinal Erectors"],
        subcategories: [
          {
            id: "squat-quad-biased",
            name: "Quad-Biased",
            description: "Upright torso, high forward knee travel. Maximizes quadriceps loading through deep knee flexion with minimal hip hinge.",
            exercises: [
              {
                id: "front-squat",
                name: "Front Squat",
                difficulty: "hard",
                targetedMuscles: ["Quadriceps", "Upper Back", "Core"],
                description: "Barbell positioned on front delts forces an upright torso, maximizing knee travel and quad recruitment.",
                mechanics: "The anterior bar position shifts the center of gravity forward, requiring greater knee flexion and ankle dorsiflexion. This creates a longer moment arm at the knee joint, increasing quadriceps demand while reducing spinal erector load.",
                equipment: [
                  { id: "barbell", name: "Barbell" },
                  { id: "safety-squat-bar", name: "Safety Squat Bar" }
                ],
                warmup: { name: "Bodyweight Squat Hold", sets: "2", reps: "10", instructions: ["Opens the hips and ankles for deep knee flexion.", "Activates the quadriceps through full ROM.", "Prepares the thoracic spine for the upright position."] }
              },
              {
                id: "heel-elevated-squat",
                name: "Heel-Elevated Goblet Squat",
                difficulty: "easy",
                targetedMuscles: ["Quadriceps", "VMO", "Glutes"],
                description: "Heels elevated on a wedge or plate with a dumbbell/kettlebell held at chest height, allowing deep knee flexion with an upright torso.",
                mechanics: "Heel elevation compensates for limited ankle dorsiflexion, allowing the knees to travel further forward. The goblet hold counterbalances the body, enabling a more vertical torso and greater quad stretch at depth.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "kettlebell", name: "Kettlebell" }
                ],
                warmup: { name: "Wall Sit", sets: "1", reps: "30 sec", instructions: ["Activates the quadriceps isometrically.", "Warms the knee joint for deep flexion.", "Prepares the VMO for loaded squatting."] }
              }
            ]
          },
          {
            id: "squat-glute-adductor",
            name: "Glute & Adductor-Biased",
            description: "Forward torso lean, higher hip hinge. Wider stance and greater hip flexion shift emphasis to the posterior chain and inner thigh.",
            exercises: [
              {
                id: "low-bar-back-squat",
                name: "Low-Bar Back Squat",
                difficulty: "hard",
                targetedMuscles: ["Glutes", "Adductors", "Hamstrings", "Quadriceps"],
                description: "Bar positioned low on the rear delts with a wider stance, creating greater forward lean and hip hinge to bias the glutes and adductors.",
                mechanics: "The low bar position moves the center of gravity posteriorly, increasing the hip moment arm. Combined with a wider stance, this recruits more glute and adductor mass while still loading the quads through knee extension.",
                equipment: [
                  { id: "barbell", name: "Barbell" }
                ],
                warmup: { name: "Banded Clamshell", sets: "2", reps: "12 each side", instructions: ["Activates the glute medius and external rotators.", "Warms the hip joint for the wide stance position.", "Prepares the adductors for the loaded stretch at depth."] }
              },
              {
                id: "sumo-squat",
                name: "Sumo Squat",
                difficulty: "medium",
                targetedMuscles: ["Adductors", "Glutes", "Quadriceps"],
                description: "Extra-wide stance with toes pointed outward, emphasizing adductor and glute recruitment through hip abduction and external rotation.",
                mechanics: "The wide stance increases adductor length at the bottom position, creating a stretch-mediated stimulus. Hip external rotation engages the deep external rotators and glute max fibers oriented for abduction.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "kettlebell", name: "Kettlebell" },
                  { id: "barbell", name: "Barbell" }
                ],
                warmup: { name: "Sumo Stance Bodyweight Squat", sets: "1", reps: "12", instructions: ["Opens the hips in the wide stance pattern.", "Activates the adductors through the full ROM.", "Prepares the groin for loaded stretching at depth."] }
              }
            ]
          }
        ]
      },
      {
        id: "hinge-patterns",
        name: "Hinge Patterns",
        muscles: ["Hamstrings", "Glutes", "Spinal Erectors"],
        subcategories: [
          {
            id: "hinge-hamstring-biased",
            name: "Hamstring-Biased",
            description: "Straighter legs, minimal knee bend. Maximizes hamstring lengthening through hip flexion with near-full knee extension.",
            exercises: [
              {
                id: "romanian-deadlift",
                name: "Romanian Deadlift",
                difficulty: "medium",
                targetedMuscles: ["Hamstrings", "Glutes", "Spinal Erectors"],
                description: "Hip hinge with minimal knee bend, lowering the weight along the legs while maintaining a flat back. Maximizes hamstring stretch under load.",
                mechanics: "With knees nearly locked, the hamstrings are stretched maximally as the hips flex. The eccentric loading in the lengthened position creates high mechanical tension on the hamstring muscle fibers, particularly the biceps femoris long head.",
                equipment: [
                  { id: "barbell", name: "Barbell" },
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                warmup: { name: "Single-Leg RDL (Bodyweight)", sets: "1", reps: "8 each leg", instructions: ["Activates the hamstrings through the hinge pattern.", "Improves balance and proprioception.", "Prepares the posterior chain for loaded hip flexion."] }
              },
              {
                id: "stiff-leg-deadlift",
                name: "Stiff-Leg Deadlift",
                difficulty: "hard",
                targetedMuscles: ["Hamstrings", "Glutes", "Lower Back"],
                description: "Similar to RDL but with completely straight legs and the bar lowered from a deficit or to the floor, maximizing hamstring stretch.",
                mechanics: "Zero knee bend creates the longest possible hamstring moment arm. The weight travels further from the hip joint, increasing spinal erector demand. This variation provides maximal eccentric hamstring loading in the most lengthened position.",
                equipment: [
                  { id: "barbell", name: "Barbell" },
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                warmup: { name: "Toe Touch Progression", sets: "1", reps: "10", instructions: ["Progressively lengthens the hamstrings.", "Warms the posterior chain for the straight-leg position.", "Activates the spinal erectors for maintaining neutral spine."] }
              }
            ]
          },
          {
            id: "hinge-glute-biased",
            name: "Glute-Biased",
            description: "Significant knee bend during the hinge. Greater knee flexion shortens the hamstrings, shifting emphasis to the glutes as the primary hip extensor.",
            exercises: [
              {
                id: "conventional-deadlift",
                name: "Conventional Deadlift",
                difficulty: "hard",
                targetedMuscles: ["Glutes", "Hamstrings", "Quadriceps", "Spinal Erectors", "Traps"],
                description: "Full deadlift from the floor with moderate knee bend, recruiting the entire posterior chain with emphasis on glute drive at lockout.",
                mechanics: "The starting position with bent knees places the glutes in a mechanically advantaged position for hip extension. As the lifter drives through the floor, the glutes are the primary mover through the mid-range, while hamstrings assist and quads extend the knee.",
                equipment: [
                  { id: "barbell", name: "Barbell" }
                ],
                warmup: { name: "Glute Bridge", sets: "2", reps: "12", instructions: ["Activates the glutes through hip extension.", "Warms the hip extensors for the pulling pattern.", "Prepares the lower back for the loaded hinge."] }
              },
              {
                id: "hip-thrust",
                name: "Hip Thrust",
                difficulty: "medium",
                targetedMuscles: ["Glutes (max)", "Hamstrings"],
                description: "Back supported on a bench with barbell across the hips, driving through full hip extension with significant knee bend.",
                mechanics: "The bent-knee position shortens the hamstrings, reducing their contribution and forcing the glutes to be the primary hip extensor. Peak glute activation occurs at full hip extension (lockout), making this a shortened-bias glute exercise.",
                equipment: [
                  { id: "barbell", name: "Barbell" },
                  { id: "machine", name: "Hip Thrust Machine" }
                ],
                warmup: { name: "Banded Hip Thrust (Bodyweight)", sets: "1", reps: "15", instructions: ["Activates the glutes with a band for extra tension at lockout.", "Warms the hip extensors in the thrust pattern.", "Establishes the mind-muscle connection with the glutes."] }
              }
            ]
          },
          {
            id: "hinge-lumbar-extension",
            name: "Lumbar Extension",
            description: "Spinal erector-focused movements. Targets the erector spinae through controlled spinal flexion and extension.",
            exercises: [
              {
                id: "good-morning",
                name: "Good Morning",
                difficulty: "hard",
                targetedMuscles: ["Spinal Erectors", "Hamstrings", "Glutes"],
                description: "Barbell on the back with a controlled forward lean, emphasizing the spinal erectors' role in maintaining and extending the spine.",
                mechanics: "The bar's position on the upper back creates a long lever arm against spinal extension. The erector spinae must work eccentrically during the descent and concentrically to return to upright, making this a primary spinal erector strengthener.",
                equipment: [
                  { id: "barbell", name: "Barbell" }
                ],
                warmup: { name: "Cat-Cow Stretch", sets: "1", reps: "10 cycles", instructions: ["Mobilizes the spine through flexion and extension.", "Warms the spinal erectors for loaded movement.", "Increases blood flow to the lumbar region."] }
              },
              {
                id: "back-extension",
                name: "Back Extension (45° or GHD)",
                difficulty: "easy",
                targetedMuscles: ["Spinal Erectors", "Glutes", "Hamstrings"],
                description: "Performed on a back extension bench, hinging at the hips with controlled spinal extension against gravity.",
                mechanics: "The fixed lower body position isolates the hip and spinal extensors. The 45-degree angle provides progressive resistance through the ROM, with peak loading at the bottom where the erectors are most lengthened.",
                equipment: [
                  { id: "machine", name: "Back Extension Bench" }
                ],
                angles: [
                  { id: "45-degree", name: "45° Bench", description: "Standard back extension angle, moderate difficulty" },
                  { id: "90-degree", name: "GHD (90°)", description: "Greater ROM and difficulty, full horizontal position" }
                ],
                warmup: { name: "Superman Hold", sets: "1", reps: "10 (3 sec hold)", instructions: ["Activates the spinal erectors isometrically.", "Warms the lower back for loaded extension.", "Prepares the glutes and hamstrings as synergists."] }
              }
            ]
          }
        ]
      },
      {
        id: "upper-body-push",
        name: "Upper Body Push",
        muscles: ["Pectorals", "Anterior Deltoid", "Triceps"],
        subcategories: [
          {
            id: "push-chest-biased",
            name: "Chest-Biased",
            description: "Horizontal push with elbows flared. Maximizes pectoral recruitment through shoulder horizontal adduction with a pressing motion.",
            exercises: [
              {
                id: "bench-press",
                name: "Bench Press",
                difficulty: "hard",
                targetedMuscles: ["Pectorals (sternal)", "Anterior Deltoid", "Triceps"],
                description: "Flat or incline pressing with elbows flared at approximately 45-75°, maximizing pectoral stretch and contraction through horizontal adduction.",
                mechanics: "The horizontal pressing angle with flared elbows creates a large moment arm for the pectorals. The stretch at the bottom and forceful horizontal adduction through the press maximally loads the sternal fibers of the pec major.",
                equipment: [
                  { id: "barbell", name: "Barbell" },
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                angles: [
                  { id: "flat", name: "Flat (0°)", description: "Targets mid-pec fibers, standard horizontal press" },
                  { id: "15-incline", name: "15° Incline", description: "Slight upper pec emphasis while maintaining overall chest focus" },
                  { id: "30-incline", name: "30° Incline", description: "Greater upper pec (clavicular) recruitment" }
                ],
                warmup: { name: "Push-Up (Slow Tempo)", sets: "2", reps: "10", instructions: ["Activates the pectorals through the pressing pattern.", "Warms the shoulder joint for loaded horizontal adduction.", "Prepares the triceps and anterior delts as synergists."] }
              },
              {
                id: "machine-chest-press",
                name: "Machine Chest Press",
                difficulty: "easy",
                targetedMuscles: ["Pectorals", "Anterior Deltoid", "Triceps"],
                description: "Seated machine press with handles at chest height, providing a fixed path that isolates the chest pressing pattern.",
                mechanics: "The machine's fixed path eliminates stabilization demands, allowing full focus on pectoral contraction. The cam system can provide variable resistance matching the strength curve of the press.",
                equipment: [
                  { id: "machine", name: "Chest Press Machine" }
                ],
                angles: [
                  { id: "flat", name: "Flat", description: "Horizontal pressing angle for mid-chest" },
                  { id: "incline", name: "Incline", description: "Angled upward for upper chest emphasis" }
                ],
                warmup: { name: "Band Pull-Apart", sets: "1", reps: "15", instructions: ["Activates the rear delts and rotator cuff for shoulder stability.", "Balances the pressing muscles with pulling activation.", "Warms the shoulder joint for the pressing movement."] }
              }
            ]
          },
          {
            id: "push-chest-fly",
            name: "Chest Fly",
            description: "Shoulder abduction focused. Isolates the pectorals through horizontal adduction without significant elbow extension, removing triceps contribution.",
            exercises: [
              {
                id: "dumbbell-fly",
                name: "Dumbbell Fly",
                difficulty: "medium",
                targetedMuscles: ["Pectorals (sternal & clavicular)", "Anterior Deltoid"],
                description: "Arms extended with a slight elbow bend, lowering dumbbells in an arc to stretch the pecs, then squeezing back to the top.",
                mechanics: "The fixed elbow angle removes triceps contribution, isolating shoulder horizontal adduction. The pectorals are loaded maximally in their lengthened position at the bottom of the arc, creating high stretch-mediated tension.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                angles: [
                  { id: "flat", name: "Flat", description: "Targets sternal pec fibers in the lengthened position" },
                  { id: "15-incline", name: "15° Incline", description: "Slight upper pec bias in the fly pattern" },
                  { id: "30-incline", name: "30° Incline", description: "Greater clavicular pec recruitment" }
                ],
                warmup: { name: "Arm Circles (Large)", sets: "1", reps: "10 each direction", instructions: ["Mobilizes the shoulder through full circumduction.", "Warms the pectoral insertion points.", "Prepares the shoulder for the stretched fly position."] }
              },
              {
                id: "cable-fly",
                name: "Cable Fly",
                difficulty: "easy",
                targetedMuscles: ["Pectorals", "Anterior Deltoid"],
                description: "Standing cable fly with constant tension throughout the full range of motion, providing peak contraction at the midline.",
                mechanics: "Unlike dumbbells which lose tension at the top, cables maintain constant tension through the entire arc. This allows peak pectoral contraction when the hands meet at midline, targeting the shortened position of the muscle.",
                equipment: [
                  { id: "cable", name: "Cable Machine" }
                ],
                angles: [
                  { id: "high-to-low", name: "High-to-Low", description: "Targets lower pec fibers, arms sweep downward" },
                  { id: "horizontal", name: "Horizontal", description: "Mid-pec focus, arms at chest height" },
                  { id: "low-to-high", name: "Low-to-High", description: "Upper pec emphasis, arms sweep upward" }
                ],
                warmup: { name: "Light Cable Crossover", sets: "1", reps: "12", instructions: ["Activates the pectorals with minimal load.", "Establishes the cable fly movement pattern.", "Warms the shoulder for the abducted position."] }
              }
            ]
          },
          {
            id: "push-shoulder-tricep",
            name: "Shoulder, Tricep & Front Delt-Biased",
            description: "Vertical overhead push, high incline, or narrow grip with elbows tucked. Shifts emphasis from pectorals to deltoids and triceps through a more vertical pressing angle.",
            exercises: [
              {
                id: "overhead-press",
                name: "Overhead Press",
                difficulty: "hard",
                targetedMuscles: ["Anterior Deltoid", "Lateral Deltoid", "Triceps", "Upper Pec"],
                description: "Pressing weight directly overhead from shoulder height, primarily loading the deltoids and triceps with minimal chest involvement.",
                mechanics: "The vertical pressing angle eliminates the horizontal adduction component that recruits the pectorals. The deltoids become the primary shoulder flexors, while the triceps handle elbow extension against the overhead load.",
                equipment: [
                  { id: "barbell", name: "Barbell" },
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                warmup: { name: "Band Shoulder Press", sets: "1", reps: "12", instructions: ["Activates the deltoids through the overhead pattern.", "Warms the shoulder joint for vertical pressing.", "Prepares the rotator cuff for overhead loading."] }
              },
              {
                id: "close-grip-bench",
                name: "Close-Grip Bench Press",
                difficulty: "medium",
                targetedMuscles: ["Triceps", "Anterior Deltoid", "Upper Pec"],
                description: "Bench press with narrow grip and elbows tucked close to the body, shifting emphasis from chest to triceps and front delts.",
                mechanics: "The narrow grip and tucked elbows reduce the horizontal adduction moment, decreasing pectoral contribution. The increased elbow extension demand shifts primary loading to the triceps, while the anterior deltoid assists in shoulder flexion.",
                equipment: [
                  { id: "barbell", name: "Barbell" }
                ],
                warmup: { name: "Diamond Push-Up", sets: "1", reps: "8", instructions: ["Activates the triceps in the narrow pressing pattern.", "Warms the elbow joint for heavy extension.", "Prepares the anterior delts for the tucked position."] }
              }
            ]
          }
        ]
      },
      {
        id: "upper-body-pull",
        name: "Upper Body Pull",
        muscles: ["Lats", "Rhomboids", "Trapezius", "Biceps"],
        subcategories: [
          {
            id: "pull-lat-biased",
            name: "Lat-Biased",
            description: "Elbows tucked to sides, pulling to the hip. Maximizes lat recruitment through shoulder extension and adduction with elbows close to the torso.",
            exercises: [
              {
                id: "lat-pulldown",
                name: "Lat Pulldown",
                difficulty: "easy",
                targetedMuscles: ["Latissimus Dorsi", "Teres Major", "Biceps"],
                description: "Pulling a bar or handle from overhead to chest level with elbows driving down and back toward the hips.",
                mechanics: "Shoulder adduction and extension with elbows tucked creates the longest moment arm for the lats. The vertical pulling angle with elbows close to the body maximizes lat fiber recruitment while minimizing upper back involvement.",
                equipment: [
                  { id: "cable", name: "Cable Machine" }
                ],
                angles: [
                  { id: "wide-grip", name: "Wide Grip", description: "Greater shoulder adduction, emphasizes lat width" },
                  { id: "close-grip", name: "Close/Neutral Grip", description: "Greater shoulder extension, emphasizes lat thickness" }
                ],
                warmup: { name: "Straight-Arm Pulldown (Light)", sets: "1", reps: "12", instructions: ["Isolates the lats through shoulder extension.", "Warms the lat insertion without bicep fatigue.", "Establishes the mind-muscle connection with the lats."] }
              },
              {
                id: "single-arm-row",
                name: "Single-Arm Dumbbell Row",
                difficulty: "medium",
                targetedMuscles: ["Latissimus Dorsi", "Rhomboids", "Biceps"],
                description: "One-arm rowing with elbow driving back past the hip, allowing full lat stretch and contraction unilaterally.",
                mechanics: "The single-arm position allows greater ROM and lat stretch at the bottom. Pulling the elbow past the hip emphasizes shoulder extension, which is the primary function of the lat. The supported position reduces spinal erector fatigue.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "cable", name: "Cable Machine" }
                ],
                warmup: { name: "Band Lat Stretch", sets: "1", reps: "20 sec each side", instructions: ["Stretches the lat through overhead shoulder flexion.", "Warms the lat for the rowing pattern.", "Increases ROM for the stretched position at the bottom."] }
              }
            ]
          },
          {
            id: "pull-upper-back",
            name: "Upper Back & Rhomboid-Biased",
            description: "Elbows flared outwards. Wider grip and higher elbow position shifts emphasis to the rhomboids, mid-traps, and rear delts through scapular retraction.",
            exercises: [
              {
                id: "face-pull",
                name: "Face Pull",
                difficulty: "easy",
                targetedMuscles: ["Rear Deltoid", "Rhomboids", "Mid Trapezius", "External Rotators"],
                description: "Cable pull to face level with elbows high and wide, emphasizing scapular retraction and external rotation.",
                mechanics: "The high elbow position and external rotation component recruits the rhomboids, mid-traps, and rear delts simultaneously. This movement pattern trains scapular retraction and posterior shoulder health.",
                equipment: [
                  { id: "cable", name: "Cable (Rope Attachment)" }
                ],
                warmup: { name: "Band Pull-Apart (High)", sets: "1", reps: "15", instructions: ["Activates the rear delts and rhomboids.", "Warms the scapular retractors.", "Prepares the external rotators for the face pull pattern."] }
              },
              {
                id: "wide-grip-row",
                name: "Wide-Grip Barbell Row",
                difficulty: "hard",
                targetedMuscles: ["Rhomboids", "Mid Trapezius", "Rear Deltoid", "Lats"],
                description: "Barbell row with a wide overhand grip, pulling to the upper abdomen/lower chest with elbows flared outward.",
                mechanics: "The wide grip and flared elbows shift the pulling vector to emphasize horizontal abduction and scapular retraction. This loads the rhomboids and mid-traps more than a close-grip row that emphasizes shoulder extension.",
                equipment: [
                  { id: "barbell", name: "Barbell" }
                ],
                angles: [
                  { id: "horizontal", name: "Horizontal (Bent Over)", description: "Standard bent-over position, full upper back loading" },
                  { id: "chest-supported", name: "Chest-Supported", description: "Removes spinal erector demand, isolates upper back" }
                ],
                warmup: { name: "Scapular Retraction Hold", sets: "2", reps: "8 (3 sec hold)", instructions: ["Activates the rhomboids and mid-traps isometrically.", "Warms the scapular retractors for loaded rowing.", "Establishes proper scapular positioning for the wide row."] }
              }
            ]
          },
          {
            id: "pull-bicep-biased",
            name: "Bicep-Biased",
            description: "Underhand/supinated grip. Supination increases biceps contribution during pulling movements, making them a primary mover alongside the back muscles.",
            exercises: [
              {
                id: "chin-up",
                name: "Chin-Up",
                difficulty: "hard",
                targetedMuscles: ["Biceps", "Latissimus Dorsi", "Brachialis"],
                description: "Pull-up with supinated (underhand) grip, maximizing biceps involvement while still heavily loading the lats.",
                mechanics: "Supination places the biceps in their strongest position for elbow flexion. Combined with the shoulder extension of a vertical pull, the biceps are loaded through both their functions simultaneously, making them a primary mover rather than just a synergist.",
                equipment: [
                  { id: "bodyweight", name: "Pull-Up Bar" }
                ],
                warmup: { name: "Dead Hang + Scap Pull", sets: "1", reps: "5 (3 sec hang + pull)", instructions: ["Decompresses the spine and stretches the lats.", "Activates the scapular depressors.", "Prepares the biceps and grip for loaded pulling."] }
              },
              {
                id: "supinated-row",
                name: "Supinated Barbell Row",
                difficulty: "medium",
                targetedMuscles: ["Biceps", "Lats", "Lower Trapezius"],
                description: "Barbell row with underhand grip, pulling to the lower abdomen with elbows close to the body.",
                mechanics: "The supinated grip positions the biceps for maximal contribution during the row. The close elbow position emphasizes shoulder extension (lats) while the supination ensures the biceps are fully engaged throughout the pull.",
                equipment: [
                  { id: "barbell", name: "Barbell" }
                ],
                warmup: { name: "Supinated Band Row", sets: "1", reps: "12", instructions: ["Activates the biceps in the supinated pulling pattern.", "Warms the elbow flexors for heavy rowing.", "Prepares the lats for the close-grip pull."] }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "regional",
    name: "Tier 2: Regional / Single-Joint",
    subtitle: "The Sand",
    description: "Small mass, low CNS fatigue. These isolation movements target individual muscle groups through single-joint actions, allowing higher volume and frequency with minimal systemic stress.",
    jointFunctions: [
      {
        id: "arm-isolation",
        name: "Arm Isolation",
        muscles: ["Biceps", "Brachialis", "Triceps"],
        subcategories: [
          {
            id: "biceps-lengthened",
            name: "Biceps - Lengthened/Stretch Bias",
            description: "Elbows behind torso. Positions the biceps in a maximally stretched state, creating high tension in the lengthened position for stretch-mediated hypertrophy.",
            exercises: [
              {
                id: "incline-dumbbell-curl",
                name: "Incline Dumbbell Curl",
                difficulty: "medium",
                targetedMuscles: ["Biceps (long head)", "Brachialis"],
                description: "Curling from an incline bench with arms hanging behind the torso, placing the biceps under maximum stretch at the bottom.",
                mechanics: "The incline position extends the shoulder, placing the biceps long head in a fully lengthened position. This creates peak tension at the bottom of the curl where the muscle is most stretched, stimulating stretch-mediated hypertrophy.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                angles: [
                  { id: "45-incline", name: "45° Incline", description: "Moderate stretch, good balance of tension and ROM" },
                  { id: "60-incline", name: "60° Incline", description: "Greater stretch on the biceps long head" }
                ],
                warmup: { name: "Arm Circle + Light Curl", sets: "1", reps: "10", instructions: ["Mobilizes the shoulder for the extended position.", "Warms the biceps tendon for the stretched curl.", "Increases blood flow to the elbow joint."] }
              },
              {
                id: "bayesian-curl",
                name: "Bayesian Cable Curl",
                difficulty: "medium",
                targetedMuscles: ["Biceps (long head)"],
                description: "Standing cable curl with the arm positioned behind the body, maintaining constant tension in the stretched position.",
                mechanics: "The cable positioned behind the body keeps the biceps under tension even at full extension. The shoulder extension places the long head in its most lengthened state, providing stretch-mediated stimulus throughout the entire ROM.",
                equipment: [
                  { id: "cable", name: "Cable (D-Handle)" }
                ],
                warmup: { name: "Behind-Body Arm Stretch", sets: "1", reps: "15 sec each arm", instructions: ["Stretches the biceps in the extended shoulder position.", "Prepares the long head for the behind-body angle.", "Warms the elbow joint for loaded flexion."] }
              }
            ]
          },
          {
            id: "biceps-shortened",
            name: "Biceps - Shortened Bias",
            description: "Elbows in front of torso. Positions the biceps for peak contraction in the shortened position, emphasizing the squeeze at the top.",
            exercises: [
              {
                id: "preacher-curl",
                name: "Preacher Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps (short head)", "Brachialis"],
                description: "Curling with arms supported on an angled pad in front of the body, eliminating momentum and emphasizing the contracted position.",
                mechanics: "The preacher pad positions the elbows in front of the torso (shoulder flexion), which shortens the biceps long head and shifts emphasis to the short head. The fixed position prevents cheating and maintains tension through the shortened range.",
                equipment: [
                  { id: "barbell", name: "EZ Bar" },
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "machine", name: "Preacher Machine" }
                ],
                warmup: { name: "Light Preacher Curl", sets: "1", reps: "15", instructions: ["Warms the biceps in the shortened position.", "Prepares the elbow joint for the fixed-arm curl.", "Activates the brachialis as a synergist."] }
              },
              {
                id: "concentration-curl",
                name: "Concentration Curl",
                difficulty: "easy",
                targetedMuscles: ["Biceps (short head)", "Brachialis"],
                description: "Seated curl with elbow braced against the inner thigh, isolating the biceps with peak contraction at the top.",
                mechanics: "The braced elbow position with the shoulder flexed forward emphasizes the biceps short head. The isolation removes all momentum, forcing the biceps to contract fully at the top of the movement.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                warmup: { name: "Wrist Rotations", sets: "1", reps: "10 each direction", instructions: ["Warms the forearm and biceps insertion.", "Prepares the elbow for isolated flexion.", "Increases blood flow to the biceps."] }
              }
            ]
          },
          {
            id: "brachialis-bias",
            name: "Brachialis Bias",
            description: "Neutral or pronated grip. Reduces biceps contribution by eliminating supination, shifting emphasis to the brachialis and brachioradialis.",
            exercises: [
              {
                id: "hammer-curl",
                name: "Hammer Curl",
                difficulty: "easy",
                targetedMuscles: ["Brachialis", "Brachioradialis", "Biceps"],
                description: "Curling with a neutral (palms facing each other) grip, emphasizing the brachialis which lies underneath the biceps.",
                mechanics: "The neutral grip reduces the biceps' mechanical advantage by eliminating the supination component. The brachialis, a pure elbow flexor unaffected by forearm position, becomes the primary mover.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "cable", name: "Cable (Rope)" }
                ],
                warmup: { name: "Wrist Curl + Extension", sets: "1", reps: "10 each", instructions: ["Warms the forearm flexors and extensors.", "Prepares the brachioradialis for neutral-grip work.", "Increases blood flow to the elbow joint."] }
              },
              {
                id: "reverse-curl",
                name: "Reverse Curl",
                difficulty: "medium",
                targetedMuscles: ["Brachioradialis", "Brachialis", "Forearm Extensors"],
                description: "Curling with a pronated (overhand) grip, maximally reducing biceps contribution and loading the brachioradialis.",
                mechanics: "Pronation places the biceps in their weakest position, forcing the brachioradialis and brachialis to handle the majority of the load. This also significantly loads the wrist extensors isometrically.",
                equipment: [
                  { id: "barbell", name: "EZ Bar" },
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                warmup: { name: "Wrist Extension Stretch", sets: "1", reps: "15 sec each", instructions: ["Stretches the wrist extensors for the pronated position.", "Warms the brachioradialis for overhand curling.", "Prepares the forearm for the reverse grip load."] }
              }
            ]
          },
          {
            id: "triceps-long-head",
            name: "Triceps - Long Head Bias",
            description: "Greater degree of shoulder flexion, arms positioned overhead. The long head of the triceps crosses the shoulder joint, so overhead positions stretch it maximally.",
            exercises: [
              {
                id: "overhead-tricep-extension",
                name: "Overhead Tricep Extension",
                difficulty: "medium",
                targetedMuscles: ["Triceps (long head)"],
                description: "Extending the elbow with arms overhead, placing the triceps long head in a maximally stretched position.",
                mechanics: "The overhead position (shoulder flexion) stretches the long head of the triceps across the shoulder joint. This creates peak tension in the lengthened position, providing stretch-mediated hypertrophy stimulus specifically to the long head.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "cable", name: "Cable (Rope)" },
                  { id: "barbell", name: "EZ Bar" }
                ],
                warmup: { name: "Overhead Tricep Stretch", sets: "1", reps: "15 sec each arm", instructions: ["Stretches the triceps long head in the overhead position.", "Warms the shoulder for the flexed position.", "Prepares the elbow for loaded extension overhead."] }
              },
              {
                id: "skull-crusher",
                name: "Skull Crusher (Incline)",
                difficulty: "medium",
                targetedMuscles: ["Triceps (long head)", "Triceps (medial)"],
                description: "Lying tricep extension on an incline bench, lowering the weight behind the head to stretch the long head.",
                mechanics: "The incline position increases shoulder flexion at the bottom, stretching the long head more than a flat skull crusher. Lowering behind the head rather than to the forehead further increases the stretch component.",
                equipment: [
                  { id: "barbell", name: "EZ Bar" },
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                angles: [
                  { id: "flat", name: "Flat Bench", description: "Standard position, moderate long head stretch" },
                  { id: "incline", name: "Incline Bench", description: "Greater shoulder flexion, increased long head stretch" }
                ],
                warmup: { name: "Light Skull Crusher", sets: "1", reps: "12", instructions: ["Warms the elbow joint for the extension pattern.", "Activates the triceps through the full ROM.", "Prepares the long head for the stretched position."] }
              }
            ]
          },
          {
            id: "triceps-lateral-medial",
            name: "Triceps - Lateral/Medial Bias",
            description: "Arms glued to sides. With the shoulder in neutral, the long head is shortened and less active, shifting emphasis to the lateral and medial heads.",
            exercises: [
              {
                id: "cable-pushdown",
                name: "Cable Pushdown",
                difficulty: "easy",
                targetedMuscles: ["Triceps (lateral head)", "Triceps (medial head)"],
                description: "Standing cable extension with elbows pinned to the sides, isolating the lateral and medial triceps heads.",
                mechanics: "With arms at the sides (shoulder neutral/slightly extended), the long head is in a shortened position and contributes less force. The lateral and medial heads, which only cross the elbow joint, become the primary extensors.",
                equipment: [
                  { id: "cable", name: "Cable (Straight Bar)" },
                  { id: "cable-rope", name: "Cable (Rope)" },
                  { id: "cable-vbar", name: "Cable (V-Bar)" }
                ],
                warmup: { name: "Light Pushdown", sets: "1", reps: "15", instructions: ["Warms the elbow joint for extension.", "Activates the lateral head with minimal load.", "Establishes the elbow-pinned position."] }
              },
              {
                id: "tricep-kickback",
                name: "Tricep Kickback",
                difficulty: "easy",
                targetedMuscles: ["Triceps (lateral head)", "Triceps (medial head)"],
                description: "Bent-over elbow extension with the arm parallel to the floor, providing peak contraction at full extension.",
                mechanics: "The shoulder extended position (arm behind body) maximally shortens the long head, reducing its contribution. The lateral and medial heads must produce the force for elbow extension, with peak loading at the lockout position.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "cable", name: "Cable (D-Handle)" }
                ],
                warmup: { name: "Arm Swing (Back)", sets: "1", reps: "10 each arm", instructions: ["Warms the triceps through dynamic extension.", "Prepares the elbow for the kickback angle.", "Increases blood flow to the lateral head."] }
              }
            ]
          }
        ]
      },
      {
        id: "shoulder-isolation",
        name: "Shoulder Isolation",
        muscles: ["Lateral Deltoid", "Rear Deltoid", "Front Deltoid"],
        subcategories: [
          {
            id: "lateral-delt-contracted",
            name: "Lateral Delt - Contracted Bias",
            description: "Free weights, hardest at top. Gravity-dependent resistance that peaks at the top of the movement where the deltoid is most contracted.",
            exercises: [
              {
                id: "dumbbell-lateral-raise",
                name: "Dumbbell Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Lateral Deltoid", "Supraspinatus"],
                description: "Raising dumbbells to the side with a slight forward lean, peak difficulty at the top of the arc.",
                mechanics: "Gravity creates maximum resistance when the arm is horizontal (90° abduction). The lateral deltoid is in its shortest position here, making this a contracted-bias exercise. Resistance is minimal at the bottom where the muscle is lengthened.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" }
                ],
                warmup: { name: "Band Pull-Apart", sets: "1", reps: "15", instructions: ["Activates the rear delts and rotator cuff.", "Warms the shoulder for abduction movements.", "Increases blood flow to the deltoid complex."] }
              },
              {
                id: "machine-lateral-raise",
                name: "Machine Lateral Raise",
                difficulty: "easy",
                targetedMuscles: ["Lateral Deltoid"],
                description: "Seated machine that provides resistance through shoulder abduction with pads on the outer arms.",
                mechanics: "The machine's cam system provides resistance matching the lateral deltoid's strength curve. Peak loading occurs at the top of the movement where the muscle is most contracted, similar to free-weight raises but with a more consistent resistance profile.",
                equipment: [
                  { id: "machine", name: "Lateral Raise Machine" }
                ],
                warmup: { name: "Light Machine Set", sets: "1", reps: "15", instructions: ["Warms the lateral deltoid at minimal resistance.", "Establishes proper pad position and ROM.", "Activates the supraspinatus for the abduction pattern."] }
              }
            ]
          },
          {
            id: "lateral-delt-stretch",
            name: "Lateral Delt - Stretch Bias",
            description: "Cables, constant tension at bottom. Cable angle provides maximum tension when the deltoid is in its lengthened position, emphasizing stretch-mediated growth.",
            exercises: [
              {
                id: "cable-lateral-raise",
                name: "Cable Lateral Raise (Behind Body)",
                difficulty: "medium",
                targetedMuscles: ["Lateral Deltoid"],
                description: "Cable positioned behind the body, creating peak tension at the bottom of the raise where the deltoid is most stretched.",
                mechanics: "The cable angle from behind creates maximum resistance when the arm is at the side (deltoid lengthened). This provides stretch-mediated stimulus that free weights cannot, as dumbbells have zero tension at the bottom.",
                equipment: [
                  { id: "cable", name: "Cable (D-Handle)" }
                ],
                warmup: { name: "Cross-Body Shoulder Stretch", sets: "1", reps: "15 sec each", instructions: ["Stretches the lateral deltoid across the body.", "Prepares the shoulder for the cable angle.", "Increases ROM for the stretched starting position."] }
              },
              {
                id: "leaning-cable-raise",
                name: "Leaning Cable Lateral Raise",
                difficulty: "medium",
                targetedMuscles: ["Lateral Deltoid (stretched position)"],
                description: "Holding a pole and leaning away from the cable, increasing the stretch on the deltoid at the bottom of the movement.",
                mechanics: "Leaning away shifts the resistance curve further toward the lengthened position. The deltoid is under significant tension even at full adduction, providing a powerful stretch-mediated stimulus that complements contracted-bias exercises.",
                equipment: [
                  { id: "cable", name: "Cable (D-Handle)" }
                ],
                warmup: { name: "Arm Swing (Lateral)", sets: "1", reps: "12 each arm", instructions: ["Dynamically warms the shoulder abductors.", "Increases ROM in the frontal plane.", "Prepares the deltoid for the leaning stretch position."] }
              }
            ]
          },
          {
            id: "rear-delt-bias",
            name: "Rear Delt Bias",
            description: "Horizontal abduction, no scapular retraction. Isolates the posterior deltoid through shoulder horizontal abduction without engaging the rhomboids.",
            exercises: [
              {
                id: "reverse-pec-deck",
                name: "Reverse Pec Deck",
                difficulty: "easy",
                targetedMuscles: ["Rear Deltoid", "Infraspinatus"],
                description: "Seated machine fly in reverse, driving arms backward through horizontal abduction to isolate the rear delts.",
                mechanics: "The fixed path of the machine allows focus on horizontal abduction without scapular retraction. Keeping the chest pressed against the pad prevents rhomboid engagement, isolating the posterior deltoid fibers.",
                equipment: [
                  { id: "machine", name: "Pec Deck (Reverse)" }
                ],
                warmup: { name: "Band Face Pull (Light)", sets: "1", reps: "12", instructions: ["Activates the rear delts with minimal load.", "Warms the posterior shoulder for horizontal abduction.", "Prepares the rotator cuff for the reverse fly pattern."] }
              },
              {
                id: "rear-delt-cable-fly",
                name: "Rear Delt Cable Fly",
                difficulty: "medium",
                targetedMuscles: ["Rear Deltoid"],
                description: "Standing cable fly with arms at shoulder height, pulling outward and back to isolate the rear delts.",
                mechanics: "The cable provides constant tension through the full arc of horizontal abduction. By maintaining a slight elbow bend and focusing on leading with the elbows, the rear delt is isolated without significant rhomboid or trap contribution.",
                equipment: [
                  { id: "cable", name: "Cable (No Attachment / D-Handle)" }
                ],
                angles: [
                  { id: "high-cable", name: "High Cable", description: "Pulling downward and back, emphasizes lower rear delt fibers" },
                  { id: "mid-cable", name: "Mid Cable", description: "Horizontal pull, standard rear delt isolation" }
                ],
                warmup: { name: "Prone Y-T-W Raises", sets: "1", reps: "5 each position", instructions: ["Activates all posterior shoulder muscles.", "Warms the rear delt through multiple angles.", "Prepares the rotator cuff for the cable fly."] }
              }
            ]
          },
          {
            id: "front-delt-bias",
            name: "Front Delt Bias",
            description: "Shoulder flexion isolation. Targets the anterior deltoid through pure shoulder flexion without pressing (no triceps involvement).",
            exercises: [
              {
                id: "front-raise",
                name: "Front Raise",
                difficulty: "easy",
                targetedMuscles: ["Anterior Deltoid", "Upper Pec (clavicular)"],
                description: "Raising weight directly in front of the body through shoulder flexion, isolating the front delt without triceps contribution.",
                mechanics: "Pure shoulder flexion without elbow extension removes triceps involvement. The anterior deltoid is the primary shoulder flexor in this plane, with the clavicular pec assisting. Peak loading occurs at 90° of flexion.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "cable", name: "Cable" },
                  { id: "barbell", name: "Barbell/Plate" }
                ],
                warmup: { name: "Arm Swing (Front/Back)", sets: "1", reps: "10 each arm", instructions: ["Dynamically warms the anterior deltoid.", "Increases shoulder flexion ROM.", "Prepares the front delt for loaded raises."] }
              },
              {
                id: "cable-front-raise",
                name: "Cable Front Raise",
                difficulty: "easy",
                targetedMuscles: ["Anterior Deltoid"],
                description: "Front raise using a low cable, providing constant tension throughout the full ROM including the bottom stretch.",
                mechanics: "The cable from below maintains tension even at the starting position (arm at side), unlike dumbbells which have zero tension at the bottom. This provides a more complete stimulus through the entire range of shoulder flexion.",
                equipment: [
                  { id: "cable", name: "Cable (Straight Bar / Rope)" }
                ],
                warmup: { name: "Light Cable Front Raise", sets: "1", reps: "12", instructions: ["Warms the anterior deltoid with minimal load.", "Establishes the cable front raise pattern.", "Prepares the shoulder for loaded flexion."] }
              }
            ]
          }
        ]
      },
      {
        id: "leg-isolation",
        name: "Leg Isolation",
        muscles: ["Hamstrings", "Quadriceps", "Calves"],
        subcategories: [
          {
            id: "hamstrings-lengthened",
            name: "Hamstrings - Lengthened Bias",
            description: "Hips flexed/seated. The seated position flexes the hips, stretching the hamstrings across both joints for maximum lengthened tension.",
            exercises: [
              {
                id: "seated-leg-curl",
                name: "Seated Leg Curl",
                difficulty: "easy",
                targetedMuscles: ["Hamstrings (biceps femoris)", "Semimembranosus"],
                description: "Machine leg curl in the seated position, where hip flexion places the hamstrings in a lengthened state throughout the movement.",
                mechanics: "The seated position (hips flexed ~90°) stretches the hamstrings across the hip joint while the knee flexion shortens them at the other end. This creates peak tension in the lengthened position, stimulating stretch-mediated hypertrophy.",
                equipment: [
                  { id: "machine", name: "Seated Leg Curl Machine" }
                ],
                warmup: { name: "Seated Hamstring Stretch", sets: "1", reps: "20 sec each leg", instructions: ["Stretches the hamstrings in the seated position.", "Prepares the muscle for lengthened-bias loading.", "Increases blood flow to the hamstring bellies."] }
              },
              {
                id: "rdl-single-leg",
                name: "Single-Leg Romanian Deadlift",
                difficulty: "medium",
                targetedMuscles: ["Hamstrings", "Glutes", "Core (anti-rotation)"],
                description: "Unilateral hip hinge with straight leg, maximizing hamstring stretch under load with balance challenge.",
                mechanics: "The single-leg position with near-full knee extension maximally lengthens the hamstrings. The unilateral nature also challenges hip stability and core anti-rotation, making it a functional lengthened-bias hamstring exercise.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "kettlebell", name: "Kettlebell" }
                ],
                warmup: { name: "Single-Leg Balance + Hinge", sets: "1", reps: "8 each leg", instructions: ["Improves balance for the single-leg position.", "Warms the hamstrings through the hinge pattern.", "Activates the core for anti-rotation stability."] }
              }
            ]
          },
          {
            id: "hamstrings-shortened",
            name: "Hamstrings - Shortened Bias",
            description: "Hips extended/prone or standing. With hips neutral or extended, the hamstrings are not pre-stretched, emphasizing the shortened/contracted position.",
            exercises: [
              {
                id: "prone-leg-curl",
                name: "Prone (Lying) Leg Curl",
                difficulty: "easy",
                targetedMuscles: ["Hamstrings (short head biceps femoris)", "Semitendinosus"],
                description: "Lying face-down on a leg curl machine, curling the weight with hips in a neutral/extended position.",
                mechanics: "The prone position keeps the hips extended, which shortens the hamstrings across the hip joint. This means the muscle reaches full shortening earlier during knee flexion, emphasizing the contracted position and the short head of the biceps femoris.",
                equipment: [
                  { id: "machine", name: "Prone Leg Curl Machine" }
                ],
                warmup: { name: "Prone Hamstring Activation", sets: "1", reps: "12 (slow)", instructions: ["Activates the hamstrings in the prone position.", "Warms the knee joint for loaded flexion.", "Establishes the mind-muscle connection with the hamstrings."] }
              },
              {
                id: "standing-leg-curl",
                name: "Standing Leg Curl",
                difficulty: "easy",
                targetedMuscles: ["Hamstrings (unilateral)"],
                description: "Single-leg curl performed standing, with the hip in neutral position for shortened-bias hamstring work.",
                mechanics: "Standing with the hip neutral/slightly extended shortens the hamstrings at the hip, similar to prone curls. The unilateral nature allows focus on each leg independently, addressing imbalances.",
                equipment: [
                  { id: "machine", name: "Standing Leg Curl Machine" }
                ],
                warmup: { name: "Standing Knee Flexion (Bodyweight)", sets: "1", reps: "10 each leg", instructions: ["Activates the hamstrings unilaterally.", "Warms the knee joint for the standing curl.", "Prepares the balance for single-leg work."] }
              }
            ]
          },
          {
            id: "quads-rectus-femoris",
            name: "Quadriceps - Rectus Femoris Bias",
            description: "Hips extended/leaning back. The rectus femoris crosses the hip, so hip extension stretches it, increasing its contribution during knee extension.",
            exercises: [
              {
                id: "leg-extension",
                name: "Leg Extension",
                difficulty: "easy",
                targetedMuscles: ["Quadriceps (all heads)", "Rectus Femoris"],
                description: "Seated knee extension machine. Leaning back or using a reclined seat increases rectus femoris recruitment.",
                mechanics: "The seated position with slight hip extension stretches the rectus femoris across the hip joint. As the only quad head crossing both joints, it receives greater stimulus when pre-stretched at the hip during knee extension.",
                equipment: [
                  { id: "machine", name: "Leg Extension Machine" }
                ],
                warmup: { name: "Bodyweight Sissy Squat (Partial)", sets: "1", reps: "8", instructions: ["Stretches the rectus femoris through hip extension + knee flexion.", "Warms the quad tendon for loaded extension.", "Activates all four quadriceps heads."] }
              },
              {
                id: "sissy-squat",
                name: "Sissy Squat",
                difficulty: "hard",
                targetedMuscles: ["Rectus Femoris", "Vastus Medialis"],
                description: "Leaning back while bending the knees, keeping hips extended to maximally stretch the rectus femoris under load.",
                mechanics: "The backward lean with extended hips creates simultaneous hip extension and knee flexion, maximally stretching the rectus femoris. This is one of the few exercises that loads the rectus femoris in its most lengthened position across both joints.",
                equipment: [
                  { id: "bodyweight", name: "Bodyweight / Sissy Squat Bench" }
                ],
                warmup: { name: "Couch Stretch", sets: "1", reps: "20 sec each leg", instructions: ["Stretches the rectus femoris and hip flexors.", "Prepares the quad for the extended-hip position.", "Increases knee flexion ROM for the sissy squat depth."] }
              }
            ]
          },
          {
            id: "calves",
            name: "Calves",
            description: "Includes both straight leg (gastrocnemius focus) and bent knee (soleus focus). The two-joint gastrocnemius is stretched with straight legs; the single-joint soleus is isolated with bent knees.",
            exercises: [
              {
                id: "standing-calf-raise",
                name: "Standing Calf Raise",
                difficulty: "easy",
                targetedMuscles: ["Gastrocnemius (medial & lateral heads)"],
                description: "Calf raise with straight legs, maximally loading the gastrocnemius which crosses both the knee and ankle joints.",
                mechanics: "Straight knees stretch the gastrocnemius across the knee joint, placing it in a mechanically advantaged position for plantarflexion. The gastrocnemius produces more force than the soleus when the knee is extended.",
                equipment: [
                  { id: "machine", name: "Standing Calf Raise Machine" },
                  { id: "smith-machine", name: "Smith Machine" }
                ],
                warmup: { name: "Ankle Circles + Calf Stretch", sets: "1", reps: "10 circles + 15 sec stretch each", instructions: ["Mobilizes the ankle through full circumduction.", "Stretches the gastrocnemius for loaded plantarflexion.", "Increases blood flow to the Achilles tendon."] }
              },
              {
                id: "seated-calf-raise",
                name: "Seated Calf Raise",
                difficulty: "easy",
                targetedMuscles: ["Soleus"],
                description: "Calf raise with bent knees (seated), isolating the soleus by shortening the gastrocnemius across the knee.",
                mechanics: "Bent knees shorten the gastrocnemius, reducing its force production capacity. The soleus, which only crosses the ankle joint, becomes the primary plantarflexor in this position. The soleus is a slow-twitch dominant muscle that responds well to higher reps.",
                equipment: [
                  { id: "machine", name: "Seated Calf Raise Machine" }
                ],
                warmup: { name: "Seated Ankle Dorsiflexion", sets: "1", reps: "12", instructions: ["Warms the soleus in the seated position.", "Increases ankle ROM for full calf raise depth.", "Prepares the Achilles tendon for loaded flexion."] }
              }
            ]
          }
        ]
      },
      {
        id: "core-isolation",
        name: "Core Isolation",
        muscles: ["Rectus Abdominis", "Obliques", "Hip Flexors"],
        subcategories: [
          {
            id: "upper-rectus-abdominis",
            name: "Upper Rectus Abdominis",
            description: "Spinal flexion. Targets the upper portion of the rectus abdominis through trunk curling/crunching movements that flex the thoracic spine.",
            exercises: [
              {
                id: "cable-crunch",
                name: "Cable Crunch",
                difficulty: "medium",
                targetedMuscles: ["Upper Rectus Abdominis", "Obliques (isometric)"],
                description: "Kneeling cable crunch pulling the rope down while flexing the spine, providing constant tension through the full ROM.",
                mechanics: "The cable provides resistance that matches the spinal flexion pattern. Unlike bodyweight crunches that lose tension at the top, the cable maintains load throughout, with peak tension when the abs are most contracted.",
                equipment: [
                  { id: "cable", name: "Cable (Rope)" }
                ],
                warmup: { name: "Bodyweight Crunch", sets: "1", reps: "15", instructions: ["Activates the rectus abdominis through spinal flexion.", "Warms the core for loaded crunching.", "Establishes the spinal flexion pattern."] }
              },
              {
                id: "weighted-crunch",
                name: "Weighted Crunch (Decline)",
                difficulty: "easy",
                targetedMuscles: ["Upper Rectus Abdominis"],
                description: "Crunching on a decline bench while holding a weight plate or dumbbell, increasing resistance on the upper abs.",
                mechanics: "The decline angle increases the range of motion and gravitational resistance. Holding weight at the chest or behind the head increases the moment arm against spinal flexion, progressively overloading the upper rectus abdominis.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell / Plate" }
                ],
                warmup: { name: "Dead Bug", sets: "1", reps: "10 each side", instructions: ["Activates the deep core stabilizers.", "Warms the rectus abdominis for loaded flexion.", "Prepares the hip flexors as synergists."] }
              }
            ]
          },
          {
            id: "lower-rectus-hip-flexors",
            name: "Lower Rectus / Hip Flexors",
            description: "Pelvic tilt/leg raises. Targets the lower rectus abdominis through posterior pelvic tilt and the hip flexors through leg raising movements.",
            exercises: [
              {
                id: "hanging-leg-raise",
                name: "Hanging Leg Raise",
                difficulty: "hard",
                targetedMuscles: ["Lower Rectus Abdominis", "Hip Flexors", "Obliques"],
                description: "Hanging from a bar and raising the legs while curling the pelvis upward, loading the lower abs through pelvic tilt.",
                mechanics: "The hanging position allows full spinal extension at the bottom (abs lengthened). Raising the legs engages the hip flexors, but the key is the posterior pelvic tilt at the top which loads the lower rectus abdominis. Without the pelvic curl, this is primarily a hip flexor exercise.",
                equipment: [
                  { id: "bodyweight", name: "Pull-Up Bar" }
                ],
                warmup: { name: "Dead Hang + Knee Tuck", sets: "1", reps: "8", instructions: ["Decompresses the spine and stretches the abs.", "Activates the hip flexors for the raising pattern.", "Warms the grip for the hanging position."] }
              },
              {
                id: "reverse-crunch",
                name: "Reverse Crunch",
                difficulty: "easy",
                targetedMuscles: ["Lower Rectus Abdominis", "Transverse Abdominis"],
                description: "Lying on a bench or floor, curling the pelvis toward the ribcage by lifting the hips off the surface.",
                mechanics: "The reverse crunch isolates posterior pelvic tilt, which is the primary function of the lower rectus abdominis. By keeping the upper body fixed and moving the pelvis, the lower fibers are preferentially recruited.",
                equipment: [
                  { id: "bodyweight", name: "Bench / Floor" }
                ],
                warmup: { name: "Pelvic Tilt (Supine)", sets: "1", reps: "12", instructions: ["Activates the lower abs through pelvic tilt.", "Warms the lumbar spine for the reverse crunch.", "Establishes the pelvic curl movement pattern."] }
              }
            ]
          },
          {
            id: "obliques",
            name: "Obliques",
            description: "Rotation & lateral flexion. Targets the internal and external obliques through trunk rotation, lateral flexion, and anti-rotation movements.",
            exercises: [
              {
                id: "cable-woodchop",
                name: "Cable Woodchop",
                difficulty: "medium",
                targetedMuscles: ["Obliques (external & internal)", "Transverse Abdominis"],
                description: "Rotational cable movement from high-to-low or low-to-high, loading the obliques through trunk rotation against resistance.",
                mechanics: "The cable provides constant rotational resistance. The external oblique on the side rotating away and the internal oblique on the side rotating toward work together to produce trunk rotation. The transverse abdominis stabilizes the spine throughout.",
                equipment: [
                  { id: "cable", name: "Cable (D-Handle / Rope)" }
                ],
                angles: [
                  { id: "high-to-low", name: "High-to-Low", description: "Emphasizes the downward rotation pattern" },
                  { id: "low-to-high", name: "Low-to-High", description: "Emphasizes the upward rotation pattern" },
                  { id: "horizontal", name: "Horizontal (Pallof Press)", description: "Anti-rotation, isometric oblique loading" }
                ],
                warmup: { name: "Torso Rotation (Bodyweight)", sets: "1", reps: "10 each side", instructions: ["Mobilizes the thoracic spine for rotation.", "Warms the obliques through the rotational pattern.", "Prepares the core for loaded anti-rotation."] }
              },
              {
                id: "side-bend",
                name: "Weighted Side Bend",
                difficulty: "easy",
                targetedMuscles: ["Obliques (lateral flexion)", "Quadratus Lumborum"],
                description: "Standing lateral flexion with a weight in one hand, targeting the obliques through side bending against resistance.",
                mechanics: "Lateral flexion is a primary function of the obliques. Holding weight on one side creates a moment arm that the contralateral obliques must resist and then overcome to produce lateral flexion. The quadratus lumborum assists as a lateral flexor.",
                equipment: [
                  { id: "dumbbell", name: "Dumbbell" },
                  { id: "cable", name: "Cable" }
                ],
                warmup: { name: "Standing Side Stretch", sets: "1", reps: "10 each side", instructions: ["Stretches the obliques through lateral flexion.", "Warms the quadratus lumborum.", "Prepares the spine for loaded side bending."] }
              }
            ]
          }
        ]
      }
    ]
  }
];

export function getProgrammingParameters(category: CategoryType): ProgrammingParameters {
  if (category === "systemic") {
    return {
      sets: "2–4 sets",
      reps: "5–8 reps",
      frequency: "2x per week",
      rest: "2–3 minutes",
      intensity: "75–85% 1RM",
      rationale: "Heavy loading with lower volume to account for high systemic fatigue and CNS demand. Longer rest periods allow full neuromuscular recovery between sets."
    };
  }
  return {
    sets: "3–5 sets",
    reps: "10–20 reps",
    frequency: "3–4x per week",
    rest: "60–90 seconds",
    intensity: "60–70% 1RM",
    rationale: "Higher volume with moderate loads optimizes regional hypertrophy. Shorter rest periods maintain metabolic stress while low CNS fatigue allows greater training frequency."
  };
}

export function getDefaultSets(category: CategoryType): number {
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
