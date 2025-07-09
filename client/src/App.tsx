import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Chat from "@/pages/chat";
import Login from "@/pages/login";
import Register from "@/pages/register";
import RegisterSimple from "@/pages/register-simple";

import Sponsor from "@/pages/sponsor";
import Handle from "@/pages/handle";
import Themes from "@/pages/themes";
import CreateRoom from "@/pages/create-room";
import RoomCheckout from "@/pages/room-checkout";
import Room from "@/pages/room";
import Careers from "@/pages/careers";
import Contact from "@/pages/contact";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import MemberSettings from "@/pages/member-settings";
import About from "@/pages/about";
import NotFound from "@/pages/not-found";
import BackendDashboard from "@/pages/backend-dashboard";
import ModeratorDashboard from "@/pages/moderator-dashboard";
import DirectMessages from "@/pages/direct-messages";
import Search from "@/pages/search";
import Notifications from "@/pages/notifications";

// Role-based home page component
function RoleBasedHome() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <Landing />;
  }
  
  if (!isAuthenticated) {
    return <Landing />;
  }
  
  // Super users go to backend dashboard
  if (user?.username === 'voidteam' || user?.username === 'caselka') {
    return <Redirect to="/backend" />;
  }
  
  // Regular authenticated users go to chat
  return <Chat />;
}

// Navigation is now handled by individual pages using DynamicHeader

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoleBasedHome} />
      <Route path="/chat" component={Chat} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/register-simple" component={RegisterSimple} />

      <Route path="/sponsor" component={Sponsor} />
      <Route path="/handle" component={Handle} />
      <Route path="/themes" component={Themes} />
      <Route path="/create-room" component={CreateRoom} />
      <Route path="/room-checkout" component={RoomCheckout} />
      <Route path="/room/:name" component={Room} />
      <Route path="/member-settings" component={MemberSettings} />
      <Route path="/about" component={About} />
      <Route path="/careers" component={Careers} />
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/backend" component={BackendDashboard} />
      <Route path="/moderator" component={ModeratorDashboard} />
      <Route path="/messages" component={DirectMessages} />
      <Route path="/search" component={Search} />
      <Route path="/notifications" component={Notifications} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
