import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dog, Cat, Sparkles, Check, Zap, ArrowRight, Plus, ArrowLeft, Clock, FlaskConical } from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

interface SubscriptionInfo {
  currentPlanId: number | null;
  pendingPlanId: number | null;
  pendingPlanName: string | null;
  renewalDate: string | null;
  subscriptionStatus: string | null;
  hasStripeSubscription: boolean;
}

export default function ChoosePlan() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId ? parseInt(params.orgId) : null;
  const [, navigate] = useLocation();
  const { isLoading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const isAdminFlow = orgId !== null && isAdmin;

  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [testMode, setTestMode] = useState(false);

  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: myOrg } = useQuery<any>({
    queryKey: ["/api/my-organization"],
    enabled: !isAdminFlow && isAuthenticated,
  });

  const effectiveOrgId = orgId || myOrg?.id || null;

  const { data: subInfo } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription-info", effectiveOrgId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/subscription-info?orgId=${effectiveOrgId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch subscription info");
      return res.json();
    },
    enabled: !!effectiveOrgId && isAuthenticated,
  });

  const isExistingSubscriber = subInfo?.hasStripeSubscription || (subInfo?.subscriptionStatus === "active");
  const currentPlanId = subInfo?.currentPlanId || myOrg?.planId;

  const activePlans = (plans || []).filter(p => p.isActive).sort((a, b) => a.priceMonthly - b.priceMonthly);
  const freePlan = activePlans.find(p => p.priceMonthly === 0);
  const hasUsedFreeTrial = myOrg?.hasUsedFreeTrial === true;

  const navigateNext = () => {
    if (isAdminFlow && orgId) {
      navigate(`/admin/rescue/${orgId}`);
    } else {
      navigate("/onboarding");
    }
  };

  const selectPlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const url = isAdminFlow && orgId
        ? `/api/admin/organizations/${orgId}/select-plan`
        : "/api/select-plan";
      const res = await apiRequest("POST", url, { planId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
      if (isAdminFlow && orgId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations", orgId] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        toast({ title: "Plan selected!", description: "Plan has been set for this business." });
      } else {
        toast({ title: "Plan activated!", description: "You're all set. Let's complete your business details." });
      }
      navigateNext();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: number) => {
      const body: any = { planId, testMode };
      if (effectiveOrgId) {
        body.orgId = effectiveOrgId;
      }
      const res = await apiRequest("POST", "/api/stripe/checkout", body);
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const res = await apiRequest("POST", "/api/stripe/change-plan", { planId, orgId: effectiveOrgId });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.action === 'upgrade') {
        checkoutMutation.mutate(data.planId);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-info", effectiveOrgId] });

      if (data.renewalDate) {
        const renewDate = new Date(data.renewalDate).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric'
        });
        toast({
          title: "Plan change scheduled",
          description: `Your plan will renew as ${data.newPlanName} on ${renewDate}.`,
        });
      }
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelChangeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/cancel-plan-change", { orgId: effectiveOrgId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-info", effectiveOrgId] });
      toast({ title: "Plan change canceled", description: "Your current plan will continue unchanged." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (isExistingSubscriber && currentPlanId && currentPlanId !== plan.id && plan.priceMonthly > 0) {
      changePlanMutation.mutate(plan.id);
    } else if (plan.priceMonthly === 0) {
      selectPlanMutation.mutate(plan.id);
    } else {
      checkoutMutation.mutate(plan.id);
    }
  };

  const handleStartFreeTrial = () => {
    if (freePlan) {
      selectPlanMutation.mutate(freePlan.id);
    }
  };

  const isMutating = selectPlanMutation.isPending || checkoutMutation.isPending || changePlanMutation.isPending;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Dog className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  const currentPlan = activePlans.find(p => p.id === currentPlanId);
  const pendingPlanName = subInfo?.pendingPlanName;
  const renewalDate = subInfo?.renewalDate
    ? new Date(subInfo.renewalDate).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary" data-testid="link-home-choose-plan">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
          </Link>
          <div className="flex items-center gap-2">
            {currentPlanId && (
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-to-dashboard" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            )}
            <div className="flex items-center gap-1.5">
              <Switch
                id="test-mode"
                checked={testMode}
                onCheckedChange={setTestMode}
                data-testid="switch-test-mode"
              />
              <Label htmlFor="test-mode" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                <FlaskConical className="h-3 w-3" />
                Test
              </Label>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Sparkles className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-3xl font-serif font-bold" data-testid="text-choose-plan-title">
              {isExistingSubscriber ? "Change Your Plan" : "Choose Your Plan"}
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-base" data-testid="text-choose-plan-subtitle">
              {isExistingSubscriber
                ? "Select a new plan below. Upgrades take effect immediately. Downgrades take effect at your next billing cycle."
                : "Start with a free trial or pick the plan that fits your business. You can upgrade or change plans anytime."}
            </p>
          </div>

          {pendingPlanName && renewalDate && (
            <Card className="border-primary/50 max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium" data-testid="text-pending-plan-change">
                      Your plan will renew as {pendingPlanName} on {renewalDate}.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      If you need to make any changes, please do so before {renewalDate}.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1"
                      onClick={() => cancelChangeMutation.mutate()}
                      disabled={cancelChangeMutation.isPending}
                      data-testid="button-cancel-plan-change"
                    >
                      {cancelChangeMutation.isPending ? "Canceling..." : "Keep Current Plan"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {activePlans.map((plan) => {
                const isFree = plan.priceMonthly === 0;
                const isPopular = plan.name === "Professional" || plan.name === "Pro";
                const isCurrent = plan.id === currentPlanId;
                const isPending = plan.id === subInfo?.pendingPlanId;
                const isDowngrade = currentPlan && plan.priceMonthly < currentPlan.priceMonthly && plan.priceMonthly > 0;
                const isUpgrade = currentPlan && plan.priceMonthly > currentPlan.priceMonthly;

                let buttonLabel = "";
                let buttonDisabled = false;

                if (isCurrent) {
                  buttonLabel = "Current Plan";
                  buttonDisabled = true;
                } else if (isPending) {
                  buttonLabel = "Change Pending";
                  buttonDisabled = true;
                } else if (isFree && hasUsedFreeTrial) {
                  buttonLabel = "Trial Used";
                  buttonDisabled = true;
                } else if (isFree) {
                  buttonLabel = "Start Free Trial";
                } else if (isExistingSubscriber && isUpgrade) {
                  buttonLabel = "Upgrade";
                } else if (isExistingSubscriber && isDowngrade) {
                  buttonLabel = "Downgrade";
                } else {
                  buttonLabel = "Subscribe";
                }

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col ${isPopular && !isCurrent ? "border-primary" : ""} ${isCurrent ? "border-primary ring-2 ring-primary/20" : ""}`}
                    data-testid={`card-plan-${plan.id}`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Your Plan</Badge>
                      </div>
                    )}
                    {isPopular && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-lg" data-testid={`text-plan-name-${plan.id}`}>{plan.name}</CardTitle>
                      <div className="mt-2">
                        {isFree ? (
                          <div className="text-3xl font-bold" data-testid={`text-plan-price-${plan.id}`}>Free</div>
                        ) : (
                          <div>
                            <span className="text-3xl font-bold" data-testid={`text-plan-price-${plan.id}`}>${(plan.priceMonthly / 100).toFixed(0)}</span>
                            <span className="text-muted-foreground">/mo</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-3">
                      {plan.description && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-plan-description-${plan.id}`}>{plan.description}</p>
                      )}
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>Up to {plan.dogsLimit} pets</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{plan.monthlyPortraitCredits || 20} portrait credits/mo</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>4 free edits per portrait</span>
                        </li>
                        {isFree && plan.trialDays ? (
                          <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{plan.trialDays}-day free trial</span>
                          </li>
                        ) : null}
                        {!isFree && plan.overagePriceCents ? (
                          <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>${(plan.overagePriceCents / 100).toFixed(0)} per extra portrait</span>
                          </li>
                        ) : null}
                        {!isFree && (
                          <li className="flex items-start gap-2">
                            <Plus className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>Add up to 5 extra pets ($3/pet/mo)</span>
                          </li>
                        )}
                        {!isFree && (
                          <li className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>Priority support</span>
                          </li>
                        )}
                      </ul>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                      <Button
                        className="w-full gap-1"
                        variant={isCurrent ? "secondary" : isPopular ? "default" : "outline"}
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isMutating || buttonDisabled}
                        data-testid={`button-select-plan-${plan.id}`}
                      >
                        {isMutating ? "Please wait..." : (
                          <>
                            {!buttonDisabled && isUpgrade && <Zap className="h-4 w-4" />}
                            {buttonLabel}
                          </>
                        )}
                      </Button>
                      {isFree && hasUsedFreeTrial && (
                        <p className="text-xs text-muted-foreground text-center" data-testid="text-trial-used">
                          Your organization has already used its free trial
                        </p>
                      )}
                      {isExistingSubscriber && isDowngrade && !isPending && (
                        <p className="text-xs text-muted-foreground text-center">
                          Takes effect at next billing cycle
                        </p>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground" data-testid="text-custom-pricing">
            Need more pets? <a href="mailto:support@pawtraitpros.com" className="underline hover-elevate" data-testid="link-contact-pricing">Contact us</a> for custom pricing.
          </p>

          {!isExistingSubscriber && !currentPlanId && (
            <div className="text-center">
              <Button variant="ghost" className="gap-2" onClick={() => setShowSkipDialog(true)} data-testid="button-skip-plan">
                Skip for now <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thanks for stopping by!</AlertDialogTitle>
            <AlertDialogDescription>
              {hasUsedFreeTrial
                ? "We'd love to help you showcase your work beautifully. When you're ready, come back and choose a plan that fits your business."
                : "We'd love to help you showcase your work beautifully. Whenever you're ready, come back and give Pawtrait Pros a try — your free trial will be waiting for you."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate("/")} data-testid="button-goodbye-continue">
              Got it
            </AlertDialogCancel>
            {!hasUsedFreeTrial && (
              <AlertDialogAction onClick={handleStartFreeTrial} data-testid="button-start-free-trial">
                Actually, start my Free Trial
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
