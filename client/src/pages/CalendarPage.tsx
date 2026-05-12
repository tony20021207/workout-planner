/**
 * CalendarPage — Mesocycle-aware scheduling.
 *
 * Two entry paths from the top banner:
 *   1. "Click any day"  → single-day picker: choose a calendar date,
 *                          then pick which split day (Week 1 or Week 2)
 *                          anchors there. Saves a workout + schedules it.
 *   2. "Bulk Schedule"  → multi-day picker (Phase 2, stub for now): pick
 *                          a starting date, then mark the upcoming 1-2
 *                          weeks of training days at once.
 *
 * After scheduling a single day, the user is asked if they want to
 * schedule more — that's the on-ramp to Bulk Schedule.
 *
 * Editing a scheduled workout (Phase 3) routes to the workout planner
 * with the saved workout loaded, with "save as new workout" if changed.
 *
 * The Check-in flow (Phase 4) lives on a separate page; today's
 * scheduled workout shows a "Check in" CTA that navigates there.
 */
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  Layers,
  Sparkles,
  CheckCircle2,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useWorkout, type RoutineItem } from "@/contexts/WorkoutContext";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { SPLIT_PRESETS, getMuscleTagsForItem, type MuscleTag } from "@/lib/splitPresets";

interface CalendarExercise {
  exercise: string;
  jointFunction: string;
  category: "systemic" | "regional";
  difficulty: string;
  targetedMuscles: string[];
  sets: { reps: number; weight: number }[];
  equipment?: string;
  angle?: string;
  parameters?: unknown;
}

interface PickerOption {
  week: 1 | 2;
  dayId: string;
  dayName: string;
  exerciseCount: number;
}

