/**
 * ExerciseList — Step 3: Display exercises organized by subcategory with difficulty, equipment, angles, muscles, and customization
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Dumbbell, Clock, RotateCcw, Flame, ChevronDown, Target, Ruler, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type CategoryType,
  type JointFunction,
  type Exercise,
  type Subcategory,
  type Difficulty,
  getProgrammingParameters,
  getDefaultSets,
  getDefaultReps,
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
  const params = getProgrammingParameters(category);
  const [expanded, setExpanded] = useState(false);
  const [numSets, setNumSets] = useState(getDefaultSets(category));
  const [defaultReps, setDefaultReps] = useState(getDefaultReps(category));
  const [defaultWeight, setDefaultWeight] = useState(0);
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
      warmup: exercise.warmup,
      numSets,
      defaultReps,
      defaultWeight,
    });
    toast.success(`${exercise.name} added to routine`, {
      description: `${numSets} sets × ${defaultReps} reps${defaultWeight > 0 ? ` @ ${defaultWeight} lbs` : ""}`,
    });
  };

  const handleSetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseInt(raw, 10);
    if (raw === "") {
      setNumSets(1);
    } else if (!isNaN(num)) {
      setNumSets(Math.min(10, Math.max(1, num)));
    }
  };

  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseInt(raw, 10);
    if (raw === "") {
      setDefaultReps(1);
    } else if (!isNaN(num)) {
      setDefaultReps(Math.min(99, Math.max(1, num)));
    }
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseInt(raw, 10);
    if (raw === "") {
      setDefaultWeight(0);
    } else if (!isNaN(num)) {
      setDefaultWeight(Math.min(9999, Math.max(0, num)));
    }
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

      {/* Customization subtab */}
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

              {/* Sets with plus/minus */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1 mb-1.5">
                    <Dumbbell className="w-3 h-3" /> Sets
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setNumSets(Math.max(1, numSets - 1))}
                      className="w-7 h-7 flex items-center justify-center bg-secondary border border-border rounded text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={numSets}
                      onChange={handleSetsChange}
                      className="w-10 bg-secondary border border-border rounded px-1 py-1 text-sm text-foreground text-center focus:border-lime focus:outline-none"
                    />
                    <button
                      onClick={() => setNumSets(Math.min(10, numSets + 1))}
                      className="w-7 h-7 flex items-center justify-center bg-secondary border border-border rounded text-muted-foreground hover:text-lime hover:border-lime/50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1 mb-1.5">
                    <RotateCcw className="w-3 h-3" /> Reps (default)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={defaultReps}
                    onChange={handleRepsChange}
                    className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground focus:border-lime focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1 mb-1.5">
                    <Dumbbell className="w-3 h-3" /> Weight (lbs)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={defaultWeight}
                    onChange={handleWeightChange}
                    className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm text-foreground focus:border-lime focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Default: {params.sets} × {params.reps} | {params.rest} rest | {params.frequency}
              </p>
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
            Choose Exercises
          </h2>
        </div>

        {/* Programming Parameters Panel */}
        <div className="p-5 bg-secondary/50 border-2 border-lime/30 rounded-sm">
          <h3 className="font-heading font-semibold text-lime mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Algorithm Output — Programming Parameters
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                <Dumbbell className="w-3 h-3" />
                Sets
              </div>
              <p className="font-heading font-bold text-lg text-foreground">{params.sets}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                <RotateCcw className="w-3 h-3" />
                Reps
              </div>
              <p className="font-heading font-bold text-lg text-foreground">{params.reps}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                Frequency
              </div>
              <p className="font-heading font-bold text-lg text-foreground">{params.frequency}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                Rest
              </div>
              <p className="font-heading font-bold text-lg text-foreground">{params.rest}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground italic">
            {params.rationale}
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
