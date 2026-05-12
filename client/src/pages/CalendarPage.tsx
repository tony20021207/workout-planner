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
import { Link } from "wouter";
import { SPLIT_PRESETS } from "@/lib/splitPresets";

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
  const { routine, split, mesocycle } = useWorkout();

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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const calendarQuery = trpc.calendar.getEntries.useQuery(
    { month: currentMonth },
    { enabled: isAuthenticated },
  );

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

  /** Commit all marked bulk dates by assigning split days chronologically.
   * Anchor day's split day is already scheduled; remaining split days
   * map to the user's marked dates in order, week-by-week. */
  const handleConfirmBulk = async () => {
    if (!activePreset || !bulkAnchorOption || !bulkAnchorDate) return;
    if (bulkSelectedDates.size === 0) {
      toast.error("Pick at least one day to schedule");
      return;
    }

    const sorted = [...bulkSelectedDates].sort();
    // Anchor option's split day is taken; build the remaining sequence
    // in split-day order for week 1, then week 2 if applicable.
    const anchorIdx = activePreset.days.findIndex((d) => d.id === bulkAnchorOption.dayId);

    /** Helper: rotate the split's days so the anchor is at the front,
     * then strip the anchor. Result is the natural play-out order. */
    const rotatedWithoutAnchor = (() => {
      const days = activePreset.days;
      if (anchorIdx < 0) return days.slice();
      return [...days.slice(anchorIdx + 1), ...days.slice(0, anchorIdx)];
    })();

    type Assignment = { date: string; option: PickerOption };
    const assignments: Assignment[] = [];

    // First, fill Week 1 remaining days (daysPerWeek - 1 slots).
    const w1RemainingCount = activePreset.daysPerWeek - 1;
    for (let i = 0; i < w1RemainingCount && i < sorted.length; i++) {
      const splitDay = rotatedWithoutAnchor[i];
      if (!splitDay) break;
      const exerciseCount = (split.dayAssignments[splitDay.id] ?? []).length;
      assignments.push({
        date: sorted[i],
        option: {
          week: 1,
          dayId: splitDay.id,
          dayName: splitDay.name,
          exerciseCount,
        },
      });
    }

    // Then, fill Week 2 days if mesocycle enabled.
    if (mesocycle.enabled && bulkScope === 2) {
      const offset = w1RemainingCount;
      // Week 2 plays through ALL split days starting from the anchor's
      // day-of-the-split. (Anchor was Week 1; Week 2 starts fresh.)
      for (let i = 0; i < activePreset.daysPerWeek && offset + i < sorted.length; i++) {
        const dayIdx = (anchorIdx + i) % activePreset.days.length;
        const splitDay = activePreset.days[dayIdx];
        const exerciseCount = (mesocycle.week2DayAssignments[splitDay.id] ?? []).length;
        assignments.push({
          date: sorted[offset + i],
          option: {
            week: 2,
            dayId: splitDay.id,
            dayName: splitDay.name,
            exerciseCount,
          },
        });
      }
    }

    if (assignments.length === 0) {
      toast.error("Could not build a schedule from the marked days");
      return;
    }

    // Schedule each assignment sequentially. Skip failures gracefully.
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
                <div className="mt-2 flex items-center gap-3 flex-wrap">
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
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
                    {isToday && entries.length > 0 && (
                      <div className="text-[9px] uppercase tracking-wider text-lime font-bold mb-1">
                        Check in
                      </div>
                    )}
                    {entries.map((entry) => (
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
                            toggleComplete.mutate({ id: entry.id });
                          }}
                          className="truncate flex-1 text-left"
                          title={entry.completed ? "Mark as not done" : "Mark as completed"}
                        >
                          {entry.workoutId ? `Workout ${entry.workoutId}` : "Workout"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEntry.mutate({ id: entry.id });
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-destructive ml-1 shrink-0"
                          title="Remove this scheduled workout"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
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
    </div>
  );
}
