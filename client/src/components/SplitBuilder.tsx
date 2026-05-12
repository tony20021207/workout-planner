/**
 * SplitBuilder — Step 4 of the microcycle flow.
 *
 * After the user has rated their pool and is happy with the selection,
 * they pick a weekly split (FB3 / UL4 / PPL6 / Custom). The auto-allocator
 * distributes the pool across the chosen split's days following the rules
 * in splitPresets.ts (40/60 compound/iso, joint-function overlap,
 * priming-first ordering).
 *
 * The user can then manually move exercises between days — the day-card
 * UI shows each assigned exercise with arrow buttons that pop a small
 * "Move to" menu listing the other days.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
  Zap,
  Target,
  RefreshCw,
  Settings,
  X,
  Wand2,
  Flame,
  Loader2,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkout, type RoutineItem, type SessionWarmup } from "@/contexts/WorkoutContext";
import {
  ALL_PRESETS,
  SPLIT_PRESETS,
  allocatePoolToSplit,
  computeMatrixSets,
  isCompoundRatioOnTarget,
  COMPOUND_PCT_GOOD_MIN,
  COMPOUND_PCT_GOOD_MAX,
  type SplitId,
  type SplitPreset,
} from "@/lib/splitPresets";
import { getExperience } from "@/lib/experience";
import { trpc } from "@/lib/trpc";
import { LIFESTYLE_PROFILES } from "@/lib/lifestyle";
import {
  REP_RANGES,
  REP_RANGE_BY_ID,
  applyRangeToRoutineSets,
  inferRangeFromReps,
  smartFillRangeForExperience,
  type RepRangeId,
} from "@/lib/repRanges";
import { toast } from "sonner";
import { swapAllNonFavoritesWeek2, type SwapSize } from "@/lib/variantSwap";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  isCalfExercise,
  isRectusAbsExercise,
  type FinisherCatalogPick,
  type FinisherKind,
} from "@/lib/finisher";
import { antagonistOrder, canApplyAntagonist } from "@/lib/dayOrdering";
import { computeWeek2LoadDeload } from "@/lib/loadDeload";
import { rebalanceForWeek2 } from "@/lib/rebalance";
import { generateId, getProgrammingParameters } from "@/lib/data";
import FinisherPickerModal from "./FinisherPickerModal";
import DayExerciseEditor from "./DayExerciseEditor";
import PostSplitRater from "./PostSplitRater";

/**
 * Calves + Abs finisher dropdowns. Two selects side-by-side; each
 * shows "Off" plus 3..N day options where N is the split's daysPerWeek.
 * When the user selects a value, the parent's onChange handler decides
 * whether to apply directly (routine has matching exercise) or open
 * the modal picker.
 */
