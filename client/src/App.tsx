import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AccessGate } from "@/components/access-gate";
import { Footer } from "@/components/footer";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Create from "@/pages/create";
import Gallery from "@/pages/gallery";
import DogProfile from "@/pages/dog-profile";
import Dashboard from "@/pages/dashboard";
import Styles from "@/pages/styles";
import Admin from "@/pages/admin";
import RescueInfo from "@/pages/rescue-info";
import RescueShowcase from "@/pages/rescue-showcase";
import ChoosePlan from "@/pages/choose-plan";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import SmsOptIn from "@/pages/sms-opt-in";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/rescue/:id" component={RescueInfo} />
      <Route path="/choose-plan" component={ChoosePlan} />
      <Route path="/choose-plan/:orgId" component={ChoosePlan} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/onboarding/:orgId" component={Onboarding} />
      <Route path="/create" component={Create} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/styles" component={Styles} />
      <Route path="/pawfile/:id" component={DogProfile} />
      <Route path="/settings" component={RescueInfo} />
      <Route path="/rescue/:slug" component={RescueShowcase} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/sms-opt-in" component={SmsOptIn} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && target.classList.contains("protected-image")) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="pawtrait-pals-theme">
        <TooltipProvider>
          <AccessGate>
            <Toaster />
            <Router />
            <Footer />
          </AccessGate>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
