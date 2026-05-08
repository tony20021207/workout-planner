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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkout, type RoutineItem } from "@/contexts/WorkoutContext";
import {
  ALL_PRESETS,
  SPLIT_PRESETS,
  allocatePoolToSplit,
  isCompoundRatioOnTarget,
  COMPOUND_PCT_GOOD_MIN,
  COMPOUND_PCT_GOOD_MAX,
  type SplitId,
  type SplitPreset,
} from "@/lib/splitPresets";
import { autoRecommendSets } from "@/lib/setRecommender";
import { toast } from "sonner";
import DayExerciseEditor from "./DayExerciseEditor";

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

function DayCard({
  day,
  items,
  allDays,
  onMoveExercise,
  stats,
}: {
  day: { id: string; name: string; tags: string[]; scheduleHint?: string };
  items: RoutineItem[];
  allDays: { id: string; name: string }[];
  onMoveExercise: (exerciseId: string, fromDayId: string, toDayId: string) => void;
  stats: { compounds: number; isolations: number; total: number; compoundPct: number };
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
  const { routine, split, setSplit, clearSplit, updateRoutineItem } = useWorkout();
  const [open, setOpen] = useState(false);

  const activePreset: SplitPreset | null =
    split.splitId && split.splitId !== "custom" ? SPLIT_PRESETS[split.splitId] : null;

  const itemsById = useMemo(() => {
    const m = new Map<string, RoutineItem>();
    routine.forEach((r) => m.set(r.id, r));
    return m;
  }, [routine]);

  const dayStats = useMemo(() => {
    const stats: Record<string, { compounds: number; isolations: number; total: number; compoundPct: number }> = {};
    if (!activePreset) return stats;
    for (const day of activePreset.days) {
      const ids = split.dayAssignments[day.id] ?? [];
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
  }, [activePreset, split.dayAssignments, itemsById]);

  const handlePickPreset = (id: SplitId) => {
    if (id === "custom") {
      toast.info("Custom split builder coming in P4c. Pick a preset for now.");
      return;
    }
    const preset = SPLIT_PRESETS[id];
    const allocation = allocatePoolToSplit(routine, preset);
    setSplit({ splitId: id, dayAssignments: allocation.byDay });
    toast.success(`Allocated ${routine.length} exercises across ${preset.daysPerWeek} days`);
  };

  const handleReallocate = () => {
    if (!activePreset) return;
    const allocation = allocatePoolToSplit(routine, activePreset);
    setSplit({ splitId: activePreset.id, dayAssignments: allocation.byDay });
    toast.success("Re-allocated using the auto-allocator");
  };

  const handleMoveExercise = (exerciseId: string, fromDayId: string, toDayId: string) => {
    const next = { ...split.dayAssignments };
    next[fromDayId] = (next[fromDayId] ?? []).filter((id) => id !== exerciseId);
    next[toDayId] = [...(next[toDayId] ?? []), exerciseId];
    setSplit({ ...split, dayAssignments: next });
  };

  const handleAutoFillAllSets = () => {
    let changed = 0;
    for (const item of routine) {
      const recommended = autoRecommendSets(item);
      // Always replace — auto-fill is destructive by design.
      updateRoutineItem(item.id, { sets: recommended });
      changed += 1;
    }
    toast.success(`Auto-filled sets & reps for ${changed} exercise${changed !== 1 ? "s" : ""}`);
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
              Pick a weekly split
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Distribute your {routine.length} exercise{routine.length !== 1 ? "s" : ""} across the week.
              Auto-allocator handles 40/60 compound/iso balance, joint-function overlap, and warmup-priming order.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold shrink-0"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          Choose split
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
                onClick={handleAutoFillAllSets}
                title="Auto-recommend sets, reps, and rest for every exercise"
                className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
              >
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                Auto-fill sets & reps
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReallocate}
                title="Re-run the auto-allocator (re-distributes exercises across days)"
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
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${activePreset.daysPerWeek <= 4 ? "260" : "220"}px, 1fr))`,
              }}
            >
              {activePreset.days.map((day) => {
                const ids = split.dayAssignments[day.id] ?? [];
                const items = ids.map((id) => itemsById.get(id)).filter(Boolean) as RoutineItem[];
                return (
                  <DayCard
                    key={day.id}
                    day={day}
                    items={items}
                    allDays={activePreset.days}
                    onMoveExercise={handleMoveExercise}
                    stats={dayStats[day.id] ?? { compounds: 0, isolations: 0, total: 0, compoundPct: 0 }}
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
