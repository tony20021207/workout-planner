/**
 * JointFunctionSelector — Step 2: Choose a joint function from the selected category
 * Design: Dropdown with bold styling, thick border accents
 */
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { type CategoryType, type JointFunction, categories } from "@/lib/data";

interface JointFunctionSelectorProps {
  category: CategoryType;
  selected: JointFunction | null;
  onSelect: (jf: JointFunction) => void;
}

export default function JointFunctionSelector({ category, selected, onSelect }: JointFunctionSelectorProps) {
  const categoryData = categories.find((c) => c.id === category);
  if (!categoryData) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={category}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-sm bg-lime text-lime-foreground font-heading font-bold text-lg">
            2
          </span>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Select Joint Function
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoryData.jointFunctions.map((jf) => (
            <motion.button
              key={jf.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(jf)}
              className={`text-left p-4 rounded-sm border-2 transition-all duration-200 ${
                selected?.id === jf.id
                  ? "border-lime bg-lime/10 shadow-[0_0_20px_rgba(132,204,22,0.15)]"
                  : "border-border bg-card hover:border-lime/40"
              }`}
            >
              <h4 className="font-heading font-semibold text-foreground mb-1">
                {jf.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {jf.muscles.join(", ")}
              </p>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
