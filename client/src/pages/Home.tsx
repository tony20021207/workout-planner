/**
 * Home Page — Kinesiology Workout Builder
 * Design: "Kinetic Energy" — Neo-Brutalism meets Athletic Performance
 * Dark slate base (#0F172A), electric lime (#84CC16) accents, diagonal cuts, bold typography
 */
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Dumbbell, LogIn, User, Calendar, Hammer, ClipboardEdit, LogOut, UserCog, ChevronDown } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import MuscleGroupSelector from "@/components/MuscleGroupSelector";
import RoutineTable from "@/components/RoutineTable";
import SplitBuilder from "@/components/SplitBuilder";
import ScheduledEditBanner from "@/components/ScheduledEditBanner";
import { useWorkout } from "@/contexts/WorkoutContext";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485353368/jfV7S3MNUDuVhtkiCcthXe/hero-gym-dark-KKuMaEkkg3MDJoz7g3KQh4.webp";
const ABSTRACT_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485353368/jfV7S3MNUDuVhtkiCcthXe/workout-abstract-Ac9q3imwxjAcUVS4pjhALz.webp";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { routine } = useWorkout();
  const [location, setLocation] = useLocation();

  // When the user lands on /planner (Planner tab in the bottom nav),
  // jump straight to the weekly microcycle / split builder section
  // instead of dumping them at the top of Home. Uses the #split anchor
  // that already exists on the SplitBuilder <section>. With the new
  // tab-persistent router, Home stays mounted across nav, so this
  // re-scrolls every time /planner becomes the active route.
  useEffect(() => {
    if (location === "/planner") {
      // Defer to next frame so any layout shift from the route change
      // has settled before we measure scroll position.
      requestAnimationFrame(() => {
        document.getElementById("split")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
    if (location === "/") {
      // Snap back to the top when the Home tab is re-selected. Without
      // this the user might be left mid-scroll from their last visit.
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }, [location]);

  // Switch account = sign out, then navigate to /login so a different
  // Google/email credential pair can sign in immediately.
  // Log out = sign out and stay put; the auth state flip will re-render
  // the nav into the "Sign In" CTA.
  const handleSwitchAccount = async () => {
    await logout();
    setLocation("/login");
  };
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-lime rounded-sm">
              <Dumbbell className="w-4 h-4 text-lime-foreground" />
            </div>
            <span className="font-heading font-bold text-sm text-foreground">OptiMass</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-lime">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Calendar
                </Button>
              </Link>
            )}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:block">{user?.name || user?.email}</span>
                {/* Profile menu — clicking the user icon used to sign you out
                    instantly (no confirmation). Now opens a dropdown so the
                    only-one-click-from-data-loss problem is fixed. */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-lime"
                      title="Account"
                    >
                      <User className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[200px]">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Signed in as
                    </DropdownMenuLabel>
                    <DropdownMenuLabel className="-mt-1 text-xs font-normal text-foreground truncate">
                      {user?.email || user?.name || "User"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleSwitchAccount} className="cursor-pointer">
                      <UserCog className="w-3.5 h-3.5 mr-2" />
                      Switch account
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer text-red-300 focus:text-red-200">
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold">
                  <LogIn className="w-4 h-4 mr-1.5" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Scheduled-workout edit banner — only renders when the user is
          editing a calendar workout (clicked "Edit in Planner" from
          CalendarPage). Provides Save / Save as new / Cancel actions. */}
      <ScheduledEditBanner />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <div className="relative container py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-lime rounded-sm">
                <Dumbbell className="w-6 h-6 text-lime-foreground" />
              </div>
              <span className="text-lime font-heading font-semibold text-sm uppercase tracking-wider">
                Workout Programming for Optimal Hypertrophy
              </span>
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground leading-tight mb-4">
              <span className="text-lime">Opti-split</span>, <span className="text-lime">Opti-fill</span>,{" "}
              <span className="text-lime">OptiMass</span>.
            </h1>
            <p className="text-base text-muted-foreground max-w-xl leading-snug mb-6">
              Five steps. Each does one job.
            </p>
            {/* Action-verb-first flow.
                  Each step: HUGE verb (action) + ONE short noun (target).
                  Detail explanation lives inside a Collapsible behind a
                  downward triangle — keeps the hero clean for the user
                  who already knows what each step is, exposes the why
                  for the user who wants to learn. */}
            <div className="space-y-3 max-w-2xl">
              {[
                {
                  num: 1,
                  verb: "Pick",
                  target: "exercises",
                  why: "Coverage of the major joint actions matters more than picking the trendiest machine. The catalog rates each pick on stretch, stability, and stimulus-to-fatigue.",
                },
                {
                  num: 2,
                  verb: "Rate",
                  target: "the selection",
                  why: "Scored 0–100 vs. the Hypertrophy Matrix. Surfaces blind spots (missing scapular depressors, too much CNS load, no deep-stretch picks) before you commit to a week.",
                },
                {
                  num: 3,
                  verb: "Split",
                  target: "across training days",
                  why: "Opti-split distributes volume per major mover so each muscle lands inside its MEV–MAV band. Compounds get prime slots; isolation crowds in around them.",
                },
                {
                  num: 4,
                  verb: "Fill",
                  target: "sets and reps",
                  why: "Opti-fill matches a rep range to each exercise's biomechanical profile — deadlifts low (5–8), calves & abs high (15–20), compounds med-low (8–12), isolation med-high (12–15). Set counts derive from your volume tier.",
                },
                {
                  num: 5,
                  verb: "Track",
                  target: "progress",
                  why: "Schedule the mesocycle on the calendar. Check in daily — log actual reps and weight per set. The Stats page (coming) reads that log for real progression data, not guesswork.",
                },
              ].map((step) => (
                <Collapsible key={step.num}>
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                      {step.num}.
                    </span>
                    <span className="font-heading text-3xl md:text-4xl font-bold text-lime leading-none">
                      {step.verb}
                    </span>
                    <span className="text-base text-foreground font-medium">
                      {step.target}
                    </span>
                    <CollapsibleTrigger asChild>
                      <button
                        className="ml-1 p-1 rounded-sm hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all data-[state=open]:rotate-180"
                        title="Why this step?"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <p className="text-xs text-muted-foreground leading-snug pl-7 pt-1.5 max-w-xl">
                      {step.why}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {/* CTA buttons. The titles are the action — make them huge.
                Subtitles are supporting context — make them tiny. The
                whole button is the click target. */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <button
                onClick={() => {
                  document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group p-6 bg-lime hover:bg-lime/90 text-lime-foreground rounded-sm border-2 border-lime transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-lime-foreground/10 rounded-sm shrink-0">
                    <Hammer className="w-7 h-7" />
                  </div>
                  <h3 className="font-heading font-extrabold text-3xl md:text-4xl leading-none">
                    Build one now
                  </h3>
                </div>
                <p className="text-[11px] opacity-75 leading-snug">
                  Pick exercises → Opti-split + Opti-fill tuned for your tier.
                </p>
              </button>
              <button
                onClick={() => {
                  document.getElementById("rate")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group p-6 bg-purple-600 hover:bg-purple-700 text-white rounded-sm border-2 border-purple-600 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/10 rounded-sm shrink-0">
                    <ClipboardEdit className="w-7 h-7" />
                  </div>
                  <h3 className="font-heading font-extrabold text-3xl md:text-4xl leading-none">
                    Rate what I have
                  </h3>
                </div>
                <p className="text-[11px] opacity-75 leading-snug">
                  Paste, upload, or import — get a Hypertrophy Matrix score.
                </p>
              </button>
            </div>
          </motion.div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-background"
          style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
        />
      </section>

      {/* Main Builder Section */}
      <section id="builder" className="container py-12">
        <MuscleGroupSelector />
      </section>

      {/* Weekly Microcycle Section */}
      <section id="rate" className="relative py-12">
        <div className="absolute inset-0 opacity-5">
          <img
            src={ABSTRACT_BG}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative container">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 bg-lime rounded-full" />
            <h2 className="font-heading text-3xl font-bold text-foreground">
              Weekly Microcycle
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-8 ml-4">
            One full week of training as the smallest periodization unit. Pick the exercises, rate the selection, then split into days.
          </p>
          <RoutineTable />
        </div>
      </section>

      {/* Split Builder */}
      {routine.length > 0 && (
        <section id="split" className="container py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 bg-lime rounded-full" />
            <h2 className="font-heading text-3xl font-bold text-foreground">Weekly Split</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-8 ml-4">
            Distribute the microcycle across the week. Pick a preset or build a custom split.
          </p>
          <SplitBuilder />
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>
            Go out there and OptiMass.
          </p>
        </div>
      </footer>
    </div>
  );
}
