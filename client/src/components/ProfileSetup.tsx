/**
 * ProfileSetup — the front-of-flow profile capture modal.
 *
 * Lifestyle / Experience / Volume aren't just rating inputs — they also
 * drive Opti-split (volume targets, session distribution) and Opti-fill
 * (rep ranges, sets per exercise). Previously these pickers lived
 * inside WorkoutRater's pre-rate strip, so a user who skipped rating
 * and went straight to building a routine + split would get the
 * allocator running on null defaults.
 *
 * This component pulls them out to the front. Two ways to open:
 *
 *   1. Auto-open on first authenticated visit when any of
 *      (lifestyle, experience) is null. Volume defaults from
 *      experience so it doesn't trigger the modal alone.
 *
 *   2. Triggered from the Home top-nav dropdown ("Edit profile")
 *      so the user can change settings later.
 *
 * Persisted in WorkoutContext (sessionStorage). Once these are set,
 * Opti-* runs with real data, and the rating UI no longer asks again.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserCircle2, Sparkles, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWorkout } from "@/contexts/WorkoutContext";
import LifestylePicker from "./LifestylePicker";
import ExperiencePicker from "./ExperiencePicker";
import VolumePicker from "./VolumePicker";

interface Props {
  /** Controlled-open prop. Parent can force it open (e.g. from dropdown). */
  open: boolean;
  onClose: () => void;
}

export default function ProfileSetup({ open, onClose }: Props) {
  const { experience, lifestyle } = useWorkout();
  const isComplete = experience !== null && lifestyle !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-purple-500/15 rounded-sm">
              <UserCircle2 className="w-5 h-5 text-purple-300" />
            </div>
            <DialogTitle className="font-heading text-2xl">Your profile</DialogTitle>
          </div>
          <DialogDescription className="text-xs leading-relaxed">
            These three settings drive everything downstream — Opti-split's
            volume targets per muscle, Opti-fill's rep ranges and set
            counts, and the rating engine's penalty multipliers. Set once;
            you can change them later from the account menu.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1 py-2">
          <LifestylePicker />
          <div className="border-t border-border" />
          <ExperiencePicker />
          <div className="border-t border-border" />
          <VolumePicker />
        </div>

        <DialogFooter className="border-t border-border pt-3">
          {isComplete ? (
            <Button
              onClick={onClose}
              className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Save & continue
            </Button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap w-full justify-between">
              <span className="text-[11px] text-yellow-400 leading-snug flex-1">
                <Sparkles className="w-3 h-3 inline-block mr-1" />
                Pick a lifestyle + experience level above. Opti-* runs on these directly — defaults won't be tuned to you.
              </span>
              <Button
                onClick={onClose}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                Skip for now
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Tiny hook that triggers the modal on first authenticated visit when
 * the profile is incomplete. Returns the controlled state + setter so
 * the parent component (Home, typically) can also open it manually
 * from a menu item.
 *
 * "First visit" is sloppy on purpose — we just check if the profile is
 * unset. If the user dismissed it without filling in, we don't keep
 * re-opening on every navigation; we rely on a dedicated "Edit
 * profile" menu item for the user to come back later.
 */
export function useProfileSetup(isAuthenticated: boolean) {
  const { experience, lifestyle } = useWorkout();
  const [open, setOpen] = useState(false);
  // Auto-open once on first authenticated visit when profile is incomplete.
  // The seenOnce flag prevents re-trigger on every nav — once dismissed
  // the user is in charge of re-opening via the menu.
  const [seenOnce, setSeenOnce] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (seenOnce) return;
    if (experience === null || lifestyle === null) {
      setOpen(true);
      setSeenOnce(true);
    }
  }, [isAuthenticated, experience, lifestyle, seenOnce]);
  return { open, setOpen };
}

/**
 * Compact one-line summary card for the Stats page / nav badges.
 * Shows current profile or 'incomplete' nudge.
 */
export function ProfileSummary({ onEdit }: { onEdit: () => void }) {
  const { experience, lifestyle, volume } = useWorkout();
  const expLabel = experience === "beginner" ? "Beginner" : experience === "foot-in-door" ? "Foot in the Door" : experience === "experienced" ? "Experienced" : null;
  const volLabel = (volume ?? (experience === "beginner" ? "low" : experience === "experienced" ? "high" : "med")).toUpperCase();
  const hasProfile = experience !== null && lifestyle !== null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-sm border-2 ${
        hasProfile
          ? "bg-purple-500/[0.04] border-purple-500/30"
          : "bg-yellow-500/[0.04] border-yellow-500/40"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <UserCircle2 className={`w-4 h-4 shrink-0 ${hasProfile ? "text-purple-300" : "text-yellow-400"}`} />
        {hasProfile ? (
          <div className="flex items-baseline gap-2 flex-wrap text-xs flex-1 min-w-0">
            <span className="text-muted-foreground">Profile:</span>
            <span className="font-semibold text-foreground">{expLabel}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-semibold text-foreground">{volLabel} volume</span>
            {lifestyle && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground">{lifestyle}</span>
              </>
            )}
          </div>
        ) : (
          <span className="text-xs text-yellow-400 leading-snug flex-1">
            Profile incomplete — Opti-* will use defaults until you set
            lifestyle + experience.
          </span>
        )}
        <button
          onClick={onEdit}
          className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-border hover:border-foreground/40 transition-colors text-muted-foreground hover:text-foreground"
        >
          {hasProfile ? "Edit" : "Set now"}
        </button>
      </div>
    </motion.div>
  );
}
