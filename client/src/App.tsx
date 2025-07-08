import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Chat from "@/pages/chat";
import GuardianCheckout from "@/pages/guardian-checkout";
import Sponsor from "@/pages/sponsor";
import Handle from "@/pages/handle";
import Themes from "@/pages/themes";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route path="/guardian" component={GuardianCheckout} />
      <Route path="/sponsor" component={Sponsor} />
      <Route path="/handle" component={Handle} />
      <Route path="/themes" component={Themes} />
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
