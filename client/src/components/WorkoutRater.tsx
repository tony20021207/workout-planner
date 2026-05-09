/**
 * WorkoutRater — Hypertrophy Matrix Rating System
 * Rates a workout (current routine, pasted text, or uploaded file/image),
 * shows the breakdown inline, and lets the user adopt the optimized routine
 * (all-or-some) and re-rate iteratively.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ClipboardEdit,
  Upload,
  ListChecks,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  RotateCw,
  Replace,
  AlertTriangle,
  X,
  Info,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkout } from "@/contexts/WorkoutContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  type RatingResult,
  type OptimizedExercise,
  serializeRoutineToText,
  optimizedToRoutineItem,
} from "@/lib/rating";
import { RatingRubric } from "./RatingRubric";

type SourceMode = "routine" | "text" | "image";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? "text-lime border-lime/40 bg-lime/10"
    : score >= 65 ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10"
    : "text-red-400 border-red-400/40 bg-red-400/10";
  return (
    <div className={`inline-flex items-baseline gap-1 px-4 py-2 rounded-sm border-2 ${color}`}>
      <span className="font-heading font-bold text-3xl tabular-nums">{Math.round(score)}</span>
      <span className="text-sm opacity-70">/100</span>
    </div>
  );
}

type ScoreTier = "poor" | "medium" | "good";

function tierOf(score: number, max: number): ScoreTier {
  const pct = score / max;
  if (pct < 0.5) return "poor";
  if (pct < 0.8) return "medium";
  return "good";
}

function BreakdownRow({ label, score, max, notes }: { label: string; score: number; max: number; notes: string }) {
  const pct = Math.max(0, Math.min(1, score / max));
  const tier = tierOf(score, max);

  const tierStyle: Record<ScoreTier, { bar: string; note: string; icon: typeof AlertTriangle; iconClass: string; label: string }> = {
    poor: {
      bar: "bg-red-400",
      note: "text-red-200/90 bg-red-500/5 border-red-500/30",
      icon: AlertTriangle,
      iconClass: "text-red-400",
      label: "Needs work",
    },
    medium: {
      bar: "bg-yellow-400",
      note: "text-yellow-100/90 bg-yellow-500/5 border-yellow-500/30",
      icon: Sparkles,
      iconClass: "text-yellow-400",
      label: "On track",
    },
    good: {
      bar: "bg-lime",
      note: "text-lime/90 bg-lime/5 border-lime/30",
      icon: CheckCircle2,
      iconClass: "text-lime",
      label: "Strong",
    },
  };
  const t = tierStyle[tier];
  const TierIcon = t.icon;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{score.toFixed(1)} / {max}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${t.bar} transition-all`} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className={`text-[11px] leading-relaxed border rounded-sm p-2 flex items-start gap-1.5 ${t.note}`}>
        <TierIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${t.iconClass}`} />
        <div>
          <span className="font-semibold uppercase tracking-wider text-[9px] block mb-0.5 opacity-80">{t.label}</span>
          {notes}
        </div>
      </div>
    </div>
  );
}

export default function WorkoutRater() {
  const { routine, replaceRoutine, addRoutineItem } = useWorkout();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SourceMode>("routine");
  const [pastedText, setPastedText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [result, setResult] = useState<RatingResult | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const rateMutation = trpc.rating.rateWorkout.useMutation({
    onSuccess: (data) => {
      setResult(data as RatingResult);
      setExcluded(new Set());
      toast.success("Rating complete");
    },
    onError: (err) => {
      toast.error(`Rating failed: ${err.message}`);
    },
  });

  const canSubmit = useMemo(() => {
    if (mode === "routine") return routine.length > 0;
    if (mode === "text") return pastedText.trim().length > 20;
    return !!imageDataUrl;
  }, [mode, routine.length, pastedText, imageDataUrl]);

  const handleRate = () => {
    if (mode === "routine") {
      rateMutation.mutate({
        source: "routine",
        text: serializeRoutineToText(routine),
      });
    } else if (mode === "text") {
      rateMutation.mutate({ source: "text", text: pastedText });
    } else if (imageDataUrl) {
      rateMutation.mutate({ source: "image", imageDataUrl });
    }
  };

  const handleFile = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isText =
      file.type === "text/plain" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md");
    const isDocx =
      file.name.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (isImage) {
      const dataUrl = await readAsDataURL(file);
      setImageDataUrl(dataUrl);
      setImageName(file.name);
      setMode("image");
    } else if (isText) {
      const text = await readAsText(file);
      setPastedText(text);
      setMode("text");
      toast.success(`Loaded ${file.name} into the text box`);
    } else if (isDocx) {
      toast.error(
        "Word .docx parsing isn't built in yet. Open the file, copy the contents, and paste into the text box.",
        { duration: 6000 }
      );
      setMode("text");
    } else {
      toast.error("Unsupported file. Use .txt, an image, or paste text directly.");
    }
  };

  const handleAdoptAll = () => {
    if (!result) return;
    const items = result.optimizedRoutine
      .filter((_, i) => !excluded.has(i))
      .map(optimizedToRoutineItem);
    if (items.length === 0) {
      toast.error("No exercises selected to adopt");
      return;
    }
    replaceRoutine(items);
    toast.success(`Adopted ${items.length} exercise${items.length === 1 ? "" : "s"} as your new routine`);
    setMode("routine");
    setResult(null);
  };

  const handleAddOne = (opt: OptimizedExercise) => {
    addRoutineItem(optimizedToRoutineItem(opt));
    toast.success(`Added "${opt.exercise}" to your routine`);
  };

  const toggleExclude = (i: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const reset = () => {
    setResult(null);
    setExcluded(new Set());
    setPastedText("");
    setImageDataUrl(null);
    setImageName(null);
  };

  if (!open) {
    return (
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
      >
        <Sparkles className="w-4 h-4 mr-1" />
        Rate Workout
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="border-2 border-purple-500/30 bg-purple-500/5 rounded-sm p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-sm">
            <Sparkles className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">Hypertrophy Matrix Rating</h3>
            <p className="text-xs text-muted-foreground">
              Microcycle scored out of 100. 5 criteria × 20 pts each.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RatingRubric />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              reset();
            }}
            className="text-muted-foreground hover:text-foreground w-8 h-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Input mode tabs */}
      {!result && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as SourceMode)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="routine" className="text-xs">
              <ListChecks className="w-3.5 h-3.5 mr-1" />
              Current Routine
            </TabsTrigger>
            <TabsTrigger value="text" className="text-xs">
              <ClipboardEdit className="w-3.5 h-3.5 mr-1" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="image" className="text-xs">
              <Upload className="w-3.5 h-3.5 mr-1" />
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="routine" className="mt-4">
            {routine.length > 0 ? (
              <div className="text-sm text-muted-foreground">
                Will rate your current routine of <strong className="text-foreground">{routine.length}</strong> exercise{routine.length === 1 ? "" : "s"}.
              </div>
            ) : (
              <div className="text-sm text-yellow-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Your routine is empty. Build one above, paste text, or upload a file.
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="mt-4 space-y-2">
            <Textarea
              placeholder={`Paste your weekly workout. Include exercise names (with angles), sets, reps, and weight. Example:

Mon - Push
  Incline DB Press 30°: 3x8 @ 60lbs
  Cable Lateral Raise: 4x12 @ 15lbs
  Triceps Pushdown (Rope): 3x12 @ 50lbs

Tue - Pull
  Lat Pulldown (Wide grip): 3x10 @ 120lbs
  ...`}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="min-h-[180px] text-xs font-mono"
            />
          </TabsContent>

          <TabsContent value="image" className="mt-4 space-y-3">
            <label className="block">
              <input
                type="file"
                accept="image/*,.txt,.md,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border file:border-purple-500/40 file:bg-purple-500/10 file:text-purple-300 file:font-semibold hover:file:bg-purple-500/20 file:cursor-pointer"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Supported: images (JPG/PNG), plain text (.txt). For Word .docx files, open the document, copy the contents, and paste into the "Paste Text" tab.
            </p>
            {imageDataUrl && (
              <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-sm">
                <img src={imageDataUrl} alt={imageName ?? "uploaded"} className="w-20 h-20 object-cover rounded-sm" />
                <div className="text-xs">
                  <div className="font-semibold text-foreground">{imageName}</div>
                  <div className="text-muted-foreground">Will be analyzed by vision model.</div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Submit button */}
      {!result && (
        <Button
          onClick={handleRate}
          disabled={!canSubmit || rateMutation.isPending}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
        >
          {rateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing... this can take 10–30 seconds
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Rate this microcycle
            </>
          )}
        </Button>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Score + verdict */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-card rounded-sm border border-border">
              <div className="flex flex-col items-center gap-1">
                <ScoreBadge score={result.score} />
                {result.minorBonus && result.minorBonus.score > 0 && (
                  <div className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold tabular-nums">
                    +{result.minorBonus.score.toFixed(2)} bonus
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed flex-1">{result.verdict}</p>
            </div>

            {/* Breakdowns — 4 selection criteria, all at 20 pts each */}
            <div className="p-4 bg-card rounded-sm border border-border space-y-4">
              <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">
                Selection · 80
              </h4>
              <BreakdownRow label="Stability" score={result.selectionBreakdown.stability.score} max={20} notes={result.selectionBreakdown.stability.notes} />
              <BreakdownRow label="Deep Stretch" score={result.selectionBreakdown.stretch.score} max={20} notes={result.selectionBreakdown.stretch.notes} />
              <BreakdownRow label="SFR" score={result.selectionBreakdown.sfr.score} max={20} notes={result.selectionBreakdown.sfr.notes} />
              <BreakdownRow label="Compound / Isolation Ratio" score={result.selectionBreakdown.compoundIsolationRatio.score} max={20} notes={result.selectionBreakdown.compoundIsolationRatio.notes} />
            </div>

            {/* Scap-depression cueing note (only if pulldown movements present) */}
            {result.scapularDepressionNote && (
              <div className="p-3 bg-blue-500/5 border border-blue-500/30 rounded-sm flex items-start gap-2 text-xs">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-0.5">Pulldown technique cue</p>
                  <p className="text-muted-foreground leading-relaxed">{result.scapularDepressionNote}</p>
                </div>
              </div>
            )}

            {/* Coverage — joint-action level (20 pts) */}
            <div className="p-4 bg-card rounded-sm border border-border">
              <BreakdownRow
                label="Joint-Action Coverage"
                score={result.coverageBreakdown.score}
                max={20}
                notes={result.coverageBreakdown.notes}
              />
              <p className="text-xs text-muted-foreground mt-3 mb-3">
                MAJORS only. 22 major joint actions distributed across 20 pts (~0.91 each, half-credit ~0.45). DIRECT coverage only — stabilizer roles and passive stretch don't auto-credit. The 5 stabilizer / minor actions sit in a separate bonus pool (see below) that adds to your total without ever deducting. Use the cueing tips to recover lost points by upgrading hidden roles into intentional direct work.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-lime mb-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Hit Well
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.coverageBreakdown.hit.length === 0 ? (
                      <span className="text-muted-foreground italic">None highlighted</span>
                    ) : result.coverageBreakdown.hit.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 bg-lime/10 text-lime rounded-sm border border-lime/30">{m}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-red-400 mb-2 font-semibold">
                    <XCircle className="w-4 h-4" /> Missing / Under-trained
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.coverageBreakdown.missing.length === 0 ? (
                      <span className="text-muted-foreground italic">All groups covered</span>
                    ) : result.coverageBreakdown.missing.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-300 rounded-sm border border-red-500/30">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
              {result.coverageBreakdown.cueingTips && result.coverageBreakdown.cueingTips.length > 0 && (
                <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/30 rounded-sm">
                  <div className="flex items-center gap-1.5 mb-1.5 text-blue-300 font-semibold text-xs">
                    <Info className="w-3.5 h-3.5" />
                    Recover lost coverage points by cueing intentionally
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mb-2 leading-snug">
                    Stabilizer / stretch roles don't auto-score, but you can upgrade them into direct training stimulus by following these cues during your existing exercises.
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed list-disc pl-4">
                    {result.coverageBreakdown.cueingTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Minor coverage bonus */}
            {result.minorBonus && (
              <div className="p-4 bg-card rounded-sm border border-border space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-blue-300" />
                    Minor Coverage Bonus
                  </h4>
                  <div className="text-xs tabular-nums">
                    <span className="text-blue-300 font-bold">+{result.minorBonus.score.toFixed(2)}</span>
                    <span className="text-muted-foreground"> / +1.50</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Stabilizer actions tracked separately from the 100. Bonus points are added on top — never deducted. Most lifters won't dedicate exercises to these; the lifter who does earns recognition.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold mb-1">Grabbed ({result.minorBonus.hit.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.minorBonus.hit.length === 0 ? (
                        <span className="text-muted-foreground italic">None yet</span>
                      ) : result.minorBonus.hit.map((h, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-sm border border-blue-500/30">{h}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Available ({result.minorBonus.missing.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.minorBonus.missing.length === 0 ? (
                        <span className="text-muted-foreground italic">All grabbed</span>
                      ) : result.minorBonus.missing.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 bg-secondary/40 text-muted-foreground rounded-sm border border-border">{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {result.minorBonus.notes && (
                  <p className="text-xs text-muted-foreground leading-relaxed italic">{result.minorBonus.notes}</p>
                )}
                {result.minorBonus.opportunityTips && result.minorBonus.opportunityTips.length > 0 && (
                  <div className="p-3 bg-blue-500/5 border border-blue-500/30 rounded-sm">
                    <div className="flex items-center gap-1.5 mb-1.5 text-blue-300 font-semibold text-xs">
                      <Info className="w-3.5 h-3.5" />
                      Easy bonus pickups
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed list-disc pl-4">
                      {result.minorBonus.opportunityTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Optimized routine */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">
                  Optimized Routine · {result.optimizedRoutine.length} exercises
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={handleAdoptAll}
                    className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
                  >
                    <Replace className="w-4 h-4 mr-1" />
                    Adopt {excluded.size > 0 ? `selected (${result.optimizedRoutine.length - excluded.size})` : "all & replace"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRate}
                    disabled={rateMutation.isPending}
                  >
                    {rateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCw className="w-4 h-4 mr-1" />}
                    Re-rate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={reset}
                    className="text-muted-foreground"
                  >
                    Start over
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Toggle <Minus className="w-3 h-3 inline" /> to exclude an exercise from "Adopt all". Use <Plus className="w-3 h-3 inline" /> to add a single exercise to your existing routine without replacing it.
              </p>

              <div className="border-2 border-border rounded-sm overflow-hidden">
                {result.optimizedRoutine.map((opt, i) => {
                  const isExcluded = excluded.has(i);
                  return (
                    <div
                      key={i}
                      className={`p-3 border-b border-border last:border-b-0 ${
                        i % 2 === 0 ? "bg-card" : "bg-secondary/30"
                      } ${isExcluded ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-semibold text-foreground text-sm">{opt.exercise}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
                              opt.category === "systemic"
                                ? "border-lime/40 text-lime bg-lime/10"
                                : "border-coral/40 text-coral bg-coral/10"
                            }`}>
                              {opt.category === "systemic" ? "Tier 1" : "Tier 2"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {opt.targetedMuscles.join(", ")}
                          </div>
                          {opt.jointActions && opt.jointActions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {opt.jointActions.map((ja, jaIdx) => (
                                <span
                                  key={jaIdx}
                                  className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-sm"
                                >
                                  {ja}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-foreground mt-1.5">
                            <span><strong className="text-lime">{opt.sets}</strong> × {opt.repRange} reps</span>
                            <span>{opt.rir}</span>
                            {opt.frequency && <span>{opt.frequency}</span>}
                            {opt.equipment && <span className="text-muted-foreground">{opt.equipment}</span>}
                          </div>
                          {opt.rationale && (
                            <p className="text-[11px] text-muted-foreground italic mt-1.5 leading-relaxed">{opt.rationale}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExclude(i)}
                            className={`w-8 h-8 p-0 ${isExcluded ? "border-lime text-lime" : "border-destructive/50 text-destructive"}`}
                            title={isExcluded ? "Include in adopt-all" : "Exclude from adopt-all"}
                          >
                            {isExcluded ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddOne(opt)}
                            className="w-8 h-8 p-0 text-lime border-lime/40 hover:bg-lime/10"
                            title="Add this single exercise to your routine"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
