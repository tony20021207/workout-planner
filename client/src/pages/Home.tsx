/**
 * Home Page — Kinesiology Workout Builder
 * Design: "Kinetic Energy" — Neo-Brutalism meets Athletic Performance
 * Dark slate base (#0F172A), electric lime (#84CC16) accents, diagonal cuts, bold typography
 */
import { motion } from "framer-motion";
import { Dumbbell, LogIn, User, Calendar, Hammer, ClipboardEdit } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import MuscleGroupSelector from "@/components/MuscleGroupSelector";
import RoutineTable from "@/components/RoutineTable";
import SplitBuilder from "@/components/SplitBuilder";
import { useWorkout } from "@/contexts/WorkoutContext";
import { Link } from "wouter";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485353368/jfV7S3MNUDuVhtkiCcthXe/hero-gym-dark-KKuMaEkkg3MDJoz7g3KQh4.webp";
const ABSTRACT_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485353368/jfV7S3MNUDuVhtkiCcthXe/workout-abstract-Ac9q3imwxjAcUVS4pjhALz.webp";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { routine } = useWorkout();

  return (
    <div className="min-h-screen bg-background">
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
                <Button variant="ghost" size="sm" onClick={() => logout()} className="text-muted-foreground hover:text-lime">
                  <User className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className="bg-lime text-lime-foreground hover:bg-lime/80 font-semibold">
                  <LogIn className="w-4 h-4 mr-1.5" />
                  Sign In
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

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
                Kinesiology-Based Programming
              </span>
            </div>
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground leading-tight mb-4">
              <span className="text-lime">OptiSplit</span>, <span className="text-lime">OptiFill</span>
              <br />
              make <span className="text-lime">OptiMass</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Pick the exercises you want this week. Rate the selection out of 100 against the
              Hypertrophy Matrix, fix the gaps it flags, then split into days.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <button
                onClick={() => {
                  document.getElementById("builder")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group p-5 bg-lime hover:bg-lime/90 text-lime-foreground rounded-sm border-2 border-lime transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-lime-foreground/10 rounded-sm shrink-0">
                    <Hammer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg leading-tight">
                      Build one now
                    </h3>
                    <p className="text-sm opacity-80 mt-0.5 leading-snug">
                      Step through the kinesiology builder, get OptiSplit + OptiFill tuned for your level.
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  document.getElementById("rate")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group p-5 bg-purple-600 hover:bg-purple-700 text-white rounded-sm border-2 border-purple-600 transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white/10 rounded-sm shrink-0">
                    <ClipboardEdit className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg leading-tight">
                      Rate what I have
                    </h3>
                    <p className="text-sm opacity-80 mt-0.5 leading-snug">
                      Paste a routine, upload a screenshot, or import text — get a Hypertrophy Matrix score.
                    </p>
                  </div>
                </div>
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
            OptiMass — Kinesiology-based hypertrophy programming
          </p>
        </div>
      </footer>
    </div>
  );
}
