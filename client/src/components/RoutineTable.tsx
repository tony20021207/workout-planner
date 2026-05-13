/**
 * RoutineTable — Weekly exercise pool overview.
 *
 * In the new flow, this is just an overview of exercises the user picked
 * for the week — no sets/reps/weight here. The user is prompted to Rate,
 * then in a later step (P4) picks a split, then per-day sets/reps are
 * configured (P5). PDF / Save-to-Calendar at this stage produce a
 * "weekly pool" reference; the daily-detail PDF comes after split.
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  ClipboardList,
  Zap,
  Target,
  FileDown,
  Save,
  Sparkles,
  Layers,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkout, MAX_FAVORITES } from "@/contexts/WorkoutContext";
import { type RoutineItem } from "@/contexts/WorkoutContext";
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

function PoolItemRow({ item, index }: { item: RoutineItem; index: number }) {
  const { removeFromRoutine, favorites, toggleFavorite, isFavorite } = useWorkout();
  const starred = isFavorite(item.id);

  const handleToggleFavorite = () => {
    if (!starred && favorites.length >= MAX_FAVORITES) {
      toast.error(`Up to ${MAX_FAVORITES} favorites — unstar another first`);
      return;
    }
    toggleFavorite(item.id);
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
            <p className="text-[11px] text-muted-foreground truncate">
              {item.targetedMuscles.join(", ")}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
              <span className="uppercase tracking-wider">{item.jointFunction}</span>
              {(item.equipment || item.angle) && <span className="text-border">|</span>}
              {item.equipment && <span>{item.equipment}</span>}
              {item.angle && <span>· {item.angle}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className={`w-8 h-8 p-0 ${
              starred
                ? "text-yellow-400 hover:text-yellow-300"
                : "text-muted-foreground hover:text-yellow-300"
            }`}
            title={
              starred
                ? "Unfavorite"
                : favorites.length >= MAX_FAVORITES
                  ? `Up to ${MAX_FAVORITES} favorites`
                  : "Mark as favorite (anchored across allocations)"
            }
          >
            <Star
              className="w-4 h-4"
              fill={starred ? "currentColor" : "none"}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeFromRoutine(item.id)}
            className="text-muted-foreground hover:text-destructive w-8 h-8 p-0"
            title="Remove from week"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function RoutineTable() {
  const { routine, clearRoutine, favorites } = useWorkout();
  const { isAuthenticated } = useAuth();

  // Aggregate stats for the weekly overview footer.
  const systemicCount = routine.filter((r) => r.category === "systemic").length;
  const regionalCount = routine.filter((r) => r.category === "regional").length;
  const uniqueJointActions = new Set<string>();
  routine.forEach((r) => r.targetedMuscles.forEach((m) => uniqueJointActions.add(m)));

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Weekly Exercise Pool", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}  |  ${routine.length} exercises (${systemicCount} systemic, ${regionalCount} regional)`,
      14,
      28,
    );
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Sets, reps, and weight are configured after split selection.",
      14,
      34,
    );

    const tableData = routine.map((item) => [
      item.exercise,
      item.jointFunction,
      item.category === "systemic" ? "Tier 1" : "Tier 2",
      item.equipment ?? "—",
      item.angle ?? "—",
      item.targetedMuscles.join(", "),
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Exercise", "Joint Function", "Tier", "Equipment", "Angle", "Targeted Muscles"]],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [132, 204, 22], textColor: [15, 23, 42], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [30, 41, 59] },
      theme: "grid",
    });

    doc.save("weekly-exercise-pool.pdf");
    toast.success("PDF exported");
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
      <div className="space-y-6">
        <div className="border-2 border-dashed border-border rounded-sm p-12 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-heading font-bold text-lg text-muted-foreground mb-2">
            No Exercises Picked Yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Pick a movement category above, then add the exercises you want for the week.
            Or paste / upload an existing routine below to rate it directly.
          </p>
        </div>
        <WorkoutRater />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-xl text-foreground">
            Weekly Microcycle
          </h3>
          <p className="text-sm text-muted-foreground">
            {routine.length} exercise{routine.length !== 1 ? "s" : ""} picked for this week.
            Sets &amp; reps come after you choose a split.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
            {favorites.length} / {MAX_FAVORITES} favorited — favorites anchor across allocations and drive week-2 bias correction.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Rate prompt — sits between the list and the rater */}
      <div className="p-4 bg-purple-500/10 border-2 border-purple-500/30 rounded-sm flex items-start gap-3">
        <div className="p-1.5 bg-purple-500/20 rounded-sm shrink-0">
          <Sparkles className="w-4 h-4 text-purple-300" />
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground mb-1">Before you pick a split, rate this selection.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Hypertrophy Matrix scores your weekly pool out of 100 and flags missing joint actions or under-trained muscles.
            Make tweaks here, then move on to the split step.
          </p>
        </div>
      </div>

      {/* Exercise rows */}
      <div className="border-2 border-border rounded-sm overflow-hidden">
        <AnimatePresence>
          {routine.map((item, index) => (
            <PoolItemRow key={item.id} item={item} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* Summary footer */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-secondary/50 rounded-sm text-center">
          <span className="text-xs text-muted-foreground block uppercase tracking-wider">
            <Zap className="w-3 h-3 inline mr-1" />Tier 1
          </span>
          <span className="font-heading font-bold text-lg text-foreground">{systemicCount}</span>
        </div>
        <div className="p-3 bg-secondary/50 rounded-sm text-center">
          <span className="text-xs text-muted-foreground block uppercase tracking-wider">
            <Target className="w-3 h-3 inline mr-1" />Tier 2
          </span>
          <span className="font-heading font-bold text-lg text-foreground">{regionalCount}</span>
        </div>
        <div className="p-3 bg-lime/10 border border-lime/30 rounded-sm text-center">
          <span className="text-xs text-muted-foreground block uppercase tracking-wider">
            <Layers className="w-3 h-3 inline mr-1" />Muscle Groups
          </span>
          <span className="font-heading font-bold text-lg text-lime">{uniqueJointActions.size}</span>
        </div>
      </div>

      {/* Hypertrophy Matrix Rater */}
      <WorkoutRater />
    </div>
  );
}
