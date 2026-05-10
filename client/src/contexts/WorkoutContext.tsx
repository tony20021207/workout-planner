import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  type CategoryType,
  type Difficulty,
  type ProgrammingParameters,
  type StretchLevel,
  type StimulusLevel,
  getProgrammingParameters,
  generateId,
} from "@/lib/data";
import { type LifestyleId } from "@/lib/lifestyle";
import { type ExperienceId } from "@/lib/experience";

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
  /**
   * Resolved biomechanical tags (after equipment + angle overrides).
   * Smart Fill reads these to bucket the exercise into Low / Medium /
   * High rep ranges. Optional so legacy session-storage rows still load.
   */
  stretchLevel?: StretchLevel;
  stability?: StimulusLevel;
}

interface AddExerciseParams {
  exercise: string;
  jointFunction: string;
  category: CategoryType;
  difficulty: Difficulty;
  targetedMuscles: string[];
  equipment?: string;
  angle?: string;
  numSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  /** Resolved tags from the source exercise + applied overrides. */
  stretchLevel?: StretchLevel;
  stability?: StimulusLevel;
}

/**
 * Selected split (one of the presets or "custom") plus the day-by-day
 * exercise assignments. Persisted independently so it can be cleared
 * without losing the pool, and vice versa.
 */
export type SplitId = "fb3" | "ul4" | "ppl6" | "custom";

export interface SplitState {
  splitId: SplitId | null;
  /** dayId -> ordered exerciseId[] from the routine. */
  dayAssignments: Record<string, string[]>;
}

const DEFAULT_SPLIT: SplitState = {
  splitId: null,
  dayAssignments: {},
};

export interface SessionWarmup {
  name: string;
  durationSeconds: number;
  instructions: string[];
  lifestyleCue: string;
}

/** Map dayId -> 3 warmups for that day. */
export type SessionWarmupsByDay = Record<string, SessionWarmup[]>;

/** Maximum favorited exercises a user can mark. */
export const MAX_FAVORITES = 4;

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
  /**
   * Up to MAX_FAVORITES exercise ids the user has marked as favorites.
   * Favorites become signals for two systems:
   *   - The auto-allocator anchors them so they always land in the
   *     split (never get dropped when balancing days).
   *   - The 2-week variant swap engine (P9.3) detects regional bias
   *     from the favorite set and counter-programs week 2 to fix
   *     under-trained sub-regions.
   */
  favorites: string[];
  toggleFavorite: (routineItemId: string) => void;
  isFavorite: (routineItemId: string) => boolean;
  split: SplitState;
  setSplit: (state: SplitState) => void;
  clearSplit: () => void;
  lifestyle: LifestyleId | null;
  setLifestyle: (id: LifestyleId | null) => void;
  experience: ExperienceId | null;
  setExperience: (id: ExperienceId | null) => void;
  sessionWarmups: SessionWarmupsByDay | null;
  setSessionWarmups: (warmups: SessionWarmupsByDay | null) => void;
  /**
   * Whether the current routine + split + sets-reps was produced solely by
   * auto-allocate + auto-recommend with no user edits afterward. When true,
   * we treat the plan as "perfect" and hide the post-split Rate button.
   * Any manual edit (move exercise, change set count, change reps, etc.)
   * flips this to false.
   */
  autoPlanUntouched: boolean;
  markAutoPlanFresh: () => void;
  markAutoPlanModified: () => void;
}

const STORAGE_KEY = "kinesiology_routine";
const EFFORT_STORAGE_KEY = "kinesiology_effort";
const SPLIT_STORAGE_KEY = "kinesiology_split";
const LIFESTYLE_STORAGE_KEY = "kinesiology_lifestyle";
const EXPERIENCE_STORAGE_KEY = "kinesiology_experience";
const WARMUPS_STORAGE_KEY = "kinesiology_session_warmups";
const AUTO_PLAN_STORAGE_KEY = "kinesiology_auto_plan_untouched";
const FAVORITES_STORAGE_KEY = "kinesiology_favorites";

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

