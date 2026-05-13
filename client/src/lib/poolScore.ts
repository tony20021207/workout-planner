/**
 * Local deterministic pool-rating scorer — Phase 1 of the rule-based
 * scoring migration. Same routine + same favorites = same score, every
 * time. The LLM still writes coaching prose + swap suggestions, but
 * the 100-pt number is computed here.
 *
 * Five criteria × 20 pts = 100 base. Plus minor bonus (+0 to +1.5)
 * tracked separately. Favorite bias (-5 to +5) is folded INTO the 100
 * via the final clamp.
 *
 * Inputs (all read off the catalog by exercise name):
 *   stability     — exercise.stability        very-high/high/medium/low
 *   stretchLevel  — exercise.stretchLevel     very-high/high/moderate
 *   sfr           — exercise.sfr              high/medium/low
 *   category      — RoutineItem.category      systemic/regional
 *   jointActions  — exercise.jointActions     canonical action names
 *
 * If a routine item's exercise name isn't in the catalog (custom adds
 * or LLM-suggested swaps), we degrade gracefully to medium / moderate
 * defaults so the score doesn't crash.
 */
import { categories, type Exercise } from "./data";
import type { RoutineItem } from "@/contexts/WorkoutContext";
import type { ExperienceId } from "./experience";

// ============================================================
// JOINT-ACTION TAXONOMY
// ============================================================

/** 22 major movers — collectively 20 pts (~0.909 each, half ~0.4545). */
const MAJOR_ACTIONS = [
  "Shoulder Flexors",
  "Shoulder Extensors",
  "Shoulder Abductors",
  "Shoulder Adductors",
  "Shoulder Horizontal Abductors",
  "Shoulder Horizontal Adductors",
  "Shoulder External Rotators",
  "Scapular Retractors",
  "Scapular Protractors",
  "Scapular Depressors",
  "Scapular Upward Rotators",
  "Scapular Downward Rotators",
  "Elbow Flexors",
  "Elbow Extensors",
  "Spinal Flexors",
  "Spinal Extensors",
  "Hip Extensors",
  "Hip Abductors",
  "Hip Adductors",
  "Knee Extensors",
  "Knee Flexors",
  "Ankle Plantarflexors",
] as const;

/** 5 minor / stabilizer actions — bonus pool only (+0.30 each, +1.5 max). */
const MINOR_ACTIONS = [
  "Scapular Elevators",
  "Spinal Rotators & Lateral Flexors",
  "Hip Flexors",
  "Hip External Rotators",
  "Hip Internal Rotators",
] as const;

const MAJOR_SET = new Set<string>(MAJOR_ACTIONS);

// ============================================================
// CATALOG LOOKUP (name → Exercise)
// ============================================================

let _byName: Map<string, Exercise> | null = null;
function exerciseByName(name: string): Exercise | null {
  if (!_byName) {
    _byName = new Map();
    for (const c of categories) {
      for (const jf of c.jointFunctions) {
        for (const sub of jf.subcategories) {
          for (const ex of sub.exercises) {
            _byName.set(ex.name, ex);
          }
        }
      }
    }
  }
  return _byName.get(name) ?? null;
}

// ============================================================
// TAG → NUMERIC VALUE MAPS
// ============================================================

const STABILITY_VALUE: Record<string, number> = {
  "very-high": 4,
  "high": 3,
  "medium": 2,
  "low": 1,
};
const STRETCH_WEIGHT: Record<string, number> = {
  "very-high": 1.5,
  "high": 1.0,
  "moderate": 0.5,
};
const SFR_VALUE: Record<string, number> = {
  "high": 3,
  "medium": 2,
  "low": 1,
};

