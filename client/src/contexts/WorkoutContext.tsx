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
import { type ExperienceId, getExperience } from "@/lib/experience";
import { rebalanceForWeek2 } from "@/lib/rebalance";
import { computeWeek2LoadDeload } from "@/lib/loadDeload";
import { swapAllNonFavoritesWeek2, type SwapSize } from "@/lib/variantSwap";

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
   * Opti-fill reads these to bucket the exercise into Low / Medium /
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
 *
 * SplitId values must match the keys in SPLIT_PRESETS (splitPresets.ts).
 */
export type SplitId =
  | "fb3"
  | "ul4"
  | "ppl6"
  | "bro5"
  | "ulppl5"
  | "custom";

export interface SplitState {
  splitId: SplitId | null;
  /** dayId -> ordered exerciseId[] from the routine. */
  dayAssignments: Record<string, string[]>;
  /** Calves finisher frequency — days per week the user wants calves
   * trained as a daily finisher. null = off (use default mass-weighted
   * volume math). Capped at the split's daysPerWeek when applied. */
  calvesFrequency: number | null;
  /** Abs finisher frequency (rectus abdominis only — obliques tracked
   * separately as a minor bonus). null = off. */
  absFrequency: number | null;
  /** dayIds with the antagonist-superset toggle ON. View-time reorder:
   * push/pull alternation on upper days, quad/ham on leg days. */
  antagonistDays: string[];
}

const DEFAULT_SPLIT: SplitState = {
  splitId: null,
  dayAssignments: {},
  calvesFrequency: null,
  absFrequency: null,
  antagonistDays: [],
};

/**
 * Two-week mesocycle state. When `enabled` is true, the SplitBuilder
 * surfaces a Week 1 / Week 2 tab control and the user can independently
 * shape each week. P9.3.1 (this commit) just adds the state model and
 * the tab UI — Week 2 starts as a clone of Week 1 and the user can
 * manually edit it. Subsequent P9.3.x phases layer in frequency
 * rebalance, leg-day differentiation, load/deload math, and the variant
 * swap engine that auto-populates Week 2.
 */
export interface MesocycleState {
  enabled: boolean;
  /** Week 2 dayId -> exercise ids. Mirrors split.dayAssignments shape.
   * IDs may reference either routine[] (un-swapped items) or
   * week2Routine[] (variant-swapped items). */
  week2DayAssignments: Record<string, string[]>;
  /**
   * Week 2 per-exercise sets[] overrides. Empty -> use the item's own
   * sets[] (either from routine[] or week2Routine[]). When the load/
   * deload phase runs, this map holds the deload-adjusted set counts.
   */
  week2ExerciseSets: Record<string, SetDetail[]>;
  /**
   * Parallel Week 2 routine — holds the RoutineItems created by the
   * variant swap engine (P9.3.4). These items are NOT in routine[];
   * they live here so Week 1 stays exactly as the user picked it.
   * Renderers merge routine[] + week2Routine[] when on the Week 2 tab.
   */
  week2Routine: RoutineItem[];
}

const DEFAULT_MESOCYCLE: MesocycleState = {
  enabled: false,
  week2DayAssignments: {},
  week2ExerciseSets: {},
  week2Routine: [],
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
  /** Toggle antagonist-superset display order on a single day (view-
   * time reorder; the canonical dayAssignments stay unchanged). */
  toggleAntagonistDay: (dayId: string) => void;
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
  /** Two-week mesocycle state. See MesocycleState. */
  mesocycle: MesocycleState;
  /** Expand the current single-week split into a 2-week mesocycle.
   * Clones week 1's dayAssignments as the initial week 2 layout. */
  expandToBiweekly: () => void;
  /** Collapse back to single-week. Wipes week 2 state. */
  collapseToSingleWeek: () => void;
  /** Replace week 2's dayAssignments wholesale (used by the variant swap
   * engine in later phases). */
  setWeek2DayAssignments: (next: Record<string, string[]>) => void;
  /** Recompute Week 2's dayAssignments from Week 1 via the rebalance
   * engine (mirrored day-pair swap + leg-day hard-binary pivot). Opt-in
   * button on the Week 2 tab. No-op if mesocycle isn't enabled. */
  rebalanceWeek2: () => void;
  /** Apply per-muscle load/deload to Week 2: target = max(0.5 ×
   * weekly, 2 × weekly − Week 1 actual). Overwrites mesocycle.week2-
   * ExerciseSets with the resulting per-item sets[]. Opt-in button on
   * the Week 2 tab. Returns a per-muscle direction summary for UI
   * feedback (load/deload/match counts). Returns null if mesocycle
   * isn't enabled. */
  applyLoadDeload: () => { loaded: number; deloaded: number; matched: number } | null;
  /** Swap all non-favorited Week 2 exercises for variants at the given
   * size (small / medium / large). Favorites are hard-locked and
   * untouched. Week 1 stays as the user picked it; the swaps land in
   * mesocycle.week2Routine[] and week2DayAssignments updates to reference
   * the new ids. Returns counts for UI feedback. Returns null if
   * mesocycle isn't enabled. */
  swapVariantsWeek2: (
    size: SwapSize,
  ) => { swapped: number; locked: number; noVariant: number } | null;
  /** Set per-exercise sets[] override for week 2. Pass empty array to
   * remove the override (week 2 will fall back to week 1's sets). */
  setWeek2ExerciseSets: (exerciseId: string, sets: SetDetail[]) => void;
  /** Commit a Week 2 snapshot atomically. Used by the combined preview
   * flow in SplitBuilder: the projection memo computes the layered
   * Week 2 state across staged previews (Swap → Rebalance → Load/Deload),
   * then this action commits the final week2DayAssignments + week2Routine
   * + week2ExerciseSets in one state update. No-op if mesocycle is off. */
  commitWeek2Snapshot: (snapshot: {
    week2DayAssignments: Record<string, string[]>;
    week2Routine: RoutineItem[];
    week2ExerciseSets: Record<string, SetDetail[]>;
  }) => void;
}

