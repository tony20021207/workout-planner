/**
 * WorkoutRater — Hypertrophy Matrix Rating System
 * Rates a workout (current routine, pasted text, or uploaded file/image),
 * shows the breakdown inline, and lets the user adopt the optimized routine
 * (all-or-some) and re-rate iteratively.
 */
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ClipboardEdit,
  Upload,
  ListChecks,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCw,
  Replace,
  AlertTriangle,
  X,
  Info,
  Trophy,
  Heart,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkout } from "@/contexts/WorkoutContext";
import { trpc } from "@/lib/trpc";
import LifestylePicker from "./LifestylePicker";
import ExperiencePicker from "./ExperiencePicker";
import { toast } from "sonner";
import {
  type RatingResult,
  type RecommendationPair,
  serializeRoutineToText,
  pairToRoutineItem,
} from "@/lib/rating";
import { type RoutineItem } from "@/contexts/WorkoutContext";
import { scorePool, type PoolScore } from "@/lib/poolScore";
import { RatingRubric } from "./RatingRubric";
import SwapTargetPicker, { type SwapOverridePick } from "./SwapTargetPicker";

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

/**
 * One row of the Pool Rating Matrix. Bar + score is always visible;
 * the LLM's coaching note is collapsed behind a "Details" toggle so
 * the matrix stays scannable at-a-glance.
 */
function BreakdownRow({ label, score, max, notes }: { label: string; score: number; max: number; notes: string }) {
  const [open, setOpen] = useState(false);
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
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted-foreground tabular-nums">{score.toFixed(1)} / {max}</span>
          {notes && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded-sm px-1.5 py-0.5 transition-colors"
              title={open ? "Hide details" : "Show coaching note"}
            >
              {open ? "− Details" : "+ Details"}
            </button>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${t.bar} transition-all`} style={{ width: `${pct * 100}%` }} />
      </div>
      {open && notes && (
        <div className={`text-[11px] leading-relaxed border rounded-sm p-2 flex items-start gap-1.5 ${t.note}`}>
          <TierIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${t.iconClass}`} />
          <div>
            <span className="font-semibold uppercase tracking-wider text-[9px] block mb-0.5 opacity-80">{t.label}</span>
            {notes}
          </div>
        </div>
      )}
    </div>
  );
}

function countActionable(pairs: RecommendationPair[]): number {
  return pairs.filter((p) => p.action !== "keep").length;
}

/**
 * Build the routine that would result if the given pairs were applied.
 * Pure function — does not mutate. Shared between the live score
 * projection (per render) and the actual Apply handler (on click).
 *
 *   keep   → current item stays
 *   swap   → current item replaced (sets[] preserved)
 *   remove → current item dropped
 *   add    → new item appended
 *
 * Pairs not in `accepted` are treated as no-ops.
 */
/**
 * Apply per-pair user overrides on top of the rating engine's
 * suggestions. When the user clicks the recommended-side exercise
 * on a swap/add row and picks something else via SwapTargetPicker,
 * we record the override here and merge it back into the pair so
 * the rest of the pipeline (projection + apply) just consumes a
 * modified pair without needing to know overrides exist.
 *
 * Override only applies to actionable pairs (swap / add); keep
 * and remove rows are pass-through.
 */
function applyOverridesToPairs(
  pairs: RecommendationPair[],
  overrides: Map<number, SwapOverridePick>,
): RecommendationPair[] {
  if (overrides.size === 0) return pairs;
  return pairs.map((p, idx) => {
    const o = overrides.get(idx);
    if (!o) return p;
    if (p.action !== "swap" && p.action !== "add") return p;
    return {
      ...p,
      recommended: o.exercise,
      category: o.category,
      targetedMuscles: o.targetedMuscles,
      rationale: `Manual override — replaces auto-suggested ${p.recommended}. ${p.rationale ?? ""}`.trim(),
    };
  });
}