// ============================================================
// EXPERIENCE-LEVEL MODULATION
// ============================================================
//
// Three of the five criteria are scored differently per experience
// level (the other two — Deep Stretch and Major Coverage — are
// universally good for hypertrophy regardless of training age).
//
//   SFR penalty       × 1.20 beginner / × 1.10 FID / × 1.00 experienced
//   Stability penalty × 1.20 beginner / × 1.10 FID / × 1.00 experienced
//   Compound/Iso band shifted: 15-35% / 20-45% / 25-50%
//
// EXPERIENCED IS THE BASELINE (multiplier = 1.00). They have the
// technique + recovery capacity to handle any pick, so the system
// applies penalties at face value. FID lifters pay 10% more on top
// for low-SFR / low-stability picks (still learning to recover);
// beginners pay 20% more (still building technique to push safely).
//
// Stretch + coverage are NOT modulated: lengthened-position loading
// helps everyone equally, and hitting the major movers matters
// regardless of experience.

const PENALTY_MULTIPLIER: Record<ExperienceId, number> = {
  beginner: 1.20,
  "foot-in-door": 1.10,
  experienced: 1.00,
};

interface CompoundBand {
  lo: number;
  hi: number;
}
const COMPOUND_BAND: Record<ExperienceId, CompoundBand> = {
  beginner: { lo: 0.15, hi: 0.35 },
  "foot-in-door": { lo: 0.20, hi: 0.45 },
  experienced: { lo: 0.25, hi: 0.50 },
};

/** Default experience when none is provided — falls back to baseline (FID). */
const DEFAULT_EXPERIENCE: ExperienceId = "foot-in-door";

function getMultiplier(experience: ExperienceId | null | undefined): number {
  return PENALTY_MULTIPLIER[experience ?? DEFAULT_EXPERIENCE] ?? 1.0;
}
function getCompoundBand(experience: ExperienceId | null | undefined): CompoundBand {
  return COMPOUND_BAND[experience ?? DEFAULT_EXPERIENCE] ?? COMPOUND_BAND[DEFAULT_EXPERIENCE];
}

// ============================================================
// CRITERION SCORERS
// ============================================================

/**
 * Stability — weighted average of pick stability, mapped to 0-20 with
 * a floor of 4 (matches the prompt's "no stable picks should score 4-8"
 * lower bound). All very-high = 20, all low = 4, mixed proportional.
 *
 * Experience-modulated: the gap below full credit (20 − baseline) is
 * multiplied by the experience penalty multiplier. Beginners absorb
 * a steeper penalty for unstable picks; experienced lifters less.
 */
function scoreStability(routine: RoutineItem[], experience: ExperienceId | null | undefined): number {
  if (routine.length === 0) return 0;
  let sum = 0;
  for (const item of routine) {
    const ex = exerciseByName(item.exercise);
    sum += STABILITY_VALUE[ex?.stability ?? "medium"] ?? 2;
  }
  const avg = sum / routine.length;
  // avg 1 → 4, avg 4 → 20 (linear). Baseline before experience scaling.
  const baseline = clamp(((avg - 1) / 3) * 16 + 4, 0, 20);
  const M = getMultiplier(experience);
  const penalty = (20 - baseline) * M;
  return clamp(20 - penalty, 0, 20);
}

/**
 * Deep Stretch — weighted average of pick stretch tier × 20 / 1.5.
 * Matches the prompt's normalization: all very-high = 20, all high ≈ 14,
 * all moderate ≈ 7.
 */
function scoreStretch(routine: RoutineItem[]): number {
  if (routine.length === 0) return 0;
  let sum = 0;
  for (const item of routine) {
    const ex = exerciseByName(item.exercise);
    sum += STRETCH_WEIGHT[ex?.stretchLevel ?? "moderate"] ?? 0.5;
  }
  const avg = sum / routine.length;
  // avg 0.5 → 6.67, avg 1.0 → 13.33, avg 1.5 → 20.
  return clamp((avg / 1.5) * 20, 0, 20);
}

/**
 * SFR — weighted average of pick stimulus-to-fatigue rating, mapped to
 * 0-20 with floor of 4. All high = 20, all medium = 12, all low = 4.
 *
 * Experience-modulated: same penalty multiplier as Stability. Beginners
 * pay more for low-SFR CNS-heavy picks; experienced lifters less.
 */
