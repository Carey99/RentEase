import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import SigninPage from "@/pages/signin";
import OnboardingPage from "@/pages/onboarding";
import LandlordDashboard from "@/pages/landlord-dashboard";
import TenantDashboard from "@/pages/tenant-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/signin" component={SigninPage} />
      <Route path="/onboarding/:role" component={OnboardingPage} />
      <Route path="/dashboard/landlord" component={LandlordDashboard} />
      <Route path="/dashboard/tenant" component={TenantDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
