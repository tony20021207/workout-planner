/**
 * Empty-state picker shown when the user sets a calves / abs finisher
 * frequency but doesn't have a matching exercise in their routine yet.
 *
 * Opens a Dialog listing every catalog exercise that qualifies as a
 * finisher of the requested kind. User clicks one → onPick fires with
 * the full FinisherCatalogPick so the parent can build a RoutineItem
 * and proceed with the allocation.
 */
import { Dumbbell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getCalfCatalogPicks,
  getRectusAbsCatalogPicks,
  type FinisherCatalogPick,
  type FinisherKind,
} from "@/lib/finisher";

interface Props {
  open: boolean;
  kind: FinisherKind | null;
  onPick: (pick: FinisherCatalogPick) => void;
  onCancel: () => void;
}

export default function FinisherPickerModal({ open, kind, onPick, onCancel }: Props) {
  const picks =
    kind === "calves"
      ? getCalfCatalogPicks()
      : kind === "abs"
        ? getRectusAbsCatalogPicks()
        : [];

  const title = kind === "calves" ? "Pick a calf exercise" : "Pick an abs exercise";
  const blurb =
    kind === "calves"
      ? "No calf exercise in your routine yet. Pick one — it'll be added and used as your daily calves finisher."
      : "No abs exercise in your routine yet. Pick one — it'll be added and used as your daily abs finisher (rectus abdominis).";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{blurb}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {picks.length === 0 && (
            <div className="text-sm text-muted-foreground italic p-3">
              No catalog options available.
            </div>
          )}
          {picks.map((pick) => (
            <button
              key={pick.name}
              onClick={() => onPick(pick)}
              className="w-full text-left p-3 border border-border rounded-sm hover:border-lime hover:bg-lime/5 transition-colors group"
            >
              <div className="flex items-start gap-2">
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
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
