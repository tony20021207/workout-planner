/**
 * StatsPage — placeholder for now. Will surface weekly volume, PR
 * tracking, streak counters, body-part bias over time, etc. once we
 * scope the data model.
 *
 * In the meantime, this page surfaces the user's profile (lifestyle,
 * experience, volume) at the top so they can see what their plan is
 * being tuned against, plus an entry point to edit it.
 */
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import ProfileSetup, { ProfileSummary } from "@/components/ProfileSetup";

export default function StatsPage() {
  const { isAuthenticated } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-lime">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Home
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-lime" />
              <span className="font-heading font-bold text-sm text-foreground">Stats</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container py-6 max-w-2xl space-y-5">
        {/* Profile summary — shown first so the user can see what their
            plan is being tuned against. */}
        {isAuthenticated && <ProfileSummary onEdit={() => setProfileOpen(true)} />}

        {/* Placeholder analytics panel. Will be replaced once the data
            model for sessions / volume / PRs is locked. */}
        <div className="p-8 bg-card border-2 border-dashed border-border rounded-sm text-center space-y-4">
          <div className="inline-flex p-3 bg-lime/10 rounded-sm">
            <Sparkles className="w-8 h-8 text-lime" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-foreground">
            Analytics coming
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            Once we lock down the data model we'll surface weekly volume per muscle, streak
            counters, PR history, body-part bias over time, and a few more analytics.
            Nothing to show yet — keep training and we'll have something for you soon.
          </p>
          <Link href="/calendar">
            <Button variant="outline">Back to Calendar</Button>
          </Link>
        </div>
      </div>

      {isAuthenticated && (
        <ProfileSetup open={profileOpen} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