function loadSplitFromStorage(): SplitState {
  try {
    const stored = sessionStorage.getItem(SPLIT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.dayAssignments) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_SPLIT;
}

function saveSplitToStorage(split: SplitState) {
  try {
    sessionStorage.setItem(SPLIT_STORAGE_KEY, JSON.stringify(split));
  } catch {
    // ignore
  }
}

function loadLifestyleFromStorage(): LifestyleId | null {
  try {
    const stored = sessionStorage.getItem(LIFESTYLE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === "string") return parsed as LifestyleId;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveLifestyleToStorage(id: LifestyleId | null) {
  try {
    if (id) {
      sessionStorage.setItem(LIFESTYLE_STORAGE_KEY, JSON.stringify(id));
    } else {
      sessionStorage.removeItem(LIFESTYLE_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function loadWarmupsFromStorage(): SessionWarmupsByDay | null {
  try {
    const stored = sessionStorage.getItem(WARMUPS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") return parsed as SessionWarmupsByDay;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveWarmupsToStorage(warmups: SessionWarmupsByDay | null) {
  try {
    if (warmups) {
      sessionStorage.setItem(WARMUPS_STORAGE_KEY, JSON.stringify(warmups));
    } else {
      sessionStorage.removeItem(WARMUPS_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function loadExperienceFromStorage(): ExperienceId | null {
  try {
    const stored = sessionStorage.getItem(EXPERIENCE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === "string") return parsed as ExperienceId;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveExperienceToStorage(id: ExperienceId | null) {
  try {
    if (id) {
      sessionStorage.setItem(EXPERIENCE_STORAGE_KEY, JSON.stringify(id));
    } else {
      sessionStorage.removeItem(EXPERIENCE_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function loadAutoPlanFromStorage(): boolean {
  try {
    const stored = sessionStorage.getItem(AUTO_PLAN_STORAGE_KEY);
    if (stored === "true") return true;
  } catch {
    // ignore
  }
  return false;
}

function saveAutoPlanToStorage(value: boolean) {
  try {
    sessionStorage.setItem(AUTO_PLAN_STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
}

function loadFavoritesFromStorage(): string[] {
  try {
    const stored = sessionStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // ignore
  }
  return [];
}

function saveFavoritesToStorage(favorites: string[]) {
  try {
    sessionStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // ignore
  }
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [routine, setRoutine] = useState<RoutineItem[]>(() => loadRoutineFromStorage());
  const [effort, setEffortState] = useState<EffortCalibration>(() => loadEffortFromStorage());
  const [split, setSplitState] = useState<SplitState>(() => loadSplitFromStorage());
  const [lifestyle, setLifestyleState] = useState<LifestyleId | null>(() => loadLifestyleFromStorage());
  const [experience, setExperienceState] = useState<ExperienceId | null>(() => loadExperienceFromStorage());
  const [sessionWarmups, setSessionWarmupsState] = useState<SessionWarmupsByDay | null>(() => loadWarmupsFromStorage());
  const [autoPlanUntouched, setAutoPlanUntouchedState] = useState<boolean>(() => loadAutoPlanFromStorage());
  const [favorites, setFavoritesState] = useState<string[]>(() => loadFavoritesFromStorage());

  // Persist routine to sessionStorage on every change
  useEffect(() => {
    saveRoutineToStorage(routine);
  }, [routine]);

  // Persist effort calibration on every change
  useEffect(() => {
    saveEffortToStorage(effort);
  }, [effort]);

  // Persist split state on every change
  useEffect(() => {
    saveSplitToStorage(split);
  }, [split]);

  // Persist lifestyle profile on every change
  useEffect(() => {
    saveLifestyleToStorage(lifestyle);
  }, [lifestyle]);

  // Persist session warmups on every change
  useEffect(() => {
    saveWarmupsToStorage(sessionWarmups);
  }, [sessionWarmups]);

  // Persist experience profile on every change
  useEffect(() => {
    saveExperienceToStorage(experience);
  }, [experience]);

  // Persist auto-plan flag on every change
  useEffect(() => {
    saveAutoPlanToStorage(autoPlanUntouched);
  }, [autoPlanUntouched]);

  // Persist favorites on every change
  useEffect(() => {
    saveFavoritesToStorage(favorites);
  }, [favorites]);

  const toggleFavorite = useCallback((routineItemId: string) => {
    setFavoritesState((prev) => {
      if (prev.includes(routineItemId)) {
        // Already favorited — remove.
        return prev.filter((id) => id !== routineItemId);
      }
      if (prev.length >= MAX_FAVORITES) {
        // At cap — refuse silently. Caller should toast.
        return prev;
      }
      return [...prev, routineItemId];
    });
  }, []);

  const isFavorite = useCallback(
    (routineItemId: string) => favorites.includes(routineItemId),
    [favorites],
  );

  const setSessionWarmups = useCallback((next: SessionWarmupsByDay | null) => {
    setSessionWarmupsState(next);
  }, []);

  const setExperience = useCallback((next: ExperienceId | null) => {
    setExperienceState(next);
  }, []);

  const markAutoPlanFresh = useCallback(() => {
    setAutoPlanUntouchedState(true);
  }, []);

  const markAutoPlanModified = useCallback(() => {
    setAutoPlanUntouchedState(false);
  }, []);

  const setEffort = useCallback((next: EffortCalibration) => {
    setEffortState(next);
  }, []);

  const setSplit = useCallback((next: SplitState) => {
    setSplitState(next);
    flipPlanModified();
  }, []);

  const clearSplit = useCallback(() => {
    setSplitState(DEFAULT_SPLIT);
    flipPlanModified();
  }, []);

  const setLifestyle = useCallback((next: LifestyleId | null) => {
    setLifestyleState(next);
  }, []);

  // Any direct mutation flips the auto-plan flag to false. Auto paths
  // (handleAutoFillAllSets, handleReallocate, adopt-all from rater)
  // call markAutoPlanFresh AFTER their batch is done, which sets it
  // back to true. Setting it to true is a no-op when nothing has
  // changed, so there's no race to worry about.
  const flipPlanModified = () => setAutoPlanUntouchedState(false);

  const addToRoutine = useCallback((params: AddExerciseParams) => {
    const parameters = getProgrammingParameters(params.category);
    // Sets / reps are intentionally empty until the user applies a
    // Pre-Set or Smart Fill. Initializing with placeholder sets is
    // misleading because rep range isn't a rated criterion on its own —
    // the rating engine cares about volume (sets x reps) downstream of
    // user choice. If callers explicitly pass numSets + defaultReps
    // (e.g. when adopting an LLM-optimized routine), honor those.
    const sets: SetDetail[] =
      params.numSets !== undefined && params.defaultReps !== undefined
        ? Array.from({ length: params.numSets }, () => ({
            reps: params.defaultReps as number,
            weight: params.defaultWeight ?? 0,
          }))
        : [];

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
      stretchLevel: params.stretchLevel,
      stability: params.stability,
    };
    setRoutine((prev) => [...prev, newItem]);
    flipPlanModified();
  }, []);

  const addRoutineItem = useCallback((item: RoutineItem) => {
    setRoutine((prev) => [...prev, item]);
    flipPlanModified();
  }, []);

  const removeFromRoutine = useCallback((id: string) => {
    setRoutine((prev) => prev.filter((item) => item.id !== id));
    // Drop this id from favorites if present so the array doesn't leak
    // stale references.
    setFavoritesState((prev) => prev.filter((favId) => favId !== id));
    flipPlanModified();
  }, []);

  const clearRoutine = useCallback(() => {
    setRoutine([]);
    setFavoritesState([]);
    flipPlanModified();
  }, []);

  const replaceRoutine = useCallback((items: RoutineItem[]) => {
    setRoutine(items);
    // The replacement set has all-new ids (LLM-adopt path), so favorites
    // pointing at the old ids are stale; clear them.
    setFavoritesState([]);
    // Caller decides whether this is a fresh auto-plan adoption or a
    // user-driven replacement. Default to modified; auto paths call
    // markAutoPlanFresh after.
    flipPlanModified();
  }, []);

  const updateRoutineItem = useCallback((id: string, updates: Partial<RoutineItem>) => {
    setRoutine((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    flipPlanModified();
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
        split,
        setSplit,
        clearSplit,
        lifestyle,
        setLifestyle,
        experience,
        setExperience,
        sessionWarmups,
        setSessionWarmups,
        autoPlanUntouched,
        markAutoPlanFresh,
        markAutoPlanModified,
        favorites,
        toggleFavorite,
        isFavorite,
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
