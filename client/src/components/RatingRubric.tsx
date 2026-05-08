/**
 * RatingRubric — Reference content for the Hypertrophy Matrix scoring system.
 *
 * Two stages:
 *   Pool-stage (100 pts): the rubric the rater uses on the weekly microcycle
 *     (exercise selection only, no sets/reps/weight yet).
 *   Post-split (100 pts): identical 9 criteria compressed to 82 pts plus 3
 *     add-ons × 6 = 18 pts. Active after split + sets/reps are configured.
 *
 * Shown in a Dialog when the user clicks "View rubric" on the rater. The
 * default rating result panel only shows tone-matched comments (poor /
 * medium / good); the full descriptions live here.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { BookOpen, Target, Flame, Layers, Trophy } from "lucide-react";

interface CriterionDoc {
  num: number;
  name: string;
  max: number;
  measures: string;
  calc: string;
  poor: string;
  medium: string;
  good: string;
}

const POOL_RUBRIC: { bucket: string; total: number; criteria: CriterionDoc[] }[] = [
  {
    bucket: "Selection",
    total: 40,
    criteria: [
      {
        num: 1,
        name: "Stability",
        max: 8,
        measures: "How safely you can push close to failure given the picks you made.",
        calc: "Reward stable picks (machines, chest-supported, cables). Penalize over-reliance on highly unstable picks.",
        poor: "Routine dominated by free-weight pressing/pulling with no machine alternates.",
        medium: "Mix of stable and free-weight picks.",
        good: "Machines and cables anchor the heavy work; free weights used where they have a real biomechanical advantage.",
      },
      {
        num: 2,
        name: "Deep Stretch",
        max: 8,
        measures: "How much of your training puts the muscle in its lengthened position under load — the variable with the strongest research backing for hypertrophy.",
        calc: "Tier-weighted average. very-high (1.5×) > high (1×) > moderate (0.5×).",
        poor: "Routine dominated by moderate-stretch picks (hip thrusts, contracted-bias laterals, hammer curls).",
        medium: "Mostly high-tier stretch picks.",
        good: "Heavy weighting toward very-high picks: Bayesian curl, lat prayer, RDL, sissy squat, deficit push-up, etc.",
      },
      {
        num: 3,
        name: "SFR (Stimulus-to-Fatigue Ratio)",
        max: 8,
        measures: "How much muscle disruption you generate per unit of recovery cost.",
        calc: "Reward picks with high SFR tags. Penalize over-reliance on conventional / sumo deadlifts and other systemically taxing lifts for hypertrophy.",
        poor: "Routine built around high-fatigue compounds (deadlifts, weighted dips, conventional barbell bench for everything).",
        medium: "Balanced mix of compounds and isolations.",
        good: "Machine + cable heavy; deadlifts used sparingly; isolation picks favor smooth force curves.",
      },
      {
        num: 4,
        name: "Angle Bias / Variety",
        max: 8,
        measures: "Whether your angle and grip choices cover the muscle proportions without redundancy.",
        calc: "Verify angles vary the joint-action emphasis: flat + incline pressing for clavicular vs sternal pec; wide + neutral pulldown grips for lat width vs thickness; arm-position curls for biceps long-head stretch.",
        poor: "Three different flat presses with the same angle bias; lat work but only one grip.",
        medium: "Some angle variation across major movers.",
        good: "Each major mover hit through multiple angles or grips.",
      },
      {
        num: 5,
        name: "Compound vs Isolation Ratio",
        max: 8,
        measures: "Whether your pool's compound/isolation balance lands in a healthy hypertrophy band. Real per-session counts of 3–5 exercises produce ratios like 25% (1/4), 33% (1/3), 40% (2/5), or 50% (2/4) — all of these are valid.",
        calc:
          "Full credit for any compound share in the 20–50% band. Outside that:\n" +
          "  • 15–20% or 50–60%: −2 to −3\n" +
          "  • 10–15% or 60–70%: −4 to −5\n" +
          "  • <10% (almost no compound) or >70% (CNS-heavy): −5 to −8",
        poor: "80% compound (over-stresses CNS) or routine with no compounds at all.",
        medium: "Just outside the band — 17% or 55% compound.",
        good: "Anywhere in the 20–50% compound band: 25%, 33%, 40%, 50% all earn full credit.",
      },
    ],
  },
  {
    bucket: "Intensity & Volume",
    total: 35,
    criteria: [
      {
        num: 6,
        name: "RIR Calibration",
        max: 15,
        measures: "Whether your effort matches Nippard's targets — compound 1–2 RIR, isolation 0 RIR — assuming consistent movement quality.",
        calc:
          "Penalties from your two RIR self-reports (compound + isolation), stacked, floor at 0:\n" +
          "  • Compound at 0 RIR → −3 (excessive fatigue cost)\n" +
          "  • Compound at 3+ RIR → −7 (under-stimulus)\n" +
          "  • Isolation at 1–2 RIR → −3 (push harder)\n" +
          "  • Isolation at 3+ RIR → −7 (severely under-stimulus)",
        poor: "Both off-target by the maximum.",
        medium: "One off-target.",
        good: "Both on Nippard-target.",
      },
      {
        num: 7,
        name: "Implied Frequency",
        max: 10,
        measures: "Whether each major joint action's prime mover would be hit 2–3×/wk given a typical 3–4 day split.",
        calc: "Score the 2–3×/wk hit-ability of major movers given the count of relevant picks in the pool. Deduct if a major mover has only 1 exercise.",
        poor: "Chest has 1 exercise (1×/wk) but glutes have 5 exercises clustered.",
        medium: "Most majors at 2x/wk-ready.",
        good: "Every major mover has 2–3 exercises supporting 2–3×/wk frequency.",
      },
      {
        num: 8,
        name: "Implied Volume Distribution",
        max: 10,
        measures: "Pool balance — at least 2 exercises per major mover, no clustering. Targets 10–20 working sets per mover per week (MEV to MAV).",
        calc: "Score whether the pool covers each major mover with sufficient picks. Penalize clustering.",
        poor: "Chest dominates the pool (10 chest exercises, 2 hamstring picks).",
        medium: "Most majors covered with 1–2 exercises each.",
        good: "Balanced 2–3 exercises per major mover.",
      },
    ],
  },
  {
    bucket: "Joint-Action Coverage",
    total: 25,
    criteria: [
      {
        num: 9,
        name: "Joint-Action Coverage",
        max: 25,
        measures: "Anatomically weighted coverage of the 27-action kinesiology taxonomy.",
        calc:
          "12 MAJOR movers up to 20 pts (~1.67 each): Knee Ext, Knee Flex, Hip Ext, Sh HAdd, Sh Add, Sh Ext, Sh Abd, Sh HAbd, Elb Flex, Elb Ext, Sp Flex, Ank PF.\n" +
          "15 MINOR / stabilizers up to 5 pts (~0.33 each): Scap Retr/Prot/Elev/Dep/UR/DR, Sp Ext, Sp Rot/LF, Hip Flex/Abd/Add/ER/IR, Sh ER.\n" +
          "Each action: +full / +half (only 1 exercise) / +0 (missing). Positive-only — you earn points for what's covered.",
        poor: "Missing 2+ major movers.",
        medium: "All majors hit but at least 2 minors missing.",
        good: "All 27 actions covered, weighted properly.",
      },
    ],
  },
];

const POST_SPLIT_ADDONS: CriterionDoc[] = [
  {
    num: 10,
    name: "Session Caps",
    max: 6,
    measures: "Avoiding junk volume — too many sets of one joint action in a single session.",
    calc: "Deduct for any joint-action prime mover that exceeds 6–8 sets in a single training session.",
    poor: "12 sets of chest in one session.",
    medium: "Occasional 9-set days.",
    good: "Every session at 6–8 sets per mover or less.",
  },
  {
    num: 11,
    name: "Rep Range Distribution",
    max: 6,
    measures: "Whether ~80% of working-set volume falls in 8–15 reps with the remaining 20% in heavy (5–8) or metabolic (20–30) ranges.",
    calc: "Score the actual rep-range mix.",
    poor: "All sets at 5 reps (powerlifting bias) or all at 25 reps (lacking heavy stimulus).",
    medium: "60–80% in target range.",
    good: "80%+ in 8–15 with a sensible heavy/metabolic mix.",
  },
  {
    num: 12,
    name: "Total Weekly Volume vs MEV–MAV",
    max: 6,
    measures: "Whether each major mover lands in the 10–20 working-set MEV–MAV window per week.",
    calc: "Score actual per-mover weekly sets.",
    poor: "Chest at 6 sets/wk (under MEV) or 30 sets/wk (over MRV → injury risk).",
    medium: "Some movers near target, others off.",
    good: "Every major mover at 10–20 sets/wk.",
  },
];

function bucketIcon(name: string) {
  if (name === "Selection") return <Target className="w-4 h-4 text-lime" />;
  if (name === "Intensity & Volume") return <Flame className="w-4 h-4 text-orange-400" />;
  if (name === "Joint-Action Coverage") return <Layers className="w-4 h-4 text-purple-300" />;
  return <Trophy className="w-4 h-4 text-yellow-400" />;
}

function CriterionCard({ c }: { c: CriterionDoc }) {
  return (
    <div className="p-3 bg-secondary/30 border border-border rounded-sm space-y-2 text-xs">
      <div className="flex items-baseline justify-between gap-2">
        <h5 className="font-heading font-semibold text-sm text-foreground">
          <span className="text-muted-foreground mr-1">{c.num}.</span>
          {c.name}
        </h5>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
          max {c.max}
        </span>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground">What it measures: </span>
        {c.measures}
      </p>
      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
        <span className="font-semibold text-foreground">How it's scored: </span>
        {c.calc}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-[11px]">
          <div className="font-semibold text-red-300 mb-0.5">Poor</div>
          <div className="text-muted-foreground">{c.poor}</div>
        </div>
        <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-[11px]">
          <div className="font-semibold text-yellow-300 mb-0.5">Medium</div>
          <div className="text-muted-foreground">{c.medium}</div>
        </div>
        <div className="p-2 bg-lime/10 border border-lime/30 rounded text-[11px]">
          <div className="font-semibold text-lime mb-0.5">Good</div>
          <div className="text-muted-foreground">{c.good}</div>
        </div>
      </div>
    </div>
  );
}

export function RatingRubric() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground border-border hover:border-purple-500/50 hover:text-purple-300"
        >
          <BookOpen className="w-3.5 h-3.5 mr-1.5" />
          View rubric
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-300" />
            Hypertrophy Matrix Rubric
          </DialogTitle>
          <DialogDescription>
            How the score is calculated. The result panel shows tone-matched feedback (poor / medium / good) per criterion — the full descriptions and tier examples live here.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pool" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="pool">Pool-Stage · 100</TabsTrigger>
            <TabsTrigger value="post-split">Post-Split · 100</TabsTrigger>
          </TabsList>

          <TabsContent value="pool" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-5">
                {POOL_RUBRIC.map((bucket) => (
                  <div key={bucket.bucket} className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                        {bucketIcon(bucket.bucket)}
                        {bucket.bucket}
                      </h4>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground">
                        {bucket.total} pts
                      </span>
                    </div>
                    <div className="space-y-2">
                      {bucket.criteria.map((c) => (
                        <CriterionCard key={c.num} c={c} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="post-split" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-5">
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-sm text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Post-split rating</strong> kicks in after you've assigned exercises to days and set sets/reps/weight. The 9 pool-stage criteria compress proportionally to <strong className="text-foreground">82 pts</strong> (Selection 33, Intensity & Volume 29, Coverage 20), and 3 new criteria worth <strong className="text-foreground">18 pts</strong> total are added below — graded against the full daily picture.
                </div>
                <div className="flex items-baseline justify-between">
                  <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Post-Split Add-Ons
                  </h4>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground">18 pts</span>
                </div>
                <div className="space-y-2">
                  {POST_SPLIT_ADDONS.map((c) => (
                    <CriterionCard key={c.num} c={c} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
