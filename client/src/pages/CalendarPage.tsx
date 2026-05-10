/**
 * CalendarPage — Save workouts, schedule them on a calendar, customize per day, copy to another day
 * Fixed: clicking a scheduled entry now opens a detail view showing all exercises
 */
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dumbbell, Calendar, ChevronLeft, ChevronRight, Plus, Trash2,
  Check, Save, ArrowLeft, X, Edit3, Minus, Copy, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useWorkout } from "@/contexts/WorkoutContext";
import { toast } from "sonner";
import { Link, useSearch } from "wouter";
import {
  REP_RANGES,
  REP_RANGE_BY_ID,
  applyDayWidePreset,
  applyRangeToExercise,
  inferRangeFromReps,
  suggestRangeForExercise,
  type RepRangeId,
} from "@/lib/repRanges";

interface CalendarExercise {
  exercise: string;
  jointFunction: string;
  customSets: number;
  customReps: number;
  customWeight: number;
}

export default function CalendarPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const search = useSearch();
  const shouldSave = new URLSearchParams(search).get("save") === "true";
  const { routine, clearRoutine } = useWorkout();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ id: number; exercises: CalendarExercise[] } | null>(null);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySource, setCopySource] = useState<{ workoutId: number; customExercises: any } | null>(null);
  const [copyTargetDate, setCopyTargetDate] = useState("");
  const [pendingSaveMode, setPendingSaveMode] = useState(false);
  const [saveScheduleDate, setSaveScheduleDate] = useState<string | null>(null);
  // NEW: View workout detail dialog
  const [viewingWorkout, setViewingWorkout] = useState<{ name: string; exercises: CalendarExercise[]; entryId: number; workoutId: number; customExercises: any } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  // Auto-enter pending save mode if coming from builder with routine
  useEffect(() => {
    if (shouldSave && routine.length > 0) {
      setPendingSaveMode(true);
    }
  }, [shouldSave, routine.length]);

  // tRPC queries
  const workoutsQuery = trpc.workout.list.useQuery(undefined, { enabled: isAuthenticated });
  const calendarQuery = trpc.calendar.getEntries.useQuery(
    { month: currentMonth },
    { enabled: isAuthenticated }
  );

  const createWorkout = trpc.workout.create.useMutation({
    onSuccess: (data) => {
      workoutsQuery.refetch();
      if (saveScheduleDate && data.id) {
        addEntry.mutate(
          { workoutId: data.id, date: saveScheduleDate },
          {
            onSuccess: () => {
              calendarQuery.refetch();
              toast.success(`Workout saved and scheduled for ${saveScheduleDate}!`);
              clearRoutine();
              setPendingSaveMode(false);
              setSaveScheduleDate(null);
              setShowSaveDialog(false);
              setWorkoutName("");
            },
          }
        );
      } else {
        toast.success("Workout saved!");
        setShowSaveDialog(false);
        setWorkoutName("");
      }
    },
    onError: (err) => {
      toast.error("Failed to save workout: " + err.message);
    },
  });

  const deleteWorkout = trpc.workout.delete.useMutation({
    onSuccess: () => {
      workoutsQuery.refetch();
      calendarQuery.refetch();
      toast.success("Workout deleted");
    },
  });

  const addEntry = trpc.calendar.addEntry.useMutation({
    onSuccess: () => {
      calendarQuery.refetch();
      toast.success("Workout scheduled!");
      setShowScheduleDialog(false);
    },
    onError: (err) => {
      toast.error("Failed to schedule: " + err.message);
    },
  });

  const removeEntry = trpc.calendar.removeEntry.useMutation({
    onSuccess: () => {
      calendarQuery.refetch();
      toast.success("Entry removed");
    },
  });

  const toggleComplete = trpc.calendar.toggleComplete.useMutation({
    onSuccess: () => {
      calendarQuery.refetch();
    },
  });

  const updateCustomExercises = trpc.calendar.updateCustomExercises.useMutation({
    onSuccess: () => {
      calendarQuery.refetch();
      toast.success("Day customized!");
      setEditingEntry(null);
    },
  });

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

  // Save workout (without scheduling)
  const handleSaveWorkoutOnly = () => {
    if (!workoutName.trim()) {
      toast.error("Please enter a workout name");
      return;
    }
    const serializedExercises = routine.map((item) => ({
      exercise: item.exercise,
      jointFunction: item.jointFunction,
      category: item.category,
      difficulty: item.difficulty,
      targetedMuscles: item.targetedMuscles,
      sets: item.sets,
      equipment: item.equipment,
      angle: item.angle,
      parameters: item.parameters,
    }));
    setSaveScheduleDate(null);
    createWorkout.mutate({
      name: workoutName.trim(),
      exercises: serializedExercises,
    });
  };

  // Save workout AND schedule to a date
  const handleSaveAndSchedule = () => {
    if (!workoutName.trim()) {
      toast.error("Please enter a workout name");
      return;
    }
    if (!saveScheduleDate) {
      toast.error("Please select a date on the calendar first");
      return;
    }
    const serializedExercises = routine.map((item) => ({
      exercise: item.exercise,
      jointFunction: item.jointFunction,
      category: item.category,
      difficulty: item.difficulty,
      targetedMuscles: item.targetedMuscles,
      sets: item.sets,
      equipment: item.equipment,
      angle: item.angle,
      parameters: item.parameters,
    }));
    createWorkout.mutate({
      name: workoutName.trim(),
      exercises: serializedExercises,
    });
  };

  // Handle clicking a date in pending save mode
  const handleDateClickInSaveMode = (dateStr: string) => {
    setSaveScheduleDate(dateStr);
    setShowSaveDialog(true);
  };

  const handleSchedule = (workoutId: number) => {
    if (!selectedDate) return;
    addEntry.mutate({ workoutId, date: selectedDate });
  };

  const getEntriesForDate = (day: number) => {
    const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
    return (calendarQuery.data || []).filter(e => e.date === dateStr);
  };

  const getWorkoutName = (workoutId: number) => {
    const w = (workoutsQuery.data || []).find(w => w.id === workoutId);
    return w?.name || "Workout";
  };

  const getWorkoutExercises = (workoutId: number): CalendarExercise[] => {
    const w = (workoutsQuery.data || []).find(w => w.id === workoutId);
    if (!w) return [];
    return ((w.exercises as any[]) || []).map((ex: any) => ({
      exercise: ex.exercise || "",
      jointFunction: ex.jointFunction || "",
      customSets: ex.sets?.length || ex.customSets || 3,
      customReps: ex.sets?.[0]?.reps || ex.customReps || 8,
      customWeight: ex.sets?.[0]?.weight || ex.customWeight || 0,
    }));
  };

  // NEW: View workout detail when clicking on a scheduled entry
  const handleViewEntry = (entryId: number, workoutId: number, customExercises: any) => {
    const name = getWorkoutName(workoutId);
    const exercises = customExercises
      ? (customExercises as CalendarExercise[])
      : getWorkoutExercises(workoutId);
    setViewingWorkout({ name, exercises, entryId, workoutId, customExercises });
  };

  const handleEditEntry = (entryId: number, workoutId: number, customExercises: any) => {
    const exercises = customExercises
      ? (customExercises as CalendarExercise[])
      : getWorkoutExercises(workoutId);
    setEditingEntry({ id: entryId, exercises });
    setViewingWorkout(null);
  };

  const handleSaveCustomization = () => {
    if (!editingEntry) return;
    updateCustomExercises.mutate({
      id: editingEntry.id,
      customExercises: editingEntry.exercises,
    });
  };

  const updateExerciseField = (index: number, field: keyof CalendarExercise, value: any) => {
    if (!editingEntry) return;
    const updated = [...editingEntry.exercises];
    updated[index] = { ...updated[index], [field]: value };
    setEditingEntry({ ...editingEntry, exercises: updated });
  };

  const removeExerciseFromDay = (index: number) => {
    if (!editingEntry) return;
    const updated = editingEntry.exercises.filter((_, i) => i !== index);
    setEditingEntry({ ...editingEntry, exercises: updated });
  };

  // Pre-Set day-wide: every exercise to the same range.
  const applyDayWide = (rangeId: RepRangeId) => {
    if (!editingEntry) return;
    const updated = applyDayWidePreset(editingEntry.exercises, rangeId);
    setEditingEntry({ ...editingEntry, exercises: updated });
    toast.success(`Pre-Set: all exercises to ${REP_RANGE_BY_ID[rangeId].shortLabel} reps`);
  };

  const applyPerExerciseRange = (index: number, rangeId: RepRangeId) => {
    if (!editingEntry) return;
    const updated = [...editingEntry.exercises];
    updated[index] = applyRangeToExercise(updated[index], rangeId) as CalendarExercise;
    setEditingEntry({ ...editingEntry, exercises: updated });
  };

  // OptiFill: each exercise gets its own range via heuristic.
  const autoBucket = () => {
    if (!editingEntry) return;
    const updated = editingEntry.exercises.map((ex) => {
      // Use exercise name to infer category — assume systemic when name
      // contains compound-ish words. Pure heuristic; user can override.
      const looksCompound = /squat|deadlift|press|row|pull-up|chin-up|hip thrust|dip|lunge/i.test(
        ex.exercise,
      );
      const rangeId = suggestRangeForExercise(ex.exercise, looksCompound ? "systemic" : "regional");
      return applyRangeToExercise(ex, rangeId) as CalendarExercise;
    });
    setEditingEntry({ ...editingEntry, exercises: updated });
    toast.success("OptiFill applied across this day");
  };

  // Copy workout to another day
  const handleCopyWorkout = (workoutId: number, customExercises: any) => {
    setCopySource({ workoutId, customExercises });
    setCopyTargetDate("");
    setShowCopyDialog(true);
    setViewingWorkout(null);
  };

  const handleConfirmCopy = () => {
    if (!copySource || !copyTargetDate) {
      toast.error("Please select a target date");
      return;
    }
    addEntry.mutate(
      {
        workoutId: copySource.workoutId,
        date: copyTargetDate,
        customExercises: copySource.customExercises || undefined,
      },
      {
        onSuccess: () => {
          calendarQuery.refetch();
          toast.success(`Workout copied to ${copyTargetDate}`);
          setShowCopyDialog(false);
          setCopySource(null);
        },
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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

      <div className="container py-8 space-y-8">
        {/* Pending Save Banner */}
        {pendingSaveMode && routine.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-lime/10 border-2 border-lime/40 rounded-sm"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Save className="w-5 h-5 text-lime" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Ready to save your routine ({routine.length} exercises)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click any date on the calendar below to save and schedule your workout.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSaveScheduleDate(null);
                    setShowSaveDialog(true);
                  }}
                  className="text-xs"
                >
                  Save Without Scheduling
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPendingSaveMode(false)}
                  className="text-xs text-muted-foreground"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Saved Workouts */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-foreground">Saved Workouts</h2>
            {routine.length > 0 && !pendingSaveMode && (
              <Button
                size="sm"
                onClick={() => {
                  setPendingSaveMode(true);
                }}
                className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Current Routine
              </Button>
            )}
          </div>

          {workoutsQuery.data && workoutsQuery.data.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workoutsQuery.data.map((workout) => {
                const exercises = (workout.exercises as any[]) || [];
                return (
                  <div key={workout.id} className="p-4 bg-card border-2 border-border rounded-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-heading font-semibold text-foreground text-sm">{workout.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWorkout.mutate({ id: workout.id })}
                        className="text-muted-foreground hover:text-destructive w-7 h-7 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {exercises.length} exercises
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {exercises.slice(0, 3).map((ex: any, i: number) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
                          {ex.exercise}
                        </span>
                      ))}
                      {exercises.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
                          +{exercises.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-sm p-8 text-center">
              <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No saved workouts yet. Build a routine and save it here.
              </p>
            </div>
          )}
        </section>

        {/* Calendar */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-foreground">Schedule</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={prevMonth} className="text-muted-foreground hover:text-lime">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-heading font-semibold text-foreground min-w-[140px] text-center">
                {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <Button variant="ghost" size="sm" onClick={nextMonth} className="text-muted-foreground hover:text-lime">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border-2 border-border rounded-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-secondary/80 border-b border-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2 min-h-[80px] border-b border-r border-border bg-secondary/20" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
                const entries = getEntriesForDate(day);
                const isToday = dateStr === new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={day}
                    className={`p-1.5 min-h-[80px] border-b border-r border-border cursor-pointer hover:bg-secondary/40 transition-colors ${
                      isToday ? "bg-lime/5" : ""
                    } ${pendingSaveMode ? "hover:bg-lime/10 hover:border-lime/30" : ""}`}
                    onClick={() => {
                      if (pendingSaveMode && routine.length > 0) {
                        handleDateClickInSaveMode(dateStr);
                      } else {
                        setSelectedDate(dateStr);
                        setShowScheduleDialog(true);
                      }
                    }}
                  >
                    <div className={`text-xs font-semibold mb-1 ${isToday ? "text-lime" : "text-muted-foreground"}`}>
                      {day}
                    </div>
                    {pendingSaveMode && routine.length > 0 && (
                      <div className="text-[8px] text-lime/60 mb-0.5">click to save</div>
                    )}
                    {entries.map(entry => (
                      <div
                        key={entry.id}
                        className={`text-[9px] px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80 ${
                          entry.completed ? "bg-green-500/20 text-green-400 line-through" : "bg-lime/20 text-lime"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          // FIXED: clicking an entry now opens the detail view instead of just toggling complete
                          handleViewEntry(entry.id, entry.workoutId, entry.customExercises);
                        }}
                      >
                        {entry.customExercises ? "✎ " : ""}{getWorkoutName(entry.workoutId)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {pendingSaveMode
              ? "Click a date to save and schedule your workout there."
              : "Click a date to schedule a workout. Click a workout entry to view details."}
          </p>
        </section>
      </div>

      {/* ===== VIEW WORKOUT DETAIL DIALOG ===== */}
      {viewingWorkout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-border rounded-sm p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-lime" />
                <h3 className="font-heading font-bold text-lg text-foreground">
                  {viewingWorkout.name}
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewingWorkout(null)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              {viewingWorkout.exercises.length} exercises in this workout
            </p>

            {/* Exercise List */}
            <div className="space-y-3 mb-6">
              {viewingWorkout.exercises.map((ex, index) => (
                <div key={index} className="p-3 bg-secondary rounded-sm border border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{ex.exercise}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{ex.jointFunction}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-lime">
                        {ex.customSets} × {ex.customReps}
                      </span>
                      {ex.customWeight > 0 && (
                        <p className="text-[10px] text-muted-foreground">{ex.customWeight} lbs</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {viewingWorkout.exercises.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No exercises in this workout.
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-between border-t border-border pt-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toggleComplete.mutate({
                      id: viewingWorkout.entryId,
                      completed: 1,
                    });
                    setViewingWorkout(null);
                    toast.success("Workout marked as complete!");
                  }}
                  className="text-xs"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Mark Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditEntry(viewingWorkout.entryId, viewingWorkout.workoutId, viewingWorkout.customExercises)}
                  className="text-xs"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Customize
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyWorkout(viewingWorkout.workoutId, viewingWorkout.customExercises)}
                  className="text-xs"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  removeEntry.mutate({ id: viewingWorkout.entryId });
                  setViewingWorkout(null);
                }}
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Save Workout Dialog (with optional schedule) */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-border rounded-sm p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-foreground">
                {saveScheduleDate ? "Save & Schedule Workout" : "Save Workout"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowSaveDialog(false); setSaveScheduleDate(null); }} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Save your current routine ({routine.length} exercises).
            </p>
            {saveScheduleDate && (
              <p className="text-sm text-lime mb-3">
                Scheduling for: <strong>{new Date(saveScheduleDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</strong>
              </p>
            )}
            <input
              type="text"
              placeholder="Workout name (e.g., Push Day A)"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:border-lime focus:outline-none mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (saveScheduleDate) {
                    handleSaveAndSchedule();
                  } else {
                    handleSaveWorkoutOnly();
                  }
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowSaveDialog(false); setSaveScheduleDate(null); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveScheduleDate ? handleSaveAndSchedule : handleSaveWorkoutOnly}
                disabled={createWorkout.isPending || addEntry.isPending}
                className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
              >
                <Save className="w-4 h-4 mr-1" />
                {createWorkout.isPending || addEntry.isPending
                  ? "Saving..."
                  : saveScheduleDate
                    ? "Save & Schedule"
                    : "Save"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Schedule Dialog (normal mode - add existing workout to date) */}
      {showScheduleDialog && selectedDate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-border rounded-sm p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-foreground">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowScheduleDialog(false)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Existing entries for this date */}
            {(() => {
              const dayNum = parseInt(selectedDate.split("-")[2]);
              const entries = getEntriesForDate(dayNum);
              if (entries.length > 0) {
                return (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Scheduled:</p>
                    {entries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleComplete.mutate({ id: entry.id, completed: entry.completed ? 0 : 1 })}
                            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                              entry.completed ? "bg-green-500 border-green-500" : "border-border"
                            }`}
                          >
                            {entry.completed ? <Check className="w-3 h-3 text-white" /> : null}
                          </button>
                          <span className={`text-sm ${entry.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {getWorkoutName(entry.workoutId)}
                          </span>
                          {!!entry.customExercises && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">customized</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowScheduleDialog(false);
                              handleViewEntry(entry.id, entry.workoutId, entry.customExercises);
                            }}
                            className="text-muted-foreground hover:text-lime w-6 h-6 p-0"
                            title="View workout details"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyWorkout(entry.workoutId, entry.customExercises)}
                            className="text-muted-foreground hover:text-blue-400 w-6 h-6 p-0"
                            title="Copy to another day"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowScheduleDialog(false);
                              handleEditEntry(entry.id, entry.workoutId, entry.customExercises);
                            }}
                            className="text-muted-foreground hover:text-lime w-6 h-6 p-0"
                            title="Customize for this day"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEntry.mutate({ id: entry.id })}
                            className="text-muted-foreground hover:text-destructive w-6 h-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            {/* Add workout to this date */}
            {workoutsQuery.data && workoutsQuery.data.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Add workout:</p>
                {workoutsQuery.data.map(workout => (
                  <button
                    key={workout.id}
                    onClick={() => handleSchedule(workout.id)}
                    className="w-full flex items-center justify-between p-3 bg-secondary hover:bg-secondary/80 rounded transition-colors text-left"
                  >
                    <div>
                      <span className="text-sm font-semibold text-foreground">{workout.name}</span>
                      <p className="text-[10px] text-muted-foreground">
                        {((workout.exercises as any[]) || []).length} exercises
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-lime" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No saved workouts. Build and save a routine first.
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowScheduleDialog(false)}>
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Per-Day Customization Dialog */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-border rounded-sm p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-foreground">
                Customize Workout for This Day
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingEntry(null)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Modify exercises, sets, reps, and weight for this specific day. Changes won't affect other days.
            </p>

            {/* Rep-range pre-sets + OptiFill */}
            {editingEntry.exercises.length > 0 && (
              <div className="mb-4 p-3 bg-secondary/50 border border-border rounded space-y-3">
                <div>
                  <h4 className="text-xs font-heading font-semibold text-foreground mb-1">Rep-range pre-sets</h4>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Pre-Set: stamp every exercise to one rep range. OptiFill: pick a different range per exercise.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {REP_RANGES.map((r) => (
                    <Button
                      key={r.id}
                      variant="outline"
                      size="sm"
                      onClick={() => applyDayWide(r.id)}
                      className="text-[11px] h-auto py-1.5 px-2 flex flex-col items-start"
                      title={`Pre-Set: every exercise to ${r.label} (${r.shortLabel})`}
                    >
                      <span className="font-semibold">{r.shortLabel}</span>
                      <span className="text-[9px] text-muted-foreground font-normal">{r.label}</span>
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={autoBucket}
                    className="text-[11px] h-auto py-1.5 px-2 flex flex-col items-start border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                    title="OptiFill: pick a rep range per exercise based on exercise type"
                  >
                    <span className="font-semibold">OptiFill</span>
                    <span className="text-[9px] text-muted-foreground font-normal">varies per ex.</span>
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {editingEntry.exercises.map((ex, index) => {
                const currentRange = inferRangeFromReps(ex.customReps);
                return (
                <div key={index} className="p-3 bg-secondary rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{ex.exercise}</span>
                      <p className="text-[10px] text-muted-foreground">{ex.jointFunction}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExerciseFromDay(index)}
                      className="text-muted-foreground hover:text-destructive w-6 h-6 p-0"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {/* Per-exercise range toggle */}
                  <div className="flex gap-1">
                    {REP_RANGES.map((r) => {
                      const active = currentRange === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => applyPerExerciseRange(index, r.id)}
                          className={`flex-1 text-[10px] py-1 rounded transition-colors ${
                            active
                              ? "bg-lime text-lime-foreground font-semibold"
                              : "bg-background text-muted-foreground hover:bg-secondary border border-border"
                          }`}
                          title={r.description}
                        >
                          {r.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Sets</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={ex.customSets}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= 10) {
                            updateExerciseField(index, "customSets", val);
                          } else if (e.target.value === "") {
                            updateExerciseField(index, "customSets", 1);
                          }
                        }}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:border-lime focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Reps</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={ex.customReps}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= 99) {
                            updateExerciseField(index, "customReps", val);
                          } else if (e.target.value === "") {
                            updateExerciseField(index, "customReps", 1);
                          }
                        }}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:border-lime focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Weight (lbs)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={ex.customWeight}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 0 && val <= 9999) {
                            updateExerciseField(index, "customWeight", val);
                          } else if (e.target.value === "") {
                            updateExerciseField(index, "customWeight", 0);
                          }
                        }}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:border-lime focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {editingEntry.exercises.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                All exercises removed. Save to clear this day's custom workout.
              </p>
            )}

            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditingEntry(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCustomization}
                disabled={updateCustomExercises.isPending}
                className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
              >
                <Save className="w-4 h-4 mr-1" />
                {updateCustomExercises.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Copy to Another Day Dialog */}
      {showCopyDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-border rounded-sm p-6 w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-foreground">Copy Workout</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCopyDialog(false)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Copy this workout to another day. You can then customize the copy independently.
            </p>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1.5">
              Target Date
            </label>
            <input
              type="date"
              value={copyTargetDate}
              onChange={(e) => setCopyTargetDate(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:border-lime focus:outline-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCopyDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmCopy}
                disabled={!copyTargetDate || addEntry.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Copy className="w-4 h-4 mr-1" />
                {addEntry.isPending ? "Copying..." : "Copy"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
