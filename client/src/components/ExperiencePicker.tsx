/**
 * ExperiencePicker — User picks their training experience level.
 *
 * Drives TECHNIQUE-related modulators only (since volume was split off
 * into the separate VolumePicker):
 *   - SFR + Stability penalty multiplier (1.25× beginner / 1.00× FID / 0.75× experienced)
 *   - Compound/Iso optimal-share band (15–35% / 20–45% / 25–50%)
 *   - Coaching tone in the rating prompt
 *
 * Volume (sets/wk per major, sets per exercise, RIR, session cap) is
 * picked separately via VolumePicker. By default the volume tier
 * tracks the experience tier — beginner → low volume, FID → med,
 * experienced → high — so most users only set this one and the
 * volume picker auto-defaults. Setting experience also resets any
 * explicit volume override so the default tracks correctly.
 */
import { useWorkout } from "@/contexts/WorkoutContext";
import { EXPERIENCE_PROFILES, type ExperienceId } from "@/lib/experience";
import { CheckCircle2, Sprout, Activity, Flame } from "lucide-react";

const ICON_MAP: Record<ExperienceId, typeof Sprout> = {
  beginner: Sprout,
  "foot-in-door": Activity,
  experienced: Flame,
};

/** User-facing description of the technique-side effect for each tier. */
const TECHNIQUE_DESCRIPTION: Record<ExperienceId, string[]> = {
  beginner: [
    "Harsher score deductions for low-SFR or unstable picks (1.25× penalty multiplier).",
    "Tighter compound-vs-isolation balance band — full credit only for 15–35% compound share.",
    "Coaching tone assumes you're still learning to recover and to push to failure safely.",
  ],
  "foot-in-door": [
    "Baseline score modulators — penalties at face value.",
    "Standard compound-vs-isolation band — full credit for 20–45% compound share.",
    "Coaching tone assumes you've trained consistently for 6 months to 2.5 years.",
  ],
  experienced: [
    "Lenient score deductions on technically-loaded picks (0.75× penalty multiplier).",
    "Wider compound-vs-isolation band — full credit for 25–50% compound share.",
    "Coaching tone assumes you can recover from suboptimal selection and push hard.",
  ],
};

export default function ExperiencePicker() {
  const { experience, setExperience } = useWorkout();
  const selected = experience ? EXPERIENCE_PROFILES.find((p) => p.id === experience) : null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-heading font-bold text-lg text-foreground">
          What's your experience level?
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Drives technique-side rating modulators — how strictly we penalize unstable or low-SFR picks, and how wide the compound-vs-isolation balance band is. Your training volume is a separate choice below; it defaults to the volume tier most lifters at your level run.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {EXPERIENCE_PROFILES.map((p) => {
          const Icon = ICON_MAP[p.id];
          const isSelected = experience === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setExperience(isSelected ? null : p.id)}
              className={`text-left p-3 border-2 rounded-sm transition-all ${
                isSelected
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-border bg-card hover:border-amber-400/40"
              }`}
            >
              <div className="flex items-start gap-2 mb-1">
                <div
                  className={`p-1.5 rounded-sm shrink-0 ${
                    isSelected ? "bg-amber-500/30" : "bg-secondary/40"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? "text-amber-200" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-heading font-bold text-sm text-foreground">
                      {p.name}
                    </h4>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{p.blurb}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/30 rounded-sm text-xs text-muted-foreground leading-relaxed">
          <p className="text-amber-300 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">
            How {selected.name} affects scoring
          </p>
          <ul className="space-y-0.5 list-disc pl-4">
            {TECHNIQUE_DESCRIPTION[selected.id].map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
