/**
 * ExerciseCard — render-and-add card for a single exercise.
 *
 * Originally part of the 3-step Tier-1/Tier-2 navigation; now lives here
 * as a reusable card consumed by the muscle-group selector.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, Target, Ruler, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type CategoryType,
  type Exercise,
  type Difficulty,
  resolveEffectiveTags,
} from "@/lib/data";
import { useWorkout } from "@/contexts/WorkoutContext";
import { toast } from "sonner";
import { getEquipmentNote } from "@/lib/equipmentNotes";

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const config = {
    hard: { label: "Hard", className: "bg-red-500/20 text-red-400 border-red-500/40" },
    medium: { label: "Medium", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
    easy: { label: "Easy", className: "bg-green-500/20 text-green-400 border-green-500/40" },
  };
  const c = config[difficulty];
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${c.className}`}>
      {c.label}
    </span>
  );
}

export function ExerciseCard({ exercise, category, jointFunctionName }: { exercise: Exercise; category: CategoryType; jointFunctionName: string }) {
  const { addToRoutine } = useWorkout();
  const [expanded, setExpanded] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(
    exercise.equipment?.[0]?.name ?? undefined
  );
  const [selectedAngle, setSelectedAngle] = useState(
    exercise.angles?.[0]?.name ?? undefined
  );

  const handleAdd = () => {
    const exerciseName = [
      exercise.name,
      selectedEquipment && exercise.equipment && exercise.equipment.length > 1 ? `(${selectedEquipment})` : "",
      selectedAngle && exercise.angles && exercise.angles.length > 1 ? `[${selectedAngle}]` : "",
    ].filter(Boolean).join(" ");

    // Resolve tags after equipment + angle overrides so Smart Fill can
    // bucket the rep range correctly (cambered bench -> very-high stretch
    // -> Low; toes-spread squat -> +Hip Abd jointActions; etc.).
    const tags = resolveEffectiveTags(exercise, selectedEquipment, selectedAngle);

    addToRoutine({
      exercise: exerciseName,
      jointFunction: jointFunctionName,
      category,
      difficulty: exercise.difficulty,
      targetedMuscles: exercise.targetedMuscles,
      equipment: selectedEquipment,
      angle: selectedAngle,
      stretchLevel: tags.stretchLevel,
      stability: tags.stability,
      // sets / reps / weight intentionally not set — the context applies
      // sensible defaults; per-set values are configured later, after the
      // user picks a split (P5).
    });
    toast.success(`${exercise.name} added to this week`);
  };

  return (
    <motion.div
      layout
      className="bg-card border-2 border-border rounded-sm hover:border-lime/40 transition-colors group overflow-hidden"
    >
      {/* Main row */}
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-heading font-semibold text-foreground group-hover:text-lime transition-colors">
              {exercise.name}
            </h4>
            <DifficultyBadge difficulty={exercise.difficulty} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {exercise.targetedMuscles.join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-lime"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Expanded customization (no sets/reps/weight — those come later) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-3">
              {/* Description & Mechanics */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{exercise.description}</p>
                <p className="italic text-[11px]">{exercise.mechanics}</p>
              </div>

              {/* Equipment selector */}
              {exercise.equipment && exercise.equipment.length > 1 && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1 mb-1.5">
                    <Target className="w-3 h-3" /> Equipment / Handle
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.equipment.map((eq) => (
                      <button
                        key={eq.id}
                        onClick={() => setSelectedEquipment(eq.name)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          selectedEquipment === eq.name
                            ? "bg-lime/20 border-lime text-lime"
                            : "bg-secondary border-border text-muted-foreground hover:border-lime/40"
                        }`}
                        title={getEquipmentNote(eq)}
                      >
                        {eq.name}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const active = exercise.equipment.find((e) => e.name === selectedEquipment);
                    if (!active) return null;
                    return (
                      <p className="mt-1.5 text-[11px] text-muted-foreground italic flex items-start gap-1.5 leading-snug">
                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{getEquipmentNote(active)}</span>
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Angle selector */}
              {exercise.angles && exercise.angles.length > 1 && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1 mb-1.5">
                    <Ruler className="w-3 h-3" /> Angle / Position
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.angles.map((angle) => (
                      <button
                        key={angle.id}
                        onClick={() => setSelectedAngle(angle.name)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          selectedAngle === angle.name
                            ? "bg-blue-500/20 border-blue-500 text-blue-400"
                            : "bg-secondary border-border text-muted-foreground hover:border-blue-500/40"
                        }`}
                        title={angle.description}
                      >
                        {angle.name}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const active = exercise.angles.find((a) => a.name === selectedAngle);
                    if (!active) return null;
                    return (
                      <p className="mt-1.5 text-[11px] text-muted-foreground italic flex items-start gap-1.5 leading-snug">
                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{active.description}</span>
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

