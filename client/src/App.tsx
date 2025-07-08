import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun, User, LogOut } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Chat from "@/pages/chat";
import GuardianCheckout from "@/pages/guardian-checkout";
import Sponsor from "@/pages/sponsor";
import Handle from "@/pages/handle";
import Themes from "@/pages/themes";
import Careers from "@/pages/careers";
import Contact from "@/pages/contact";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";

function Navigation() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="bg-background/80 backdrop-blur-sm"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      
      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-background/80 backdrop-blur-sm"
            onClick={() => window.location.href = "/api/logout"}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
          onClick={() => window.location.href = "/api/login"}
        >
          <User className="h-4 w-4 mr-1" />
          Login
        </Button>
      )}
    </div>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/chat" component={Chat} />
        <Route path="/guardian" component={GuardianCheckout} />
        <Route path="/sponsor" component={Sponsor} />
        <Route path="/handle" component={Handle} />
        <Route path="/themes" component={Themes} />
        <Route path="/careers" component={Careers} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route component={NotFound} />
      </Switch>
    </>
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
