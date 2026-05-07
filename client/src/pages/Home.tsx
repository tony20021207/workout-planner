/**
 * Home Page — Kinesiology Workout Builder
 * Design: "Kinetic Energy" — Neo-Brutalism meets Athletic Performance
 * Dark slate base (#0F172A), electric lime (#84CC16) accents, diagonal cuts, bold typography
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Dumbbell, ChevronDown, LogIn, User, Calendar, FileDown } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import CategorySelector from "@/components/CategorySelector";
import JointFunctionSelector from "@/components/JointFunctionSelector";
import ExerciseList from "@/components/ExerciseList";
import RoutineTable from "@/components/RoutineTable";
import WarmupSection from "@/components/WarmupSection";
import { type CategoryType, type JointFunction } from "@/lib/data";
import { useWorkout } from "@/contexts/WorkoutContext";
import { Link } from "wouter";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485353368/jfV7S3MNUDuVhtkiCcthXe/hero-gym-dark-KKuMaEkkg3MDJoz7g3KQh4.webp";
const ABSTRACT_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663485353368/jfV7S3MNUDuVhtkiCcthXe/workout-abstract-Ac9q3imwxjAcUVS4pjhALz.webp";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { routine } = useWorkout();
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [selectedJointFunction, setSelectedJointFunction] = useState<JointFunction | null>(null);

  const handleCategorySelect = (category: CategoryType) => {
    setSelectedCategory(category);
    setSelectedJointFunction(null);
  };

  const handleJointFunctionSelect = (jf: JointFunction) => {
    setSelectedJointFunction(jf);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-lime rounded-sm">
              <Dumbbell className="w-4 h-4 text-lime-foreground" />
            </div>
            <span className="font-heading font-bold text-sm text-foreground">KineticBuilder</span>
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
              Build Your Routine<br />
              <span className="text-lime">By Joint Function</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Science-driven workout programming based on biomechanical joint functions. 
              Select movements, get algorithmic parameters, and build a complete routine.
            </p>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mt-8 flex items-center gap-2 text-muted-foreground"
            >
              <ChevronDown className="w-5 h-5" />
              <span className="text-sm">Scroll to begin</span>
            </motion.div>
          </motion.div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-background"
          style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
        />
      </section>

      {/* Main Builder Section */}
      <section className="container py-12 space-y-12">
        <CategorySelector
          selected={selectedCategory}
          onSelect={handleCategorySelect}
        />

        {selectedCategory && (
          <JointFunctionSelector
            category={selectedCategory}
            selected={selectedJointFunction}
            onSelect={handleJointFunctionSelect}
          />
        )}

        {selectedCategory && selectedJointFunction && (
          <ExerciseList
            category={selectedCategory}
            jointFunction={selectedJointFunction}
          />
        )}
      </section>

      {/* Routine Section */}
      <section className="relative py-12">
        <div className="absolute inset-0 opacity-5">
          <img
            src={ABSTRACT_BG}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative container">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-1 bg-lime rounded-full" />
            <h2 className="font-heading text-3xl font-bold text-foreground">
              Workout Builder
            </h2>
          </div>
          <RoutineTable />
        </div>
      </section>

      {/* Warmup Recommendations */}
      {routine.length > 0 && (
        <section className="container py-12">
          <WarmupSection />
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>
            Kinesiology Workout Builder — Programming based on biomechanical joint functions
          </p>
        </div>
      </footer>
    </div>
  );
}