const STORAGE_KEY = "kinesiology_routine";
const EFFORT_STORAGE_KEY = "kinesiology_effort";
const SPLIT_STORAGE_KEY = "kinesiology_split";
const LIFESTYLE_STORAGE_KEY = "kinesiology_lifestyle";
const EXPERIENCE_STORAGE_KEY = "kinesiology_experience";
const WARMUPS_STORAGE_KEY = "kinesiology_session_warmups";
const AUTO_PLAN_STORAGE_KEY = "kinesiology_auto_plan_untouched";
const FAVORITES_STORAGE_KEY = "kinesiology_favorites";
const MESOCYCLE_STORAGE_KEY = "kinesiology_mesocycle";

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
      if (parsed?.dayAssignments) {
        // Backfill new optional fields for older session storage.
        return {
          splitId: parsed.splitId ?? null,
          dayAssignments: parsed.dayAssignments,
          calvesFrequency: parsed.calvesFrequency ?? null,
          absFrequency: parsed.absFrequency ?? null,
          antagonistDays: Array.isArray(parsed.antagonistDays) ? parsed.antagonistDays : [],
        };
      }
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

function loadMesocycleFromStorage(): MesocycleState {
  try {
    const stored = sessionStorage.getItem(MESOCYCLE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        return {
          enabled: Boolean(parsed.enabled),
          week2DayAssignments: parsed.week2DayAssignments ?? {},
          week2ExerciseSets: parsed.week2ExerciseSets ?? {},
          week2Routine: Array.isArray(parsed.week2Routine) ? parsed.week2Routine : [],
        };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_MESOCYCLE;
}

function saveMesocycleToStorage(state: MesocycleState) {
  try {
    sessionStorage.setItem(MESOCYCLE_STORAGE_KEY, JSON.stringify(state));
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
  const [mesocycle, setMesocycleState] = useState<MesocycleState>(() => loadMesocycleFromStorage());

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

  // Persist mesocycle state on every change
  useEffect(() => {
    saveMesocycleToStorage(mesocycle);
  }, [mesocycle]);

  const expandToBiweekly = useCallback(() => {
    setSplitState((prevSplit) => {
      setMesocycleState({
        enabled: true,
        // Seed week 2 with a clone of week 1's day assignments so the
        // user sees something useful immediately. Later P9.3 phases
        // will reshape week 2 (frequency rebalance + variant swaps).
        week2DayAssignments: JSON.parse(JSON.stringify(prevSplit.dayAssignments)) as Record<string, string[]>,
        week2ExerciseSets: {},
        week2Routine: [],
      });
      return prevSplit;
    });
  }, []);

  const collapseToSingleWeek = useCallback(() => {
    setMesocycleState(DEFAULT_MESOCYCLE);
  }, []);

  const setWeek2DayAssignments = useCallback((next: Record<string, string[]>) => {
    setMesocycleState((prev) => ({ ...prev, week2DayAssignments: next }));
  }, []);

  const commitWeek2Snapshot = useCallback(
    (snapshot: {
      week2DayAssignments: Record<string, string[]>;
      week2Routine: RoutineItem[];
      week2ExerciseSets: Record<string, SetDetail[]>;
    }) => {
      setMesocycleState((prev) => {
        if (!prev.enabled) return prev;
        return {
          ...prev,
          week2DayAssignments: snapshot.week2DayAssignments,
          week2Routine: snapshot.week2Routine,
          week2ExerciseSets: snapshot.week2ExerciseSets,
        };
      });
    },
    [],
  );

  const rebalanceWeek2 = useCallback(() => {
    // Read latest values via setter-callbacks so we never close over stale
    // state (the button can fire after Week 1 edits without remounting).
    setSplitState((prevSplit) => {
      if (!prevSplit.splitId) return prevSplit;
      setRoutine((prevRoutine) => {
        setMesocycleState((prevMeso) => {
          if (!prevMeso.enabled) return prevMeso;
          const next = rebalanceForWeek2(
            prevRoutine,
            prevSplit.splitId!,
            prevSplit.dayAssignments,
          );
          return { ...prevMeso, week2DayAssignments: next };
        });
        return prevRoutine;
      });
      return prevSplit;
    });
  }, []);

  const applyLoadDeload = useCallback((): { loaded: number; deloaded: number; matched: number } | null => {
    // Like rebalanceWeek2, read latest state via nested setter callbacks
    // to avoid stale closures. Also closes over `experience` (the
    // experience id) via deps so we always use the current profile.
    // Captured in an outer closure variable so we can return summary.
    let summary: { loaded: number; deloaded: number; matched: number } | null = null;
    setSplitState((prevSplit) => {
      setRoutine((prevRoutine) => {
        setMesocycleState((prevMeso) => {
          if (!prevMeso.enabled) return prevMeso;
          const profile = getExperience(experience) ?? getExperience("foot-in-door")!;
          const result = computeWeek2LoadDeload(
            prevRoutine,
            prevSplit.dayAssignments,
            prevMeso.week2DayAssignments,
            profile,
          );
          let loaded = 0,
            deloaded = 0,
            matched = 0;
          for (const v of Object.values(result.perMuscle)) {
            if (v.direction === "load") loaded++;
            else if (v.direction === "deload") deloaded++;
            else matched++;
          }
          summary = { loaded, deloaded, matched };
          return { ...prevMeso, week2ExerciseSets: result.week2ExerciseSets };
        });
        return prevRoutine;
      });
      return prevSplit;
    });
    return summary;
  }, [experience]);

  const swapVariantsWeek2 = useCallback(
    (size: SwapSize): { swapped: number; locked: number; noVariant: number } | null => {
      let summary: { swapped: number; locked: number; noVariant: number } | null = null;
      setRoutine((prevRoutine) => {
        setFavoritesState((prevFavorites) => {
          setMesocycleState((prevMeso) => {
            if (!prevMeso.enabled) return prevMeso;
            // Merge current routine + any existing week2Routine items as
            // the source pool — items that were already swapped on a
            // previous click are now the "current" Week 2 items and
            // should be considered for further swapping.
            const sourcePool = [...prevRoutine, ...prevMeso.week2Routine];
            const result = swapAllNonFavoritesWeek2(
              sourcePool,
              prevMeso.week2DayAssignments,
              new Set(prevFavorites),
              size,
            );
            summary = {
              swapped: result.swappedCount,
              locked: result.unchangedCount,
              noVariant: result.noVariantCount,
            };
            // Migrate week2ExerciseSets so any load/deload work the user
            // already did stays applied to the swapped-in item.
            const newSets: Record<string, SetDetail[]> = {};
            for (const [oldId, sets] of Object.entries(prevMeso.week2ExerciseSets)) {
              const newId = result.idMap[oldId] ?? oldId;
              newSets[newId] = sets;
            }
            // Rebuild week2Routine: drop entries whose old ids got
            // swapped out (their corresponding new items are in
            // result.swappedItems), keep the rest, then append new swaps.
            const swappedOutIds = new Set(Object.keys(result.idMap));
            const retainedWeek2Routine = prevMeso.week2Routine.filter(
              (r) => !swappedOutIds.has(r.id),
            );
            return {
              ...prevMeso,
              week2DayAssignments: result.newWeek2DayAssignments,
              week2ExerciseSets: newSets,
              week2Routine: [...retainedWeek2Routine, ...result.swappedItems],
            };
          });
          return prevFavorites;
        });
        return prevRoutine;
      });
      return summary;
    },
    [],
  );

  const setWeek2ExerciseSets = useCallback((exerciseId: string, sets: SetDetail[]) => {
    setMesocycleState((prev) => {
      const nextMap = { ...prev.week2ExerciseSets };
      if (sets.length === 0) {
        delete nextMap[exerciseId];
      } else {
        nextMap[exerciseId] = sets;
      }
      return { ...prev, week2ExerciseSets: nextMap };
    });
  }, []);

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

  /** Toggle antagonist-superset display order on a single day. */
  const toggleAntagonistDay = useCallback((dayId: string) => {
    setSplitState((prev) => {
      const has = prev.antagonistDays.includes(dayId);
      return {
        ...prev,
        antagonistDays: has
          ? prev.antagonistDays.filter((d) => d !== dayId)
          : [...prev.antagonistDays, dayId],
      };
    });
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
    // Pre-Set or Opti-fill. Initializing with placeholder sets is
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
    setMesocycleState(DEFAULT_MESOCYCLE);
    flipPlanModified();
  }, []);

  const replaceRoutine = useCallback((items: RoutineItem[]) => {
    setRoutine(items);
    // The replacement set has all-new ids (LLM-adopt path), so favorites
    // + mesocycle pointing at the old ids are stale; clear them.
    setFavoritesState([]);
    setMesocycleState(DEFAULT_MESOCYCLE);
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
        toggleAntagonistDay,
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
        mesocycle,
        expandToBiweekly,
        collapseToSingleWeek,
        setWeek2DayAssignments,
        commitWeek2Snapshot,
        rebalanceWeek2,
        applyLoadDeload,
        swapVariantsWeek2,
        setWeek2ExerciseSets,
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
