/**
 * ScheduledEditBanner — pinned at the top of the home page when the
 * user is editing a scheduled calendar workout (clicked "Edit in
 * Planner" from CalendarPage). Three actions:
 *
 *   Save changes  → workout.update overwrites the original entry's
 *                   workout content. Original scheduled date keeps
 *                   the new content. Original workout overwritten.
 *
 *   Save as new   → workout.create as a fresh workout (preserves the
 *                   original on the calendar). User can later schedule
 *                   the new workout elsewhere. The original scheduled
 *                   entry stays untouched.
 *
 *   Cancel        → cancelEditingScheduledEntry restores the routine /
 *                   split / mesocycle backup. Navigates back to /calendar.
 *
 * After Save / Save as new / Cancel, the user is routed back to the
 * calendar.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Save, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkout } from "@/contexts/WorkoutContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface SerializedExercise {
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

export default function ScheduledEditBanner() {
  const {
    routine,
    editingScheduledEntry,
    finishEditingScheduledEntry,
    cancelEditingScheduledEntry,
  } = useWorkout();
  const [, setLocation] = useLocation();
  const [newName, setNewName] = useState("");
  const [showSaveAsNew, setShowSaveAsNew] = useState(false);

  const updateWorkout = trpc.workout.update.useMutation();
  const createWorkout = trpc.workout.create.useMutation();

  if (!editingScheduledEntry) return null;

  /** Serialize the current routine[] back into the CalendarExercise
   * shape that the workout table stores. Mirrors the buildWorkoutPayload
   * inverse used in CalendarPage. */
  const serialize = (): SerializedExercise[] =>
    routine.map((item) => ({
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

  const handleSaveChanges = async () => {
    if (!editingScheduledEntry) return;
    if (routine.length === 0) {
      toast.error("Empty routine — add or keep exercises before saving");
      return;
    }
    try {
      await updateWorkout.mutateAsync({
        id: editingScheduledEntry.workoutId,
        exercises: serialize(),
      });
      toast.success(`Updated "${editingScheduledEntry.workoutName}"`);
      finishEditingScheduledEntry();
      setLocation("/calendar");
    } catch (err) {
      toast.error(
        `Failed to save: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  };

  const handleSaveAsNew = async () => {
    if (!editingScheduledEntry) return;
    const name = newName.trim() || `${editingScheduledEntry.workoutName} (modified)`;
    if (routine.length === 0) {
      toast.error("Empty routine — add or keep exercises before saving");
      return;
    }
    try {
      await createWorkout.mutateAsync({
        name,
        exercises: serialize(),
      });
      toast.success(`Saved "${name}" as a new workout`);
      finishEditingScheduledEntry();
      setLocation("/calendar");
    } catch (err) {
      toast.error(
        `Failed to save: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  };

  const handleCancel = () => {
    cancelEditingScheduledEntry();
    setLocation("/calendar");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-purple-500/10 border-b-2 border-purple-400/40"
    >
      <div className="container py-3 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-purple-500/20 rounded-sm shrink-0">
              <CalendarCheck className="w-5 h-5 text-purple-200" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-sm text-foreground truncate">
                Editing: {editingScheduledEntry.workoutName}
              </h3>
              <p className="text-xs text-muted-foreground leading-snug">
                Scheduled {editingScheduledEntry.date}. Make changes, then{" "}
                <span className="text-foreground font-semibold">Save changes</span> to
                overwrite, or <span className="text-foreground font-semibold">Save as new</span>{" "}
                to keep the original and add a new workout to your library.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleSaveChanges}
              disabled={updateWorkout.isPending || routine.length === 0}
              className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save changes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSaveAsNew((v) => !v)}
              className="border-purple-400/50 text-purple-200 hover:bg-purple-500/15"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Save as new
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
        {showSaveAsNew && (
          <div className="flex items-center gap-2 p-3 bg-purple-500/5 border border-purple-400/30 rounded-sm">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`${editingScheduledEntry.workoutName} (modified)`}
              className="flex-1 text-xs bg-background border border-border rounded-sm px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-400"
            />
            <Button
              size="sm"
              onClick={handleSaveAsNew}
              disabled={createWorkout.isPending || routine.length === 0}
              className="bg-purple-500 text-white hover:bg-purple-600 font-semibold text-xs"
            >
              Save as new workout
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
