import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import Notes from "./pages/Notes";
import Calendar from "./pages/Calendar";
import Appointments from "./pages/Appointments";
import Notifications from "./pages/Notifications";
import Team from "./pages/Team";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/chat" component={Chat} />
      <Route path="/notes" component={Notes} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/team" component={Team} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

