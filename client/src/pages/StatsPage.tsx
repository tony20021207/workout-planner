/**
 * StatsPage — placeholder for now. Will surface weekly volume, PR
 * tracking, streak counters, body-part bias over time, etc. once we
 * scope the data model.
 */
import { Link } from "wouter";
import { ArrowLeft, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StatsPage() {
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

      <div className="container py-12 max-w-2xl">
        <div className="p-8 bg-card border-2 border-dashed border-border rounded-sm text-center space-y-4">
          <div className="inline-flex p-3 bg-lime/10 rounded-sm">
            <Sparkles className="w-8 h-8 text-lime" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-foreground">
            Stats are coming
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
    </div>
  );
}
