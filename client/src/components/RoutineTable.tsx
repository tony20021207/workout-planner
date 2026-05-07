/**
 * RoutineTable — Workout Builder display with per-set customization, PDF export, and save
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ClipboardList, Zap, Target, FileDown, Save, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkout } from "@/contexts/WorkoutContext";
import { type RoutineItem, type SetDetail } from "@/contexts/WorkoutContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { toast } from "sonner";
import WorkoutRater from "./WorkoutRater";

function DifficultyDot({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    hard: "bg-red-500",
    medium: "bg-yellow-500",
    easy: "bg-green-500",
  };
  return <span className={`w-2 h-2 rounded-full ${colors[difficulty] || "bg-gray-500"}`} />;
}

function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  className = "",
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    const num = parseInt(localValue, 10);
    if (isNaN(num) || num < min) {
      setLocalValue(String(min));
      onChange(min);
    } else if (num > max) {
      setLocalValue(String(max));
      onChange(max);
    } else {
      setLocalValue(String(num));
      onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`w-14 bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground text-center focus:border-lime focus:outline-none ${className}`}
    />
  );
}

function SetRow({
  setIndex,
  setDetail,
  onUpdate,
}: {
  setIndex: number;
  setDetail: SetDetail;
  onUpdate: (updates: Partial<SetDetail>) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-6 text-right font-mono">S{setIndex + 1}</span>
      <NumberInput
        value={setDetail.reps}
        onChange={(val) => onUpdate({ reps: val })}
        min={1}
        max={99}
        className="w-12 text-xs"
      />
      <span className="text-muted-foreground">reps</span>
      <span className="text-muted-foreground">@</span>
      <NumberInput
        value={setDetail.weight}
        onChange={(val) => onUpdate({ weight: val })}
        min={0}
        max={9999}
        className="w-14 text-xs"
      />
      <span className="text-muted-foreground">lbs</span>
    </div>
  );
}

function RoutineItemRow({ item, index }: { item: RoutineItem; index: number }) {
  const { removeFromRoutine, updateRoutineItem } = useWorkout();
  const [expanded, setExpanded] = useState(false);

  const addSet = () => {
    const lastSet = item.sets[item.sets.length - 1];
    const newSet: SetDetail = { reps: lastSet?.reps ?? 10, weight: lastSet?.weight ?? 0 };
    updateRoutineItem(item.id, { sets: [...item.sets, newSet] });
  };

  const removeSet = () => {
    if (item.sets.length <= 1) return;
    updateRoutineItem(item.id, { sets: item.sets.slice(0, -1) });
  };

  const updateSet = (setIndex: number, updates: Partial<SetDetail>) => {
    const newSets = item.sets.map((s, i) => (i === setIndex ? { ...s, ...updates } : s));
    updateRoutineItem(item.id, { sets: newSets });
  };

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`p-4 ${index % 2 === 0 ? "bg-card" : "bg-secondary/30"} border-b border-border last:border-b-0`}
    >
      {/* Main row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <DifficultyDot difficulty={item.difficulty} />
          {item.category === "systemic" ? (
            <Zap className="w-3.5 h-3.5 text-lime shrink-0" />
          ) : (
            <Target className="w-3.5 h-3.5 text-coral shrink-0" />
          )}
          <div className="min-w-0">
            <span className="font-heading font-semibold text-foreground text-sm block truncate">
              {item.exercise}
            </span>
            <p className="text-[10px] text-muted-foreground truncate">
              {item.targetedMuscles.join(", ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span>{item.sets.length} sets</span>
            <span>•</span>
            <span>{item.parameters.frequency}</span>
            <span>•</span>
            <span>{item.parameters.rest}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-lime hover:text-lime/80 px-2"
          >
            {expanded ? "Close" : "Edit"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeFromRoutine(item.id)}
            className="text-muted-foreground hover:text-destructive w-8 h-8 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile summary */}
      <div className="flex flex-wrap gap-2 sm:hidden text-xs text-muted-foreground mt-2">
        <span>{item.sets.length} sets</span>
        <span>•</span>
        <span>{item.parameters.frequency}</span>
        <span>•</span>
        <span>{item.parameters.rest}</span>
      </div>

      {/* Expanded per-set editor */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Per-Set Configuration
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeSet}
                    disabled={item.sets.length <= 1}
                    className="w-7 h-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-foreground font-medium w-6 text-center">
                    {item.sets.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSet}
                    disabled={item.sets.length >= 10}
                    className="w-7 h-7 p-0 text-muted-foreground hover:text-lime"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {item.sets.map((setDetail, setIdx) => (
                <SetRow
                  key={setIdx}
                  setIndex={setIdx}
                  setDetail={setDetail}
                  onUpdate={(updates) => updateSet(setIdx, updates)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function RoutineTable() {
  const { routine, clearRoutine, totalWeeklySets } = useWorkout();
  const { isAuthenticated } = useAuth();

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Kinesiology Workout Builder", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Total Weekly Sets: ${Math.round(totalWeeklySets)}`, 14, 28);

    // Main workout table
    const tableData = routine.map((item) => [
      item.exercise,
      item.jointFunction,
      `${item.sets.length}`,
      item.sets.map((s, i) => `S${i + 1}: ${s.reps} reps @ ${s.weight}lbs`).join(", "),
      item.parameters.frequency,
      item.parameters.rest,
      item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1),
    ]);

    autoTable(doc, {
      startY: 34,
      head: [["Exercise", "Joint Function", "Sets", "Set Details", "Freq", "Rest", "Difficulty"]],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [132, 204, 22], textColor: [15, 23, 42], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [30, 41, 59] },
      theme: "grid",
    });

    // Warmup section
    const warmupY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Recommended Warmups", 14, warmupY);

    const warmupData = routine.map((item) => [
      item.exercise,
      item.warmup.name,
      `${item.warmup.sets} × ${item.warmup.reps}`,
      item.warmup.instructions.join(" "),
    ]);

    autoTable(doc, {
      startY: warmupY + 4,
      head: [["Before", "Warmup Exercise", "Sets × Reps", "Instructions"]],
      body: warmupData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 3: { cellWidth: 70 } },
      theme: "grid",
    });

    doc.save("workout-routine.pdf");
    toast.success("PDF exported successfully!");
  };

  const [, setLocation] = useLocation();

  const handleSaveWorkout = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setLocation("/calendar?save=true");
  };

  if (routine.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-sm p-12 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-heading font-bold text-lg text-muted-foreground mb-2">
            Your Routine is Empty
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Select a movement category, choose a joint function, and add exercises to build your weekly routine — or paste / upload an existing one to rate it below.
          </p>
        </div>
        <WorkoutRater />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-xl text-foreground">
            Your Routine
          </h3>
          <p className="text-sm text-muted-foreground">
            {routine.length} exercise{routine.length !== 1 ? "s" : ""} programmed
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-4 py-2 bg-lime/10 border-2 border-lime/30 rounded-sm">
            <span className="text-xs text-muted-foreground uppercase tracking-wider block">
              Total Weekly Sets
            </span>
            <span className="font-heading font-bold text-2xl text-lime">
              {Math.round(totalWeeklySets)}
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleExportPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <FileDown className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button
            size="sm"
            onClick={handleSaveWorkout}
            className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearRoutine}
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Exercise rows */}
      <div className="border-2 border-border rounded-sm overflow-hidden">
        <AnimatePresence>
          {routine.map((item, index) => (
            <RoutineItemRow key={item.id} item={item} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-secondary/50 rounded-sm text-center">
          <span className="text-xs text-muted-foreground block">Systemic</span>
          <span className="font-heading font-bold text-foreground">
            {routine.filter((r) => r.category === "systemic").length}
          </span>
        </div>
        <div className="p-3 bg-secondary/50 rounded-sm text-center">
          <span className="text-xs text-muted-foreground block">Regional</span>
          <span className="font-heading font-bold text-foreground">
            {routine.filter((r) => r.category === "regional").length}
          </span>
        </div>
        <div className="p-3 bg-secondary/50 rounded-sm text-center">
          <span className="text-xs text-muted-foreground block">Total Exercises</span>
          <span className="font-heading font-bold text-foreground">
            {routine.length}
          </span>
        </div>
        <div className="p-3 bg-lime/10 border border-lime/30 rounded-sm text-center">
          <span className="text-xs text-muted-foreground block">Weekly Sets</span>
          <span className="font-heading font-bold text-lime">
            {Math.round(totalWeeklySets)}
          </span>
        </div>
      </div>

      {/* Hypertrophy Matrix Rater (inline) */}
      <WorkoutRater />
    </div>
  );
}
