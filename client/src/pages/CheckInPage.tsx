/**
 * CheckInPage — day-of-workout experience.
 *
 * Default date is today; URL param `?date=YYYY-MM-DD` overrides.
 *
 * Behavior:
 *  - If no calendar entry is scheduled for the day → empty-state with
 *    an "Add workout" CTA that routes to /calendar to pick one.
 *  - If there's a scheduled workout → render its exercises with per-set
 *    checkboxes + per-set editable reps / weight, plus a per-exercise
 *    "Mark exercise done" button (auto-toggled when all sets are
 *    checked) and a bottom "Mark workout complete" button.
 *
 * After completion: shows a celebratory panel with the next scheduled
 * workout (if any) and words of encouragement.
 */
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardCheck,
  Check,
  Plus,
  Trophy,
  Sparkles,
  Calendar as CalendarIcon,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { useWorkout } from "@/contexts/WorkoutContext";
import { resolveProfile } from "@/lib/experience";
import { videoUrlForRoutineItem } from "@/lib/exerciseVideo";

interface CheckInExercise {
  exercise: string;
  jointFunction: string;
  category: string;
  difficulty: string;
  targetedMuscles: string[];
  sets: { reps: number; weight: number }[];
  equipment?: string;
  angle?: string;
}

/** Per-set check state, keyed by exercise index + set index. */
type SetCheckMap = Record<string, boolean>; // "exIdx-setIdx" → checked

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readDateFromUrl(search: string): string {
  const params = new URLSearchParams(search);
  const d = params.get("date");
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return todayISO();
}

function formatHumanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Encouragement strings rotate based on completed-set count so the
 * message feels alive rather than canned. */
function pickEncouragement(setsCompleted: number): string {
  const messages = [
    "Show up, do the work, repeat. That's it.",
    "Each rep is a vote for the lifter you want to become.",
    "Consistency compounds. You're stacking deposits.",
    "Discomfort now buys capacity later.",
    "The set is the unit. You did the units. Good.",
    "Recovery is when the gain happens. Eat. Sleep. Repeat.",
    "Strong shows up. Today you were strong.",
  ];
  return messages[setsCompleted % messages.length];
}

