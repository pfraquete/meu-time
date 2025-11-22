import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Matches from "./pages/Matches";
import CreateMatch from "./pages/CreateMatch";
import MatchDetails from "./pages/MatchDetails";
import Profile from "./pages/Profile";
import Ranking from "./pages/Ranking";
import MySeries from "./pages/MySeries";
import Challenges from "./pages/Challenges";
import PlayerProfile from "./pages/PlayerProfile";
import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      <Route path="/matches">
        <ProtectedRoute>
          <Matches />
        </ProtectedRoute>
      </Route>
      <Route path="/matches/create">
        <ProtectedRoute>
          <CreateMatch />
        </ProtectedRoute>
      </Route>
      <Route path="/matches/:id">
        <ProtectedRoute>
          <MatchDetails />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/ranking">
        <ProtectedRoute>
          <Ranking />
        </ProtectedRoute>
      </Route>
      <Route path="/series">
        <ProtectedRoute>
          <MySeries />
        </ProtectedRoute>
      </Route>
      <Route path="/challenges">
        <ProtectedRoute>
          <Challenges />
        </ProtectedRoute>
      </Route>
      <Route path="/players/:id">
        <ProtectedRoute>
          <PlayerProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
