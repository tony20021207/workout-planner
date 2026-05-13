/**
 * AvailabilityPicker — User says how many days per week they can train.
 *
 * Drives split-preset recommendations downstream (matching presets are
 * highlighted; non-matching are still selectable). The picker is paired
 * with a reassurance: the rest of the system optimizes for maximal gain
 * regardless of which split the user picks.
 *
 * Lives next to LifestylePicker (post-rating section). Same visual
 * language: outline buttons that fill purple when selected.
 */
import { useWorkout } from "@/contexts/WorkoutContext";
import { CalendarCheck } from "lucide-react";

/** Days the user can train per week. Maps to our preset coverage:
 *  3 → FB3 · 4 → UL4 · 5 → Bro5 / UL+PPL5 · 6 → PPL6 */
const DAY_OPTIONS = [3, 4, 5, 6] as const;

export default function AvailabilityPicker() {
  const { availableDaysPerWeek, setAvailableDaysPerWeek } = useWorkout();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-purple-300" />
          How many days a week can you train?
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Pick the count that matches your realistic availability. The split
          presets you'll see on the next step are matched to your answer —
          but don't worry: <span className="text-foreground font-semibold">we
          optimize the workout for maximal gain with any split you pick</span>,
          even if your schedule changes later.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {DAY_OPTIONS.map((n) => {
          const selected = availableDaysPerWeek === n;
          return (
            <button
              key={n}
              onClick={() => setAvailableDaysPerWeek(selected ? null : n)}
              className={`p-3 border-2 rounded-sm text-center transition-all ${
                selected
                  ? "border-purple-400 bg-purple-500/10"
                  : "border-border bg-card hover:border-purple-400/40"
              }`}
            >
              <div
                className={`font-heading font-bold text-2xl tabular-nums ${
                  selected ? "text-purple-200" : "text-foreground"
                }`}
              >
                {n}
              </div>
              <div
                className={`text-[10px] uppercase tracking-wider mt-0.5 ${
                  selected ? "text-purple-300/80" : "text-muted-foreground"
                }`}
              >
                day{n === 1 ? "" : "s"} / wk
              </div>
            </button>
          );
        })}
      </div>

      {availableDaysPerWeek && (
        <div className="p-3 bg-purple-500/5 border border-purple-500/30 rounded-sm text-xs text-muted-foreground leading-relaxed">
          <p className="text-purple-300 font-semibold mb-1 text-[11px] uppercase tracking-wider">
            Matching splits for {availableDaysPerWeek} days / week
          </p>
          <p className="leading-snug">
            {availableDaysPerWeek === 3 && "Full Body 3 (FB3). Every major muscle hits 2x / wk."}
            {availableDaysPerWeek === 4 && "Upper / Lower / Upper / Leg (UL4). Twice-per-week frequency on upper."}
            {availableDaysPerWeek === 5 && "Bro Split (Bro5) or Upper-Lower + PPL (UL+PPL5). Higher session count with mixed frequencies."}
            {availableDaysPerWeek === 6 && "Push / Pull / Legs 6 (PPL6). Twice-per-week frequency on each pattern."}
          </p>
        </div>
      )}
    </div>
  );
}
