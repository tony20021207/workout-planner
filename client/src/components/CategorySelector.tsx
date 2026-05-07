/**
 * CategorySelector — Step 1: Choose Tier 1 (Systemic) or Tier 2 (Regional)
 * Design: Neo-Brutalist cards with thick borders, diagonal accents, bold typography
 */
import { motion } from "framer-motion";
import { Zap, Target } from "lucide-react";
import { type CategoryType } from "@/lib/data";

interface CategorySelectorProps {
  selected: CategoryType | null;
  onSelect: (category: CategoryType) => void;
}

export default function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-sm bg-lime text-lime-foreground font-heading font-bold text-lg">
          1
        </span>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Select Movement Category
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier 1: Systemic Card */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("systemic")}
          className={`relative overflow-hidden text-left p-6 border-3 rounded-sm transition-colors duration-200 ${
            selected === "systemic"
              ? "border-lime bg-lime/10"
              : "border-border bg-card hover:border-lime/50"
          }`}
          style={{ borderWidth: "3px" }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-lime/5 -translate-y-6 translate-x-6 rotate-12" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-lime/20 rounded-sm">
                <Zap className="w-6 h-6 text-lime" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-foreground">
                  Tier 1: Systemic / Multi-Joint
                </h3>
                <p className="text-sm text-muted-foreground">
                  "The Big Rocks" — Large Mass, High CNS Fatigue
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Compound movements recruiting multiple joints and large muscle groups simultaneously. High systemic fatigue demands heavier loads, lower volume, and longer recovery.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Squats", "Hinges", "Presses", "Pulls"].map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 bg-secondary rounded-sm text-secondary-foreground font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.button>

        {/* Tier 2: Regional Card */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("regional")}
          className={`relative overflow-hidden text-left p-6 border-3 rounded-sm transition-colors duration-200 ${
            selected === "regional"
              ? "border-lime bg-lime/10"
              : "border-border bg-card hover:border-lime/50"
          }`}
          style={{ borderWidth: "3px" }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-lime/5 -translate-y-6 translate-x-6 rotate-12" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-coral/20 rounded-sm">
                <Target className="w-6 h-6 text-coral" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-foreground">
                  Tier 2: Regional / Single-Joint
                </h3>
                <p className="text-sm text-muted-foreground">
                  "The Sand" — Small Mass, Low CNS Fatigue
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Isolation movements targeting individual muscles. Low systemic fatigue allows higher volume, more frequency, and shorter rest periods for regional hypertrophy.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Arms", "Shoulders", "Legs", "Core"].map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 bg-secondary rounded-sm text-secondary-foreground font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
