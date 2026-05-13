import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WorkoutProvider } from "./contexts/WorkoutContext";
import Home from "./pages/Home";
import CalendarPage from "./pages/CalendarPage";
import CheckInPage from "./pages/CheckInPage";
import StatsPage from "./pages/StatsPage";
import BottomNav from "./components/BottomNav";

function Router() {
  return (
    <Switch>
      {/* Home + Planner currently share the same component — the builder
       * UI is on the home page. /planner is a distinct URL the bottom-
       * nav highlights when the user wants to jump straight to the
       * builder. Split them apart when the home page diverges. */}
      <Route path={"/"} component={Home} />
      <Route path={"/planner"} component={Home} />
      <Route path={"/calendar"} component={CalendarPage} />
      <Route path={"/check-in"} component={CheckInPage} />
      <Route path={"/stats"} component={StatsPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
