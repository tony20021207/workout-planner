/**
 * DayExerciseEditor — One row inside a SplitBuilder day card.
 *
 * Simplified UX: the workout builder only edits REP RANGE per exercise.
 * Granular per-set sets/reps/weight editing lives on the calendar (where
 * users plan a specific training day). Here the user picks one of:
 *   - Low / Medium / High pre-set (one of the three rep ranges)
 *   - Opti-fill (matrix-driven pick based on the exercise's tags)
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
  PlayCircle,
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
import { videoUrlForRoutineItem } from "@/lib/exerciseVideo";
import { toast } from "sonner";
import {
  REP_RANGES,
  REP_RANGE_BY_ID,
  applyRangeToRoutineSets,
  inferRangeFromReps,
  smartFillRangeForExperience,
  type RepRangeId,
} from "@/lib/repRanges";
import { computeMatrixSets } from "@/lib/splitPresets";
import { resolveProfile } from "@/lib/experience";

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
  /** If set, renders an inline preview annotation showing the projected
   * sets[] (e.g., for Week 2 Load/Deload preview before commit). The
   * underlying item.sets stays untouched until the user confirms. */
  previewSets?: { reps: number; weight: number }[];
  /** If set, this exercise moved to its current day via the staged
   * Rebalance preview. The value is the name of the day it was on
   * before — used to render a "(was Day X)" badge. */
  movedFromDayName?: string | null;
  /** If set, this exercise was swapped in via the staged Swap preview.
   * The value is the original exercise name — used to render a
   * "(was Original Name)" badge. */
  swappedFromExerciseName?: string | null;
}

/** Special select values that aren't rep ranges. */
type SelectValueId = RepRangeId | "smart-fill" | "custom";

export default function DayExerciseEditor({
  item,
  index,
  dayId,
  allDays,
  onMoveExercise,
  previewSets,
  movedFromDayName,
  swappedFromExerciseName,
}: DayExerciseEditorProps) {
  const { updateRoutineItem, routine, split, experience, volume, favorites, toggleFavorite, isFavorite } = useWorkout();
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

  const expProfile = resolveProfile(experience, volume);

  // Which rep-range bucket the current sets fall into. Default to
  // med-low (8–12) for unconfigured items — the heavy-hypertrophy
  // bucket the matrix uses for compounds.
  const currentRange: RepRangeId =
    item.sets.length > 0 ? inferRangeFromReps(item.sets[0].reps) : "med-low";

  const applyRangePreset = (rangeId: RepRangeId) => {
    setCustomMode(false);
    updateRoutineItem(item.id, { sets: applyRangeToRoutineSets(item, rangeId) });
  };

  const applySmartFill = () => {
    setCustomMode(false);
    const rangeId = smartFillRangeForExperience(item, experience);
    const setsCount = computeMatrixSets(item, routine, split.dayAssignments, expProfile);
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
  // Fallback default for set count when the user hasn't applied a
  // Pre-Set or Opti-fill yet. Derived from the volume tier (low→2,
  // med→3, high→4) — same formula setRecommender + the allocator
  // fallback use, now that the static setsPerExercise field is gone.
  const defaultSetCount = Math.max(1, Math.round(expProfile.weeklyVolumePerMajor / 5));
  const customSetsCount = item.sets.length || defaultSetCount;
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
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">{item.exercise}</div>
            {/* Watch demo link — IP-safe outbound link to a public
                platform (YouTube curated or fallback search). Tiny so it
                doesn't crowd the row, but always present. */}
            <a
              href={videoUrlForRoutineItem(item)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-0.5 rounded-sm text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Watch a demo of this exercise (opens in a new tab)"
              aria-label={`Watch demo of ${item.exercise}`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {item.targetedMuscles.join(", ")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono flex items-center gap-1.5 flex-wrap">
            <span>{summary}</span>
            {item.sets.length > 0 && (
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                · {currentLabel}
              </span>
            )}
            {/* Recommended RIR per-exercise: read from experience profile.
                Compounds get a different target than isolations. The
                tag is informational — never enforced. */}
            {expProfile && (
              <span
                className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded-sm bg-purple-500/15 text-purple-300 border border-purple-500/30"
                title={`Recommended RIR target for this exercise type at ${expProfile.name}`}
              >
                {item.category === "systemic"
                  ? `RIR ${expProfile.rir.compound}`
                  : `RIR ${expProfile.rir.isolation}`}
              </span>
            )}
          </div>
          {/* Load/Deload preview annotation — shown right below the
              current sets when a preview is staged. Color-coded by
              direction: lime for load (sets going up), red for deload
              (sets going down), muted for no change. */}
          {previewSets && (() => {
            const currentCount = item.sets.length;
            const projCount = previewSets.length;
            const delta = projCount - currentCount;
            const color =
              delta > 0
                ? "text-lime"
                : delta < 0
                  ? "text-red-400"
                  : "text-muted-foreground";
            const label =
              delta > 0
                ? `load +${delta}`
                : delta < 0
                  ? `deload ${delta}`
                  : "held";
            const projReps = previewSets[0]?.reps ?? customReps;
            return (
              <div className={`text-[10px] mt-0.5 font-mono ${color} flex items-center gap-1.5`}>
                <span className="opacity-70">→</span>
                <span className="font-semibold">
                  {projCount} × {projReps} reps
                </span>
                <span className="text-[9px] uppercase tracking-wider opacity-80">
                  ({label})
                </span>
              </div>
            );
          })()}
          {/* Rebalance preview: this exercise moved from a different day. */}
          {movedFromDayName && (
            <div className="text-[10px] mt-0.5 text-purple-300/80 flex items-center gap-1">
              <span className="opacity-70">↩</span>
              <span className="italic">was {movedFromDayName}</span>
            </div>
          )}
          {/* Swap preview: this exercise was swapped in from a different pick. */}
          {swappedFromExerciseName && (
            <div className="text-[10px] mt-0.5 text-yellow-300/80 flex items-center gap-1">
              <span className="opacity-70">↩</span>
              <span className="italic">was {swappedFromExerciseName}</span>
            </div>
          )}
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
                      Opti-fill — pick by exercise
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
