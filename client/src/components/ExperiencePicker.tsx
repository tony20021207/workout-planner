/**
 * ExperiencePicker — User selects one of three experience levels after
 * rating their pool. The selection drives:
 *   - Auto-recommend (sets / reps / RIR per exercise)
 *   - Auto-allocator session caps + total weekly volume
 *   - Rating prompts (so the LLM judges in light of the lifter's level)
 */
import { useWorkout } from "@/contexts/WorkoutContext";
import { EXPERIENCE_PROFILES, type ExperienceId } from "@/lib/experience";
import { CheckCircle2, Sprout, Activity, Flame } from "lucide-react";

const ICON_MAP: Record<ExperienceId, typeof Sprout> = {
  beginner: Sprout,
  "foot-in-door": Activity,
  experienced: Flame,
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
          Drives Smart Split + Smart Fill: how many sets, reps, RIR per exercise, and
          weekly volume per major mover. All three levels stay inside the Nippard / Israetel
          MEV–MAV band — beginners pin to the lower edge, experienced lifters to the upper edge.
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
            What changes for {selected.name}
          </p>
          <ul className="space-y-0.5 list-disc pl-4">
            <li>
              <span className="text-foreground font-semibold">
                {selected.setsPerExercise.compound} sets
              </span>{" "}
              per compound,{" "}
              <span className="text-foreground font-semibold">
                {selected.setsPerExercise.isolation} sets
              </span>{" "}
              per isolation.
            </li>
            <li>
              RIR target:{" "}
              <span className="text-foreground font-semibold">{selected.rir.compound} RIR</span>{" "}
              compound /{" "}
              <span className="text-foreground font-semibold">{selected.rir.isolation} RIR</span>{" "}
              isolation.
            </li>
            <li>
              Per-session cap:{" "}
              <span className="text-foreground font-semibold">
                ≤ {selected.sessionCapPerMover} sets per joint-action mover
              </span>
              .
            </li>
            <li>
              Weekly volume target:{" "}
              <span className="text-foreground font-semibold">
                ~{selected.weeklyVolumePerMajor} sets/wk per major
              </span>{" "}
              (
              <span className="italic">{selected.description.split("Goal:")[0].trim()}</span>).
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
