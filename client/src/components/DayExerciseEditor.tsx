/**
 * DayExerciseEditor — One row inside a SplitBuilder day card.
 *
 * Simplified UX: the workout builder only edits REP RANGE per exercise.
 * Granular per-set sets/reps/weight editing lives on the calendar (where
 * users plan a specific training day). Here the user picks one of:
 *   - Low / Medium / High pre-set (one of the three rep ranges)
 *   - Smart Fill (matrix-driven pick based on the exercise's tags)
 *   - Customize (free-form reps + sets inputs)
 *
 * Move-to-day popover stays available.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ArrowRightLeft,
  GripVertical,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkout, MAX_FAVORITES, type RoutineItem } from "@/contexts/WorkoutContext";
import { toast } from "sonner";
import {
  REP_RANGES,
  REP_RANGE_BY_ID,
  applyRangeToRoutineSets,
  inferRangeFromReps,
  smartFillRangeForExperience,
  type RepRangeId,
} from "@/lib/repRanges";
import { computeSmartFillSets } from "@/lib/splitPresets";
import { getExperience } from "@/lib/experience";

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

/** Special select values that aren't rep ranges. */
type SelectValueId = RepRangeId | "smart-fill" | "custom";

export default function DayExerciseEditor({
  item,
  index,
  dayId,
  allDays,
  onMoveExercise,
}: DayExerciseEditorProps) {
  const { updateRoutineItem, routine, split, experience, favorites, toggleFavorite, isFavorite } = useWorkout();
  const [expanded, setExpanded] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const starred = isFavorite(item.id);

  const handleToggleFavorite = () => {
    if (!starred && favorites.length >= MAX_FAVORITES) {
      toast.error(`Up to ${MAX_FAVORITES} favorites — unstar another first`);
      return;
    }
    toggleFavorite(item.id);
  };

  const expProfile = getExperience(experience) ?? getExperience("foot-in-door")!;

  // Which rep-range bucket the current sets fall into.
  const currentRange: RepRangeId =
    item.sets.length > 0 ? inferRangeFromReps(item.sets[0].reps) : "medium";

  const applyRangePreset = (rangeId: RepRangeId) => {
    setCustomMode(false);
    updateRoutineItem(item.id, { sets: applyRangeToRoutineSets(item, rangeId) });
  };

  const applySmartFill = () => {
    setCustomMode(false);
    const rangeId = smartFillRangeForExperience(item, experience);
    const setsCount = computeSmartFillSets(item, routine, split.dayAssignments, expProfile);
    updateRoutineItem(item.id, { sets: applyRangeToRoutineSets(item, rangeId, setsCount) });
  };

  const handleSelectChange = (value: string) => {
    if (value === "smart-fill") {
      applySmartFill();
    } else if (value === "custom") {
      setCustomMode(true);
    } else {
      applyRangePreset(value as RepRangeId);
    }
  };

  // Customize handlers: edit a single reps value + sets count uniformly.
  // When sets[] is empty (the default after add), seed with split-aware
  // defaults so the user starts from a reasonable place.
  const customReps = item.sets[0]?.reps ?? 12;
  const customSetsCount = item.sets.length || expProfile.setsPerExercise.compound;
  const customWeight = item.sets[0]?.weight ?? 0;

  const updateCustomReps = (reps: number) => {
    const newSets = Array.from({ length: customSetsCount }, () => ({
      reps,
      weight: customWeight,
    }));
    updateRoutineItem(item.id, { sets: newSets });
  };

  const updateCustomSetsCount = (n: number) => {
    const safe = Math.max(1, Math.min(10, n));
    const newSets = Array.from({ length: safe }, () => ({
      reps: customReps,
      weight: customWeight,
    }));
    updateRoutineItem(item.id, { sets: newSets });
  };

  // Compact summary for the collapsed row.
  const summary =
    item.sets.length === 0
      ? "Reps not set yet"
      : `${item.sets.length} × ${customReps} reps`;
  const currentLabel = REP_RANGE_BY_ID[currentRange].shortLabel;

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
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {summary}
            {item.sets.length > 0 && (
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                {" "}· {currentLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className={`w-7 h-7 p-0 ${
              starred
                ? "text-yellow-400 hover:text-yellow-300"
                : "text-muted-foreground/50 hover:text-yellow-300"
            }`}
            title={
              starred
                ? "Unfavorite"
                : favorites.length >= MAX_FAVORITES
                  ? `Up to ${MAX_FAVORITES} favorites`
                  : "Mark as favorite"
            }
          >
            <Star className="w-3 h-3" fill={starred ? "currentColor" : "none"} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 p-0"
            title={expanded ? "Hide" : "Edit rep range"}
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

      {/* Expanded — rep-range dropdown + optional Customize input */}
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
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Rep range
                </span>
                <Select
                  value={customMode ? "custom" : currentRange}
                  onValueChange={handleSelectChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REP_RANGES.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        <span className="font-semibold">{r.shortLabel}</span>{" "}
                        <span className="text-muted-foreground">— {r.label}</span>
                      </SelectItem>
                    ))}
                    <SelectItem value="smart-fill" className="text-xs text-purple-300">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Smart Fill — pick by exercise
                    </SelectItem>
                    <SelectItem value="custom" className="text-xs">
                      Customize — free-form reps & sets
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customize: simple reps + sets inputs (one value applies uniformly) */}
              {customMode && (
                <div className="flex items-center gap-2 text-[11px] pt-1">
                  <NumberInput
                    value={customSetsCount}
                    onChange={updateCustomSetsCount}
                    min={1}
                    max={10}
                    className="w-12"
                  />
                  <span className="text-muted-foreground">sets ×</span>
                  <NumberInput
                    value={customReps}
                    onChange={updateCustomReps}
                    min={1}
                    max={50}
                    className="w-12"
                  />
                  <span className="text-muted-foreground">reps</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
