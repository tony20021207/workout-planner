/**
 * PostSplitRater — Second-stage rating engine.
 *
 * Runs after the user has picked a split, distributed exercises across
 * days, and set sets/reps/weight. Calls the rateFinalizedWeek tRPC
 * procedure with the serialized week + effort + same RIR self-report.
 *
 * Scores out of 100: pool's 9 criteria compressed to 82 + 3 add-ons of
 * 6 each (Session Caps, Rep Range Distribution, Total Weekly Volume).
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkout } from "@/contexts/WorkoutContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { type PostSplitRatingResult, serializeFinalizedWeekToText } from "@/lib/rating";
import { SPLIT_PRESETS } from "@/lib/splitPresets";
import { RatingRubric } from "./RatingRubric";

type ScoreTier = "poor" | "medium" | "good";

function tierOf(score: number, max: number): ScoreTier {
  const pct = score / max;
  if (pct < 0.5) return "poor";
  if (pct < 0.8) return "medium";
  return "good";
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85
      ? "text-lime border-lime/40 bg-lime/10"
      : score >= 65
      ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10"
      : "text-red-400 border-red-400/40 bg-red-400/10";
  return (
    <div className={`inline-flex items-baseline gap-1 px-4 py-2 rounded-sm border-2 ${color}`}>
      <span className="font-heading font-bold text-3xl tabular-nums">{Math.round(score)}</span>
      <span className="text-sm opacity-70">/100</span>
    </div>
  );
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
        <span className="text-muted-foreground tabular-nums">
          {score.toFixed(1)} / {max}
        </span>
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

export default function PostSplitRater() {
  const { routine, split, lifestyle, experience, autoPlanUntouched } = useWorkout();
  const [result, setResult] = useState<PostSplitRatingResult | null>(null);

  const activePreset = useMemo(() => {
    if (!split.splitId || split.splitId === "custom") return null;
    return SPLIT_PRESETS[split.splitId];
  }, [split.splitId]);

  // Don't render if pre-split: rating only makes sense after allocation.
  const hasAssignments = useMemo(() => {
    return Object.values(split.dayAssignments).some((ids) => ids.length > 0);
  }, [split.dayAssignments]);

  // Don't render if sets aren't filled in (weight=0 across the board is fine,
  // but reps must be set — they default to 1 in WorkoutContext, but the
  // auto-recommender bumps them to category-appropriate defaults).
  const hasSetData = routine.every((r) => r.sets.length > 0);

  const rateMutation = trpc.rating.rateFinalizedWeek.useMutation({
    onSuccess: (data) => {
      setResult(data as PostSplitRatingResult);
      toast.success("Post-split rating complete");
    },
    onError: (err) => {
      toast.error(`Rating failed: ${err.message}`);
    },
  });

  const handleRate = () => {
    if (!activePreset) return;
    const text = serializeFinalizedWeekToText(routine, activePreset.name, split.dayAssignments, activePreset.days);
    rateMutation.mutate({
      text,
      lifestyle: lifestyle ?? undefined,
      experience: experience ?? undefined,
    });
  };

  if (!activePreset || !hasAssignments || !hasSetData) {
    return null;
  }

  // When the plan came purely from auto-allocate + auto-recommend with no
  // user edits, we tell the user it already meets the rubric and hide the
  // Rate button. Any manual edit flips autoPlanUntouched to false.
  const planIsPerfect = autoPlanUntouched && !result;

  if (planIsPerfect) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-2 border-lime/40 bg-lime/5 rounded-sm p-5 space-y-3"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-lime/20 rounded-sm shrink-0">
            <CheckCircle2 className="w-5 h-5 text-lime" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-lg font-bold text-foreground">
              Plan meets the rubric
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              You used Smart Split and Smart Fill without editing — the result already satisfies the Hypertrophy Matrix criteria for your experience level. Make any change (move an exercise, edit sets / reps, swap a pick) and the post-split rating button will reappear so you can re-score.
            </p>
          </div>
          <RatingRubric />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-yellow-500/30 bg-yellow-500/5 rounded-sm p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-sm">
            <Trophy className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              Rate the Finalized Week
            </h3>
            <p className="text-xs text-muted-foreground">
              Post-split: 5 selection criteria (14 each = 70) + 3 add-ons (10 each = 30) = 100.
            </p>
          </div>
        </div>
        <RatingRubric />
      </div>

      {!result && (
        <Button
          onClick={handleRate}
          disabled={rateMutation.isPending}
          className="w-full bg-yellow-500 text-yellow-950 hover:bg-yellow-400 font-semibold"
        >
          {rateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing the full week... 15–40 seconds
            </>
          ) : (
            <>
              <Trophy className="w-4 h-4 mr-2" />
              Rate this finalized week
            </>
          )}
        </Button>
      )}

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

            {/* 5 compressed selection criteria — 14 pts each = 70 pts */}
            <div className="p-4 bg-card rounded-sm border border-border space-y-4">
              <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">
                Selection · 56
              </h4>
              <BreakdownRow label="Stability" score={result.selectionBreakdown.stability.score} max={14} notes={result.selectionBreakdown.stability.notes} />
              <BreakdownRow label="Deep Stretch" score={result.selectionBreakdown.stretch.score} max={14} notes={result.selectionBreakdown.stretch.notes} />
              <BreakdownRow label="SFR" score={result.selectionBreakdown.sfr.score} max={14} notes={result.selectionBreakdown.sfr.notes} />
              <BreakdownRow label="Compound / Isolation Ratio" score={result.selectionBreakdown.compoundIsolationRatio.score} max={14} notes={result.selectionBreakdown.compoundIsolationRatio.notes} />
            </div>

            {/* Coverage — 14 pts */}
            <div className="p-4 bg-card rounded-sm border border-border">
              <BreakdownRow
                label="Joint-Action Coverage"
                score={result.coverageBreakdown.score}
                max={14}
                notes={result.coverageBreakdown.notes}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-lime mb-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Hit Well
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.coverageBreakdown.hit.length === 0 ? (
                      <span className="text-muted-foreground italic">None highlighted</span>
                    ) : (
                      result.coverageBreakdown.hit.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 bg-lime/10 text-lime rounded-sm border border-lime/30">{m}</span>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-red-400 mb-2 font-semibold">
                    <XCircle className="w-4 h-4" /> Missing / Under-trained
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.coverageBreakdown.missing.length === 0 ? (
                      <span className="text-muted-foreground italic">All groups covered</span>
                    ) : (
                      result.coverageBreakdown.missing.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-300 rounded-sm border border-red-500/30">{m}</span>
                      ))
                    )}
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
                    <span className="text-muted-foreground"> / +1.05</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Stabilizer actions tracked separately from the 100. Bonus points only — never deducted.
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

            {/* Post-split add-ons */}
            <div className="p-4 bg-yellow-500/5 rounded-sm border-2 border-yellow-500/30 space-y-3">
              <div className="flex items-baseline justify-between">
                <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">
                  Post-Split Add-Ons · 30
                </h4>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  daily detail you couldn't score at the pool stage
                </span>
              </div>
              <BreakdownRow label="Session Caps" score={result.postSplitAddOns.sessionCaps.score} max={10} notes={result.postSplitAddOns.sessionCaps.notes} />
              <BreakdownRow label="Rep Range Distribution" score={result.postSplitAddOns.repRangeDistribution.score} max={10} notes={result.postSplitAddOns.repRangeDistribution.notes} />
              <BreakdownRow label="Total Weekly Volume vs MEV–MAV" score={result.postSplitAddOns.totalVolume.score} max={10} notes={result.postSplitAddOns.totalVolume.notes} />
            </div>

            {/* Notes */}
            {result.scapularDepressionNote && (
              <div className="p-3 bg-blue-500/5 border border-blue-500/30 rounded-sm flex items-start gap-2 text-xs">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-0.5">Pulldown technique cue</p>
                  <p className="text-muted-foreground leading-relaxed">{result.scapularDepressionNote}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRate}
                disabled={rateMutation.isPending}
              >
                {rateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />}
                Re-rate
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setResult(null)} className="text-muted-foreground">
                Hide
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