export default function CalendarPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const { routine, split, mesocycle, startEditingScheduledEntry } = useWorkout();
  const [, setLocation] = useLocation();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // New flow state
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [showMorePrompt, setShowMorePrompt] = useState<
    | { date: string; workoutLabel: string; anchorOption: PickerOption }
    | null
  >(null);

  /**
   * Bulk Schedule mode — entered after the user accepts the "Schedule
   * more?" prompt. Anchored on a date + the split day that was just
   * scheduled there. The calendar highlights the next 7 or 14 days
   * (depending on mesocycle.enabled). The user clicks days within the
   * window to mark them; confirm assigns split days chronologically.
   */
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkAnchorDate, setBulkAnchorDate] = useState<string | null>(null);
  const [bulkAnchorOption, setBulkAnchorOption] = useState<PickerOption | null>(null);
  const [bulkSelectedDates, setBulkSelectedDates] = useState<Set<string>>(new Set());
  /** Projected assignment: dateStr → split day id. Driven by chronological
   * default initially; mutated by Opti-fill to minimize muscle-spacing
   * conflicts. Surfaced in calendar cells so the user sees what each
   * marked date will become. */
  const [bulkAssignments, setBulkAssignments] = useState<Record<string, string>>({});
  /** "Are you sure?" override modal when Confirm Schedule is clicked
   * while muscle-spacing conflicts remain. */
  const [conflictConfirm, setConflictConfirm] = useState<
    Array<{ date1: string; date2: string; sharedTags: MuscleTag[] }> | null
  >(null);

  /** Detail modal shown when the user clicks a scheduled workout entry.
   * Lists the exercises + offers Edit / Mark Complete / Remove / Close. */
  const [viewingEntry, setViewingEntry] = useState<
    | {
        entryId: number;
        workoutId: number;
        workoutName: string;
        exercises: CalendarExercise[];
        date: string;
        completed: boolean;
      }
    | null
  >(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const calendarQuery = trpc.calendar.getEntries.useQuery(
    { month: currentMonth },
    { enabled: isAuthenticated },
  );
  /** Full workout list — needed to resolve a calendar entry's
   * workoutId → name + exercises when opening the detail modal. */
  const workoutsQuery = trpc.workout.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createWorkout = trpc.workout.create.useMutation();
  const addEntry = trpc.calendar.addEntry.useMutation({
    onSuccess: () => calendarQuery.refetch(),
  });
  const removeEntry = trpc.calendar.removeEntry.useMutation({
    onSuccess: () => {
      calendarQuery.refetch();
      toast.success("Entry removed");
    },
  });
  const toggleComplete = trpc.calendar.toggleComplete.useMutation({
    onSuccess: () => calendarQuery.refetch(),
  });

  const activePreset = useMemo(() => {
    if (!split.splitId || split.splitId === "custom") return null;
    return SPLIT_PRESETS[split.splitId];
  }, [split.splitId]);

  const hasSavedSplit = Boolean(activePreset) && routine.length > 0;

  // Build the picker options: each split day for Week 1 + Week 2 (if mesocycle enabled).
  const pickerOptions = useMemo<PickerOption[]>(() => {
    if (!hasSavedSplit || !activePreset) return [];
    const opts: PickerOption[] = [];
    for (const day of activePreset.days) {
      const w1Count = (split.dayAssignments[day.id] ?? []).length;
      if (w1Count > 0) {
        opts.push({ week: 1, dayId: day.id, dayName: day.name, exerciseCount: w1Count });
      }
    }
    if (mesocycle.enabled) {
      for (const day of activePreset.days) {
        const w2Count = (mesocycle.week2DayAssignments[day.id] ?? []).length;
        if (w2Count > 0) {
          opts.push({ week: 2, dayId: day.id, dayName: day.name, exerciseCount: w2Count });
        }
      }
    }
    return opts;
  }, [hasSavedSplit, activePreset, split.dayAssignments, mesocycle]);

  /** Bulk Schedule window — the next 7 or 14 days starting from the
   * anchor date. Empty when not in bulk mode. Used to highlight cells
   * in the calendar grid and gate "click to mark" interactions. */
  const bulkScope: 1 | 2 = mesocycle.enabled ? 2 : 1;
  const bulkWindow = useMemo(() => {
    if (!bulkMode || !bulkAnchorDate) return new Set<string>();
    const set = new Set<string>();
    const [y, m, d] = bulkAnchorDate.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const days = bulkScope * 7;
    for (let i = 0; i < days; i++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      set.add(iso);
    }
    return set;
  }, [bulkMode, bulkAnchorDate, bulkScope]);

  /** How many additional days the user needs to mark to fill the
   * mesocycle. Total required = daysPerWeek × scope; subtract 1 for
   * the anchor already scheduled. */
  const bulkRequiredCount = useMemo(() => {
    if (!activePreset) return 0;
    return Math.max(0, activePreset.daysPerWeek * bulkScope - 1);
  }, [activePreset, bulkScope]);

  const bulkDaysLeft = Math.max(0, bulkRequiredCount - bulkSelectedDates.size);
  const bulkComplete = bulkSelectedDates.size === bulkRequiredCount;

  /**
   * Get the major muscle tags trained by a split day. Reads items from
   * the day's assignments and aggregates their tags. Calves / core /
   * routing-only tags are excluded — those don't drive spacing
   * conflicts since they're small-mass and can be trained frequently.
   */
  const getMuscleTagsForDay = (dayId: string, week: 1 | 2): Set<MuscleTag> => {
    const ids =
      week === 1
        ? split.dayAssignments[dayId] ?? []
        : mesocycle.week2DayAssignments[dayId] ?? [];
    const itemsById = new Map<string, RoutineItem>();
    routine.forEach((r) => itemsById.set(r.id, r));
    mesocycle.week2Routine.forEach((r) => itemsById.set(r.id, r));

    const tags = new Set<MuscleTag>();
    for (const id of ids) {
      const item = itemsById.get(id);
      if (!item) continue;
      for (const tag of getMuscleTagsForItem(item)) {
        if (tag === "heavy-hinge" || tag === "calves" || tag === "core") continue;
        tags.add(tag);
      }
    }
    return tags;
  };

  /** Determine the week (1 or 2) for a given date relative to the anchor. */
  const weekForDate = (dateStr: string): 1 | 2 => {
    if (!bulkAnchorDate) return 1;
    const [y1, m1, d1] = bulkAnchorDate.split("-").map(Number);
    const [y2, m2, d2] = dateStr.split("-").map(Number);
    const anchorDt = new Date(y1, m1 - 1, d1);
    const dt = new Date(y2, m2 - 1, d2);
    const diffDays = Math.floor((dt.getTime() - anchorDt.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7 ? 2 : 1;
  };

  /**
   * Compute conflicts for a given dateStr → splitDayId assignment.
   * Conflict = consecutive calendar days both training a shared major
   * muscle tag. Anchor's day is included in the chain.
   */
  const conflictsForAssignment = (
    assignment: Record<string, string>,
  ): Array<{ date1: string; date2: string; sharedTags: MuscleTag[] }> => {
    if (!bulkAnchorDate || !bulkAnchorOption || !activePreset) return [];
    const all: Array<{ date: string; week: 1 | 2; dayId: string }> = [];
    all.push({
      date: bulkAnchorDate,
      week: bulkAnchorOption.week,
      dayId: bulkAnchorOption.dayId,
    });
    for (const [date, dayId] of Object.entries(assignment)) {
      all.push({ date, week: weekForDate(date), dayId });
    }
    all.sort((a, b) => a.date.localeCompare(b.date));
    const conflicts: Array<{ date1: string; date2: string; sharedTags: MuscleTag[] }> = [];
    for (let i = 0; i < all.length - 1; i++) {
      const a = all[i];
      const b = all[i + 1];
      const [y1, m1, d1] = a.date.split("-").map(Number);
      const [y2, m2, d2] = b.date.split("-").map(Number);
      const dateA = new Date(y1, m1 - 1, d1);
      const dateB = new Date(y2, m2 - 1, d2);
      const dayDiff = Math.round(
        (dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (dayDiff !== 1) continue;
      const tagsA = getMuscleTagsForDay(a.dayId, a.week);
      const tagsB = getMuscleTagsForDay(b.dayId, b.week);
      const shared: MuscleTag[] = [];
      for (const tag of tagsA) if (tagsB.has(tag)) shared.push(tag);
      if (shared.length > 0) {
        conflicts.push({ date1: a.date, date2: b.date, sharedTags: shared });
      }
    }
    return conflicts;
  };

  // Rebuild the default chronological assignment whenever the marked
  // dates change. Anchor's day is excluded from the rotation; remaining
  // dates get remaining split days in chronological + split order.
  useEffect(() => {
    if (!bulkMode || !bulkAnchorDate || !bulkAnchorOption || !activePreset) {
      setBulkAssignments({});
      return;
    }
    const sorted = [...bulkSelectedDates].sort();
    const anchorIdx = activePreset.days.findIndex((d) => d.id === bulkAnchorOption.dayId);
    const rotated = anchorIdx >= 0
      ? [...activePreset.days.slice(anchorIdx + 1), ...activePreset.days.slice(0, anchorIdx)]
      : activePreset.days.slice();
    const next: Record<string, string> = {};
    let week1Filled = 0;
    let week2Slot = 0;
    for (const dateStr of sorted) {
      const week = weekForDate(dateStr);
      if (week === 1 && week1Filled < rotated.length) {
        next[dateStr] = rotated[week1Filled].id;
        week1Filled++;
      } else if (week === 2) {
        // Week 2: cycle from anchor index again, since Week 2 starts fresh.
        const dayIdx = (anchorIdx + week2Slot) % activePreset.days.length;
        next[dateStr] = activePreset.days[dayIdx].id;
        week2Slot++;
      }
    }
    setBulkAssignments(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkMode, bulkAnchorDate, bulkAnchorOption, activePreset, bulkSelectedDates]);

  const currentConflicts = useMemo(
    () => conflictsForAssignment(bulkAssignments),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bulkAssignments, bulkAnchorDate, bulkAnchorOption, activePreset],
  );

  // Build a Set of date strings involved in any conflict so the calendar
  // can paint them red.
  const conflictingDates = useMemo(() => {
    const set = new Set<string>();
    for (const c of currentConflicts) {
      set.add(c.date1);
      set.add(c.date2);
    }
    return set;
  }, [currentConflicts]);

  /**
   * Opti-fill: permute the assignment of selected dates to split days
   * (within each week independently) to minimize the conflict count.
   * Anchor stays fixed. Tractable for any of our presets (≤6 days/wk).
   */
  const handleOptiFill = () => {
    if (!bulkMode || !bulkAnchorDate || !bulkAnchorOption || !activePreset) return;
    const sortedAll = [...bulkSelectedDates].sort();
    const week1Dates = sortedAll.filter((d) => weekForDate(d) === 1);
    const week2Dates = sortedAll.filter((d) => weekForDate(d) === 2);
    const anchorIdx = activePreset.days.findIndex((d) => d.id === bulkAnchorOption.dayId);
    const w1Pool = activePreset.days.filter((d, i) => i !== anchorIdx).map((d) => d.id);
    const w2Pool = activePreset.days.map((d) => d.id); // Week 2 fresh play-through

    // Build a candidate from permutations within each week.
    const permute = <T,>(arr: T[]): T[][] => {
      if (arr.length <= 1) return [arr];
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        for (const p of permute(rest)) out.push([arr[i], ...p]);
      }
      return out;
    };

    const week1Perms = w1Pool.length > 0 ? permute(w1Pool) : [[]];
    const week2Perms = w2Pool.length > 0 ? permute(w2Pool) : [[]];

    let best: Record<string, string> | null = null;
    let bestCount = Infinity;

    outer: for (const p1 of week1Perms) {
      for (const p2 of week2Perms) {
        const trial: Record<string, string> = {};
        for (let i = 0; i < week1Dates.length && i < p1.length; i++) {
          trial[week1Dates[i]] = p1[i];
        }
        for (let i = 0; i < week2Dates.length && i < p2.length; i++) {
          trial[week2Dates[i]] = p2[i];
        }
        const conflicts = conflictsForAssignment(trial);
        if (conflicts.length < bestCount) {
          best = trial;
          bestCount = conflicts.length;
          if (bestCount === 0) break outer;
        }
      }
    }

    if (best) {
      setBulkAssignments(best);
      if (bestCount === 0) {
        toast.success("Opti-fill: zero muscle-spacing conflicts");
      } else {
        toast.warning(
          `Opti-fill: minimized to ${bestCount} conflict${bestCount === 1 ? "" : "s"}. Try a different anchor day to fully resolve.`,
        );
      }
    }
  };

  // Calendar helpers
  const monthDate = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [currentMonth]);

  const daysInMonth = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }, [currentMonth]);

  const firstDayOfWeek = useMemo(() => monthDate.getDay(), [monthDate]);

  const prevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  /** Resolve a calendar entry's workoutId to its saved name + exercises. */
  const getWorkoutByEntry = (entry: { workoutId: number }) => {
    const w = (workoutsQuery.data ?? []).find((w) => w.id === entry.workoutId);
    if (!w) return null;
    const exercises = ((w.exercises as unknown[]) ?? []) as CalendarExercise[];
    return { name: w.name, exercises };
  };

  /** Click handler when user clicks a scheduled workout label on a
   * calendar cell — opens the detail modal. */
  const openEntryDetail = (entry: {
    id: number;
    workoutId: number;
    date: string;
    completed: boolean;
  }) => {
    const w = getWorkoutByEntry({ workoutId: entry.workoutId });
    if (!w) {
      toast.error("Workout content unavailable — it may have been deleted.");
      return;
    }
    setViewingEntry({
      entryId: entry.id,
      workoutId: entry.workoutId,
      workoutName: w.name,
      exercises: w.exercises,
      date: entry.date,
      completed: entry.completed,
    });
  };

  /** Convert a saved workout's exercises (CalendarExercise shape) back
   * into RoutineItem[] shape so the planner can edit them. The saved
   * shape was built from RoutineItem in buildWorkoutPayload, so most
   * fields round-trip. Generates fresh ids for routine. */
  const handleEditInPlanner = () => {
    if (!viewingEntry) return;
    const routineItems: RoutineItem[] = viewingEntry.exercises.map((ex) => {
      // Generate a fresh id so the planner doesn't conflict with any
      // routine ids the user may have in state.
      const id = `edit-${viewingEntry.entryId}-${Math.random().toString(36).slice(2, 9)}`;
      return {
        id,
        exercise: ex.exercise,
        jointFunction: ex.jointFunction,
        category: ex.category,
        // ProgrammingParameters payload is stored as `unknown` in the
        // workout schema — narrow it back. Fall back to a sensible
        // default if absent so the planner UI doesn't crash.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parameters: (ex.parameters as any) ?? {
          sets: "3 sets",
          reps: "8-12 reps",
          frequency: "2x per week",
          rest: ex.category === "systemic" ? "2–3 minutes" : "60–90 seconds",
          intensity: ex.category === "systemic" ? "1-2 RIR" : "0 RIR",
          rationale: "",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        difficulty: (ex.difficulty as any) ?? "medium",
        targetedMuscles: ex.targetedMuscles ?? [],
        sets: ex.sets ?? [],
        equipment: ex.equipment,
        angle: ex.angle,
      };
    });
    startEditingScheduledEntry({
      entryId: viewingEntry.entryId,
      workoutId: viewingEntry.workoutId,
      date: viewingEntry.date,
      workoutName: viewingEntry.workoutName,
      exercises: routineItems,
    });
    setViewingEntry(null);
    toast.info("Loaded into the planner. Edit, then Save or Save as New.");
    setLocation("/");
  };

  const getEntriesForDate = (day: number) => {
    const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
    return (calendarQuery.data || []).filter((e) => e.date === dateStr);
  };

  /**
   * Build a serialized workout payload for one split day. Reads routine
   * + mesocycle.week2Routine for the exercise items; falls through to
   * the day's exercise ids in the appropriate week's assignments.
   * Applies Week 2 sets-override when scheduling a Week 2 day.
   */
  const buildWorkoutPayload = (
    option: PickerOption,
  ): { name: string; exercises: CalendarExercise[] } | null => {
    if (!activePreset) return null;
    const itemsById = new Map<string, RoutineItem>();
    routine.forEach((r) => itemsById.set(r.id, r));
    mesocycle.week2Routine.forEach((r) => itemsById.set(r.id, r));

    const ids =
      option.week === 1
        ? split.dayAssignments[option.dayId] ?? []
        : mesocycle.week2DayAssignments[option.dayId] ?? [];

    const exercises: CalendarExercise[] = [];
    for (const id of ids) {
      const item = itemsById.get(id);
      if (!item) continue;
      const sets =
        option.week === 2 && mesocycle.week2ExerciseSets[id]
          ? mesocycle.week2ExerciseSets[id]
          : item.sets;
      exercises.push({
        exercise: item.exercise,
        jointFunction: item.jointFunction,
        category: item.category,
        difficulty: item.difficulty,
        targetedMuscles: item.targetedMuscles,
        sets,
        equipment: item.equipment,
        angle: item.angle,
        parameters: item.parameters,
      });
    }

    const name = `${activePreset.shortLabel} · W${option.week} · ${option.dayName}`;
    return { name, exercises };
  };

  /** Enter Bulk Schedule mode anchored at a date with a chosen split day.
   * Called from the "Schedule more?" prompt after the user confirms. */
  const enterBulkMode = (anchorDate: string, anchorOption: PickerOption) => {
    setBulkMode(true);
    setBulkAnchorDate(anchorDate);
    setBulkAnchorOption(anchorOption);
    setBulkSelectedDates(new Set());
    setShowMorePrompt(null);
    // Make sure the calendar is showing the month containing the anchor.
    const [y, m] = anchorDate.split("-");
    setCurrentMonth(`${y}-${m}`);
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setBulkAnchorDate(null);
    setBulkAnchorOption(null);
    setBulkSelectedDates(new Set());
  };

  const toggleBulkDate = (dateStr: string) => {
    setBulkSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  /** Commit all marked bulk dates using the current bulkAssignments
   * projection. Each date → split day pairing comes from bulkAssignments
   * (chronological default, mutable via Opti-fill). Conflicts trigger
   * an "are you sure?" override before committing. */
  const handleConfirmBulk = async () => {
    if (!activePreset || !bulkAnchorOption || !bulkAnchorDate) return;
    if (bulkSelectedDates.size === 0) {
      toast.error("Pick at least one day to schedule");
      return;
    }
    if (currentConflicts.length > 0 && !conflictConfirm) {
      // Surface conflicts before committing. User can choose to override
      // or stay and try Opti-fill / change dates.
      setConflictConfirm(currentConflicts);
      return;
    }
    setConflictConfirm(null);
    await commitBulkAssignment();
  };

  const commitBulkAssignment = async () => {
    if (!activePreset || !bulkAnchorOption) return;
    type Assignment = { date: string; option: PickerOption };
    const assignments: Assignment[] = [];
    for (const [date, dayId] of Object.entries(bulkAssignments)) {
      const week = weekForDate(date);
      const splitDay = activePreset.days.find((d) => d.id === dayId);
      if (!splitDay) continue;
      const exerciseCount =
        week === 1
          ? (split.dayAssignments[dayId] ?? []).length
          : (mesocycle.week2DayAssignments[dayId] ?? []).length;
      assignments.push({
        date,
        option: { week, dayId, dayName: splitDay.name, exerciseCount },
      });
    }
    if (assignments.length === 0) {
      toast.error("Could not build a schedule from the marked days");
      return;
    }
    let succeeded = 0;
    for (const { date, option } of assignments) {
      const payload = buildWorkoutPayload(option);
      if (!payload || payload.exercises.length === 0) continue;
      try {
        const createRes = await createWorkout.mutateAsync({
          name: payload.name,
          exercises: payload.exercises,
        });
        if (createRes?.id) {
          await addEntry.mutateAsync({ workoutId: createRes.id, date });
          succeeded++;
        }
      } catch {
        // Continue with the rest; the user will see partial success.
      }
    }
    toast.success(`Scheduled ${succeeded} workout${succeeded === 1 ? "" : "s"}`);
    calendarQuery.refetch();
    exitBulkMode();
  };

  const handlePickSplitDay = (option: PickerOption) => {
    if (!pickerDate) return;
    const payload = buildWorkoutPayload(option);
    if (!payload || payload.exercises.length === 0) {
      toast.error("That day has no exercises assigned");
      return;
    }
    createWorkout.mutate(
      { name: payload.name, exercises: payload.exercises },
      {
        onSuccess: (data) => {
          if (!data?.id) {
            toast.error("Failed to save workout");
            return;
          }
          addEntry.mutate(
            { workoutId: data.id, date: pickerDate },
            {
              onSuccess: () => {
                toast.success(`Scheduled ${payload.name} on ${pickerDate}`);
                const scheduledDate = pickerDate;
                setPickerDate(null);
                setShowMorePrompt({
                  date: scheduledDate,
                  workoutLabel: payload.name,
                  anchorOption: option,
                });
              },
            },
          );
        },
      },
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-lime">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Builder
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-lime" />
              <span className="font-heading font-bold text-sm text-foreground">Workout Calendar</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{user?.name || user?.email}</span>
        </div>
      </nav>

      <div className="container py-8 space-y-6">
        {/* Top entry banner — two options. Pinned at the top so user
            knows what they can do on this page. */}
        <div className="p-4 bg-lime/5 border-2 border-lime/30 rounded-sm">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="p-2 bg-lime/15 rounded-sm shrink-0">
              <Calendar className="w-5 h-5 text-lime" />
            </div>
            <div className="flex-1 min-w-[260px]">
              <h3 className="font-heading font-bold text-base text-foreground mb-1">
                {hasSavedSplit ? "Schedule your training" : "Build a routine first"}
              </h3>
              {hasSavedSplit ? (
                <p className="text-xs text-muted-foreground leading-snug">
                  <span className="text-foreground font-semibold">Click any day below</span> to
                  schedule a single workout from your saved split, or use{" "}
                  <span className="text-foreground font-semibold">Bulk Schedule</span> to plan an
                  entire mesocycle starting from a chosen day.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground leading-snug">
                  You need a routine + split before you can schedule.{" "}
                  <Link href="/" className="text-lime underline">
                    Head to the builder
                  </Link>{" "}
                  and pick exercises + a split.
                </p>
              )}
            </div>
            <Button
              size="sm"
              disabled={!hasSavedSplit}
              onClick={() => {
                toast.info("Bulk Schedule coming next — for now click any day on the calendar");
              }}
              className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold shrink-0"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Bulk Schedule
            </Button>
          </div>
        </div>

        {/* Bulk Schedule mode banner — shown only when bulkMode is active.
            Anchor day is in lime; user clicks highlighted (purple) days
            within the 1- or 2-week window to mark them. */}
        {bulkMode && bulkAnchorDate && bulkAnchorOption && activePreset && (
          <div className="p-4 bg-purple-500/[0.06] border-2 border-purple-400/40 rounded-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <h3 className="font-heading font-bold text-base text-foreground mb-1 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-300" />
                  Bulk Schedule · {bulkScope === 2 ? "2-week" : "1-week"} mesocycle
                </h3>
                <p className="text-xs text-muted-foreground leading-snug">
                  Anchor: <span className="font-semibold text-lime">{bulkAnchorDate}</span> ·{" "}
                  {bulkAnchorOption.dayName}. Click days within the highlighted window to mark
                  your remaining training days. Counter ticks down toward zero.
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <div
                    className={`text-xs font-mono tabular-nums px-2 py-1 rounded-sm border ${
                      bulkComplete
                        ? "bg-lime/15 text-lime border-lime/40"
                        : "bg-purple-500/15 text-purple-200 border-purple-400/40"
                    }`}
                  >
                    {bulkComplete ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> All {bulkRequiredCount} days picked
                      </span>
                    ) : (
                      <>
                        {bulkDaysLeft} day{bulkDaysLeft === 1 ? "" : "s"} left ·{" "}
                        {bulkSelectedDates.size}/{bulkRequiredCount} picked
                      </>
                    )}
                  </div>
                  {currentConflicts.length > 0 && (
                    <div
                      className="text-xs font-mono tabular-nums px-2 py-1 rounded-sm border bg-red-500/15 text-red-300 border-red-500/40 inline-flex items-center gap-1"
                      title="Adjacent calendar days training the same major muscle group"
                    >
                      ⚠ {currentConflicts.length} muscle-spacing conflict
                      {currentConflicts.length === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOptiFill}
                  disabled={bulkSelectedDates.size === 0}
                  className="border-purple-400/50 text-purple-200 hover:bg-purple-500/15 text-xs"
                  title="Auto-arrange the split day assignment to minimize muscle-spacing conflicts"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Opti-fill
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmBulk}
                  disabled={bulkSelectedDates.size === 0}
                  className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Confirm Schedule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={exitBulkMode}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-foreground">Schedule</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevMonth}
                className="text-muted-foreground hover:text-lime"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-heading font-semibold text-foreground min-w-[140px] text-center">
                {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextMonth}
                className="text-muted-foreground hover:text-lime"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="border-2 border-border rounded-sm overflow-hidden">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 bg-secondary/80 border-b border-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="p-2 text-center text-xs font-semibold text-muted-foreground uppercase"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {/* Empty cells for the first-of-month offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-2 min-h-[80px] border-b border-r border-border bg-secondary/20"
                />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
                const entries = getEntriesForDate(day);
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                const clickable = hasSavedSplit;
                const inBulkWindow = bulkMode && bulkWindow.has(dateStr);
                const isBulkAnchor = bulkMode && dateStr === bulkAnchorDate;
                const isBulkSelected = bulkSelectedDates.has(dateStr);

                // Bulk-mode styling: highlight window with soft purple
                // background; mark anchor with lime; mark selected days
                // with stronger purple + check.
                const bulkBg = bulkMode
                  ? isBulkAnchor
                    ? "bg-lime/15"
                    : isBulkSelected
                      ? "bg-purple-500/25"
                      : inBulkWindow
                        ? "bg-purple-500/[0.06]"
                        : "bg-secondary/10"
                  : "";

                return (
                  <div
                    key={day}
                    className={`p-1.5 min-h-[80px] border-b border-r border-border transition-colors ${
                      isToday ? "bg-lime/5" : ""
                    } ${bulkBg} ${
                      clickable
                        ? bulkMode
                          ? inBulkWindow && !isBulkAnchor
                            ? "cursor-pointer hover:bg-purple-500/15"
                            : "cursor-not-allowed opacity-70"
                          : "cursor-pointer hover:bg-lime/10 hover:border-lime/30"
                        : "cursor-not-allowed opacity-70"
                    }`}
                    onClick={() => {
                      if (!clickable) {
                        toast.info("Build a routine + split first to schedule");
                        return;
                      }
                      if (bulkMode) {
                        if (isBulkAnchor) return; // anchor is fixed
                        if (!inBulkWindow) {
                          toast.info(
                            `Click days within the highlighted ${bulkScope === 2 ? "2-week" : "week"} window`,
                          );
                          return;
                        }
                        toggleBulkDate(dateStr);
                        return;
                      }
                      setPickerDate(dateStr);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`text-xs font-semibold mb-1 ${
                          isToday ? "text-lime" : isBulkAnchor ? "text-lime" : isBulkSelected ? "text-purple-200" : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </div>
                      {isBulkAnchor && (
                        <span className="text-[8px] uppercase tracking-wider text-lime font-bold">
                          anchor
                        </span>
                      )}
                      {isBulkSelected && !isBulkAnchor && (
                        <CheckCircle2 className="w-3 h-3 text-purple-300" />
                      )}
                    </div>
                    {/* Projected split-day label for marked dates in bulk
                        mode — shows what this date will become on Confirm.
                        Includes anchor for visual completeness. */}
                    {bulkMode && (isBulkAnchor || isBulkSelected) && (() => {
                      const splitDayId = isBulkAnchor
                        ? bulkAnchorOption?.dayId
                        : bulkAssignments[dateStr];
                      if (!splitDayId || !activePreset) return null;
                      const splitDay = activePreset.days.find((d) => d.id === splitDayId);
                      if (!splitDay) return null;
                      const week = isBulkAnchor
                        ? bulkAnchorOption?.week ?? 1
                        : weekForDate(dateStr);
                      const isConflict = conflictingDates.has(dateStr);
                      return (
                        <div
                          className={`text-[9px] mt-0.5 leading-tight ${
                            isConflict
                              ? "text-red-300"
                              : isBulkAnchor
                                ? "text-lime/90"
                                : "text-purple-200/90"
                          }`}
                          title={isConflict ? "Adjacent to a day training the same major muscle" : splitDay.name}
                        >
                          {isConflict && "⚠ "}
                          W{week} · {splitDay.name.split("—")[0]?.trim() ?? splitDay.name}
                        </div>
                      );
                    })()}
                    {isToday && entries.length > 0 && (
                      <div className="text-[9px] uppercase tracking-wider text-lime font-bold mb-1">
                        Check in
                      </div>
                    )}
                    {entries.map((entry) => {
                      const w = getWorkoutByEntry({ workoutId: entry.workoutId });
                      const label = w?.name ?? `Workout ${entry.workoutId}`;
                      return (
                        <div
                          key={entry.id}
                          className={`group text-[9px] px-1 py-0.5 rounded mb-0.5 flex items-center justify-between ${
                            entry.completed
                              ? "bg-green-500/20 text-green-400 line-through"
                              : "bg-lime/20 text-lime"
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEntryDetail({
                                id: entry.id,
                                workoutId: entry.workoutId,
                                date: entry.date,
                                completed: entry.completed,
                              });
                            }}
                            className="truncate flex-1 text-left"
                            title="Open details · edit / mark complete / remove"
                          >
                            {label}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {hasSavedSplit
              ? "Click any day to schedule. Click a workout entry to mark complete; hover and click the × to remove."
              : "Build a routine and pick a split, then return here to schedule."}
          </p>
        </section>
      </div>

      {/* ===== SINGLE-DAY PICKER MODAL =====
          Opens when user clicks any empty (clickable) calendar day. Lists
          all split days × weeks as options. User picks one to schedule. */}
      {pickerDate && hasSavedSplit && activePreset && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-border rounded-sm p-5 w-full max-w-md max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  Schedule a workout
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick the split day for{" "}
                  <span className="font-semibold text-foreground">{pickerDate}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPickerDate(null)}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {pickerOptions.map((opt) => (
                <button
                  key={`${opt.week}-${opt.dayId}`}
                  onClick={() => handlePickSplitDay(opt)}
                  className="w-full p-3 bg-secondary/40 hover:bg-lime/10 border border-border hover:border-lime/40 rounded-sm text-left transition-colors group"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{opt.dayName}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm ${
                        opt.week === 1
                          ? "bg-lime/15 text-lime border border-lime/30"
                          : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      Week {opt.week}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" />
                    {opt.exerciseCount} exercise{opt.exerciseCount === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
              {pickerOptions.length === 0 && (
                <p className="text-xs text-muted-foreground italic p-4 text-center">
                  No days available to schedule. Make sure each split day has at least one
                  exercise assigned.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== "SCHEDULE MORE?" PROMPT =====
          Shown right after a successful single-day schedule. User can
          dismiss (continue clicking individual days) or jump to Bulk
          Schedule mode for multi-day planning. */}
      {showMorePrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-lime/40 rounded-sm p-5 w-full max-w-md"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-lime/15 rounded-sm shrink-0">
                <CheckCircle2 className="w-5 h-5 text-lime" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground mb-1">
                  Scheduled.
                </h3>
                <p className="text-xs text-muted-foreground leading-snug">
                  <span className="text-foreground font-semibold">{showMorePrompt.workoutLabel}</span>{" "}
                  is on {showMorePrompt.date}. Want to schedule more days at once?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowMorePrompt(null)}
                className="text-muted-foreground"
              >
                Not now
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!showMorePrompt) return;
                  enterBulkMode(showMorePrompt.date, showMorePrompt.anchorOption);
                }}
                className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Yes, schedule more
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== SCHEDULED ENTRY DETAIL MODAL =====
          Opens when the user clicks a scheduled workout label on a
          calendar cell. Shows the workout's exercises and offers four
          actions: Edit in Planner (routes to / with edit mode set),
          Mark Complete, Remove (deletes the calendar entry), Close. */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-border rounded-sm p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  {viewingEntry.workoutName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scheduled {viewingEntry.date} ·{" "}
                  {viewingEntry.exercises.length} exercise
                  {viewingEntry.exercises.length === 1 ? "" : "s"}
                  {viewingEntry.completed ? " · ✓ completed" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingEntry(null)}
                className="text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Read-only exercise list */}
            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
              {viewingEntry.exercises.map((ex, i) => (
                <div
                  key={i}
                  className="p-2 bg-secondary/40 rounded-sm border border-border/50 flex items-baseline justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {ex.exercise}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {ex.targetedMuscles.join(", ")}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-lime shrink-0">
                    {ex.sets.length} × {ex.sets[0]?.reps ?? "—"}
                    {ex.sets[0]?.weight ? ` @ ${ex.sets[0].weight}lb` : ""}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toggleComplete.mutate({ id: viewingEntry.entryId });
                    setViewingEntry(null);
                  }}
                  className={
                    viewingEntry.completed
                      ? "border-muted-foreground/40 text-muted-foreground"
                      : "border-lime/40 text-lime hover:bg-lime/10"
                  }
                  title={viewingEntry.completed ? "Mark as not done" : "Mark as completed"}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {viewingEntry.completed ? "Mark not done" : "Mark complete"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    removeEntry.mutate({ id: viewingEntry.entryId });
                    setViewingEntry(null);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  title="Remove this scheduled workout"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Remove
                </Button>
              </div>
              <Button
                size="sm"
                onClick={handleEditInPlanner}
                className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
                title="Open this workout in the planner; save changes back or as a new workout"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Edit in Planner
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ===== CONFLICT OVERRIDE MODAL =====
          Shown when the user clicks Confirm Schedule with muscle-spacing
          conflicts remaining. They can override and commit anyway, or
          go back to fix the schedule (try Opti-fill or change marked days). */}
      {conflictConfirm && conflictConfirm.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-red-500/40 rounded-sm p-5 w-full max-w-md"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-500/15 rounded-sm shrink-0">
                <X className="w-5 h-5 text-red-300" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground mb-1">
                  Muscle-spacing conflicts detected
                </h3>
                <p className="text-xs text-muted-foreground leading-snug">
                  Some adjacent calendar days train the same major muscle group, which
                  hurts recovery. Try <span className="font-semibold text-foreground">Opti-fill</span>
                  {" "}or change your marked days, or override if you know what you're doing.
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4 text-[11px] text-muted-foreground max-h-[200px] overflow-y-auto">
              {conflictConfirm.map((c, i) => (
                <li
                  key={i}
                  className="p-2 bg-red-500/[0.05] border border-red-500/20 rounded-sm leading-snug"
                >
                  <span className="font-mono text-red-300">{c.date1} → {c.date2}</span>:{" "}
                  shared majors{" "}
                  <span className="text-red-300 font-semibold">
                    {c.sharedTags.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConflictConfirm(null)}
                className="text-muted-foreground"
              >
                Back to fix
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setConflictConfirm(null);
                  await commitBulkAssignment();
                }}
                className="border-red-500/40 text-red-300 hover:bg-red-500/10"
              >
                I'm sure — schedule anyway
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