function scoreSFR(routine: RoutineItem[], experience: ExperienceId | null | undefined): number {
  if (routine.length === 0) return 0;
  let sum = 0;
  for (const item of routine) {
    const ex = exerciseByName(item.exercise);
    sum += SFR_VALUE[ex?.sfr ?? "medium"] ?? 2;
  }
  const avg = sum / routine.length;
  // avg 1 → 4, avg 2 → 12, avg 3 → 20 (linear). Baseline before scaling.
  const baseline = clamp(((avg - 1) / 2) * 16 + 4, 0, 20);
  const M = getMultiplier(experience);
  const penalty = (20 - baseline) * M;
  return clamp(20 - penalty, 0, 20);
}

/**
 * Compound vs Isolation Ratio. Full credit (20) inside the experience-
 * specific band; penalty grows linearly outside the band per the
 * prompt's curve.
 *
 *   Beginner band:     15–35%   (less compound — lower CNS load)
 *   Foot-in-Door band: 20–45%   (baseline)
 *   Experienced band:  25–50%   (more compound capacity)
 *
 * Returns the score and the actual compound percentage.
 */
function scoreCompoundIsoRatio(
  routine: RoutineItem[],
  experience: ExperienceId | null | undefined,
): { score: number; pct: number } {
  if (routine.length === 0) return { score: 0, pct: 0 };
  const compounds = routine.filter((r) => r.category === "systemic").length;
  const pct = compounds / routine.length;
  const band = getCompoundBand(experience);
  let score: number;
  if (pct >= band.lo && pct <= band.hi) {
    score = 20;
  } else if (pct < band.lo) {
    const deficit = band.lo - pct;
    score = Math.max(0, 20 - deficit * 90);
  } else {
    const excess = pct - band.hi;
    score = Math.max(0, 20 - excess * 36);
  }
  return { score, pct };
}

interface CoverageResult {
  score: number;
  hit: string[]; // covered 2+ (full credit)
  half: string[]; // covered exactly 1 (half credit)
  missing: string[]; // covered 0
}

/**
 * Joint-action coverage — count how many exercises in the pool emit
 * each action; map 2+ to full credit, 1 to half, 0 to nothing. Used for
 * both the 20-pt MAJOR coverage and the 1.5-pt MINOR bonus by varying
 * actions[] and totalPoints.
 */
function scoreCoverage(
  routine: RoutineItem[],
  actions: readonly string[],
  totalPoints: number,
): CoverageResult {
  const counts = new Map<string, number>();
  for (const item of routine) {
    const ex = exerciseByName(item.exercise);
    if (!ex) continue;
    for (const action of ex.jointActions) {
      counts.set(action, (counts.get(action) ?? 0) + 1);
    }
  }
  const perActionFull = totalPoints / actions.length;
  let score = 0;
  const hit: string[] = [];
  const half: string[] = [];
  const missing: string[] = [];
  for (const action of actions) {
    const c = counts.get(action) ?? 0;
    if (c >= 2) {
      score += perActionFull;
      hit.push(action);
    } else if (c === 1) {
      score += perActionFull / 2;
      half.push(action);
    } else {
      missing.push(action);
    }
  }
  return { score, hit, half, missing };
}

/**
 * Favorite bias (-5 to +5). Rule-based classification:
 *   GOOD favorite — the favorite is the ONLY source of at least one
 *                   MAJOR joint action (removing it would drop that
 *                   action to 0 / no coverage). +1 each.
 *   BAD favorite  — every MAJOR action the favorite provides is
 *                   already covered 2+ times by OTHER picks (i.e.,
 *                   action count ≥ 3 with this favorite included).
 *                   The slot is redundant. −1 each.
 *   NEUTRAL       — somewhere in between. 0.
 *
 * Net delta clamped to [-5, +5].
 */