function buildProjectedRoutine(
  routine: RoutineItem[],
  pairs: RecommendationPair[],
  accepted: Set<number>,
): RoutineItem[] {
  // Build TWO lookup maps so a swap/keep/remove pair can find its
  // target even when the LLM's currentIndex is missing or zero. Falls
  // back to matching by exercise name (pair.current) so we don't
  // silently skip the change. This was the "swap does nothing"
  // failure mode: the LLM occasionally returned currentIndex: 0 for
  // a swap, the index map never matched, and the routine came out
  // unchanged with no error.
  const pairByCurrentIdx = new Map<number, { pair: RecommendationPair; pairIdx: number }>();
  const pairByCurrentName = new Map<string, { pair: RecommendationPair; pairIdx: number }>();
  pairs.forEach((p, pairIdx) => {
    if (p.currentIndex > 0) pairByCurrentIdx.set(p.currentIndex, { pair: p, pairIdx });
    if (p.current && (p.action === "swap" || p.action === "keep" || p.action === "remove")) {
      pairByCurrentName.set(p.current, { pair: p, pairIdx });
    }
  });
  const out: RoutineItem[] = [];
  // Track which pair indices we've already consumed via the index path
  // so the name-fallback doesn't apply the same change twice.
  const consumedPairIdx = new Set<number>();
  routine.forEach((item, i) => {
    // Try index lookup first (the LLM is supposed to return 1-based
    // currentIndex). Fall back to matching by the item's exercise
    // name — handles the case where currentIndex came back zero or
    // off-by-one, which historically caused swaps to silently no-op.
    let found = pairByCurrentIdx.get(i + 1);
    if (!found) {
      const nameFound = pairByCurrentName.get(item.exercise);
      if (nameFound && !consumedPairIdx.has(nameFound.pairIdx)) found = nameFound;
    }
    if (!found) {
      out.push(item);
      return;
    }
    consumedPairIdx.add(found.pairIdx);
    const { pair, pairIdx } = found;
    const isAccepted = accepted.has(pairIdx);
    if (!isAccepted || pair.action === "keep") {
      out.push(item);
      return;
    }
    if (pair.action === "remove") return;
    if (pair.action === "swap") {
      const newItem = pairToRoutineItem(pair);
      newItem.sets = item.sets;
      out.push(newItem);
      return;
    }
    out.push(item);
  });
  pairs.forEach((p, pairIdx) => {
    if (p.action === "add" && accepted.has(pairIdx)) {
      out.push(pairToRoutineItem(p));
    }
  });
  return out;
}

/**
 * Merge the deterministic local PoolScore into the LLM's RatingResult.
 * Replaces every score number + the coverage / minor / favorite list
 * fields with the locally-computed values. The LLM's prose (notes,
 * cueingTips, opportunityTips, reasoning, recommendations) is preserved.
 *
 * Result: same routine + same favorites always yields the same numbers.
 */
function mergeLocalScoreIntoResult(result: RatingResult, score: PoolScore): RatingResult {
  return {
    ...result,
    score: score.total,
    selectionBreakdown: {
      stability: {
        score: score.stability,
        notes: result.selectionBreakdown.stability.notes,
      },
      stretch: {
        score: score.stretch,
        notes: result.selectionBreakdown.stretch.notes,
      },
      sfr: {
        score: score.sfr,
        notes: result.selectionBreakdown.sfr.notes,
      },
      compoundIsolationRatio: {
        score: score.compoundIsoRatio,
        notes: result.selectionBreakdown.compoundIsolationRatio.notes,
      },
    },
    coverageBreakdown: {
      ...result.coverageBreakdown,
      score: score.coverage,
      hit: score.coverageHit,
      // UI shows two buckets: hit (full credit) vs missing (everything
      // not full). Half-credit actions live in "missing" alongside zero-
      // coverage ones — both are recoverable via cueing.
      missing: [...score.coverageHalf, ...score.coverageMissing],
    },
    minorBonus: {
      ...result.minorBonus,
      score: score.minorBonus,
      hit: score.minorHit,
      missing: [...score.minorHalf, ...score.minorMissing],
    },
    favoriteBias: {
      ...result.favoriteBias,
      delta: score.favoriteBias,
      goodFavorites: score.favoriteGood,
      badFavorites: score.favoriteBad,
    },
  };
}

/**
 * "How to recover rating" — big call-to-action button that expands to
 * show the coverage hit/missing chips + cueing tips. Framed as "please
 * read" because under-trained MAJOR joint actions can be recovered via
 * conscious cueing of existing exercises (no need to add lifts).
 */
