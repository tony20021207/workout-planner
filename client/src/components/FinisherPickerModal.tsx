/**
 * Multi-pick finisher modal — calves / abs.
 *
 * Previously single-pick: user clicked one exercise → modal closed
 * immediately. That gave no way to pick a second exercise for
 * day-to-day variety on the rotation (the allocator already supports
 * rotation across 2+ picks; the UI just couldn't deliver them).
 *
 * Multi-pick rules:
 *   - Max 2 picks per finisher kind. Beyond 2 stops being a finisher
 *     and starts being a dedicated workout, which is a different
 *     conversation. The 3rd checkbox disables until one of the two
 *     selected items is unchecked.
 *   - The two exercises rotate one-per-day across the finisher
 *     frequency days. Week-2 mesocycle then offsets the starting
 *     position so total weekly volume balances across the meso.
 *   - User must select at least 1 to enable Submit.
 *
 * One-pick still works: tick one box, hit Submit. The allocator
 * handles 1 / 2 the same way.
 */
import { useState, useEffect } from "react";
import { Dumbbell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCalfCatalogPicks,
  getRectusAbsCatalogPicks,
  type FinisherCatalogPick,
  type FinisherKind,
} from "@/lib/finisher";

const MAX_PICKS = 2;

interface Props {
  open: boolean;
  kind: FinisherKind | null;
  /** Fires once with all selected picks when the user hits Submit. */
  onSubmit: (picks: FinisherCatalogPick[]) => void;
  onCancel: () => void;
}

export default function FinisherPickerModal({ open, kind, onSubmit, onCancel }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selection whenever the modal opens fresh.
  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, kind]);

  const picks =
    kind === "calves"
      ? getCalfCatalogPicks()
      : kind === "abs"
        ? getRectusAbsCatalogPicks()
        : [];

  const title =
    kind === "calves"
      ? "Pick calf exercise(s)"
      : "Pick abs exercise(s)";
  const blurb =
    kind === "calves"
      ? `Pick up to ${MAX_PICKS} calf exercises — they'll rotate one-per-day across your finisher frequency. One pick is fine; two adds variety.`
      : `Pick up to ${MAX_PICKS} abs exercises (rectus abdominis only) — they'll rotate one-per-day across your finisher frequency. One pick is fine; two adds variety.`;

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        if (next.size >= MAX_PICKS) return prev; // hard cap
        next.add(name);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const chosen = picks.filter((p) => selected.has(p.name));
    if (chosen.length === 0) return;
    onSubmit(chosen);
  };

  const remaining = MAX_PICKS - selected.size;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{blurb}</DialogDescription>
        </DialogHeader>

        {/* Selected count + cap hint */}
        <div className="flex items-center justify-between text-xs px-1 py-1.5 border-y border-border">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{selected.size}</span> of {MAX_PICKS} selected
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {remaining > 0 ? `${remaining} more allowed` : "cap reached"}
          </span>
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
          {picks.length === 0 && (
            <div className="text-sm text-muted-foreground italic p-3">
              No catalog options available.
            </div>
          )}
          {picks.map((pick) => {
            const isSelected = selected.has(pick.name);
            const isDisabled = !isSelected && selected.size >= MAX_PICKS;
            return (
              <button
                key={pick.name}
                onClick={() => toggle(pick.name)}
                disabled={isDisabled}
                className={`w-full text-left p-3 border-2 rounded-sm transition-colors group ${
                  isSelected
                    ? "border-lime bg-lime/10"
                    : isDisabled
                      ? "border-border bg-secondary/20 opacity-40 cursor-not-allowed"
                      : "border-border hover:border-lime/60 hover:bg-lime/5"
                }`}
                title={isDisabled ? `Cap of ${MAX_PICKS} reached. Uncheck one to swap.` : pick.description}
              >
                <div className="flex items-start gap-2">
                  {/* Checkbox indicator */}
                  <div
                    className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-lime border-lime text-lime-foreground"
                        : "bg-background border-border"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                  </div>
                  <div className="p-1.5 bg-secondary rounded-sm shrink-0 group-hover:bg-lime/20">
                    <Dumbbell className="w-3.5 h-3.5 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-foreground">{pick.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {pick.targetedMuscles.join(", ")} · {pick.category === "systemic" ? "Compound" : "Isolation"}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                      {pick.description}
                    </p>
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
            disabled={selected.size === 0}
            className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold disabled:opacity-50"
          >
            Add {selected.size > 0 ? `${selected.size} exercise${selected.size === 1 ? "" : "s"}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