function scoreFavorites(
  routine: RoutineItem[],
  favoriteIds: string[],
): { delta: number; good: string[]; bad: string[] } {
  if (favoriteIds.length === 0) return { delta: 0, good: [], bad: [] };

  // Build action counts across the full routine (including favorites).
  const counts = new Map<string, number>();
  for (const item of routine) {
    const ex = exerciseByName(item.exercise);
    if (!ex) continue;
    for (const a of ex.jointActions) {
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
  }

  const good: string[] = [];
  const bad: string[] = [];
  for (const favId of favoriteIds) {
    const item = routine.find((r) => r.id === favId);
    if (!item) continue;
    const ex = exerciseByName(item.exercise);
    if (!ex) continue;

    const majorActions = ex.jointActions.filter((a) => MAJOR_SET.has(a));
    if (majorActions.length === 0) continue;

    // Critical = unique source of at least one major (count is exactly
    // 1 for this favorite's action across the whole routine).
    const isCritical = majorActions.some((a) => (counts.get(a) ?? 0) === 1);
    // Redundant = every major action this favorite provides has ≥ 3
    // total coverage (≥ 2 from OTHER picks even after subtracting this
    // favorite's contribution).
    const isRedundant = majorActions.every((a) => (counts.get(a) ?? 0) >= 3);

    if (isCritical) good.push(item.exercise);
    else if (isRedundant) bad.push(item.exercise);
  }

  const delta = clamp(good.length - bad.length, -5, 5);
  return { delta, good, bad };
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

export interface PoolScore {
  /** Final 0-100 score: sum of criteria + favoriteBias, clamped. */
  total: number;

  /** Sum of the 5 criteria BEFORE favorite-bias is applied. */
  criteriaTotal: number;

  // 5 criteria (each 0-20)
  stability: number;
  stretch: number;
  sfr: number;
  compoundIsoRatio: number;
  coverage: number;

  /** Compound percentage (0-1), useful for displaying alongside the score. */
  compoundPct: number;

  // Coverage detail
  coverageHit: string[];
  coverageHalf: string[];
  coverageMissing: string[];

  // Minor bonus (0 to 1.5, separate from the 100)
  minorBonus: number;
  minorHit: string[];
  minorHalf: string[];
  minorMissing: string[];

  // Favorite bias (-5 to +5, folded INTO the 100)
  favoriteBias: number;
  favoriteGood: string[]; // exercise names
  favoriteBad: string[]; // exercise names
}

/**
 * Score a routine pool. Pure function — same routine + favorites +
 * experience always produces the same score. If experience is
 * null/undefined, falls back to the foot-in-door baseline (no
 * modulation on the SFR / Stability / Compound-Iso criteria).
 */
export function scorePool(
  routine: RoutineItem[],
  favoriteIds: string[],
  experience: ExperienceId | null | undefined,
): PoolScore {
  const stability = scoreStability(routine, experience);
  const stretch = scoreStretch(routine);
  const sfr = scoreSFR(routine, experience);
  const cir = scoreCompoundIsoRatio(routine, experience);
  const cov = scoreCoverage(routine, MAJOR_ACTIONS, 20);
  const minor = scoreCoverage(routine, MINOR_ACTIONS, 1.5);
  const fav = scoreFavorites(routine, favoriteIds);

  const criteriaTotal = stability + stretch + sfr + cir.score + cov.score;
  const total = clamp(criteriaTotal + fav.delta, 0, 100);

  return {
    total,
    criteriaTotal,
    stability,
    stretch,
    sfr,
    compoundIsoRatio: cir.score,
    coverage: cov.score,
    compoundPct: cir.pct,
    coverageHit: cov.hit,
    coverageHalf: cov.half,
    coverageMissing: cov.missing,
    minorBonus: minor.score,
    minorHit: minor.hit,
    minorHalf: minor.half,
    minorMissing: minor.missing,
    favoriteBias: fav.delta,
    favoriteGood: fav.good,
    favoriteBad: fav.bad,
  };
}

// ============================================================
// HELPERS
// ============================================================

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
