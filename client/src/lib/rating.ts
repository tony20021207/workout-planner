/**
 * Hypertrophy Matrix Rating — types & helpers.
 * Converts between RoutineItem and the LLM's optimized-routine format,
 * and serializes the current routine to a text the LLM can read.
 */
import type { RoutineItem } from "@/contexts/WorkoutContext";
import { type CategoryType, generateId } from "@/lib/data";

export interface BreakdownEntry {
  score: number;
  notes: string;
}

export interface SelectionBreakdown {
  stability: BreakdownEntry;
  stretch: BreakdownEntry;
  sfr: BreakdownEntry;
  angles: BreakdownEntry;
}

export interface VolumeBreakdown {
  reps: BreakdownEntry;
  sessionCaps: BreakdownEntry;
  frequency: BreakdownEntry;
  /** New 12.5-pt criterion: compound-vs-isolation ratio + RIR-mismatch penalties from user's self-report. */
  compoundIsolationIntensity: BreakdownEntry;
}

export interface CoverageCheck {
  hit: string[];
  missing: string[];
}

export interface OptimizedExercise {
  exercise: string;
  angle?: string;
  equipment?: string;
  sets: number;
  repRange: string;
  rir: string;
  frequency?: string;
  category: CategoryType;
  targetedMuscles: string[];
  jointActions: string[];
  rationale: string;
}

export interface RatingResult {
  score: number;
  verdict: string;
  selectionBreakdown: SelectionBreakdown;
  volumeBreakdown: VolumeBreakdown;
  coverage: CoverageCheck;
  /** Educational text on the user's RIR alignment with the targets. */
  intensityNote: string;
  /** Empty string if no pulldowns; otherwise the scap-depression cueing reminder. */
  scapularDepressionNote: string;
  optimizedRoutine: OptimizedExercise[];
}

/**
 * Convert the user's current routine into a plaintext description for the LLM.
 */
export function serializeRoutineToText(routine: RoutineItem[]): string {
  if (routine.length === 0) return "(empty routine)";
  const lines: string[] = [];
  lines.push(`Total exercises: ${routine.length}`);
  lines.push("");
  routine.forEach((item, idx) => {
    const name = item.angle && !item.exercise.toLowerCase().includes(item.angle.toLowerCase())
      ? `${item.angle} ${item.exercise}`
      : item.exercise;
    lines.push(`${idx + 1}. ${name}`);
    lines.push(`   Joint function / pattern: ${item.jointFunction}`);
    lines.push(`   Category: ${item.category === "systemic" ? "Tier 1 Systemic / Multi-joint" : "Tier 2 Regional / Single-joint"}`);
    lines.push(`   Targeted muscles: ${item.targetedMuscles.join(", ")}`);
    if (item.equipment) lines.push(`   Equipment: ${item.equipment}`);
    if (item.angle) lines.push(`   Angle: ${item.angle}`);
    lines.push(`   Sets (${item.sets.length}): ${item.sets.map((s, i) => `S${i + 1} ${s.reps}reps@${s.weight}lbs`).join(" | ")}`);
    lines.push(`   Frequency: ${item.parameters.frequency}  Rest: ${item.parameters.rest}  Intensity: ${item.parameters.intensity}`);
    lines.push(`   Difficulty: ${item.difficulty}`);
    lines.push("");
  });
  return lines.join("\n");
}

/**
 * Convert an LLM-suggested OptimizedExercise into a RoutineItem ready for the routine.
 */
export function optimizedToRoutineItem(opt: OptimizedExercise): RoutineItem {
  const repsMatch = opt.repRange.match(/(\d+)/);
  const defaultReps = repsMatch ? parseInt(repsMatch[1], 10) : 10;
  const sets = Array.from({ length: Math.max(1, opt.sets) }, () => ({
    reps: defaultReps,
    weight: 0,
  }));

  const exerciseName = opt.angle && !opt.exercise.toLowerCase().includes(opt.angle.toLowerCase())
    ? `${opt.angle} ${opt.exercise}`
    : opt.exercise;

  return {
    id: generateId(),
    exercise: exerciseName,
    jointFunction: opt.targetedMuscles[0] || "Custom",
    category: opt.category,
    parameters: {
      sets: `${opt.sets} sets`,
      reps: `${opt.repRange} reps`,
      frequency: opt.frequency || "2x per week",
      rest: opt.category === "systemic" ? "2–3 minutes" : "60–90 seconds",
      intensity: opt.rir,
      rationale: opt.rationale,
    },
    sets,
    difficulty: "medium",
    targetedMuscles: opt.targetedMuscles,
    equipment: opt.equipment,
    angle: opt.angle,
    warmup: {
      name: "General activation",
      sets: "1",
      reps: "8–10",
      instructions: [
        "5 minutes light cardio to raise core temperature.",
        "Dynamic stretching for the target muscles.",
        "1–2 ramp-up sets at lighter loads before working sets.",
      ],
    },
  };
}
