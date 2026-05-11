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
import type { SwapSize } from "@/lib/variantSwap";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import DayExerciseEditor from "./DayExerciseEditor";
import PostSplitRater from "./PostSplitRater";

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
}) {
  const compoundPctRounded = Math.round(stats.compoundPct * 100);
  const ratioOnTarget = stats.total > 0 && isCompoundRatioOnTarget(stats.compoundPct);

  return (
    <div className="bg-card border-2 border-border rounded-sm overflow-hidden flex flex-col">
      {/* Day header */}
      <div className="p-3 bg-secondary/30 border-b border-border">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h5 className="font-heading font-bold text-foreground">{day.name}</h5>
          {day.scheduleHint && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {day.scheduleHint}
            </span>
          )}
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
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground italic">
            No exercises assigned. Pool may not have a match for this day's tags ({day.tags.join(", ")}).
          </div>
        ) : (
          items.map((item, idx) => (
            <DayExerciseEditor
              key={item.id}
              item={item}
              index={idx}
              dayId={day.id}
              allDays={allDays}
              onMoveExercise={onMoveExercise}
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
    updateRoutineItem,
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
    rebalanceWeek2,
    applyLoadDeload,
    swapVariantsWeek2,
  } = useWorkout();
  const [open, setOpen] = useState(false);
  const [activeWeek, setActiveWeek] = useState<1 | 2>(1);

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

  const itemsById = useMemo(() => {
    const m = new Map<string, RoutineItem>();
    routine.forEach((r) => m.set(r.id, r));
    // Merge in Week 2's parallel routine (variant-swapped items). These
    // ids only appear in mesocycle.week2DayAssignments — on Week 1 the
    // merge is a no-op since Week 1 day assignments reference routine[]
    // exclusively.
    mesocycle.week2Routine.forEach((r) => m.set(r.id, r));
    return m;
  }, [routine, mesocycle.week2Routine]);

  // Active week's day assignments — Week 1 reads split.dayAssignments,
  // Week 2 (when mesocycle is enabled) reads mesocycle.week2DayAssignments.
  const isViewingWeek2 = mesocycle.enabled && activeWeek === 2;
  const activeDayAssignments = isViewingWeek2
    ? mesocycle.week2DayAssignments
    : split.dayAssignments;

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
    const allocation = allocatePoolToSplit(routine, preset, { experience, favoriteIds: favorites });
    setSplit({ splitId: id, dayAssignments: allocation.byDay });
    // setSplit flips the plan-modified flag; auto-allocate is the canonical
    // "fresh" state, so flip back. This runs after setSplit's state update.
    markAutoPlanFresh();
    const totalSlots = Object.values(allocation.byDay).reduce((n, ids) => n + ids.length, 0);
    toast.success(`Allocated ${totalSlots} session slots across ${preset.daysPerWeek} days (${routine.length} unique exercises, repeats included)`);
  };

  const handleReallocate = () => {
    if (!activePreset) return;
    const allocation = allocatePoolToSplit(routine, activePreset, { experience, favoriteIds: favorites });
    setSplit({ splitId: activePreset.id, dayAssignments: allocation.byDay });
    markAutoPlanFresh();
    toast.success("Re-allocated using Opti-split");
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
  const expProfile = getExperience(experience) ?? getExperience("foot-in-door")!;

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
                    2-week mesocycle. Week 2 starts as a clone of Week 1. <span className="font-semibold text-purple-300">Rebalance</span> swaps mirrored upper days + pivots leg days; <span className="font-semibold text-purple-300">Load/Deload</span> redistributes set counts against the 2-week budget; <span className="font-semibold text-purple-300">Swap Variants</span> rotates non-favorited exercises (favorites are locked).
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          rebalanceWeek2();
                          toast.success("Week 2 rebalanced — leg-day pivot + day-pair swap applied");
                        }}
                        className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs"
                        title="Reshape Week 2: swap mirrored upper days (Upper 1 ↔ Upper 2, Push 1 ↔ Push 2, Pull 1 ↔ Pull 2) and separate squat-pattern from hinge-pattern across Lower and Leg Day"
                      >
                        Rebalance Week 2
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const summary = applyLoadDeload();
                          if (!summary) return;
                          const parts: string[] = [];
                          if (summary.loaded) parts.push(`${summary.loaded} loaded`);
                          if (summary.deloaded) parts.push(`${summary.deloaded} deloaded`);
                          if (summary.matched) parts.push(`${summary.matched} held`);
                          toast.success(
                            `Week 2 load/deload applied${parts.length ? ` — ${parts.join(", ")}` : ""}`,
                          );
                        }}
                        className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs"
                        title="Recompute Week 2 set counts per muscle: target = max(0.5 × weekly, 2-week budget − Week 1 actual). Muscles you hit hard in Week 1 deload toward the floor; muscles that came in light get loaded up."
                      >
                        Apply Load/Deload
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs"
                            title="Replace non-favorited Week 2 exercises with biomechanically similar variants. Favorites are hard-locked and never swapped."
                          >
                            <Shuffle className="w-3.5 h-3.5 mr-1" />
                            Swap Variants
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72">
                          {([
                            {
                              size: "small" as SwapSize,
                              label: "Small — same lane",
                              detail: "Equipment / angle variant (BB Bench → DB Bench)",
                            },
                            {
                              size: "medium" as SwapSize,
                              label: "Medium — same muscle",
                              detail: "Different SFR / ROM (Bayesian Curl → Preacher Curl)",
                            },
                            {
                              size: "large" as SwapSize,
                              label: "Large — same group",
                              detail: "Different sub-bucket (Quads → Glutes within Legs)",
                            },
                          ]).map((opt) => (
                            <DropdownMenuItem
                              key={opt.size}
                              onClick={() => {
                                const summary = swapVariantsWeek2(opt.size);
                                if (!summary) return;
                                const parts: string[] = [];
                                if (summary.swapped) parts.push(`${summary.swapped} swapped`);
                                if (summary.locked) parts.push(`${summary.locked} locked / favorited`);
                                if (summary.noVariant) parts.push(`${summary.noVariant} no variant available`);
                                toast.success(
                                  `Week 2 ${opt.size} swap applied${parts.length ? ` — ${parts.join(", ")}` : ""}`,
                                );
                              }}
                              className="flex-col items-start gap-0.5 py-2"
                            >
                              <span className="font-semibold text-foreground">{opt.label}</span>
                              <span className="text-[11px] text-muted-foreground leading-snug">
                                {opt.detail}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                    // On Week 2, swap in load/deload sets[] override when present.
                    if (!isViewingWeek2) return item as RoutineItem;
                    const override = mesocycle.week2ExerciseSets[(item as RoutineItem).id];
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
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
