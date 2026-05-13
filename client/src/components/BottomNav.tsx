/**
 * BottomNav — fixed nav strip at the bottom of every page. Five tabs:
 * Home / Workout / Calendar / Check-in / Stats. Mobile-friendly
 * (touch-sized tap targets) and works on desktop too. Active tab is
 * highlighted based on the current route.
 *
 * Stats is a placeholder for now — clicking it lands on a "coming
 * soon" page. Check-in is the day-of-workout experience.
 */
import { Link, useLocation } from "wouter";
import {
  Home as HomeIcon,
  Hammer,
  Calendar as CalendarIcon,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

interface Tab {
  id: string;
  label: string;
  href: string;
  icon: typeof HomeIcon;
  matches: (path: string) => boolean;
}

const TABS: Tab[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    icon: HomeIcon,
    matches: (p) => p === "/",
  },
  {
    id: "planner",
    label: "Planner",
    href: "/planner",
    icon: Hammer,
    matches: (p) => p.startsWith("/planner"),
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: CalendarIcon,
    matches: (p) => p.startsWith("/calendar"),
  },
  {
    id: "checkin",
    label: "Check-in",
    href: "/check-in",
    icon: ClipboardCheck,
    matches: (p) => p.startsWith("/check-in"),
  },
  {
    id: "stats",
    label: "Stats",
    href: "/stats",
    icon: BarChart3,
    matches: (p) => p.startsWith("/stats"),
  },
];

export default function BottomNav() {
  const [location] = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border">
      <div className="container">
        <div className="grid grid-cols-5 gap-1 py-1.5">
          {TABS.map((t) => {
            const active = t.matches(location);
            const Icon = t.icon;
            return (
              <Link key={t.id} href={t.href}>
                <button
                  className={`w-full flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-sm transition-colors ${
                    active
                      ? "text-lime"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={t.label}
                >
                  <Icon
                    className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-2"}`}
                  />
                  <span
                    className={`text-[10px] uppercase tracking-wider ${
                      active ? "font-bold" : "font-medium"
                    }`}
                  >
                    {t.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