function FinisherPanel({
  routine,
  splitDaysPerWeek,
  calvesFrequency,
  absFrequency,
  onChange,
}: {
  routine: RoutineItem[];
  splitDaysPerWeek: number;
  calvesFrequency: number | null;
  absFrequency: number | null;
  onChange: (kind: FinisherKind, freq: number | null) => void;
}) {
  const calfPicks = routine.filter((r) => isCalfExercise(r.exercise));
  const absPicks = routine.filter((r) => isRectusAbsExercise(r.exercise));
  // Frequency options: Off, 3, 4, ..., capped at split.daysPerWeek.
  const dayOptions: number[] = [];
  for (let n = 3; n <= splitDaysPerWeek; n++) dayOptions.push(n);

  return (
    <div className="p-3 bg-amber-500/[0.04] border-2 border-amber-500/30 rounded-sm space-y-2.5">
      <div>
        <h5 className="font-heading font-bold text-sm text-foreground leading-tight">
          Calves + Abs Finishers
        </h5>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
          Calves and abs (rectus) grow best with higher frequency. Pick a per-week day count to make them a daily finisher.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <FinisherRow
          kind="calves"
          label="Calves"
          frequency={calvesFrequency}
          dayOptions={dayOptions}
          existingPicks={calfPicks}
          onChange={onChange}
        />
        <FinisherRow
          kind="abs"
          label="Abs (rectus)"
          frequency={absFrequency}
          dayOptions={dayOptions}
          existingPicks={absPicks}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function FinisherRow({
  kind,
  label,
  frequency,
  dayOptions,
  existingPicks,
  onChange,
}: {
  kind: FinisherKind;
  label: string;
  frequency: number | null;
  dayOptions: number[];
  existingPicks: RoutineItem[];
  onChange: (kind: FinisherKind, freq: number | null) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-foreground">{label}:</label>
        <Select
          value={frequency === null ? "off" : String(frequency)}
          onValueChange={(v) => onChange(kind, v === "off" ? null : Number(v))}
        >
          <SelectTrigger className="h-7 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off" className="text-xs">Off</SelectItem>
            {dayOptions.map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                {n} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {frequency !== null && existingPicks.length > 0 && (
        <div className="text-[10px] text-lime/90 leading-snug">
          ✓ Using:{" "}
          <span className="font-semibold">
            {existingPicks.map((p) => p.exercise).join(", ")}
          </span>
          {existingPicks.length > 1 && (
            <span className="text-muted-foreground"> (rotated across days)</span>
          )}
        </div>
      )}
      {frequency !== null && existingPicks.length === 0 && (
        <div className="text-[10px] text-yellow-300/90 leading-snug">
          No {kind} exercise in your routine — picker will open
        </div>
      )}
    </div>
  );
}

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: SplitPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 border-2 rounded-sm transition-all ${
        selected
          ? "border-lime bg-lime/5"
          : "border-border bg-card hover:border-lime/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h4 className="font-heading font-bold text-sm text-foreground">{preset.name}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {preset.daysPerWeek} day{preset.daysPerWeek !== 1 ? "s" : ""} / week
          </p>
        </div>
        {selected && <CheckCircle2 className="w-5 h-5 text-lime shrink-0" />}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{preset.description}</p>
    </button>
  );
}

function CustomCard({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 border-2 border-dashed rounded-sm transition-all ${
        selected
          ? "border-lime bg-lime/5"
          : "border-border bg-card hover:border-lime/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-heading font-bold text-sm text-foreground">Custom Split</h4>
        </div>
        {selected && <CheckCircle2 className="w-5 h-5 text-lime shrink-0" />}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Hand-build days, name them, and assign exercises manually. Coming in P4c.
      </p>
    </button>
  );
}

function WarmupBlock({ warmups }: { warmups: SessionWarmup[] }) {
  return (
    <div className="border-b border-orange-500/20 bg-orange-500/[0.03]">
      <div className="px-3 py-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-orange-300 font-semibold border-b border-orange-500/20">
        <Flame className="w-3 h-3" />
        Session Warmup · 3 dynamic
      </div>
      <ol className="divide-y divide-orange-500/10">
        {warmups.map((w, i) => (
          <li key={i} className="p-3 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <h6 className="font-heading font-semibold text-xs text-foreground leading-tight">
                {i + 1}. {w.name}
              </h6>
              <span className="text-[10px] tabular-nums text-orange-300/80 shrink-0">
                {Math.round(w.durationSeconds / 30) * 30 || w.durationSeconds}s
              </span>
            </div>
            <ul className="space-y-0.5 ml-3 list-disc text-[10px] text-muted-foreground leading-snug">
              {w.instructions.map((line, j) => (
                <li key={j}>{line}</li>
              ))}
            </ul>
            {w.lifestyleCue && (
              <p className="text-[10px] text-purple-300/90 italic leading-snug pl-3">
                <span className="not-italic font-semibold">Why:</span> {w.lifestyleCue}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function DayCard({
  day,
  items,
  allDays,
  onMoveExercise,
  onApplyDayRange,
  onAutoBucketDay,
  stats,
  warmups,
  antagonistEnabled,
  onToggleAntagonist,
  loadDeloadPreview,
  rebalanceMovedFrom,
  swappedFromName,
}: {
  day: { id: string; name: string; tags: string[]; scheduleHint?: string };
  items: RoutineItem[];
  allDays: { id: string; name: string }[];
  onMoveExercise: (exerciseId: string, fromDayId: string, toDayId: string) => void;
  /** When undefined (Week 2 view), the day-wide rep-range bar is hidden. */
  onApplyDayRange?: (dayId: string, rangeId: RepRangeId) => void;
  /** When undefined (Week 2 view), the per-day Opti-fill button is hidden. */
  onAutoBucketDay?: (dayId: string) => void;
  stats: { compounds: number; isolations: number; total: number; compoundPct: number };
  warmups?: SessionWarmup[];
  /** Whether antagonist-superset display order is enabled on this day. */
  antagonistEnabled: boolean;
  /** Toggle the antagonist mode. When undefined (Week 2 view), button hidden. */
  onToggleAntagonist?: () => void;
  /** Optional preview map: exerciseId → projected sets[] from staged
   * Load/Deload. When present, each editor row renders an inline
   * current → projected annotation. */
  loadDeloadPreview?: Record<string, { reps: number; weight: number }[]>;
  /** Optional map: exerciseId → original day name (when Rebalance
   * preview is staged and the exercise moved from another day). */
  rebalanceMovedFrom?: Map<string, string> | null;
  /** Optional map: exerciseId → original exercise name (when Swap
   * preview is staged and this id is a swap target). */
  swappedFromName?: Map<string, string> | null;
}) {
  const compoundPctRounded = Math.round(stats.compoundPct * 100);
  const ratioOnTarget = stats.total > 0 && isCompoundRatioOnTarget(stats.compoundPct);

  // Apply antagonist reorder at render time when the toggle is on. The
  // underlying dayAssignments stay canonical (sorted by allocator);
  // this is purely a view-mode override.
  const canAntagonist = canApplyAntagonist(items);
  const displayItems = antagonistEnabled && canAntagonist ? antagonistOrder(items) : items;

  return (
    <div className="bg-card border-2 border-border rounded-sm overflow-hidden flex flex-col">
      {/* Day header */}
      <div className="p-3 bg-secondary/30 border-b border-border">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h5 className="font-heading font-bold text-foreground">{day.name}</h5>
          <div className="flex items-center gap-2 shrink-0">
            {onToggleAntagonist && (
              <button
                onClick={onToggleAntagonist}
                disabled={!canAntagonist && !antagonistEnabled}
                title={
                  !canAntagonist && !antagonistEnabled
                    ? "Day has no antagonist pair (no push/pull or quad/ham)"
                    : antagonistEnabled
                      ? "Antagonist superset ON — push/pull (or quad/ham) interleaved"
                      : "Turn on antagonist superset — interleaves push/pull or quad/ham"
                }
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border transition-colors ${
                  antagonistEnabled
                    ? "bg-purple-500/15 text-purple-200 border-purple-500/40"
                    : canAntagonist
                      ? "bg-background text-muted-foreground border-border hover:border-purple-500/40 hover:text-purple-300"
                      : "bg-background text-muted-foreground/40 border-border cursor-not-allowed"
                }`}
              >
                Superset {antagonistEnabled ? "ON" : "OFF"}
              </button>
            )}
            {day.scheduleHint && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {day.scheduleHint}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Zap className="w-3 h-3 text-lime" />
            {stats.compounds} comp
          </span>
          <span className="inline-flex items-center gap-1">
            <Target className="w-3 h-3 text-coral" />
            {stats.isolations} iso
          </span>
          {stats.total > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded ${
                ratioOnTarget
                  ? "bg-lime/10 text-lime border border-lime/30"
                  : "bg-yellow-500/10 text-yellow-300 border border-yellow-500/30"
              }`}
            >
              {compoundPctRounded}% comp
            </span>
          )}
        </div>
      </div>

      {/* Day-wide rep-range — Pre-Set or Opti-fill via one dropdown. Hidden
          when handlers aren't provided (Week 2 view in P9.3.1; set
          editing on Week 2 lands in P9.3.3). */}
      {items.length > 0 && onApplyDayRange && onAutoBucketDay && (
        <div className="px-3 py-2 border-b border-border bg-secondary/15 flex items-center gap-2 flex-wrap">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            Day reps:
          </span>
          <Select
            onValueChange={(v) => {
              if (v === "smart-fill") onAutoBucketDay(day.id);
              else onApplyDayRange(day.id, v as RepRangeId);
            }}
          >
            <SelectTrigger className="h-6 text-[10px] w-[180px] py-0">
              <SelectValue placeholder="Apply to day..." />
            </SelectTrigger>
            <SelectContent>
              {REP_RANGES.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">
                  <span className="font-semibold">{r.shortLabel}</span>{" "}
                  <span className="text-muted-foreground">— {r.label}</span>
                </SelectItem>
              ))}
              <SelectItem value="smart-fill" className="text-xs text-purple-300">
                <Wand2 className="w-3 h-3 inline mr-1" />
                Opti-fill — pick per exercise
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Session warmups (lifestyle-aware, 3 per day) */}
      {warmups && warmups.length > 0 && <WarmupBlock warmups={warmups} />}

      {/* Exercise list with inline sets/reps editor */}
      <div className="flex-1">
        {displayItems.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground italic">
            No exercises assigned. Pool may not have a match for this day's tags ({day.tags.join(", ")}).
          </div>
        ) : (
          displayItems.map((item, idx) => (
            <DayExerciseEditor
              key={item.id}
              item={item}
              index={idx}
              dayId={day.id}
              allDays={allDays}
              onMoveExercise={onMoveExercise}
              previewSets={loadDeloadPreview?.[item.id]}
              movedFromDayName={rebalanceMovedFrom?.get(item.id) ?? null}
              swappedFromExerciseName={swappedFromName?.get(item.id) ?? null}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function SplitBuilder() {
  const {
    routine,
    split,
    setSplit,
    clearSplit,
    toggleAntagonistDay,
    updateRoutineItem,
    addRoutineItem,
    lifestyle,
    experience,
    sessionWarmups,
    setSessionWarmups,
    markAutoPlanFresh,
    favorites,
    mesocycle,
    expandToBiweekly,
    collapseToSingleWeek,
    setWeek2DayAssignments,
    commitWeek2Snapshot,
  } = useWorkout();
  const [open, setOpen] = useState(false);
  const [activeWeek, setActiveWeek] = useState<1 | 2>(1);

  // Finisher state — drives the calves + abs dropdowns + modal picker.
  // pendingFinisher tracks "user changed the dropdown but we're waiting
  // for them to pick an exercise from the modal first."
  const [finisherPickerKind, setFinisherPickerKind] = useState<FinisherKind | null>(null);
  const [pendingFinisherFreq, setPendingFinisherFreq] = useState<number | null>(null);

  // Week 2 preview staging — three independent layer flags. Each can be
  // toggled on / off; the projection memo computes the combined Week 2
  // state across all currently-staged layers in dependency order
  // (Swap → Rebalance → Load/Deload). One Confirm Apply commits the
  // composite snapshot atomically; one Cancel All discards every layer.
  const [rebalanceStaged, setRebalanceStaged] = useState(false);
  const [loadDeloadStaged, setLoadDeloadStaged] = useState(false);
  const [swapStaged, setSwapStaged] = useState<SwapSize | null>(null);
  const anyPreviewStaged = rebalanceStaged || loadDeloadStaged || swapStaged !== null;

  /** Discard every staged preview layer. */
  const cancelAllPreviews = () => {
    setRebalanceStaged(false);
    setLoadDeloadStaged(false);
    setSwapStaged(null);
  };

  const warmupMutation = trpc.sessionWarmups.generate.useMutation({
    onSuccess: (data: { days: Array<{ dayName: string; warmups: SessionWarmup[] }> }) => {
      // Reconcile by dayName -> dayId so renames don't break mapping.
      if (!split.splitId || split.splitId === "custom") return;
      const preset = SPLIT_PRESETS[split.splitId];
      const byName = new Map(data.days.map((d) => [d.dayName, d.warmups]));
      const next: Record<string, SessionWarmup[]> = {};
      for (const day of preset.days) {
        const found = byName.get(day.name);
        if (found) next[day.id] = found;
      }
      setSessionWarmups(next);
      toast.success(`Generated warmups for ${Object.keys(next).length} day${Object.keys(next).length === 1 ? "" : "s"}`);
    },
    onError: (err) => {
      toast.error(`Warmup generation failed: ${err.message}`);
    },
  });

  const activePreset: SplitPreset | null =
    split.splitId && split.splitId !== "custom" ? SPLIT_PRESETS[split.splitId] : null;

  const expProfile = getExperience(experience) ?? getExperience("foot-in-door")!;

  const isViewingWeek2 = mesocycle.enabled && activeWeek === 2;

  /**
   * Combined Week 2 preview projection. Returns the layered Week 2
   * state if any layer is staged; null otherwise. Layers compose in
   * dependency order: Swap → Rebalance → Load/Deload. Each layer reads
   * the output of the prior, so toggling them produces the same result
   * as if they were committed in that order.
   */
  const projection = useMemo(() => {
    if (!isViewingWeek2 || !anyPreviewStaged || !split.splitId) return null;

    // Baseline = current committed Week 2 state.
    let dayAssignments: Record<string, string[]> = { ...mesocycle.week2DayAssignments };
    let week2Routine: RoutineItem[] = [...mesocycle.week2Routine];
    let exerciseSets: Record<string, { reps: number; weight: number }[]> = {
      ...mesocycle.week2ExerciseSets,
    };

    const swappedFromName = new Map<string, string>();
    const movedFromDay = new Map<string, string>();

    // Name lookup that grows as swap layer adds new items.
    const nameById = new Map<string, string>();
    for (const r of routine) nameById.set(r.id, r.exercise);
    for (const r of mesocycle.week2Routine) nameById.set(r.id, r.exercise);

    // ---- Layer 1: Swap ----
    let swapCount = 0;
    if (swapStaged) {
      const sourcePool = [...routine, ...week2Routine];
      const swapResult = swapAllNonFavoritesWeek2(
        sourcePool,
        dayAssignments,
        new Set(favorites),
        swapStaged,
      );
      // Migrate exerciseSets to new ids.
      const newSets: Record<string, { reps: number; weight: number }[]> = {};
      for (const [oldId, sets] of Object.entries(exerciseSets)) {
        const newId = swapResult.idMap[oldId] ?? oldId;
        newSets[newId] = sets;
      }
      exerciseSets = newSets;
      const swappedOutIds = new Set(Object.keys(swapResult.idMap));
      week2Routine = [
        ...week2Routine.filter((r) => !swappedOutIds.has(r.id)),
        ...swapResult.swappedItems,
      ];
      for (const r of swapResult.swappedItems) nameById.set(r.id, r.exercise);
      for (const [oldId, newId] of Object.entries(swapResult.idMap)) {
        swappedFromName.set(newId, nameById.get(oldId) ?? "(unknown)");
      }
      dayAssignments = swapResult.newWeek2DayAssignments;
      swapCount = swapResult.swappedCount;
    }

    // ---- Layer 2: Rebalance ----
    let rebalanceMoves = 0;
    if (rebalanceStaged) {
      const beforeRebalance = dayAssignments;
      dayAssignments = rebalanceForWeek2(
        [...routine, ...week2Routine],
        split.splitId,
        split.dayAssignments,
      );
      const dayNameById = new Map<string, string>();
      if (activePreset) for (const d of activePreset.days) dayNameById.set(d.id, d.name);
      for (const [dayId, newIds] of Object.entries(dayAssignments)) {
        const oldIds = new Set(beforeRebalance[dayId] ?? []);
        for (const id of newIds) {
          if (oldIds.has(id)) continue;
          for (const [otherDayId, otherIds] of Object.entries(beforeRebalance)) {
            if (otherDayId !== dayId && otherIds.includes(id)) {
              movedFromDay.set(id, dayNameById.get(otherDayId) ?? otherDayId);
              rebalanceMoves++;
              break;
            }
          }
        }
      }
    }

    // ---- Layer 3: Load/Deload ----
    let loaded = 0,
      deloaded = 0,
      matched = 0;
    if (loadDeloadStaged) {
      const result = computeWeek2LoadDeload(
        [...routine, ...week2Routine],
        split.dayAssignments,
        dayAssignments,
        expProfile,
      );
      exerciseSets = result.week2ExerciseSets;
      for (const v of Object.values(result.perMuscle)) {
        if (v.direction === "load") loaded++;
        else if (v.direction === "deload") deloaded++;
        else matched++;
      }
    }

    return {
      week2DayAssignments: dayAssignments,
      week2Routine,
      week2ExerciseSets: exerciseSets,
      swappedFromName,
      movedFromDay,
      swapCount,
      rebalanceMoves,
      loadDeloadDirections: { loaded, deloaded, matched },
    };
  }, [
    isViewingWeek2,
    anyPreviewStaged,
    swapStaged,
    rebalanceStaged,
    loadDeloadStaged,
    routine,
    mesocycle,
    favorites,
    split,
    activePreset,
    expProfile,
  ]);

  // Active week's day assignments — Week 1 reads split.dayAssignments;
  // Week 2 reads the projection if any preview is staged, else the
  // committed mesocycle.week2DayAssignments.
  const activeDayAssignments = isViewingWeek2
    ? (projection?.week2DayAssignments ?? mesocycle.week2DayAssignments)
    : split.dayAssignments;

  const itemsById = useMemo(() => {
    const m = new Map<string, RoutineItem>();
    routine.forEach((r) => m.set(r.id, r));
    // Merge in Week 2's parallel routine (variant-swapped items).
    mesocycle.week2Routine.forEach((r) => m.set(r.id, r));
    // If a Swap preview is staged, the projection's week2Routine
    // includes the projected swap items — merge those too so they can
    // be rendered in the day grid.
    if (projection) projection.week2Routine.forEach((r) => m.set(r.id, r));
    return m;
  }, [routine, mesocycle.week2Routine, projection]);

  const dayStats = useMemo(() => {
    const stats: Record<string, { compounds: number; isolations: number; total: number; compoundPct: number }> = {};
    if (!activePreset) return stats;
    for (const day of activePreset.days) {
      const ids = activeDayAssignments[day.id] ?? [];
      const items = ids.map((id) => itemsById.get(id)).filter(Boolean) as RoutineItem[];
      const compounds = items.filter((i) => i.category === "systemic").length;
      const isolations = items.length - compounds;
      stats[day.id] = {
        compounds,
        isolations,
        total: items.length,
        compoundPct: items.length > 0 ? compounds / items.length : 0,
      };
    }
    return stats;
  }, [activePreset, activeDayAssignments, itemsById]);

  const handlePickPreset = (id: SplitId) => {
    if (id === "custom") {
      toast.info("Custom split builder coming in P4c. Pick a preset for now.");
      return;
    }
    const preset = SPLIT_PRESETS[id];
    const allocation = allocatePoolToSplit(routine, preset, {
      experience,
      favoriteIds: favorites,
      calvesFrequency: split.calvesFrequency,
      absFrequency: split.absFrequency,
    });
    setSplit({
      splitId: id,
      dayAssignments: allocation.byDay,
      calvesFrequency: split.calvesFrequency,
      absFrequency: split.absFrequency,
      antagonistDays: split.antagonistDays,
    });
    // setSplit flips the plan-modified flag; auto-allocate is the canonical
    // "fresh" state, so flip back. This runs after setSplit's state update.
    markAutoPlanFresh();
    const totalSlots = Object.values(allocation.byDay).reduce((n, ids) => n + ids.length, 0);
    toast.success(`Allocated ${totalSlots} session slots across ${preset.daysPerWeek} days (${routine.length} unique exercises, repeats included)`);
  };

  const handleReallocate = () => {
    if (!activePreset) return;
    const allocation = allocatePoolToSplit(routine, activePreset, {
      experience,
      favoriteIds: favorites,
      calvesFrequency: split.calvesFrequency,
      absFrequency: split.absFrequency,
    });
    setSplit({
      splitId: activePreset.id,
      dayAssignments: allocation.byDay,
      calvesFrequency: split.calvesFrequency,
      absFrequency: split.absFrequency,
      antagonistDays: split.antagonistDays,
    });
    markAutoPlanFresh();
    toast.success("Re-allocated using Opti-split");
  };

  /**
   * Apply a finisher frequency change. If the routine has no matching
   * exercise (calf / rectus-abs), open the modal picker; otherwise
   * re-allocate immediately with the new frequency.
   */
  const handleFinisherFreqChange = (kind: FinisherKind, freq: number | null) => {
    if (!activePreset) {
      toast.info("Pick a split first, then set finishers.");
      return;
    }
    // If turning OFF (null), apply immediately — no picker needed.
    if (freq === null) {
      reallocateWithFinishers(routine, {
        calvesFrequency: kind === "calves" ? null : split.calvesFrequency,
        absFrequency: kind === "abs" ? null : split.absFrequency,
      });
      return;
    }
    // Check if routine has at least one matching exercise.
    const predicate = kind === "calves" ? isCalfExercise : isRectusAbsExercise;
    const hasOne = routine.some((r) => predicate(r.exercise));
    if (hasOne) {
      // Apply immediately, using existing exercises as the finisher.
      reallocateWithFinishers(routine, {
        calvesFrequency: kind === "calves" ? freq : split.calvesFrequency,
        absFrequency: kind === "abs" ? freq : split.absFrequency,
      });
    } else {
      // Open the picker; pendingFinisherFreq holds the target frequency
      // until the user picks an exercise.
      setFinisherPickerKind(kind);
      setPendingFinisherFreq(freq);
    }
  };

  /** Build a RoutineItem from a catalog pick and run the allocation. */
  const handleFinisherPick = (pick: FinisherCatalogPick) => {
    if (!activePreset || finisherPickerKind === null || pendingFinisherFreq === null) return;
    const newItem: RoutineItem = {
      id: generateId(),
      exercise: pick.name,
      jointFunction: pick.jointFunction,
      category: pick.category,
      parameters: getProgrammingParameters(pick.category),
      sets: [],
      difficulty: pick.difficulty,
      targetedMuscles: pick.targetedMuscles,
      stretchLevel: pick.stretchLevel,
      stability: pick.stability,
    };
    const nextRoutine = [...routine, newItem];
    addRoutineItem(newItem);
    reallocateWithFinishers(nextRoutine, {
      calvesFrequency: finisherPickerKind === "calves" ? pendingFinisherFreq : split.calvesFrequency,
      absFrequency: finisherPickerKind === "abs" ? pendingFinisherFreq : split.absFrequency,
    });
    setFinisherPickerKind(null);
    setPendingFinisherFreq(null);
    toast.success(`Added ${pick.name} to your routine as the ${finisherPickerKind} finisher`);
  };

  /** Re-run allocator with new finisher overrides + persist the result. */
  const reallocateWithFinishers = (
    routineToUse: RoutineItem[],
    overrides: { calvesFrequency: number | null; absFrequency: number | null },
  ) => {
    if (!activePreset) return;
    const allocation = allocatePoolToSplit(routineToUse, activePreset, {
      experience,
      favoriteIds: favorites,
      calvesFrequency: overrides.calvesFrequency,
      absFrequency: overrides.absFrequency,
    });
    setSplit({
      splitId: activePreset.id,
      dayAssignments: allocation.byDay,
      calvesFrequency: overrides.calvesFrequency,
      absFrequency: overrides.absFrequency,
      antagonistDays: split.antagonistDays,
    });
    markAutoPlanFresh();
  };

  const handleMoveExercise = (exerciseId: string, fromDayId: string, toDayId: string) => {
    const next = { ...activeDayAssignments };
    next[fromDayId] = (next[fromDayId] ?? []).filter((id) => id !== exerciseId);
    next[toDayId] = [...(next[toDayId] ?? []), exerciseId];
    if (isViewingWeek2) {
      setWeek2DayAssignments(next);
    } else {
      setSplit({ ...split, dayAssignments: next });
    }
  };

  // Opti-fill resolves an experience-aware rep range AND a sets count
  // computed from per-muscle weekly volume targets divided by total
  // session-instances of all exercises hitting that muscle. Beginner
  // shifts the range UP (more reps, skill bias); experienced shifts DOWN
  // (fewer reps, push-to-failure bias); foot-in-door uses matrix as-is.
  // (expProfile is hoisted above the projection memo for ordering.)

  // Pre-Set: stamp every exercise in the routine with the same range.
  // Uses the rep-range's natural defaultSets (4/3/2 for Low/Med/High).
  const handleApplyRangeAll = (rangeId: RepRangeId) => {
    for (const item of routine) {
      const newSets = applyRangeToRoutineSets(item, rangeId);
      updateRoutineItem(item.id, { sets: newSets });
    }
    markAutoPlanFresh();
    toast.success(`Pre-Set: all exercises to ${REP_RANGE_BY_ID[rangeId].shortLabel} reps`);
  };

  // Opti-fill: each exercise gets its own range from the matrix
  // (experience-shifted) AND a sets count from per-muscle volume math.
  const handleAutoBucket = () => {
    for (const item of routine) {
      const rangeId = smartFillRangeForExperience(item, experience);
      const setsCount = computeMatrixSets(item, routine, split.dayAssignments, expProfile);
      const newSets = applyRangeToRoutineSets(item, rangeId, setsCount);
      updateRoutineItem(item.id, { sets: newSets });
    }
    markAutoPlanFresh();
    toast.success(
      `Opti-fill applied — sets distributed to hit ${expProfile.weeklyVolumePerMajor} weekly per major mover (${expProfile.name})`,
    );
  };

  // Pre-Set day-scoped: stamp every exercise on this day with one range.
  // Note: because a RoutineItem is shared across days when an exercise
  // repeats, this also retunes the exercise on its other day(s).
  const handleApplyDayRange = (dayId: string, rangeId: RepRangeId) => {
    const ids = split.dayAssignments[dayId] ?? [];
    let n = 0;
    for (const id of ids) {
      const item = itemsById.get(id);
      if (!item) continue;
      const newSets = applyRangeToRoutineSets(item, rangeId);
      updateRoutineItem(id, { sets: newSets });
      n += 1;
    }
    markAutoPlanFresh();
    if (n > 0) {
      toast.success(`Pre-Set: day to ${REP_RANGE_BY_ID[rangeId].shortLabel} reps (${n} exercise${n === 1 ? "" : "s"})`);
    }
  };

  // Opti-fill day-scoped: each exercise on this day gets its own range
  // via the experience-shifted matrix; sets count from per-muscle math.
  const handleAutoBucketDay = (dayId: string) => {
    const ids = split.dayAssignments[dayId] ?? [];
    let n = 0;
    for (const id of ids) {
      const item = itemsById.get(id);
      if (!item) continue;
      const rangeId = smartFillRangeForExperience(item, experience);
      const setsCount = computeMatrixSets(item, routine, split.dayAssignments, expProfile);
      const newSets = applyRangeToRoutineSets(item, rangeId, setsCount);
      updateRoutineItem(id, { sets: newSets });
      n += 1;
    }
    markAutoPlanFresh();
    if (n > 0) {
      toast.success(`Opti-fill applied to ${n} exercise${n === 1 ? "" : "s"} on this day`);
    }
  };

  const handleGenerateWarmups = () => {
    if (!activePreset || !lifestyle) return;
    const days = activePreset.days.map((day) => {
      const ids = split.dayAssignments[day.id] ?? [];
      const items = ids.map((id) => itemsById.get(id)).filter(Boolean) as RoutineItem[];
      return {
        dayName: day.name,
        scheduleHint: day.scheduleHint,
        exercises: items.map((it) => ({
          exercise: it.exercise,
          equipment: it.equipment,
          angle: it.angle,
          targetedMuscles: it.targetedMuscles,
          category: it.category,
        })),
      };
    });
    warmupMutation.mutate({ lifestyle, days });
  };

  if (routine.length === 0) {
    return null; // Hidden until the pool has at least one exercise
  }

  if (!open) {
    return (
      <div className="border-2 border-dashed border-lime/30 rounded-sm p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-lime/10 rounded-sm shrink-0">
            <Calendar className="w-5 h-5 text-lime" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground text-base">
              Opti-split
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Distribute your {routine.length} exercise{routine.length !== 1 ? "s" : ""} across the week.
              Opti-split handles joint-function synergy on each day, leg vs lower-body routing, and weekly-volume targeting.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold shrink-0"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          Start Opti-split
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="border-2 border-lime/30 bg-lime/5 rounded-sm p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-lime/20 rounded-sm">
            <Calendar className="w-5 h-5 text-lime" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">Weekly Split</h3>
            <p className="text-xs text-muted-foreground">
              Pool distributed across the week. Move exercises between days as needed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activePreset && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReallocate}
                title="Re-run Opti-split (re-distributes exercises across days)"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Re-allocate
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              if (split.splitId) {
                clearSplit();
              }
            }}
            className="text-muted-foreground hover:text-foreground w-8 h-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preset picker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ALL_PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            selected={split.splitId === preset.id}
            onSelect={() => handlePickPreset(preset.id)}
          />
        ))}
        <CustomCard
          selected={split.splitId === "custom"}
          onSelect={() => handlePickPreset("custom")}
        />
      </div>

      {/* Post-split rater — only renders once a split is picked + assigned.
          Operates on Week 1 (split.dayAssignments). Week 2 rating comes
          later once load/deload + variant swap engine populate it. */}
      {activePreset && !isViewingWeek2 && (
        <PostSplitRater />
      )}

      {/* Day grid */}
      <AnimatePresence>
        {activePreset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-baseline justify-between">
              <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {activePreset.shortLabel} · {activePreset.daysPerWeek} day{activePreset.daysPerWeek !== 1 ? "s" : ""}
              </h4>
              <p className="text-[11px] text-muted-foreground italic">
                Compound share target: {Math.round(COMPOUND_PCT_GOOD_MIN * 100)}–{Math.round(COMPOUND_PCT_GOOD_MAX * 100)}% per day
              </p>
            </div>

            {/* Mesocycle-wide rep-range — only relevant on Week 1 (Week 2
                set overrides come from the load/deload phase in P9.3.3). */}
            {routine.length > 0 && !isViewingWeek2 && (
              <div className="p-3 bg-secondary/40 border-2 border-border rounded-sm space-y-2">
                <div>
                  <h5 className="font-heading font-bold text-sm text-foreground leading-tight">
                    Rep-Range for {mesocycle.enabled ? "Week 1" : "the Mesocycle"}
                  </h5>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Pre-Set stamps every exercise to one rep range. Opti-fill picks a different range per exercise (calves &amp; abs high reps, deadlifts low reps, everything else medium).
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Apply to all:
                  </span>
                  <Select
                    onValueChange={(v) => {
                      if (v === "smart-fill") handleAutoBucket();
                      else handleApplyRangeAll(v as RepRangeId);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-[260px]">
                      <SelectValue placeholder="Pick a rep range for the whole week..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REP_RANGES.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          <span className="font-semibold">{r.shortLabel}</span>{" "}
                          <span className="text-muted-foreground">— {r.label} (Pre-Set)</span>
                        </SelectItem>
                      ))}
                      <SelectItem value="smart-fill" className="text-xs text-purple-300">
                        <Wand2 className="w-3 h-3 inline mr-1" />
                        Opti-fill — pick per exercise
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Lifestyle-aware session warmup generator — Week 1 only.
                Week 2 warmups derive from Week 2's exercise list once the
                variant swap engine lands in P9.3.4. */}
            {!isViewingWeek2 && (
            <div className="p-3 bg-orange-500/[0.04] border-2 border-orange-500/25 rounded-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="p-1.5 bg-orange-500/15 rounded-sm shrink-0">
                    <Flame className="w-4 h-4 text-orange-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-heading font-bold text-sm text-foreground leading-tight">
                      Session Warmups
                    </h5>
                    {!lifestyle ? (
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Pick a lifestyle profile in the rating section above, then generate 3 dynamic warmups per day biased to your chronic restrictions.
                      </p>
                    ) : sessionWarmups && Object.keys(sessionWarmups).length > 0 ? (
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Generated for{" "}
                        <span className="text-orange-300 font-semibold">
                          {LIFESTYLE_PROFILES.find((p) => p.id === lifestyle)?.name}
                        </span>
                        . Re-generate after editing your split.
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                        Profile:{" "}
                        <span className="text-orange-300 font-semibold">
                          {LIFESTYLE_PROFILES.find((p) => p.id === lifestyle)?.name}
                        </span>
                        . 3 warmups per day will mobilize your chronic restrictions and prep the joint actions about to be trained.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={sessionWarmups && Object.keys(sessionWarmups).length > 0 ? "outline" : "default"}
                  onClick={handleGenerateWarmups}
                  disabled={!lifestyle || warmupMutation.isPending}
                  className={
                    !lifestyle || warmupMutation.isPending
                      ? ""
                      : !sessionWarmups || Object.keys(sessionWarmups).length === 0
                        ? "bg-orange-500 text-white hover:bg-orange-500/90 font-semibold"
                        : ""
                  }
                >
                  {warmupMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Flame className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {sessionWarmups && Object.keys(sessionWarmups).length > 0 ? "Re-generate" : "Generate warmups"}
                </Button>
              </div>
            </div>
            )}

            {/* Finishers — calves + abs frequency dropdowns */}
            {!isViewingWeek2 && (
              <FinisherPanel
                routine={routine}
                splitDaysPerWeek={activePreset.daysPerWeek}
                calvesFrequency={split.calvesFrequency}
                absFrequency={split.absFrequency}
                onChange={handleFinisherFreqChange}
              />
            )}

            {/* Mesocycle expand control + Week 1 / Week 2 tabs */}
            <div className="flex items-center justify-between gap-3 flex-wrap p-3 bg-purple-500/[0.04] border-2 border-purple-500/25 rounded-sm">
              <div className="flex-1 min-w-0">
                <h5 className="font-heading font-bold text-sm text-foreground leading-tight">
                  Mesocycle
                </h5>
                {!mesocycle.enabled ? (
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    Single week. Expand to a 2-week mesocycle for accumulation → deload waves and per-week variant swaps.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    2-week mesocycle. Toggle any combination of preview layers — Rebalance / Load-Deload / Swap — to see the combined projected state inline, then Confirm Apply commits everything atomically. Re-click any staged toggle to unstage; Cancel All wipes the preview.
                  </p>
                )}
              </div>
              {!mesocycle.enabled ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    expandToBiweekly();
                    setActiveWeek(1);
                  }}
                  className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 shrink-0"
                  title="Clone Week 1 into a separate Week 2 you can shape independently"
                >
                  Expand to Biweekly
                </Button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="inline-flex rounded-sm overflow-hidden border border-border">
                    <button
                      onClick={() => setActiveWeek(1)}
                      className={`text-xs px-3 py-1 ${activeWeek === 1 ? "bg-purple-500/20 text-purple-200 font-semibold" : "bg-background text-muted-foreground hover:bg-secondary"}`}
                    >
                      Week 1
                    </button>
                    <button
                      onClick={() => setActiveWeek(2)}
                      className={`text-xs px-3 py-1 ${activeWeek === 2 ? "bg-purple-500/20 text-purple-200 font-semibold" : "bg-background text-muted-foreground hover:bg-secondary"}`}
                    >
                      Week 2
                    </button>
                  </div>
                  {isViewingWeek2 && (
                    <>
                      {/* Three Preview toggle buttons — re-click to unstage.
                          Only show when no preview is staged OR when this
                          specific button's layer is what's staged. The
                          Confirm Apply / Cancel All pair below covers commit. */}
                      <button
                        onClick={() => setRebalanceStaged((v) => !v)}
                        disabled={!split.splitId}
                        className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                          rebalanceStaged
                            ? "bg-purple-500/20 border-purple-400 text-purple-100 font-semibold"
                            : "border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                        }`}
                        title={
                          rebalanceStaged
                            ? "Rebalance staged — re-click to unstage"
                            : "Stage Rebalance preview: swap mirrored upper days + pivot leg days"
                        }
                      >
                        {rebalanceStaged ? "▸ Rebalance" : "Preview Rebalance"}
                      </button>
                      <button
                        onClick={() => setLoadDeloadStaged((v) => !v)}
                        className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                          loadDeloadStaged
                            ? "bg-purple-500/20 border-purple-400 text-purple-100 font-semibold"
                            : "border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                        }`}
                        title={
                          loadDeloadStaged
                            ? "Load/Deload staged — re-click to unstage"
                            : "Stage Load/Deload preview: recompute set counts per muscle against the 2-week budget"
                        }
                      >
                        {loadDeloadStaged ? "▸ Load/Deload" : "Preview Load/Deload"}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`text-xs px-2.5 py-1 rounded-sm border transition-colors inline-flex items-center gap-1 ${
                              swapStaged
                                ? "bg-purple-500/20 border-purple-400 text-purple-100 font-semibold"
                                : "border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
                            }`}
                            title={
                              swapStaged
                                ? `Swap (${swapStaged}) staged — re-click to change size or unstage`
                                : "Stage variant Swap preview at small / medium / large scope"
                            }
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                            {swapStaged ? `▸ Swap (${swapStaged})` : "Preview Swap"}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72">
                          {([
                            { size: "small" as SwapSize, label: "Small — same lane", detail: "Equipment / angle variant" },
                            { size: "medium" as SwapSize, label: "Medium — same muscle", detail: "Different SFR / ROM" },
                            { size: "large" as SwapSize, label: "Large — same group", detail: "Different sub-bucket" },
                          ]).map((opt) => (
                            <DropdownMenuItem
                              key={opt.size}
                              onClick={() =>
                                setSwapStaged((cur) => (cur === opt.size ? null : opt.size))
                              }
                              className="flex-col items-start gap-0.5 py-2"
                            >
                              <span className="font-semibold text-foreground">
                                {swapStaged === opt.size ? "▸ " : ""}{opt.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground leading-snug">
                                {opt.detail}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* Unified Confirm/Cancel — visible when ANY layer is staged. */}
                      {anyPreviewStaged && projection && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              commitWeek2Snapshot({
                                week2DayAssignments: projection.week2DayAssignments,
                                week2Routine: projection.week2Routine,
                                week2ExerciseSets: projection.week2ExerciseSets,
                              });
                              const parts: string[] = [];
                              if (projection.swapCount)
                                parts.push(`${projection.swapCount} swapped`);
                              if (projection.rebalanceMoves)
                                parts.push(`${projection.rebalanceMoves} moved`);
                              const ldd = projection.loadDeloadDirections;
                              if (ldd.loaded || ldd.deloaded) {
                                const ldParts: string[] = [];
                                if (ldd.loaded) ldParts.push(`${ldd.loaded} loaded`);
                                if (ldd.deloaded) ldParts.push(`${ldd.deloaded} deloaded`);
                                parts.push(ldParts.join("/"));
                              }
                              cancelAllPreviews();
                              toast.success(
                                `Week 2 changes applied${parts.length ? ` — ${parts.join(", ")}` : ""}`,
                              );
                              markAutoPlanFresh();
                            }}
                            className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold text-xs"
                            title="Commit all staged Week 2 preview layers atomically"
                          >
                            Confirm Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelAllPreviews}
                            className="text-muted-foreground text-xs"
                            title="Cancel — discard every staged preview"
                          >
                            Cancel All
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      collapseToSingleWeek();
                      setActiveWeek(1);
                    }}
                    className="text-muted-foreground hover:text-destructive text-xs"
                    title="Collapse back to a single week (clears Week 2 edits)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${activePreset.daysPerWeek <= 4 ? "260" : "220"}px, 1fr))`,
              }}
            >
              {activePreset.days.map((day) => {
                const ids = activeDayAssignments[day.id] ?? [];
                const items = ids
                  .map((id) => itemsById.get(id))
                  .filter(Boolean)
                  .map((item) => {
                    // On Week 2, render the COMMITTED state. Load/Deload's
                    // projected sets are passed separately as a preview
                    // annotation (so the user sees current → projected).
                    if (!isViewingWeek2) return item as RoutineItem;
                    const id = (item as RoutineItem).id;
                    const override = mesocycle.week2ExerciseSets[id];
                    if (!override) return item as RoutineItem;
                    return { ...(item as RoutineItem), sets: override };
                  }) as RoutineItem[];
                return (
                  <DayCard
                    key={day.id}
                    day={day}
                    items={items}
                    allDays={activePreset.days}
                    onMoveExercise={handleMoveExercise}
                    onApplyDayRange={isViewingWeek2 ? undefined : handleApplyDayRange}
                    onAutoBucketDay={isViewingWeek2 ? undefined : handleAutoBucketDay}
                    stats={dayStats[day.id] ?? { compounds: 0, isolations: 0, total: 0, compoundPct: 0 }}
                    warmups={isViewingWeek2 ? undefined : sessionWarmups?.[day.id]}
                    antagonistEnabled={split.antagonistDays.includes(day.id)}
                    onToggleAntagonist={isViewingWeek2 ? undefined : () => toggleAntagonistDay(day.id)}
                    loadDeloadPreview={
                      isViewingWeek2 && loadDeloadStaged && projection
                        ? projection.week2ExerciseSets
                        : undefined
                    }
                    rebalanceMovedFrom={
                      isViewingWeek2 && rebalanceStaged && projection
                        ? projection.movedFromDay
                        : null
                    }
                    swappedFromName={
                      isViewingWeek2 && swapStaged && projection
                        ? projection.swappedFromName
                        : null
                    }
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty-state picker shown when user enables a finisher without
          having a matching exercise in the routine yet. */}
      <FinisherPickerModal
        open={finisherPickerKind !== null}
        kind={finisherPickerKind}
        onPick={handleFinisherPick}
        onCancel={() => {
          setFinisherPickerKind(null);
          setPendingFinisherFreq(null);
        }}
      />
    </motion.div>
  );
}
