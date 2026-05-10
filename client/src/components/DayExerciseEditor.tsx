/**
 * DayExerciseEditor — One row inside a SplitBuilder day card.
 *
 * Shows the exercise's name, targeted muscles, and a collapsed
 * sets-and-reps summary. Click the chevron to expand into an inline
 * per-set editor (reps + weight per set, plus add/remove set buttons).
 *
 * Move-to-day popover stays available even when collapsed.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ArrowRightLeft,
  GripVertical,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkout, type RoutineItem, type SetDetail } from "@/contexts/WorkoutContext";
import { recommendSetsForItem, autoRecommendSets } from "@/lib/setRecommender";
import {
  REP_RANGES,
  applyRangeToRoutineSets,
  inferRangeFromReps,
  type RepRangeId,
} from "@/lib/repRanges";

function NumberInput({
  value,
  onChange,
  min = 0,
  max = 9999,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [local, setLocal] = useState(String(value));

  const commit = () => {
    const n = parseInt(local, 10);
    if (isNaN(n) || n < min) {
      setLocal(String(min));
      onChange(min);
    } else if (n > max) {
      setLocal(String(max));
      onChange(max);
    } else {
      setLocal(String(n));
      onChange(n);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        const n = parseInt(e.target.value, 10);
        if (!isNaN(n) && n >= min && n <= max) onChange(n);
      }}
      onBlur={commit}
      className={`bg-secondary border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center focus:border-lime focus:outline-none ${className}`}
    />
  );
}

interface DayExerciseEditorProps {
  item: RoutineItem;
  index: number;
  dayId: string;
  allDays: { id: string; name: string }[];
  onMoveExercise: (exerciseId: string, fromDayId: string, toDayId: string) => void;
}

export default function DayExerciseEditor({
  item,
  index,
  dayId,
  allDays,
  onMoveExercise,
}: DayExerciseEditorProps) {
  const { updateRoutineItem, experience } = useWorkout();
  const [expanded, setExpanded] = useState(false);
  const rec = recommendSetsForItem(item, experience);

  const updateSet = (setIdx: number, partial: Partial<SetDetail>) => {
    const nextSets = item.sets.map((s, i) => (i === setIdx ? { ...s, ...partial } : s));
    updateRoutineItem(item.id, { sets: nextSets });
  };

  const addSet = () => {
    const last = item.sets[item.sets.length - 1];
    const nextSet: SetDetail = {
      reps: last?.reps ?? rec.defaultReps,
      weight: last?.weight ?? rec.defaultWeight,
    };
    updateRoutineItem(item.id, { sets: [...item.sets, nextSet] });
  };

  const removeSet = () => {
    if (item.sets.length <= 1) return;
    updateRoutineItem(item.id, { sets: item.sets.slice(0, -1) });
  };

  const applyAutoRec = () => {
    updateRoutineItem(item.id, { sets: autoRecommendSets(item, experience) });
  };

  const applyRangePreset = (rangeId: RepRangeId) => {
    updateRoutineItem(item.id, { sets: applyRangeToRoutineSets(item, rangeId) });
  };

  // Which preset bucket this exercise's current reps fall into.
  const currentRange: RepRangeId = item.sets.length > 0
    ? inferRangeFromReps(item.sets[0].reps)
    : "medium";

  // Compact summary for the collapsed row.
  const summary = (() => {
    const reps = item.sets.map((s) => s.reps);
    const weights = item.sets.map((s) => s.weight);
    const allSameReps = reps.every((r) => r === reps[0]);
    const allSameWeight = weights.every((w) => w === weights[0]);
    const repsLabel = allSameReps ? `${reps[0]}` : `${Math.min(...reps)}–${Math.max(...reps)}`;
    const weightLabel = allSameWeight
      ? weights[0] === 0
        ? "weight TBD"
        : `${weights[0]} lbs`
      : `${Math.min(...weights)}–${Math.max(...weights)} lbs`;
    return `${item.sets.length} × ${repsLabel} reps · ${weightLabel}`;
  })();

  return (
    <div className="border-b border-border/50 last:border-b-0 group">
      {/* Collapsed row */}
      <div className="p-2.5 flex items-start gap-2">
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums mt-1 w-4 text-right shrink-0">
          {index + 1}
        </span>
        <GripVertical className="w-3 h-3 text-muted-foreground/50 mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground truncate">{item.exercise}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {item.targetedMuscles.join(", ")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{summary}</div>
        </div>
        <div className="flex flex-col gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 p-0"
            title={expanded ? "Hide sets" : "Edit sets"}
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-7 h-7 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
                title="Move to another day"
              >
                <ArrowRightLeft className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                Move to
              </div>
              {allDays
                .filter((d) => d.id !== dayId)
                .map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onMoveExercise(item.id, dayId, d.id)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-secondary text-foreground"
                  >
                    {d.name}
                  </button>
                ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Expanded set editor */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-2 bg-secondary/20">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">
                  Suggested: {rec.numSets} × {rec.repRangeLabel} reps · rest ~{rec.restSeconds}s
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={applyAutoRec}
                  className="h-6 px-2 text-[10px] text-purple-300 hover:text-purple-200"
                  title="Apply the auto-recommendation"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-fill
                </Button>
              </div>

              {/* Rep-range bucket toggle for this exercise */}
              <div className="flex gap-1">
                {REP_RANGES.map((r) => {
                  const active = currentRange === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => applyRangePreset(r.id)}
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

              {/* Per-set rows */}
              <div className="space-y-1">
                {item.sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground font-mono w-7">S{i + 1}</span>
                    <NumberInput
                      value={s.reps}
                      onChange={(v) => updateSet(i, { reps: v })}
                      min={1}
                      max={99}
                      className="w-12"
                    />
                    <span className="text-muted-foreground">reps</span>
                    <span className="text-muted-foreground">@</span>
                    <NumberInput
                      value={s.weight}
                      onChange={(v) => updateSet(i, { weight: v })}
                      min={0}
                      max={9999}
                      className="w-14"
                    />
                    <span className="text-muted-foreground">lbs</span>
                  </div>
                ))}
              </div>

              {/* Set count controls */}
              <div className="flex items-center gap-1 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeSet}
                  disabled={item.sets.length <= 1}
                  className="w-7 h-7 p-0 text-muted-foreground hover:text-destructive"
                  title="Remove last set"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-center">
                  {item.sets.length} sets
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSet}
                  disabled={item.sets.length >= 10}
                  className="w-7 h-7 p-0 text-muted-foreground hover:text-lime"
                  title="Add set"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
