/**
 * LifestylePicker — User selects a lifestyle / activity profile after
 * rating their pool. The selection biases:
 *   - Rating cueingTips and opportunityTips toward the chronic gaps for
 *     that profile.
 *   - The session warmup engine (3 dynamic warmups per training day).
 */
import { useWorkout } from "@/contexts/WorkoutContext";
import { LIFESTYLE_PROFILES, type LifestyleId } from "@/lib/lifestyle";
import { CheckCircle2, Briefcase, Footprints, Trophy, Bed, HardHat } from "lucide-react";

const ICON_MAP: Record<LifestyleId, typeof Briefcase> = {
  "desk-job": Briefcase,
  runner: Footprints,
  "competitive-sports": Trophy,
  "bed-rot": Bed,
  "physical-labor": HardHat,
};

export default function LifestylePicker() {
  const { lifestyle, setLifestyle } = useWorkout();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-heading font-bold text-lg text-foreground">
          Tell us your weekday lifestyle
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Your day-to-day activity drives chronic restrictions and weaknesses your routine should
          counter. We'll bias the rating cues, the recovery tips, and the daily warmups based on
          what you pick.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {LIFESTYLE_PROFILES.map((p) => {
          const Icon = ICON_MAP[p.id];
          const selected = lifestyle === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setLifestyle(selected ? null : p.id)}
              className={`text-left p-3 border-2 rounded-sm transition-all ${
                selected
                  ? "border-purple-400 bg-purple-500/10"
                  : "border-border bg-card hover:border-purple-400/40"
              }`}
            >
              <div className="flex items-start gap-2 mb-1">
                <div
                  className={`p-1.5 rounded-sm shrink-0 ${
                    selected ? "bg-purple-500/30" : "bg-secondary/40"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      selected ? "text-purple-200" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-heading font-bold text-sm text-foreground">
                      {p.name}
                    </h4>
                    {selected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{p.blurb}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {lifestyle && (
        <div className="p-3 bg-purple-500/5 border border-purple-500/30 rounded-sm text-xs text-muted-foreground leading-relaxed">
          <p className="text-purple-300 font-semibold mb-1 text-[11px] uppercase tracking-wider">
            Why this matters for {LIFESTYLE_PROFILES.find((p) => p.id === lifestyle)?.name}
          </p>
          <ul className="space-y-0.5 list-disc pl-4">
            {LIFESTYLE_PROFILES.find((p) => p.id === lifestyle)?.chronicRestrictions.map(
              (r, i) => (
                <li key={i}>{r}</li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
