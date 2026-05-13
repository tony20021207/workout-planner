/**
 * VolumePicker — User picks their weekly training volume tier.
 *
 * Decoupled from experience. Drives:
 *   - Weekly working sets per major mover (10 / 15 / 20)
 *   - Default sets per exercise instance (2 / 3 / 4)
 *   - Per-session cap per joint-action mover (4 / 6 / 8)
 *   - RIR self-report targets
 *   - Total weekly working-sets budget across the pool
 *
 * Defaults to the volume tier most lifters at the user's experience
 * level run (beginner→low, FID→med, experienced→high), so most
 * people only need to set experience. Returning lifters wanting to
 * start at low volume, or confident intermediates wanting to push
 * past their tier, set this explicitly.
 */
import { useWorkout } from "@/contexts/WorkoutContext";
import { VOLUME_PROFILES, defaultVolumeForExperience, type VolumeId } from "@/lib/volume";
import { CheckCircle2, ArrowDownToLine, Gauge, Mountain } from "lucide-react";

const ICON_MAP: Record<VolumeId, typeof Gauge> = {
  low: ArrowDownToLine,
  med: Gauge,
  high: Mountain,
};

const EXPERIENCE_LABEL_FROM_ID: Record<string, string> = {
  beginner: "Beginners",
  "foot-in-door": "Foot-in-the-door",
  experienced: "Experienced lifters",
};

export default function VolumePicker() {
  const { experience, volume, setVolume } = useWorkout();
  // The volume tier actually in effect — explicit override, or
  // experience's natural default.
  const effectiveVolumeId: VolumeId =
    volume ?? defaultVolumeForExperience(experience);
  const selected = VOLUME_PROFILES.find((p) => p.id === effectiveVolumeId) ?? null;
  const isExplicit = volume !== null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-heading font-bold text-lg text-foreground">
          Training volume
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          How much load per week. Defaults to the tier most lifters at your experience level run — change it if you want more or less than the default.
          {!isExplicit && experience && (
            <span className="ml-1 italic">
              Currently auto-set from your experience ({selected?.name}).
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {VOLUME_PROFILES.map((p) => {
          const Icon = ICON_MAP[p.id];
          const isSelected = effectiveVolumeId === p.id;
          const isExplicitlySelected = volume === p.id;
          const recommendedLabel = EXPERIENCE_LABEL_FROM_ID[p.recommendedFor] ?? p.recommendedFor;
          return (
            <button
              key={p.id}
              onClick={() => setVolume(isExplicitlySelected ? null : p.id)}
              className={`text-left p-3 border-2 rounded-sm transition-all ${
                isSelected
                  ? "border-purple-400 bg-purple-500/10"
                  : "border-border bg-card hover:border-purple-400/40"
              }`}
              title={isExplicitlySelected ? "Click again to revert to experience default" : "Pick this volume tier"}
            >
              <div className="flex items-start gap-2 mb-1">
                <div
                  className={`p-1.5 rounded-sm shrink-0 ${
                    isSelected ? "bg-purple-500/30" : "bg-secondary/40"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? "text-purple-200" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-heading font-bold text-sm text-foreground">
                      {p.name}
                    </h4>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    )}
                    {!isExplicit && p.id === effectiveVolumeId && (
                      <span className="text-[8px] uppercase tracking-wider text-purple-300/80">
                        default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {p.blurb}
                  </p>
                  <p className="text-[10px] text-purple-300/90 mt-1">
                    Recommended for: {recommendedLabel}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="p-3 bg-purple-500/5 border border-purple-500/30 rounded-sm text-xs text-muted-foreground leading-relaxed">
          <p className="text-purple-300 font-semibold mb-1.5 text-[11px] uppercase tracking-wider">
            What {selected.name} sets
          </p>
          <ul className="space-y-0.5 list-disc pl-4">
            <li>
              Weekly volume target:{" "}
              <span className="text-foreground font-semibold">
                ~{selected.weeklyVolumePerMajor} sets/wk per major mover
              </span>
              . Sets per exercise per day are derived from this target
              ÷ how many exercises target the muscle ÷ how many days
              train it.
            </li>
            <li>
              RIR target:{" "}
              <span className="text-foreground font-semibold">{selected.rir.compound} RIR</span>{" "}
              compound /{" "}
              <span className="text-foreground font-semibold">{selected.rir.isolation} RIR</span>{" "}
              isolation.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
