import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import Home from "./pages/Home";
import CalendarPage from "./pages/CalendarPage";
import CheckInPage from "./pages/CheckInPage";
import StatsPage from "./pages/StatsPage";
import BottomNav from "./components/BottomNav";

/**
 * Tab-persistent router.
 *
 * Previously used wouter's <Switch>, which unmounts inactive routes and
 * loses their local state — scroll position, expanded sections, in-flight
 * form input, modal visibility, anything in React useState. That's a
 * frustrating UX when bouncing between bottom-nav tabs.
 *
 * The new approach keeps ALL pages mounted simultaneously and toggles
 * visibility via CSS. State persists because the components never unmount.
 * tRPC react-query caching handles the "don't re-fetch on every nav"
 * concern automatically.
 *
 * /planner and / both render Home — the planner tab's intent of "take me
 * to the weekly microcycle" is handled inside Home.tsx via a useEffect
 * that scrolls to the SplitBuilder anchor when the location is /planner.
 */
function Router() {
  const [loc] = useLocation();
  const isHome = loc === "/" || loc === "/planner";
  const isCalendar = loc.startsWith("/calendar");
  const isCheckin = loc.startsWith("/check-in");
  const isStats = loc.startsWith("/stats");
  const isKnown = isHome || isCalendar || isCheckin || isStats;

  return (
    <>
      <div style={{ display: isHome ? "block" : "none" }}>
        <Home />
      </div>
      <div style={{ display: isCalendar ? "block" : "none" }}>
        <CalendarPage />
      </div>
      <div style={{ display: isCheckin ? "block" : "none" }}>
        <CheckInPage />
      </div>
      <div style={{ display: isStats ? "block" : "none" }}>
        <StatsPage />
      </div>
      {!isKnown && <NotFound />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <WorkoutProvider>
              <Toaster />
              <Router />
              <BottomNav />
            </WorkoutProvider>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
