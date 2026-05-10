/**
 * MuscleGroupSelector — single-step exercise picker.
 *
 * Replaces the old 3-level Tier-1/Tier-2 -> JointFunction -> Subcategory
 * navigation with the 6 muscle-group buckets the lifting community actually
 * thinks in: Chest / Back / Shoulders / Arms / Legs / Core.
 *
 * Layout:
 *   - Top: 6 pills as muscle-group selectors (with icons).
 *   - Body: each subgroup of the selected group rendered as a section
 *     (e.g. inside "Legs" you see Quads / Hamstrings / Glutes / Calves
 *     stacked, each with its exercise grid). Reuses ExerciseCard so all
 *     equipment / angle / difficulty UI stays the same.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Square,
  Hexagon,
  Triangle,
  Diamond,
  Circle,
  Octagon,
} from "lucide-react";
import { ExerciseCard } from "./ExerciseList";
import {
  getMuscleGroupTree,
  type MuscleGroup,
  type MuscleGroupId,
} from "@/lib/muscleGroups";

const ICON_MAP: Record<MuscleGroupId, typeof Square> = {
  chest: Square,
  back: Hexagon,
  shoulders: Triangle,
  arms: Diamond,
  legs: Circle,
  core: Octagon,
};

function MuscleGroupPill({
  group,
  selected,
  onSelect,
}: {
  group: MuscleGroup;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = ICON_MAP[group.id];
  const exerciseCount = group.subgroups.reduce((n, sg) => n + sg.exercises.length, 0);
  return (
    <button
      onClick={onSelect}
      className={`text-left p-3 border-2 rounded-sm transition-all ${
        selected
          ? "border-lime bg-lime/10"
          : "border-border bg-card hover:border-lime/40"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`p-1.5 rounded-sm shrink-0 ${
            selected ? "bg-lime/30" : "bg-secondary/40"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${
              selected ? "text-lime" : "text-muted-foreground"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-bold text-sm text-foreground leading-tight">
            {group.name}
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
            {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"} ·{" "}
            {group.subgroups.length} group{group.subgroups.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function MuscleGroupSelector() {
  const tree = useMemo(() => getMuscleGroupTree(), []);
  const [selectedId, setSelectedId] = useState<MuscleGroupId | null>(null);
  const selected = selectedId ? tree.find((g) => g.id === selectedId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-sm bg-lime text-lime-foreground font-heading font-bold text-lg">
          1
        </span>
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Pick a muscle group
          </h2>
          <p className="text-xs text-muted-foreground italic mt-0.5">
            Sets, reps, and RIR are picked by OptiFill after you rate, pick a lifestyle, and pick an experience level. This step is just exercise selection.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {tree.map((group) => (
          <MuscleGroupPill
            key={group.id}
            group={group}
            selected={selectedId === group.id}
            onSelect={() => setSelectedId(selectedId === group.id ? null : group.id)}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-8"
          >
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-lime/40 pl-3">
              {selected.blurb}
            </p>

            {selected.subgroups.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No exercises mapped here yet.
              </p>
            ) : (
              selected.subgroups.map((subgroup) => (
                <section key={subgroup.id} className="space-y-3">
                  <div className="border-l-2 border-lime/50 pl-3">
                    <h4 className="font-heading font-semibold text-sm text-foreground">
                      {subgroup.name}{" "}
                      <span className="text-[11px] text-muted-foreground font-normal">
                        · {subgroup.exercises.length} exercise{subgroup.exercises.length === 1 ? "" : "s"}
                      </span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">{subgroup.blurb}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subgroup.exercises.map((mge, idx) => (
                      <motion.div
                        key={`${mge.sourceJointFunction}-${mge.exercise.id}`}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.25 }}
                      >
                        <ExerciseCard
                          exercise={mge.exercise}
                          category={mge.sourceCategory}
                          jointFunctionName={mge.sourceJointFunction}
                        />
                      </motion.div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
