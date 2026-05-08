/**
 * Brief notes that explain how each equipment variant differs in terms of
 * tension curve, stretch profile, stability, and stabilizer recruitment.
 *
 * The shared muscle engagement is identical across an exercise's equipment
 * toggle (otherwise the variants would be separate exercises). These notes
 * cover the secondary factors that don't change which muscles are hit —
 * just *how* they're hit.
 */
import type { EquipmentOption } from "@/lib/data";

type EquipmentKind =
  | "barbell"
  | "dumbbell"
  | "smith"
  | "cable"
  | "machine"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "trx"
  | "ez-bar"
  | "ssb"
  | "trap-bar"
  | "cambered"
  | "landmine"
  | "tbar"
  | "rope"
  | "v-bar"
  | "straight-bar"
  | "wide-grip"
  | "neutral-grip"
  | "underhand"
  | "single-arm"
  | "weighted"
  | "assisted"
  | "ghd"
  | "decline"
  | "ball"
  | "wheel"
  | "preacher"
  | "default";

const NOTE_BY_KIND: Record<EquipmentKind, string> = {
  barbell:
    "Heaviest load potential; bilateral fixed grip. Top-heavy tension curve (easier near lockout).",
  dumbbell:
    "Independent loading allows deeper bottom stretch and recruits more stabilizers. Bottom-heavy tension curve.",
  smith:
    "Fixed bar path = maximum stability with minimal stabilizer demand. Easier to push close to failure than free weights.",
  cable:
    "Constant tension across the entire ROM, especially in the stretched position where free weights lose load.",
  machine:
    "Cam-corrected resistance and high stability. Safest variant to push to or near failure.",
  bodyweight:
    "No external load; progress via tempo, ROM, eccentric emphasis, or extra rep volume.",
  kettlebell:
    "Off-center load increases grip and stabilizer demand vs a dumbbell.",
  band:
    "Ascending resistance — easy at the bottom, hardest at lockout. Pairs well with strength-curve-matched lifts.",
  trx: "Bodyweight with an adjustable lean angle. High stabilizer recruitment.",
  "ez-bar":
    "Angled grip reduces wrist strain vs a straight bar; load and stability otherwise like a barbell.",
  ssb: "Safety squat bar shifts the load forward and allows a more upright torso vs a high-bar back squat.",
  "trap-bar":
    "Neutral handles and centered load shift demand toward the quads and reduce lumbar shear vs a conventional deadlift.",
  cambered:
    "Cambered bar lets the chest drop deeper at the bottom — more stretch than a standard barbell.",
  landmine:
    "Anchored bar pivots in an arc. Natural for isolateral pulling and reduced lower-back load on rows.",
  tbar: "T-bar setup gives a chest-supported or angled pull line with smooth resistance.",
  rope:
    "Rope handle lets the wrists rotate at the end range — biases peak contraction over deep stretch.",
  "v-bar":
    "V-bar / straight-bar pressdown keeps elbows in a stretched path; better for the long head than rope.",
  "straight-bar":
    "Straight bar fixes wrist alignment; good for adding load with predictable mechanics.",
  "wide-grip":
    "Wide grip lengthens the lat moment arm and biases lat width.",
  "neutral-grip":
    "Palms-facing grip is shoulder-friendly and shifts a small share of work to the elbow flexors.",
  underhand:
    "Supinated grip recruits the biceps more heavily and opens the elbow for greater flexion ROM.",
  "single-arm":
    "Unilateral loading allows full ROM per side and addresses left-right imbalances.",
  weighted:
    "Add load via belt, vest, or held DB to push the bodyweight movement past the easy progression band.",
  assisted:
    "Use band or machine assistance when bodyweight is too hard to hit the working rep range.",
  ghd: "Glute-ham developer — more posterior chain involvement than a 45° bench, but harder to load.",
  decline:
    "Decline bench biases the lower fibers and shortens the bottom range vs a flat or incline bench.",
  ball: "Stability ball reduces base of support and increases stabilizer demand significantly.",
  wheel:
    "Ab wheel enforces a long anti-extension lever. Hard to progress without lengthening the arc.",
  preacher:
    "Preacher pad locks the elbow forward, removing cheating and creating a near-perfect biceps force curve.",
  default:
    "Same engagement as the other options on this exercise; choose based on availability and personal feel.",
};

const KIND_PATTERNS: Array<{ pattern: RegExp; kind: EquipmentKind }> = [
  // Specific implements first (more specific wins)
  { pattern: /cambered/i, kind: "cambered" },
  { pattern: /\bssb|safety squat\b/i, kind: "ssb" },
  { pattern: /trap[\s-]?bar|hex[\s-]?bar/i, kind: "trap-bar" },
  { pattern: /ez[\s-]?bar/i, kind: "ez-bar" },
  { pattern: /landmine/i, kind: "landmine" },
  { pattern: /t[\s-]?bar/i, kind: "tbar" },
  { pattern: /smith/i, kind: "smith" },
  { pattern: /preacher/i, kind: "preacher" },
  { pattern: /ghd|glute[\s-]?ham/i, kind: "ghd" },
  { pattern: /stability ball|swiss ball/i, kind: "ball" },
  { pattern: /ab wheel|wheel/i, kind: "wheel" },
  { pattern: /trx|suspension/i, kind: "trx" },
  { pattern: /kettlebell|\bkb\b/i, kind: "kettlebell" },
  { pattern: /\bband\b/i, kind: "band" },
  // Cable handle types
  { pattern: /\brope\b/i, kind: "rope" },
  { pattern: /v[\s-]?bar/i, kind: "v-bar" },
  { pattern: /straight bar/i, kind: "straight-bar" },
  // Grip / setup descriptors
  { pattern: /wide[\s-]?grip/i, kind: "wide-grip" },
  { pattern: /neutral[\s-]?grip/i, kind: "neutral-grip" },
  { pattern: /underhand|chin/i, kind: "underhand" },
  { pattern: /single[\s-]?arm|one[\s-]?arm/i, kind: "single-arm" },
  { pattern: /weighted/i, kind: "weighted" },
  { pattern: /assisted/i, kind: "assisted" },
  { pattern: /decline/i, kind: "decline" },
  // Generic implement classes (lower priority)
  { pattern: /barbell|\bbb\b/i, kind: "barbell" },
  { pattern: /dumbbell|\bdb\b/i, kind: "dumbbell" },
  { pattern: /cable/i, kind: "cable" },
  { pattern: /machine|selectorized|plate[\s-]?loaded|pec deck|pendulum|hack/i, kind: "machine" },
  { pattern: /bodyweight|\bbw\b/i, kind: "bodyweight" },
];

export function inferEquipmentKind(option: EquipmentOption): EquipmentKind {
  const haystack = `${option.name} ${option.id}`;
  for (const { pattern, kind } of KIND_PATTERNS) {
    if (pattern.test(haystack)) return kind;
  }
  return "default";
}

export function getEquipmentNote(option: EquipmentOption): string {
  return NOTE_BY_KIND[inferEquipmentKind(option)];
}
