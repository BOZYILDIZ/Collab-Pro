import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import NotesV2 from "./pages/NotesV2";
import Calendar from "./pages/Calendar";
import Appointments from "./pages/Appointments";
import Notifications from "./pages/Notifications";
import Team from "./pages/Team";
import Projects from "./pages/Projects";
import ProjectBoard from "./pages/ProjectBoard";
import TaskDetail from "./pages/TaskDetail";
import Search from "./pages/Search";
import Invitations from "./pages/Invitations";
import Teams from "./pages/Teams";
import Admin from "./pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/chat" component={Chat} />
      <Route path="/notes" component={NotesV2} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/team" component={Team} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectBoard} />
      <Route path="/tasks/:id" component={TaskDetail} />
      <Route path="/search" component={Search} />
      <Route path="/invitations" component={Invitations} />
      <Route path="/teams" component={Teams} />
      <Route path="/admin" component={Admin} />
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

