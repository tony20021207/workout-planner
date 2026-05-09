/**
 * RatingRubric — Reference content for the Hypertrophy Matrix scoring system.
 *
 * Two stages:
 *   Pool-stage (100 pts): 5 criteria × 20 each. Scored on the weekly
 *     microcycle (exercise selection only, no sets/reps/weight yet).
 *   Post-split (100 pts): 5 criteria × 14 each (70) + 3 add-ons × 10
 *     (30). Active after split + sets/reps are configured.
 *
 * Shown in a Dialog when the user clicks "View rubric" on the rater.
 * The default rating result panel shows tone-matched comments (poor /
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
import { BookOpen, Layers, Trophy } from "lucide-react";

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

const POOL_CRITERIA: CriterionDoc[] = [
  {
    num: 1,
    name: "Stability",
    max: 20,
    measures: "How safely you can push close to failure given the picks you made.",
    calc: "Reward stable picks (machines, chest-supported, cables). Penalize over-reliance on highly unstable picks. A pool dominated by stable picks earns full 20; mostly free-weight = 8–12; no stable picks at all = 4–8.",
    poor: "Routine dominated by free-weight pressing/pulling with no machine alternates.",
    medium: "Mix of stable and free-weight picks.",
    good: "Machines and cables anchor the heavy work; free weights used where they have a real biomechanical advantage.",
  },
  {
    num: 2,
    name: "Deep Stretch",
    max: 20,
    measures: "How much of your training puts the muscle in its lengthened position under load — the variable with the strongest research backing for hypertrophy.",
    calc: "Tier-weighted average per exercise. very-high (1.5×), high (1×), moderate (0.5×). Pool of all very-high = 20; all high = 14; all moderate = 7.",
    poor: "Routine dominated by moderate-stretch picks (hip thrusts, contracted-bias laterals, hammer curls).",
    medium: "Mostly high-tier stretch picks.",
    good: "Heavy weighting toward very-high picks: Bayesian curl, lat prayer, RDL, sissy squat, deficit push-up, etc.",
  },
  {
    num: 3,
    name: "SFR (Stimulus-to-Fatigue Ratio)",
    max: 20,
    measures: "How much muscle disruption you generate per unit of recovery cost.",
    calc: "Reward picks with high SFR tags. Penalize over-reliance on conventional / sumo deadlifts and other systemically taxing lifts for hypertrophy. Machine + cable heavy pool = 18–20; free-weight compound heavy = 8–12.",
    poor: "Routine built around high-fatigue compounds (deadlifts, weighted dips, conventional barbell bench for everything).",
    medium: "Balanced mix of compounds and isolations.",
    good: "Machine + cable heavy; deadlifts used sparingly; isolation picks favor smooth force curves.",
  },
  {
    num: 4,
    name: "Compound vs Isolation Ratio",
    max: 20,
    measures: "Whether your pool's compound/isolation balance lands in a healthy hypertrophy band. Real per-session counts of 3–5 exercises produce ratios like 25% (1/4), 33% (1/3), 40% (2/5). 50%+ patterns (3C+3I, 2C+2I) start being too CNS-heavy for hypertrophy.",
    calc:
      "Full credit (20) for any compound share in the 20–45% band. Outside that:\n" +
      "  • 45–55% compound: −2 to −5 (slightly CNS-heavy)\n" +
      "  • 15–20% or 55–65%: −5 to −8\n" +
      "  • 10–15% or 65–75%: −10 to −13\n" +
      "  • <10% (almost none) or >75%: −13 to −18",
    poor: "80% compound (way over-stresses CNS) or routine with no compounds at all.",
    medium: "Just over the 45% line — 50% compound (3C+3I or 2C+2I).",
    good: "Anywhere in the 20–45% compound band: 25%, 33%, 40% all earn full credit.",
  },
  {
    num: 5,
    name: "Joint-Action Coverage",
    max: 20,
    measures: "Anatomically weighted coverage of the 27-action kinesiology taxonomy.",
    calc:
      "12 MAJOR movers up to 16 pts (~1.33 each): Knee Ext, Knee Flex, Hip Ext, Sh HAdd, Sh Add, Sh Ext, Sh Abd, Sh HAbd, Elb Flex, Elb Ext, Sp Flex, Ank PF.\n" +
      "15 MINOR / stabilizers up to 4 pts (~0.27 each): Scap Retr/Prot/Elev/Dep/UR/DR, Sp Ext, Sp Rot/LF, Hip Flex/Abd/Add/ER/IR, Sh ER.\n" +
      "Each action: +full / +half (only 1 exercise) / +0 (missing). Positive-only — you earn points for what's covered.",
    poor: "Missing 2+ major movers.",
    medium: "All majors hit but at least 2 minors missing.",
    good: "All 27 actions covered, weighted properly.",
  },
];

const POST_SPLIT_CORE: CriterionDoc[] = POOL_CRITERIA.map((c) => ({
  ...c,
  max: c.num === 5 ? 14 : 14, // all 5 compressed to 14 each
}));

const POST_SPLIT_ADDONS: CriterionDoc[] = [
  {
    num: 6,
    name: "Session Caps",
    max: 10,
    measures: "Avoiding junk volume — too many sets of one joint action in a single session.",
    calc:
      "Each joint-action prime mover should get ≤6–8 working sets per session.\n" +
      "  • All sessions ≤6 sets per mover: full 10\n" +
      "  • Occasional 7–8 set sessions: −1 to −3\n" +
      "  • Multiple sessions at 9–12: −4 to −7\n" +
      "  • Any session at 13+ sets for one mover: −7 to −10",
    poor: "12 sets of chest in one session.",
    medium: "Occasional 9-set days.",
    good: "Every session at 6–8 sets per mover or less.",
  },
  {
    num: 7,
    name: "Rep Range Distribution",
    max: 10,
    measures: "Whether ~80% of working-set volume falls in 8–15 reps with the remaining 20% in heavy (5–8) or metabolic (20–30) ranges.",
    calc:
      "  • 80%+ in 8–15 with sensible heavy/metabolic mix: full 10\n" +
      "  • 60–80% in target range: −2 to −4\n" +
      "  • All sets at 5 reps (powerlifting bias) or all at 25+ (no heavy stimulus): −5 to −9",
    poor: "All sets at 5 reps (powerlifting bias) or all at 25 reps (lacking heavy stimulus).",
    medium: "60–80% in target range.",
    good: "80%+ in 8–15 with a sensible heavy/metabolic mix.",
  },
  {
    num: 8,
    name: "Total Weekly Volume vs MEV–MAV",
    max: 10,
    measures: "Whether each major mover lands in the 10–20 working-set MEV–MAV window per week.",
    calc:
      "  • All majors at 10–20 sets/wk: full 10\n" +
      "  • Some near target, others off: −2 to −5\n" +
      "  • Major movers <10 sets/wk (under-MEV) or >25 sets/wk (over-MRV): −6 to −10",
    poor: "Chest at 6 sets/wk (under MEV) or 30 sets/wk (over MRV → injury risk).",
    medium: "Some movers near target, others off.",
    good: "Every major mover at 10–20 sets/wk.",
  },
];

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
            How the score is calculated. The result panel shows tone-matched feedback (poor / medium / good) per criterion — full descriptions and tier examples live here.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pool" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="pool">Pool-Stage · 100</TabsTrigger>
            <TabsTrigger value="post-split">Post-Split · 100</TabsTrigger>
          </TabsList>

          <TabsContent value="pool" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-3">
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-sm text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Pool-stage rating</strong> grades the weekly exercise selection. 5 criteria × 20 pts each = 100. Sets, reps, weight, and split-day allocations don't exist yet at this stage; those score in the post-split rating.
                </div>
                {POOL_CRITERIA.map((c) => (
                  <CriterionCard key={c.num} c={c} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="post-split" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-5">
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-sm text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Post-split rating</strong> kicks in after you've assigned exercises to days and set sets/reps/weight. The 5 pool-stage criteria compress proportionally to <strong className="text-foreground">70 pts</strong> (14 each) and 3 new criteria worth <strong className="text-foreground">30 pts</strong> total are added below — graded against the full daily picture.
                </div>

                <div>
                  <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-foreground flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-lime" />
                    Compressed Pool Criteria · 70
                  </h4>
                  <div className="space-y-2">
                    {POST_SPLIT_CORE.map((c) => (
                      <CriterionCard key={c.num} c={c} />
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-foreground flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Post-Split Add-Ons · 30
                  </h4>
                  <div className="space-y-2">
                    {POST_SPLIT_ADDONS.map((c) => (
                      <CriterionCard key={c.num} c={c} />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
