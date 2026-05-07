/**
 * WarmupSection — Auto-recommends warmup exercises for each exercise in the routine
 */
import { motion } from "framer-motion";
import { Flame, Info } from "lucide-react";
import { useWorkout } from "@/contexts/WorkoutContext";

export default function WarmupSection() {
  const { routine } = useWorkout();

  if (routine.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-500/20 rounded-sm">
          <Flame className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Recommended Warmups
          </h2>
          <p className="text-sm text-muted-foreground">
            One warmup exercise per main exercise to prepare your body
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {routine.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-card border-2 border-orange-500/20 rounded-sm"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                  Before: {item.exercise}
                </p>
                <h4 className="font-heading font-semibold text-foreground">
                  {item.warmup.name}
                </h4>
                <p className="text-xs text-lime mt-0.5">
                  {item.warmup.sets} sets × {item.warmup.reps}
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 ml-11">
              {item.warmup.instructions.map((instruction: string, idx: number) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  {instruction}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