export default function CheckInPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const { experience, volume } = useWorkout();
  const expProfile = resolveProfile(experience, volume);
  const [, setLocation] = useLocation();

  // Date can be set via ?date=YYYY-MM-DD; defaults to today.
  const [dateStr, setDateStr] = useState<string>(() => readDateFromUrl(window.location.search));
  // Sync from URL on mount + on navigation (wouter doesn't auto-rerun
  // useState initializer).
  useEffect(() => {
    setDateStr(readDateFromUrl(window.location.search));
  }, []);

  // Per-set check state — keyed by "exIdx-setIdx".
  const [setChecks, setSetChecks] = useState<SetCheckMap>({});
  // Editable per-set reps + weight (overrides the saved workout's
  // values for this session only — persisted to the calendar entry's
  // completed flag at the end).
  const [setEdits, setSetEdits] = useState<
    Record<string, { reps: number; weight: number }>
  >({});

  // Final celebratory screen
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const currentMonth = useMemo(() => dateStr.slice(0, 7), [dateStr]);

  const calendarQuery = trpc.calendar.getEntries.useQuery(
    { month: currentMonth },
    { enabled: isAuthenticated },
  );
  const workoutsQuery = trpc.workout.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const toggleComplete = trpc.calendar.toggleComplete.useMutation({
    onSuccess: () => calendarQuery.refetch(),
  });
  // Persists the lifter's actual reps/weight back to the calendar entry's
  // `customExercises` JSON column — same shape as the source workout, but
  // with the numbers as performed. Future Stats page reads this to chart
  // weight progression across completed entries.
  const updateCustomExercises = trpc.calendar.updateCustomExercises.useMutation({
    onSuccess: () => calendarQuery.refetch(),
  });

  // Find the entry for this date (any state — completed or not).
  const todaysEntries = useMemo(
    () => (calendarQuery.data ?? []).filter((e) => e.date === dateStr),
    [calendarQuery.data, dateStr],
  );
  const entry = todaysEntries[0] ?? null; // assume one workout per day for now

  const workout = useMemo(() => {
    if (!entry) return null;
    const w = (workoutsQuery.data ?? []).find((w) => w.id === entry.workoutId);
    if (!w) return null;
    // If the lifter has already logged numbers for this day,
    // `entry.customExercises` is the source of truth — it stores the
    // actually-performed reps/weight per set. Falls back to the base
    // workout template when no log exists yet.
    const exercises = (entry.customExercises
      ? (entry.customExercises as unknown[])
      : (w.exercises as unknown[]) ?? []) as CheckInExercise[];
    return { id: w.id, name: w.name, exercises };
  }, [entry, workoutsQuery.data]);

  // When opening a day that already has a persisted log, hydrate the
  // local edit/check state from it so the UI reflects "what you actually
  // did" rather than the template defaults. Runs once per entry change.
  useEffect(() => {
    if (!entry?.customExercises || !workout) return;
    const seedEdits: Record<string, { reps: number; weight: number }> = {};
    const seedChecks: SetCheckMap = {};
    workout.exercises.forEach((ex, exIdx) => {
      ex.sets.forEach((s, setIdx) => {
        const key = `${exIdx}-${setIdx}`;
        seedEdits[key] = { reps: s.reps, weight: s.weight };
        if (entry.completed) seedChecks[key] = true;
      });
    });
    setSetEdits(seedEdits);
    setSetChecks(seedChecks);
  }, [entry?.id, entry?.customExercises, entry?.completed, workout]);

  // Find the next scheduled (uncompleted) workout AFTER today for the
  // encouragement panel.
  const nextWorkout = useMemo(() => {
    const future = (calendarQuery.data ?? [])
      .filter((e) => e.date > dateStr && !e.completed)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!future) return null;
    const w = (workoutsQuery.data ?? []).find((w) => w.id === future.workoutId);
    return future && w ? { date: future.date, name: w.name } : null;
  }, [calendarQuery.data, workoutsQuery.data, dateStr]);

  // Track total completed sets for messaging.
  const completedSetCount = useMemo(
    () => Object.values(setChecks).filter(Boolean).length,
    [setChecks],
  );

  const toggleSet = (exIdx: number, setIdx: number) => {
    const key = `${exIdx}-${setIdx}`;
    setSetChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isExerciseDone = (exIdx: number, setCount: number): boolean => {
    for (let i = 0; i < setCount; i++) {
      if (!setChecks[`${exIdx}-${i}`]) return false;
    }
    return setCount > 0;
  };

  const markExerciseDone = (exIdx: number, setCount: number) => {
    setSetChecks((prev) => {
      const next = { ...prev };
      for (let i = 0; i < setCount; i++) next[`${exIdx}-${i}`] = true;
      return next;
    });
  };

  const updateSetField = (
    exIdx: number,
    setIdx: number,
    field: "reps" | "weight",
    raw: string,
  ) => {
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 0) return;
    const key = `${exIdx}-${setIdx}`;
    setSetEdits((prev) => ({
      ...prev,
      [key]: {
        reps: field === "reps" ? num : prev[key]?.reps ?? 0,
        weight: field === "weight" ? num : prev[key]?.weight ?? 0,
      },
    }));
  };

  const getDisplayedSet = (
    exIdx: number,
    setIdx: number,
    originalSet: { reps: number; weight: number },
  ) => {
    const key = `${exIdx}-${setIdx}`;
    const edit = setEdits[key];
    return {
      reps: edit?.reps ?? originalSet.reps,
      weight: edit?.weight ?? originalSet.weight,
    };
  };

  /**
   * Snapshot the actual numbers the lifter performed (applying `setEdits`
   * over the original template) into `entry.customExercises`, then mark
   * the entry complete. Persistence is fire-and-forget — UI advances to
   * the celebratory panel immediately.
   */
  const handleCompleteWorkout = () => {
    if (!entry || !workout) return;
    const performedExercises = workout.exercises.map((ex, exIdx) => ({
      ...ex,
      sets: ex.sets.map((s, setIdx) => {
        const edit = setEdits[`${exIdx}-${setIdx}`];
        return {
          reps: edit?.reps ?? s.reps,
          weight: edit?.weight ?? s.weight,
        };
      }),
    }));
    updateCustomExercises.mutate({
      id: entry.id,
      customExercises: performedExercises,
    });
    if (!entry.completed) {
      toggleComplete.mutate({ id: entry.id, completed: 1 });
    }
    setCompleted(true);
    toast.success("Workout complete. Get the recovery.");
  };

  const handleAddWorkout = () => {
    setLocation(`/calendar?date=${dateStr}`);
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
    <div className="min-h-screen bg-background pb-24">
      {/* Top Nav */}
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-lime">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Home
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-lime" />
              <span className="font-heading font-bold text-sm text-foreground">
                Check-in
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{user?.name || user?.email}</span>
        </div>
      </nav>

      <div className="container py-6 space-y-6">
        {/* Date heading */}
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              {formatHumanDate(dateStr)}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Today's check-in · <span className="font-mono">{dateStr}</span>
            </p>
          </div>
        </div>

        {/* No workout scheduled */}
        {!entry && !completed && (
          <div className="p-8 bg-card border-2 border-dashed border-border rounded-sm text-center space-y-3">
            <div className="inline-flex p-3 bg-secondary/40 rounded-sm">
              <CalendarIcon className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="font-heading font-bold text-lg text-foreground">
              Nothing scheduled today
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Want to train? Add a workout for{" "}
              <span className="font-semibold text-foreground">{formatHumanDate(dateStr)}</span>{" "}
              and it'll show up here.
            </p>
            <Button
              onClick={handleAddWorkout}
              className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add workout
            </Button>
          </div>
        )}

        {/* Workout + completion view */}
        {entry && workout && !completed && (
          <>
            <div className="p-4 bg-card border-2 border-border rounded-sm">
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-heading font-bold text-lg text-foreground">
                    {workout.name}
                  </h2>
                  {entry.completed ? (
                    <span
                      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-lime/15 text-lime border border-lime/30"
                      title="The numbers shown are what you actually performed on this day."
                    >
                      Logged
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {workout.exercises.length} exercise
                  {workout.exercises.length === 1 ? "" : "s"} ·{" "}
                  {workout.exercises.reduce((n, e) => n + e.sets.length, 0)} sets total
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {entry.completed
                  ? "You've already logged this day — numbers below are what you actually performed. Edit any set and hit Mark workout complete again to update the log."
                  : "Check each set as you finish. Edit reps and weight inline if you adjusted on the fly. When everything's checked, hit Mark workout complete at the bottom."}
              </p>
            </div>

            <div className="space-y-3">
              {workout.exercises.map((ex, exIdx) => {
                const exDone = isExerciseDone(exIdx, ex.sets.length);
                return (
                  <div
                    key={exIdx}
                    className={`p-4 bg-card border-2 rounded-sm transition-colors ${
                      exDone ? "border-lime/40 bg-lime/[0.04]" : "border-border"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading font-semibold text-base text-foreground">
                            {ex.exercise}
                          </h3>
                          {/* Watch demo — outbound link to a public-platform
                              video (curated URL or YouTube search fallback).
                              IP-safe: we link only, never host or embed. */}
                          <a
                            href={videoUrlForRoutineItem(ex)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Watch a demo of this exercise (opens in a new tab)"
                            aria-label={`Watch demo of ${ex.exercise}`}
                          >
                            <PlayCircle className="w-4 h-4" />
                          </a>
                          {/* Recommended RIR per exercise type — informational
                              badge sourced from the user's experience profile.
                              The lifter trains TO this target; the system never
                              enforces it. */}
                          {expProfile && (
                            <span
                              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              title={`Target RIR for ${ex.category === "systemic" ? "compound" : "isolation"} at ${expProfile.name}`}
                            >
                              RIR{" "}
                              {ex.category === "systemic"
                                ? expProfile.rir.compound
                                : expProfile.rir.isolation}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {ex.targetedMuscles.join(", ")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={exDone ? "default" : "outline"}
                        onClick={() => markExerciseDone(exIdx, ex.sets.length)}
                        disabled={exDone}
                        className={
                          exDone
                            ? "bg-lime text-lime-foreground"
                            : "border-lime/40 text-lime hover:bg-lime/10"
                        }
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        {exDone ? "Done" : "Mark exercise done"}
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      {ex.sets.map((origSet, setIdx) => {
                        const key = `${exIdx}-${setIdx}`;
                        const checked = !!setChecks[key];
                        const displayed = getDisplayedSet(exIdx, setIdx, origSet);
                        return (
                          <div
                            key={setIdx}
                            className={`flex items-center gap-2 p-2 rounded-sm border transition-colors ${
                              checked
                                ? "bg-lime/[0.06] border-lime/30"
                                : "bg-secondary/40 border-border"
                            }`}
                          >
                            <button
                              onClick={() => toggleSet(exIdx, setIdx)}
                              className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-colors shrink-0 ${
                                checked
                                  ? "bg-lime border-lime text-lime-foreground"
                                  : "bg-background border-border hover:border-lime/60"
                              }`}
                              title={checked ? "Mark not done" : "Mark this set complete"}
                            >
                              {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                            </button>
                            <span className="text-[10px] font-mono text-muted-foreground w-8">
                              Set {setIdx + 1}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={displayed.reps}
                                onChange={(e) =>
                                  updateSetField(exIdx, setIdx, "reps", e.target.value)
                                }
                                className="w-14 text-xs text-center bg-background border border-border rounded-sm px-1.5 py-1 text-foreground focus:outline-none focus:border-lime"
                              />
                              <span className="text-[10px] text-muted-foreground">reps</span>
                              <span className="text-[10px] text-muted-foreground mx-1">@</span>
                              <input
                                type="number"
                                min={0}
                                value={displayed.weight}
                                onChange={(e) =>
                                  updateSetField(exIdx, setIdx, "weight", e.target.value)
                                }
                                className="w-16 text-xs text-center bg-background border border-border rounded-sm px-1.5 py-1 text-foreground focus:outline-none focus:border-lime"
                              />
                              <span className="text-[10px] text-muted-foreground">lb</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-20 z-30 p-3 bg-background/95 backdrop-blur-md border-2 border-lime/40 rounded-sm shadow-lg">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  {completedSetCount} of{" "}
                  {workout.exercises.reduce((n, e) => n + e.sets.length, 0)} sets done
                </p>
                <Button
                  size="sm"
                  onClick={handleCompleteWorkout}
                  className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
                >
                  <Trophy className="w-4 h-4 mr-1.5" />
                  Mark workout complete
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Post-complete celebratory panel */}
        {completed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-6 bg-lime/10 border-2 border-lime/40 rounded-sm text-center">
              <div className="inline-flex p-3 bg-lime/20 rounded-sm mb-3">
                <Trophy className="w-8 h-8 text-lime" />
              </div>
              <h2 className="font-heading font-bold text-2xl text-foreground mb-2">
                Workout complete.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                {pickEncouragement(completedSetCount)}
              </p>
            </div>

            {nextWorkout && (
              <div className="p-4 bg-card border-2 border-purple-400/30 rounded-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/15 rounded-sm shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-sm text-foreground mb-1">
                      Next up
                    </h3>
                    <p className="text-xs text-muted-foreground leading-snug">
                      <span className="font-semibold text-foreground">{nextWorkout.name}</span>
                      {" "}on{" "}
                      <span className="font-semibold text-foreground">
                        {formatHumanDate(nextWorkout.date)}
                      </span>
                      . Recovery starts now — eat, hydrate, sleep, see you then.
                    </p>
                  </div>
                  <Link href={`/check-in?date=${nextWorkout.date}`}>
                    <Button size="sm" variant="outline" className="border-purple-400/40 text-purple-200 hover:bg-purple-500/10">
                      Peek
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <Link href="/calendar">
                <Button variant="outline" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-1.5" />
                  Back to calendar
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCompleted(false);
                  setSetChecks({});
                  setSetEdits({});
                }}
                className="text-muted-foreground"
              >
                Re-do today
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