function HowToRecoverButton({
  hit,
  missing,
  cueingTips,
}: {
  hit: string[];
  missing: string[];
  cueingTips: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-2 border-yellow-500/40 bg-yellow-500/[0.06] rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center justify-between gap-3 hover:bg-yellow-500/10 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-sm">
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-bold text-base text-foreground">How to recover rating</span>
              <span className="text-[10px] uppercase tracking-wider bg-yellow-500/30 text-yellow-100 font-semibold px-1.5 py-0.5 rounded-sm">
                please read
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              Lost coverage points can be recovered without changing your exercise list — just by cueing intentional engagement of under-trained joint actions during your existing lifts.
            </p>
          </div>
        </div>
        <span className="text-muted-foreground text-xs shrink-0">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="p-4 border-t-2 border-yellow-500/30 space-y-4 bg-background/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-lime mb-2 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Hit Well ({hit.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {hit.length === 0 ? (
                  <span className="text-muted-foreground italic">None highlighted</span>
                ) : (
                  hit.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 bg-lime/10 text-lime rounded-sm border border-lime/30">
                      {m}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-red-400 mb-2 font-semibold">
                <XCircle className="w-4 h-4" /> Missing / Under-trained ({missing.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {missing.length === 0 ? (
                  <span className="text-muted-foreground italic">All groups covered</span>
                ) : (
                  missing.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-300 rounded-sm border border-red-500/30">
                      {m}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
          {cueingTips.length > 0 && (
            <div className="p-3 bg-yellow-500/[0.04] border border-yellow-500/30 rounded-sm">
              <div className="flex items-center gap-1.5 mb-2 text-yellow-200 font-semibold text-xs uppercase tracking-wider">
                <Info className="w-3.5 h-3.5" />
                Cue these intentionally during your existing exercises
              </div>
              <ul className="space-y-2 text-[12px] text-foreground leading-relaxed list-disc pl-5">
                {cueingTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * "Cherry on top" — collapsible button that expands to show the minor
 * coverage bonus. Bonus points sit ON TOP of the 100 and are never
 * deducted; framed as a low-stakes "extra credit" pickup.
 */
function CherryOnTopButton({
  score,
  hit,
  missing,
  notes,
  opportunityTips,
}: {
  score: number;
  hit: string[];
  missing: string[];
  notes: string;
  opportunityTips: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-2 border-blue-500/40 bg-blue-500/[0.05] rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center justify-between gap-3 hover:bg-blue-500/10 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-sm">
            <Trophy className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-bold text-base text-foreground">Cherry on top</span>
              <span className="text-xs tabular-nums text-blue-300 font-bold">
                +{score.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">/ +1.50</span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              Minor stabilizer actions tracked as a bonus pool. Added on top of the 100 — never deducted. Optional pickup.
            </p>
          </div>
        </div>
        <span className="text-muted-foreground text-xs shrink-0">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="p-4 border-t-2 border-blue-500/30 space-y-3 bg-background/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold mb-1">
                Grabbed ({hit.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hit.length === 0 ? (
                  <span className="text-muted-foreground italic">None yet</span>
                ) : (
                  hit.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-sm border border-blue-500/30">
                      {h}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Available ({missing.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missing.length === 0 ? (
                  <span className="text-muted-foreground italic">All grabbed</span>
                ) : (
                  missing.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 bg-secondary/40 text-muted-foreground rounded-sm border border-border">
                      {m}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
          {notes && <p className="text-xs text-muted-foreground leading-relaxed italic">{notes}</p>}
          {opportunityTips.length > 0 && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/30 rounded-sm">
              <div className="flex items-center gap-1.5 mb-1.5 text-blue-300 font-semibold text-xs">
                <Info className="w-3.5 h-3.5" />
                Easy bonus pickups
              </div>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed list-disc pl-4">
                {opportunityTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RecommendationRowProps {
  pair: RecommendationPair;
  /** Same-index RoutineItem from the user's routine (for keep rows, used
   * to source targetedMuscles for the 'current' side). May be undefined
   * for 'add' rows where current is null. */
  currentItem?: RoutineItem;
  striped: boolean;
  accepted: boolean;
  onToggle: () => void;
  /** The criterion that moves the most if THIS pair alone is applied.
   * Surfaces inline next to the action tag so the user understands
   * what each swap actually does for the score. Null when noise-only. */
  criterionDelta: { name: string; delta: number } | null;
  /** Fires when the user clicks the recommended-side exercise name on
   * a swap or add row — opens the SwapTargetPicker so they can
   * override the auto-suggestion with their own pick. Null on
   * keep/remove rows where overriding is meaningless. */
  onClickRecommendedToOverride?: () => void;
  /** True if the row already carries an override (visual cue). */
  hasOverride?: boolean;
}

function RecommendationRow({
  pair,
  currentItem,
  striped,
  accepted,
  onToggle,
  criterionDelta,
  onClickRecommendedToOverride,
  hasOverride,
}: RecommendationRowProps) {
  const isKeep = pair.action === "keep";
  const isRemove = pair.action === "remove";
  const isAdd = pair.action === "add";
  const isSwap = pair.action === "swap";

  // Tag chip styling per action.
  const tagStyle =
    isKeep ? "border-muted-foreground/40 text-muted-foreground bg-muted-foreground/5"
    : isSwap ? "border-yellow-400/40 text-yellow-300 bg-yellow-500/10"
    : isAdd ? "border-lime/40 text-lime bg-lime/10"
    : "border-red-400/40 text-red-300 bg-red-500/10";

  const tagLabel = isKeep ? "Keep" : isSwap ? "Swap" : isAdd ? "Add" : "Remove";

  // Muscles per side. Current side comes from the user's routine when
  // available (most accurate); falls back to keeping it blank. Recommended
  // side comes from the LLM's pair.targetedMuscles (for swap / add) or
  // copies from current (for keep).
  const currentMuscles = currentItem?.targetedMuscles ?? [];
  const recommendedMuscles =
    isKeep ? currentMuscles
    : isRemove ? []
    : pair.targetedMuscles ?? [];

  return (
    <div
      className={`p-3 border-b border-border last:border-b-0 ${
        striped ? "bg-secondary/30" : "bg-card"
      } ${!accepted && !isKeep ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox column — keep rows show a lock icon instead. */}
        <div className="pt-1 shrink-0">
          {isKeep ? (
            <div
              className="w-5 h-5 flex items-center justify-center text-muted-foreground"
              title={pair.rationale || "No action — current pick is appropriate"}
            >
              <Lock className="w-3 h-3" />
            </div>
          ) : (
            <button
              onClick={onToggle}
              className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-colors ${
                accepted
                  ? "bg-lime border-lime text-lime-foreground"
                  : "bg-background border-border hover:border-lime/60"
              }`}
              title={pair.rationale || (accepted ? "Untick to skip" : "Tick to accept")}
            >
              {accepted && <CheckCircle2 className="w-3 h-3" strokeWidth={3} />}
            </button>
          )}
        </div>

        {/* Diff row: current side → recommended side */}
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
          {/* Current side */}
          <div className="min-w-0 space-y-0.5">
            {pair.current ? (
              <>
                <div className="text-sm font-semibold text-foreground truncate" title={pair.current}>
                  {pair.current}
                </div>
                {currentMuscles.length > 0 && (
                  <div className="text-[10px] text-muted-foreground leading-snug">
                    {currentMuscles.join(", ")}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground italic">— (none)</div>
            )}
          </div>

          {/* Arrow + action chip + per-pair criterion delta. The chip is
              CLICKABLE on actionable rows (swap/remove/add) — it shortcuts
              the accept-checkbox toggle so the user can click the visible
              "ADD" / "SWAP" / "REMOVE" tag itself, not just the small
              checkbox on the left. Keep rows show a non-interactive chip
              because the Lock icon already conveys "no action available". */}
          <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              {isKeep ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-semibold uppercase tracking-wider ${tagStyle}`}>
                  {tagLabel}
                </span>
              ) : (
                <button
                  onClick={onToggle}
                  className={`text-[10px] px-2 py-0.5 rounded-sm border font-semibold uppercase tracking-wider cursor-pointer transition-all ${tagStyle} ${
                    accepted ? "ring-2 ring-lime/40 shadow-sm" : "hover:brightness-125 hover:scale-105"
                  }`}
                  title={accepted ? "Click to skip this change" : "Click to accept this change"}
                >
                  {tagLabel}
                  {accepted && <CheckCircle2 className="w-2.5 h-2.5 inline-block ml-1" strokeWidth={3} />}
                </button>
              )}
            </div>
            {criterionDelta && (
              <span
                className={`text-[10px] tabular-nums font-semibold ${
                  criterionDelta.delta > 0 ? "text-lime" : "text-red-400"
                }`}
                title={`Applying this pair shifts ${criterionDelta.name} by ${criterionDelta.delta > 0 ? "+" : ""}${criterionDelta.delta.toFixed(1)}`}
              >
                {criterionDelta.delta > 0 ? "+" : ""}
                {criterionDelta.delta.toFixed(1)} {criterionDelta.name}
              </span>
            )}
          </div>

          {/* Recommended side — clickable on swap/add rows to override
              the auto-suggested target with the user's own pick via
              SwapTargetPicker. Keep / remove rows render the name
              non-interactively. */}
          <div className="min-w-0 space-y-0.5">
            {isRemove ? (
              <div className="text-sm text-muted-foreground italic">— (drop)</div>
            ) : onClickRecommendedToOverride ? (
              <button
                onClick={onClickRecommendedToOverride}
                className={`block w-full text-left group/recsel ${
                  hasOverride ? "ring-1 ring-purple-400/40 rounded-sm p-1 -m-1 bg-purple-500/5" : ""
                }`}
                title="Click to pick a different exercise for this swap"
              >
                <div className="text-sm font-semibold text-foreground truncate group-hover/recsel:text-purple-200 group-hover/recsel:underline decoration-purple-400/60 decoration-dotted underline-offset-2">
                  {pair.recommended}
                  {hasOverride && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider text-purple-300">
                      override
                    </span>
                  )}
                </div>
                {recommendedMuscles.length > 0 && (
                  <div className="text-[10px] text-muted-foreground leading-snug">
                    {recommendedMuscles.join(", ")}
                  </div>
                )}
                <div className="text-[9px] text-muted-foreground/70 mt-0.5 opacity-0 group-hover/recsel:opacity-100 transition-opacity">
                  click to override
                </div>
              </button>
            ) : (
              <>
                <div className="text-sm font-semibold text-foreground truncate" title={pair.recommended}>
                  {pair.recommended}
                </div>
                {recommendedMuscles.length > 0 && (
                  <div className="text-[10px] text-muted-foreground leading-snug">
                    {recommendedMuscles.join(", ")}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutRater() {
  const { routine, replaceRoutine, lifestyle, experience, markAutoPlanFresh, favorites } = useWorkout();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SourceMode>("routine");
  const [pastedText, setPastedText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [result, setResult] = useState<RatingResult | null>(null);
  // Indices into result.recommendations.pairs that the user has accepted.
  // Defaults to every non-"keep" pair on a fresh rating. Toggled per row.
  const [acceptedPairs, setAcceptedPairs] = useState<Set<number>>(new Set());
  // Per-pair manual overrides: when the user picks their own swap
  // target via SwapTargetPicker, the chosen exercise replaces the
  // rating engine's auto-suggestion for that specific pair index.
  // Reset whenever a new result lands (different recommendations,
  // old overrides no longer apply).
  const [swapOverrides, setSwapOverrides] = useState<Map<number, SwapOverridePick>>(
    new Map(),
  );
  // Picker state — null when closed.
  const [pickerPairIdx, setPickerPairIdx] = useState<number | null>(null);
  useEffect(() => {
    if (result === null) setSwapOverrides(new Map());
  }, [result]);
  // Local deterministic score computed at mutate-time. Stashed here so
  // onSuccess can merge it into the LLM response (replacing any LLM-
  // emitted numbers with the deterministic values).
  const [pendingScore, setPendingScore] = useState<PoolScore | null>(null);

  const rateMutation = trpc.rating.rateWorkout.useMutation({
    onSuccess: (data) => {
      const raw = data as RatingResult;
      const merged = pendingScore ? mergeLocalScoreIntoResult(raw, pendingScore) : raw;
      setResult(merged);
      setPendingScore(null);
      toast.success("Rating complete");
    },
    onError: (err) => {
      setPendingScore(null);
      toast.error(`Rating failed: ${err.message}`);
    },
  });

  // Default-accept every non-"keep" pair whenever a fresh result arrives.
  useEffect(() => {
    if (!result) return;
    const next = new Set<number>();
    result.recommendations.pairs.forEach((p, idx) => {
      if (p.action !== "keep") next.add(idx);
    });
    setAcceptedPairs(next);
  }, [result]);

  const canSubmit = useMemo(() => {
    if (mode === "routine") return routine.length > 0;
    if (mode === "text") return pastedText.trim().length > 20;
    return !!imageDataUrl;
  }, [mode, routine.length, pastedText, imageDataUrl]);

  /**
   * Live score projection — re-runs the deterministic scorer against
   * the hypothetical routine that would result from applying every
   * currently-checked pair. Updates as the user toggles checkboxes.
   * Only meaningful for source=routine (text / image have no local
   * routine state).
   */
  // Pairs with user manual overrides folded in. Downstream code
  // (projection memo, criterion deltas, apply handler) all consume
  // these and stay unaware of the override mechanism.
  const effectivePairs = useMemo(() => {
    if (!result) return [];
    return applyOverridesToPairs(result.recommendations.pairs, swapOverrides);
  }, [result, swapOverrides]);

  const projectedScore = useMemo(() => {
    if (!result || mode !== "routine") return null;
    const projected = buildProjectedRoutine(routine, effectivePairs, acceptedPairs);
    return scorePool(projected, favorites, experience);
  }, [result, routine, effectivePairs, acceptedPairs, favorites, experience, mode]);

  /**
   * Per-pair criterion deltas — for each pair, simulates "what if only
   * THIS pair is applied?" and surfaces the criterion that moves most.
   * Shown inline next to each row in the diff view as "+3 stretch" etc.
   */
  const perPairCriterionDelta = useMemo(() => {
    if (!result || mode !== "routine") return [];
    const baseline = scorePool(routine, favorites, experience);
    return effectivePairs.map((pair, idx) => {
      if (pair.action === "keep") return null;
      const justThis = new Set([idx]);
      const projected = buildProjectedRoutine(routine, effectivePairs, justThis);
      const scored = scorePool(projected, favorites, experience);
      // Criterion-by-criterion delta. Pick the one with the biggest |Δ|.
      const candidates: Array<{ name: string; delta: number }> = [
        { name: "stability", delta: scored.stability - baseline.stability },
        { name: "stretch", delta: scored.stretch - baseline.stretch },
        { name: "SFR", delta: scored.sfr - baseline.sfr },
        { name: "compound/iso", delta: scored.compoundIsoRatio - baseline.compoundIsoRatio },
        { name: "coverage", delta: scored.coverage - baseline.coverage },
      ];
      let best: { name: string; delta: number } | null = null;
      for (const c of candidates) {
        if (Math.abs(c.delta) < 0.3) continue; // ignore noise
        if (!best || Math.abs(c.delta) > Math.abs(best.delta)) best = c;
      }
      return best;
    });
  }, [result, routine, effectivePairs, favorites, experience, mode]);

  const handleRate = () => {
    const lifestyleArg = lifestyle ?? undefined;
    const experienceArg = experience ?? undefined;
    // Favorites only apply when rating the user's own routine — text /
    // image sources are external content the user is checking, not their
    // own committed picks.
    const favoriteNames =
      mode === "routine"
        ? routine.filter((r) => favorites.includes(r.id)).map((r) => r.exercise)
        : undefined;
    if (mode === "routine") {
      // Compute the deterministic score locally so the LLM only writes
      // prose. Same routine + same favorites + same experience = same
      // numbers every time. Experience modulates SFR / Stability penalty
      // multiplier and the Compound/Iso band.
      const localScore = scorePool(routine, favorites, experience);
      setPendingScore(localScore);
      rateMutation.mutate({
        source: "routine",
        text: serializeRoutineToText(routine),
        lifestyle: lifestyleArg,
        experience: experienceArg,
        favorites: favoriteNames,
        precomputedScores: {
          total: localScore.total,
          stability: localScore.stability,
          stretch: localScore.stretch,
          sfr: localScore.sfr,
          compoundIsoRatio: localScore.compoundIsoRatio,
          coverage: localScore.coverage,
          compoundPct: localScore.compoundPct,
          coverageHit: localScore.coverageHit,
          coverageHalf: localScore.coverageHalf,
          coverageMissing: localScore.coverageMissing,
          minorBonus: localScore.minorBonus,
          minorHit: localScore.minorHit,
          minorHalf: localScore.minorHalf,
          minorMissing: localScore.minorMissing,
          favoriteBias: localScore.favoriteBias,
          favoriteGood: localScore.favoriteGood,
          favoriteBad: localScore.favoriteBad,
        },
      });
    } else if (mode === "text") {
      // Text / image paths can't be scored locally (no RoutineItem state).
      // Server falls back to LLM scoring.
      setPendingScore(null);
      rateMutation.mutate({ source: "text", text: pastedText, lifestyle: lifestyleArg, experience: experienceArg });
    } else if (imageDataUrl) {
      setPendingScore(null);
      rateMutation.mutate({ source: "image", imageDataUrl, lifestyle: lifestyleArg, experience: experienceArg });
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

  const togglePair = (idx: number) => {
    setAcceptedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const acceptAll = () => {
    if (!result) return;
    const next = new Set<number>();
    result.recommendations.pairs.forEach((p, idx) => {
      if (p.action !== "keep") next.add(idx);
    });
    setAcceptedPairs(next);
  };

  /**
   * Apply the accepted pairs to the user's routine. Uses the shared
   * buildProjectedRoutine helper so the math matches what the live
   * projection shows.
   */
  const handleApplyRecommendations = () => {
    if (!result) return;
    // Use the override-merged pairs so user-picked swap targets win.
    const pairs = effectivePairs;
    // Tally action counts BEFORE mutating, for the toast summary.
    let appliedSwaps = 0;
    let appliedRemoves = 0;
    let appliedAdds = 0;
    pairs.forEach((p, idx) => {
      if (!acceptedPairs.has(idx)) return;
      if (p.action === "swap") appliedSwaps++;
      else if (p.action === "remove") appliedRemoves++;
      else if (p.action === "add") appliedAdds++;
    });
    if (appliedSwaps + appliedRemoves + appliedAdds === 0) {
      toast.error("No changes selected — pick at least one recommendation");
      return;
    }

    const nextRoutine = buildProjectedRoutine(routine, pairs, acceptedPairs);
    // Detect silent no-op: compare exercise-name signatures before/after.
    // If the lengths and ordered names match exactly, buildProjectedRoutine
    // didn't actually apply anything — usually means the LLM returned
    // pairs the projection couldn't match (currentIndex 0 + a name that
    // doesn't appear in the routine). Surfaces what historically read
    // as "swap doesn't do anything" — apply succeeded silently with
    // zero changes.
    const sig = (r: RoutineItem[]) =>
      r.map((it) => `${it.exercise}|${it.equipment ?? ""}|${it.angle ?? ""}`).join(">");
    if (sig(nextRoutine) === sig(routine)) {
      toast.error(
        "Recommendations didn't take — the rater's swap targets couldn't be matched against your routine. Try Re-rate; if it keeps happening, report the routine to the dev.",
      );
      return;
    }
    replaceRoutine(nextRoutine);
    markAutoPlanFresh();
    const parts: string[] = [];
    if (appliedSwaps) parts.push(`${appliedSwaps} swapped`);
    if (appliedRemoves) parts.push(`${appliedRemoves} removed`);
    if (appliedAdds) parts.push(`${appliedAdds} added`);
    toast.success(`Recommendations applied — ${parts.join(", ")}`);
    setMode("routine");
    setResult(null);
  };

  const reset = () => {
    setResult(null);
    setAcceptedPairs(new Set());
    setSwapOverrides(new Map());
    setPickerPairIdx(null);
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

      {/* Pre-rate context pickers — surfaced BEFORE the first rating so
          experience modulation (SFR/Stability penalty + Compound/Iso band)
          + lifestyle warmup logic take effect on the initial score, not
          forcing a re-rate. Availability is NOT here: it doesn't influence
          the rating (confirmed by code audit — server/rating.ts and
          client/lib/poolScore.ts never read it) and lives on the SplitBuilder
          where it actually drives which presets are eligible. After the
          first rating these pickers do NOT re-render — the user makes
          changes to their routine and re-rates, no need to re-ask the
          same context every time. */}
      {!result && (
        <div className="p-4 bg-card rounded-sm border-2 border-purple-500/30 space-y-5">
          <div>
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-purple-300 mb-1">
              Tell us about you
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              These shape the score before the LLM ever sees it — experience
              modulates SFR/Stability/Compound-Iso penalties; lifestyle
              drives warmup picks. Set once; we won't ask again.
            </p>
          </div>
          <LifestylePicker />
          <div className="border-t border-border" />
          <ExperiencePicker />
        </div>
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

            {/* Pool Rating Matrix — 5 criterion rows, all at 20 pts each.
                Notes folded behind '+ Details' so the matrix stays scannable. */}
            <div className="p-4 bg-card rounded-sm border border-border space-y-4">
              <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">
                Pool Rating Matrix · 100
              </h4>
              <BreakdownRow label="Stability" score={result.selectionBreakdown.stability.score} max={20} notes={result.selectionBreakdown.stability.notes} />
              <BreakdownRow label="Deep Stretch" score={result.selectionBreakdown.stretch.score} max={20} notes={result.selectionBreakdown.stretch.notes} />
              <BreakdownRow label="SFR" score={result.selectionBreakdown.sfr.score} max={20} notes={result.selectionBreakdown.sfr.notes} />
              <BreakdownRow label="Compound / Isolation Ratio" score={result.selectionBreakdown.compoundIsolationRatio.score} max={20} notes={result.selectionBreakdown.compoundIsolationRatio.notes} />
              <BreakdownRow label="Joint-Action Coverage" score={result.coverageBreakdown.score} max={20} notes={result.coverageBreakdown.notes} />
            </div>

            {/* How to recover rating — big call-to-action button */}
            <HowToRecoverButton
              hit={result.coverageBreakdown.hit}
              missing={result.coverageBreakdown.missing}
              cueingTips={result.coverageBreakdown.cueingTips ?? []}
            />

            {/* Cherry on top — minor coverage bonus, collapsed */}
            {result.minorBonus && (
              <CherryOnTopButton
                score={result.minorBonus.score}
                hit={result.minorBonus.hit}
                missing={result.minorBonus.missing}
                notes={result.minorBonus.notes}
                opportunityTips={result.minorBonus.opportunityTips ?? []}
              />
            )}

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

            {/* Favorite-driven bias (P9.3.5 harsh parenting) */}
            {result.favoriteBias && (
              <div className="p-4 bg-card rounded-sm border border-border space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    Favorite Bias
                  </h4>
                  <div className="text-xs tabular-nums">
                    <span
                      className={`font-bold ${
                        result.favoriteBias.delta > 0
                          ? "text-lime"
                          : result.favoriteBias.delta < 0
                            ? "text-red-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {result.favoriteBias.delta > 0 ? "+" : ""}
                      {result.favoriteBias.delta}
                    </span>
                    <span className="text-muted-foreground"> / ±5 (in the 100)</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Favorites are locked from variant-swap. In exchange, the rating engine holds them to a higher standard — good favorites earn up to +5, bad ones penalize up to −5.
                </p>
                {(result.favoriteBias.goodFavorites.length > 0 || result.favoriteBias.badFavorites.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-lime font-semibold mb-1">
                        Good ({result.favoriteBias.goodFavorites.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.favoriteBias.goodFavorites.length === 0 ? (
                          <span className="text-muted-foreground italic">None</span>
                        ) : (
                          result.favoriteBias.goodFavorites.map((g, i) => (
                            <span key={i} className="px-2 py-0.5 bg-lime/10 text-lime rounded-sm border border-lime/30">
                              {g}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">
                        Costing you ({result.favoriteBias.badFavorites.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.favoriteBias.badFavorites.length === 0 ? (
                          <span className="text-muted-foreground italic">None</span>
                        ) : (
                          result.favoriteBias.badFavorites.map((b, i) => (
                            <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-sm border border-red-500/30">
                              {b}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {result.favoriteBias.reasoning && (
                  <p className="text-xs text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
                    {result.favoriteBias.reasoning}
                  </p>
                )}
              </div>
            )}

            {/* Note: Lifestyle / Availability / Experience pickers used to
                re-render here in the post-rate panel. They've been removed —
                lifestyle + experience are captured ONCE in the pre-rate
                strip before the first rating; availability lives on the
                SplitBuilder where it actually drives preset eligibility.
                The post-rate UX is focused: read the rating, optionally
                accept recommendations, continue to split. */}

            {/* Optimized Routine — pair-based diff view */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">
                      Optimized Routine
                    </h4>
                    {projectedScore && (
                      <div className="text-xs tabular-nums flex items-center gap-1.5">
                        <span className="text-muted-foreground">Score:</span>
                        <span className="text-foreground font-semibold">{Math.round(result.score)}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span
                          className={`font-bold ${
                            projectedScore.total > result.score
                              ? "text-lime"
                              : projectedScore.total < result.score
                                ? "text-red-400"
                                : "text-foreground"
                          }`}
                        >
                          {Math.round(projectedScore.total)}
                        </span>
                        {projectedScore.total !== result.score && (
                          <span
                            className={`text-[10px] ${
                              projectedScore.total > result.score ? "text-lime" : "text-red-400"
                            }`}
                          >
                            ({projectedScore.total > result.score ? "+" : ""}
                            {(projectedScore.total - result.score).toFixed(1)})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {countActionable(result.recommendations.pairs)} suggested change{countActionable(result.recommendations.pairs) === 1 ? "" : "s"}. Tick a row to accept, untick to keep your current pick. Favorited exercises are locked.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={acceptAll}
                    className="text-xs"
                    title="Re-check every actionable row (swap / remove / add)"
                  >
                    Select all
                  </Button>
                  {/* Apply button — bumped to size=default for prominence
                      and shows the accepted count so the user can tell at
                      a glance what's about to happen. The previous size=sm
                      version sat too close in weight to the other action
                      buttons; this is the headline action of the panel. */}
                  <Button
                    size="default"
                    onClick={handleApplyRecommendations}
                    disabled={acceptedPairs.size === 0}
                    className="bg-lime text-lime-foreground hover:bg-lime/80 font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      acceptedPairs.size === 0
                        ? "Tick at least one change to enable Apply"
                        : projectedScore
                          ? `Apply ${acceptedPairs.size} change${acceptedPairs.size === 1 ? "" : "s"}. Projected new score: ${Math.round(projectedScore.total)}/100`
                          : `Apply ${acceptedPairs.size} checked change${acceptedPairs.size === 1 ? "" : "s"}`
                    }
                  >
                    <Replace className="w-4 h-4 mr-1.5" />
                    Apply{acceptedPairs.size > 0 ? ` ${acceptedPairs.size}` : ""}
                    {projectedScore && projectedScore.total !== result.score && acceptedPairs.size > 0 && (
                      <span className="ml-2 text-[11px] opacity-90 font-semibold">
                        → {Math.round(projectedScore.total)}
                      </span>
                    )}
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

              {/* Diff rows — iterate effectivePairs (auto-suggestions
                  with any user overrides folded in) so the row display
                  and the projection/apply pipeline see the same data. */}
              <div className="border-2 border-border rounded-sm overflow-hidden">
                {effectivePairs.map((pair, idx) => {
                  // For keep / swap / remove, current item is routine[currentIndex - 1].
                  // For 'add' pairs (currentIndex = 0), there's no current item.
                  const currentItem =
                    pair.currentIndex > 0 ? routine[pair.currentIndex - 1] : undefined;
                  const isOverridable = pair.action === "swap" || pair.action === "add";
                  return (
                    <RecommendationRow
                      key={idx}
                      pair={pair}
                      currentItem={currentItem}
                      striped={idx % 2 === 1}
                      accepted={acceptedPairs.has(idx)}
                      onToggle={() => togglePair(idx)}
                      criterionDelta={perPairCriterionDelta[idx] ?? null}
                      onClickRecommendedToOverride={
                        isOverridable ? () => setPickerPairIdx(idx) : undefined
                      }
                      hasOverride={swapOverrides.has(idx)}
                    />
                  );
                })}
              </div>

              {/* Global rationale — mesocycle-perspective summary */}
              {result.recommendations.globalRationale && (
                <div className="p-4 bg-purple-500/[0.04] border-2 border-purple-500/25 rounded-sm">
                  <div className="flex items-center gap-1.5 mb-1.5 text-purple-300 font-semibold text-xs uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Why these changes — mesocycle view
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {result.recommendations.globalRationale}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap-target override picker — mounted at component root so it
          escapes the AnimatePresence overflow region. Closes on pick or
          cancel. */}
      {result && pickerPairIdx !== null && (() => {
        const pair = effectivePairs[pickerPairIdx];
        if (!pair) return null;
        const originalPair = result.recommendations.pairs[pickerPairIdx];
        const primaryMuscle = pair.targetedMuscles?.[0];
        return (
          <SwapTargetPicker
            open={true}
            originalCurrentName={pair.current || ""}
            category={pair.category}
            primaryMuscleHint={primaryMuscle}
            currentSuggestion={originalPair?.recommended ?? pair.recommended}
            onSelect={(pick) => {
              setSwapOverrides((prev) => {
                const next = new Map(prev);
                next.set(pickerPairIdx, pick);
                return next;
              });
              setPickerPairIdx(null);
              toast.success(`Override: will use ${pick.exercise} instead`);
            }}
            onCancel={() => setPickerPairIdx(null)}
          />
        );
      })()}
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
