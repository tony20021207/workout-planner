import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  type CategoryType,
  type Difficulty,
  type WarmupInfo,
  type ProgrammingParameters,
  getProgrammingParameters,
  generateId,
  getDefaultSets,
  getDefaultReps,
} from "@/lib/data";

export interface SetDetail {
  reps: number;
  weight: number;
}

/**
 * User's self-reported reps-in-reserve at the last rep of a working set,
 * **on the explicit premise that movement quality stays consistent** (no
 * body english, no shortened ROM, no tempo cheating).
 *
 * Nippard's "million-dollar test": if someone offered you $1M to do one
 * more clean rep — same form, same ROM, same tempo — could you?
 *
 * Targets per Nippard / Israetel: compound = 1-2 RIR, isolation = 0 RIR.
 */
export type RIRChoice = "0" | "1-2" | "3+";

export interface EffortCalibration {
  compoundRIR: RIRChoice;
  isolationRIR: RIRChoice;
}

const DEFAULT_EFFORT: EffortCalibration = {
  compoundRIR: "1-2",
  isolationRIR: "0",
};

export interface RoutineItem {
  id: string;
  exercise: string;
  jointFunction: string;
  category: CategoryType;
  parameters: ProgrammingParameters;
  sets: SetDetail[];
  difficulty: Difficulty;
  targetedMuscles: string[];
  equipment?: string;
  angle?: string;
  warmup: WarmupInfo;
}

interface AddExerciseParams {
  exercise: string;
  jointFunction: string;
  category: CategoryType;
  difficulty: Difficulty;
  targetedMuscles: string[];
  equipment?: string;
  angle?: string;
  warmup: WarmupInfo;
  numSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
}

interface WorkoutContextType {
  routine: RoutineItem[];
  addToRoutine: (params: AddExerciseParams) => void;
  addRoutineItem: (item: RoutineItem) => void;
  removeFromRoutine: (id: string) => void;
  clearRoutine: () => void;
  replaceRoutine: (items: RoutineItem[]) => void;
  updateRoutineItem: (id: string, updates: Partial<RoutineItem>) => void;
  totalWeeklySets: number;
  effort: EffortCalibration;
  setEffort: (effort: EffortCalibration) => void;
}

const STORAGE_KEY = "kinesiology_routine";
const EFFORT_STORAGE_KEY = "kinesiology_effort";

function loadRoutineFromStorage(): RoutineItem[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveRoutineToStorage(routine: RoutineItem[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(routine));
  } catch {
    // ignore storage errors
  }
}

function loadEffortFromStorage(): EffortCalibration {
  try {
    const stored = sessionStorage.getItem(EFFORT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.compoundRIR && parsed?.isolationRIR) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_EFFORT;
}

function saveEffortToStorage(effort: EffortCalibration) {
  try {
    sessionStorage.setItem(EFFORT_STORAGE_KEY, JSON.stringify(effort));
  } catch {
    // ignore
  }
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [routine, setRoutine] = useState<RoutineItem[]>(() => loadRoutineFromStorage());
  const [effort, setEffortState] = useState<EffortCalibration>(() => loadEffortFromStorage());

  // Persist routine to sessionStorage on every change
  useEffect(() => {
    saveRoutineToStorage(routine);
  }, [routine]);

  // Persist effort calibration on every change
  useEffect(() => {
    saveEffortToStorage(effort);
  }, [effort]);

  const setEffort = useCallback((next: EffortCalibration) => {
    setEffortState(next);
  }, []);

  const addToRoutine = useCallback((params: AddExerciseParams) => {
    const parameters = getProgrammingParameters(params.category);
    const numSets = params.numSets ?? getDefaultSets(params.category);
    const defaultReps = params.defaultReps ?? getDefaultReps(params.category);
    const defaultWeight = params.defaultWeight ?? 0;

    const sets: SetDetail[] = Array.from({ length: numSets }, () => ({
      reps: defaultReps,
      weight: defaultWeight,
    }));

    const newItem: RoutineItem = {
      id: generateId(),
      exercise: params.exercise,
      jointFunction: params.jointFunction,
      category: params.category,
      parameters,
      sets,
      difficulty: params.difficulty,
      targetedMuscles: params.targetedMuscles,
      equipment: params.equipment,
      angle: params.angle,
      warmup: params.warmup,
    };
    setRoutine((prev) => [...prev, newItem]);
  }, []);

  const addRoutineItem = useCallback((item: RoutineItem) => {
    setRoutine((prev) => [...prev, item]);
  }, []);

  const removeFromRoutine = useCallback((id: string) => {
    setRoutine((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearRoutine = useCallback(() => {
    setRoutine([]);
  }, []);

  const replaceRoutine = useCallback((items: RoutineItem[]) => {
    setRoutine(items);
  }, []);

  const updateRoutineItem = useCallback((id: string, updates: Partial<RoutineItem>) => {
    setRoutine((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const totalWeeklySets = routine.reduce((total, item) => {
    const freqMatch = item.parameters.frequency.match(/(\d+)/);
    const freq = freqMatch ? parseInt(freqMatch[1]) : 1;
    return total + item.sets.length * freq;
  }, 0);

  return (
    <WorkoutContext.Provider
      value={{
        routine,
        addToRoutine,
        addRoutineItem,
        removeFromRoutine,
        clearRoutine,
        replaceRoutine,
        updateRoutineItem,
        totalWeeklySets,
        effort,
        setEffort,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }
  return context;
}
