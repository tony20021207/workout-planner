/**
 * ExerciseList — Step 3: Display exercises organized by subcategory.
 *
 * In the weekly-pool model, picking an exercise here just adds it to the
 * week. Sets / reps / weight are deferred to the per-day allocation step
 * after the user picks a split (P5).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, Target, Ruler, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type CategoryType,
  type JointFunction,
  type Exercise,
  type Subcategory,
  type Difficulty,
  getProgrammingParameters,
} from "@/lib/data";
import { useWorkout } from "@/contexts/WorkoutContext";
import { toast } from "sonner";
import { getEquipmentNote } from "@/lib/equipmentNotes";

interface ExerciseListProps {
  category: CategoryType;
  jointFunction: JointFunction;
}

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

function ExerciseCard({ exercise, category, jointFunctionName }: { exercise: Exercise; category: CategoryType; jointFunctionName: string }) {
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

    addToRoutine({
      exercise: exerciseName,
      jointFunction: jointFunctionName,
      category,
      difficulty: exercise.difficulty,
      targetedMuscles: exercise.targetedMuscles,
      equipment: selectedEquipment,
      angle: selectedAngle,
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

function SubcategorySection({ subcategory, category, jointFunctionName }: { subcategory: Subcategory; category: CategoryType; jointFunctionName: string }) {
  return (
    <div className="space-y-3">
      <div className="border-l-2 border-lime/50 pl-3">
        <h4 className="font-heading font-semibold text-sm text-foreground">{subcategory.name}</h4>
        <p className="text-[11px] text-muted-foreground">{subcategory.description}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subcategory.exercises.map((exercise: Exercise, index: number) => (
          <motion.div
            key={exercise.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <ExerciseCard
              exercise={exercise}
              category={category}
              jointFunctionName={jointFunctionName}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function ExerciseList({ category, jointFunction }: ExerciseListProps) {
  const params = getProgrammingParameters(category);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={jointFunction.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-sm bg-lime text-lime-foreground font-heading font-bold text-lg">
            3
          </span>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Choose Exercises for the Week
          </h2>
        </div>

        {/* Programming Parameters — informational only at this step */}
        <div className="p-4 bg-secondary/40 border border-lime/20 rounded-sm">
          <h3 className="font-heading font-semibold text-sm text-lime mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Programming Targets ({category === "systemic" ? "Tier 1" : "Tier 2"})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground uppercase tracking-wider block">Sets</span>
              <span className="font-semibold text-foreground">{params.sets}</span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase tracking-wider block">Reps</span>
              <span className="font-semibold text-foreground">{params.reps}</span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase tracking-wider block">Frequency</span>
              <span className="font-semibold text-foreground">{params.frequency}</span>
            </div>
            <div>
              <span className="text-muted-foreground uppercase tracking-wider block">Rest</span>
              <span className="font-semibold text-foreground">{params.rest}</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground italic">
            Sets, reps, and weight are auto-recommended after you pick a split. Pick the exercises you want this week — that's all this step does.
          </p>
        </div>

        {/* Subcategories with exercises */}
        <div className="space-y-6">
          {jointFunction.subcategories.map((subcategory: Subcategory) => (
            <SubcategorySection
              key={subcategory.id}
              subcategory={subcategory}
              category={category}
              jointFunctionName={jointFunction.name}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
