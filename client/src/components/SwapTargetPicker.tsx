/**
 * SwapTargetPicker — lets the user override the rating engine's
 * auto-suggested swap target with their own pick.
 *
 * Default flow: rating engine recommends "swap A for B". User can
 * accept/reject. Now there's a third option — click the recommended
 * exercise name on a swap row → opens this picker → user picks a
 * different exercise → pair's recommended side is replaced.
 *
 * Candidate filtering:
 *   - Same category as the original (systemic vs regional). Don't
 *     offer compound replacements for an isolation exercise — that
 *     changes the structure of the routine, not the variant.
 *   - Catalog-wide search (name + targeted muscles). Optional muscle
 *     filter pre-checks the original's primary targeted muscle so
 *     the relevant alternatives are surfaced first.
 *
 * Submission shape matches what WorkoutRater needs to override a
 * RecommendationPair: exercise name, category, targetedMuscles
 * (plus optional equipment / angle for future variant variations).
 */
import { useMemo, useState, useEffect } from "react";
import { Search, Dumbbell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { categories, type CategoryType } from "@/lib/data";

export interface SwapOverridePick {
  exercise: string;
  category: CategoryType;
  targetedMuscles: string[];
}

interface CatalogEntry {
  name: string;
  category: CategoryType;
  targetedMuscles: string[];
  description: string;
  difficulty: string;
  jointFunction: string;
}

let _flatCatalog: CatalogEntry[] | null = null;
function getFlatCatalog(): CatalogEntry[] {
  if (_flatCatalog) return _flatCatalog;
  const out: CatalogEntry[] = [];
  for (const c of categories) {
    for (const jf of c.jointFunctions) {
      for (const sub of jf.subcategories) {
        for (const ex of sub.exercises) {
          out.push({
            name: ex.name,
            category: ex.compound ? "systemic" : "regional",
            targetedMuscles: ex.targetedMuscles,
            description: ex.description,
            difficulty: ex.difficulty,
            jointFunction: jf.name,
          });
        }
      }
    }
  }
  _flatCatalog = out;
  return out;
}

interface Props {
  open: boolean;
  /** The exercise the rating engine wants to swap OUT (for display + filter). */
  originalCurrentName: string;
  /** The category to constrain candidates to (typically the original pair's category). */
  category: CategoryType;
  /** Primary muscle to bias candidates toward — usually the first targetedMuscle on the recommended side. */
  primaryMuscleHint?: string;
  /** The currently-suggested target name, so the user can see what they're overriding. */
  currentSuggestion: string;
  onSelect: (pick: SwapOverridePick) => void;
  onCancel: () => void;
}

export default function SwapTargetPicker({
  open,
  originalCurrentName,
  category,
  primaryMuscleHint,
  currentSuggestion,
  onSelect,
  onCancel,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const all = getFlatCatalog().filter((e) => e.category === category);
    // Exclude the original we're swapping out — picking it would be a no-op.
    const exOriginal = all.filter((e) => e.name !== originalCurrentName);

    // Rank: hint-muscle matches first, then name matches, then everything else.
    const q = query.trim().toLowerCase();
    const matchesQuery = (e: CatalogEntry) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.targetedMuscles.some((m) => m.toLowerCase().includes(q)) ||
      e.jointFunction.toLowerCase().includes(q);

    const hint = primaryMuscleHint?.toLowerCase();
    const matchesHint = (e: CatalogEntry) =>
      hint
        ? e.targetedMuscles.some((m) => m.toLowerCase().includes(hint))
        : false;

    return exOriginal
      .filter(matchesQuery)
      .sort((a, b) => {
        const aHint = matchesHint(a) ? 1 : 0;
        const bHint = matchesHint(b) ? 1 : 0;
        if (aHint !== bHint) return bHint - aHint;
        return a.name.localeCompare(b.name);
      });
  }, [category, originalCurrentName, primaryMuscleHint, query]);

  const handleSubmit = () => {
    const pick = filtered.find((e) => e.name === selected);
    if (!pick) return;
    onSelect({
      exercise: pick.name,
      category: pick.category,
      targetedMuscles: pick.targetedMuscles,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Override swap target</DialogTitle>
          <DialogDescription className="space-y-1">
            <div>
              Swapping out:{" "}
              <span className="font-semibold text-foreground">{originalCurrentName}</span>
            </div>
            <div>
              Auto-suggested:{" "}
              <span className="font-semibold text-foreground">{currentSuggestion}</span>
              <span className="text-muted-foreground"> · pick your own below</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${category === "systemic" ? "compound" : "isolation"} exercises by name or muscle...`}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Results */}
        <div className="space-y-1 overflow-y-auto flex-1 pr-1">
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground italic p-3">
              No matches.
            </div>
          )}
          {filtered.map((entry) => {
            const isSelected = selected === entry.name;
            return (
              <button
                key={entry.name}
                onClick={() => setSelected(entry.name)}
                className={`w-full text-left p-2.5 border-2 rounded-sm transition-colors ${
                  isSelected
                    ? "border-lime bg-lime/10"
                    : "border-border hover:border-lime/60 hover:bg-lime/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-lime border-lime text-lime-foreground"
                        : "bg-background border-border"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                  </div>
                  <div className="p-1 bg-secondary rounded-sm shrink-0">
                    <Dumbbell className="w-3 h-3 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-foreground">
                      {entry.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {entry.targetedMuscles.join(", ")} · {entry.jointFunction}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selected}
            className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold disabled:opacity-50"
          >
            Use as swap target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
