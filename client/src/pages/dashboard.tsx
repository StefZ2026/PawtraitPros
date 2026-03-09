import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminFloatingButton } from "@/components/admin-button";
import {
  Dog, Cat, Plus, LogOut, Shield,
  Heart, LogIn, Settings,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { CreateOrgForm } from "./create-business";
import { OrgDashboard, DogWithPortrait, OrgWithStats } from "./org-dashboard";
import type { Organization } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, isAdmin, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(() => {
    const orgParam = new URLSearchParams(window.location.search).get('org');
    return orgParam ? parseInt(orgParam) : null;
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'success') {
      const sessionId = urlParams.get('session_id');
      const planParam = urlParams.get('plan');

      const onSubscriptionConfirmed = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
        toast({ title: "Subscription active!", description: "Your plan is now active. Let's get you set up!" });
        const returnOrgId = urlParams.get('orgId');
        if (returnOrgId) {
          navigate(`/admin/business/${returnOrgId}`);
        } else {
          navigate("/onboarding");
        }
      };

      const orgIdParam = urlParams.get('orgId');
      const testModeParam = urlParams.get('testMode');
      if (sessionId && planParam) {
        const confirmBody: any = { sessionId, planId: parseInt(planParam) };
        if (orgIdParam) confirmBody.orgId = parseInt(orgIdParam);
        if (testModeParam === 'true') confirmBody.testMode = true;
        apiRequest("POST", "/api/stripe/confirm-checkout", confirmBody)
          .then(onSubscriptionConfirmed)
          .catch((err) => {
            console.error("[stripe] Checkout confirmation failed:", err);
            toast({ title: "Subscription confirmation failed", description: "Please contact support if your plan isn't active.", variant: "destructive" });
            queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
          });
      } else {
        onSubscriptionConfirmed();
      }
    }
  }, []);

  const { data: myOrganization, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: ["/api/my-organization"],
    enabled: isAuthenticated,
  });

  const { data: allOrgs = [] } = useQuery<OrgWithStats[]>({
    queryKey: ["/api/admin/organizations"],
    enabled: isAuthenticated && isAdmin,
    staleTime: 0,
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin && !orgLoading) {
      if (selectedOrgId) return;
      navigate("/admin");
    }
  }, [isAuthenticated, authLoading, isAdmin, orgLoading, selectedOrgId, navigate]);

  const selectedOrg = isAdmin
    ? allOrgs.find(o => o.id === selectedOrgId) || null
    : myOrganization || null;

  const dogsQueryKey = isAdmin && selectedOrgId
    ? ["/api/admin/organizations", selectedOrgId, "dogs"]
    : ["/api/my-dogs"];

  const dogsQueryUrl = isAdmin && selectedOrgId
    ? `/api/admin/organizations/${selectedOrgId}/dogs`
    : "/api/my-dogs";

  const { data: dogs = [], isLoading: dogsLoading } = useQuery<DogWithPortrait[]>({
    queryKey: dogsQueryKey,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(dogsQueryUrl, { headers });
      if (!res.ok) throw new Error("Failed to fetch dogs");
      return res.json();
    },
    enabled: isAuthenticated && (isAdmin ? !!selectedOrgId : !!myOrganization),
  });

  const [logoData, setLogoData] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      websiteUrl: "",
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; websiteUrl: string }) => {
      const res = await apiRequest("POST", "/api/my-organization", { ...data, logoUrl: logoData });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
      setShowCreateForm(false);
      toast({ title: "Organization created!", description: "Now choose a plan to get started." });
      navigate(data?.id ? `/choose-plan/${data.id}` : "/choose-plan");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteDogMutation = useMutation({
    mutationFn: async (dogId: number) => {
      await apiRequest("DELETE", `/api/dogs/${dogId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dogsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Pet removed", description: "The pet has been permanently removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const archiveDogMutation = useMutation({
    mutationFn: async ({ dogId, archive }: { dogId: number; archive: boolean }) => {
      await apiRequest("PATCH", `/api/dogs/${dogId}`, { isAvailable: !archive });
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: dogsQueryKey });
      toast({ title: archive ? "Pet archived" : "Pet restored", description: archive ? "Pet moved to archived. Portraits are preserved." : "Pet is back on your active list." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const activeOrg = isAdmin ? (selectedOrgId ? allOrgs.find(o => o.id === selectedOrgId) : null) : myOrganization;
  const needsIndustryType = activeOrg && !(activeOrg as any).industryType;
  const needsPlanSelection = activeOrg && !activeOrg.planId && activeOrg.subscriptionStatus === "inactive";
  const hasBaseline = activeOrg?.name && activeOrg?.speciesHandled && activeOrg?.planId;
  const needsOnboarding = activeOrg && activeOrg.planId && !activeOrg.onboardingCompleted && !hasBaseline;

  useEffect(() => {
    if (needsIndustryType && isAuthenticated && activeOrg) {
      navigate(isAdmin ? `/onboarding/${activeOrg.id}` : "/onboarding");
    } else if (needsPlanSelection && isAuthenticated && activeOrg) {
      navigate(`/choose-plan/${activeOrg.id}`);
    } else if (needsOnboarding && isAuthenticated && activeOrg) {
      navigate(isAdmin ? `/onboarding/${activeOrg.id}` : "/onboarding");
    }
  }, [needsIndustryType, needsPlanSelection, needsOnboarding, isAuthenticated, activeOrg, navigate]);

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

  const showWelcome = !isAuthenticated || (!orgLoading && !selectedOrg && !showCreateForm && !(isAdmin && !selectedOrgId));
  const showOrgDashboard = isAuthenticated && !!selectedOrg && !needsPlanSelection;

  const trialDaysRemaining = selectedOrg?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(selectedOrg.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary" data-testid="link-home-dashboard">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" data-testid="link-gallery-dashboard" asChild>
              <Link href="/gallery">Gallery</Link>
            </Button>
            {isAuthenticated && selectedOrg && (
              <Button variant="ghost" size="sm" className="gap-1" asChild>
                <Link href={isAdmin ? `/admin/business/${selectedOrg.id}` : "/settings"}>
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
              </Button>
            )}
            {isAdmin && selectedOrgId && (
              <Button variant="outline" size="sm" className="gap-1" data-testid="button-back-to-admin" asChild>
                <Link href="/admin">
                  <Shield className="h-3 w-3" />
                  Admin Panel
                </Link>
              </Button>
            )}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                  <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline">
                  {user?.firstName || user?.email?.split("@")[0]}
                </span>
                <Button variant="ghost" size="icon" data-testid="button-logout" onClick={() => logout()} disabled={isLoggingOut}>
                    <LogOut className="h-4 w-4" />
                </Button>
                <ThemeToggle />
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {orgLoading ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : showCreateForm && isAuthenticated ? (
          <CreateOrgForm
            form={form}
            mutation={createOrgMutation}
            onBack={() => setShowCreateForm(false)}
            logoData={logoData}
            onLogoChange={setLogoData}
          />
        ) : showWelcome ? (
          <WelcomePage
            isAuthenticated={isAuthenticated}
            onCreateNew={() => {
              if (!isAuthenticated) {
                window.location.href = "/login";
              } else {
                setShowCreateForm(true);
              }
            }}
          />
        ) : showOrgDashboard ? (
          <OrgDashboard
            organization={selectedOrg}
            dogs={dogs}
            dogsLoading={dogsLoading}
            trialDaysRemaining={trialDaysRemaining}
            isAdmin={isAdmin}
            onDeleteDog={(dogId) => {
              if (confirm("Are you sure? This permanently deletes the pet and all portraits.")) {
                deleteDogMutation.mutate(dogId);
              }
            }}
            onArchiveDog={(dogId, archive) => {
              archiveDogMutation.mutate({ dogId, archive });
            }}
          />
        ) : null}
      </div>

      <AdminFloatingButton />
    </div>
  );
}

function WelcomePage({ isAuthenticated, onCreateNew }: {
  isAuthenticated: boolean;
  onCreateNew: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto pt-8">
      <Card>
        <CardHeader className="text-center">
          <Heart className="h-14 w-14 mx-auto mb-4 text-primary" />
          <CardTitle className="text-2xl font-serif">Welcome to Pawtrait Pros</CardTitle>
          <CardDescription className="text-base">
            Create stunning AI portraits to delight your clients and showcase your work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticated ? (
            <>
              <p className="text-center text-muted-foreground text-sm">
                You're logged in but don't have a business set up yet. Create one to get started, or log in with a different account if your business is already set up.
              </p>
              <div className="grid gap-3">
                <Button className="w-full gap-2" onClick={onCreateNew} data-testid="button-create-business">
                  <Plus className="h-4 w-4" />
                  Create Your Business
                </Button>
                <a href="/login" className="block">
                  <Button variant="outline" className="w-full gap-2" data-testid="button-switch-account">
                    <LogIn className="h-4 w-4" />
                    Log In With a Different Account
                  </Button>
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="text-center text-muted-foreground text-sm">
                Log in to manage your pets and portraits, or create a new business profile.
              </p>
              <div className="grid gap-3">
                <a href="/login" className="block">
                  <Button className="w-full gap-2" data-testid="button-login-business">
                    <LogIn className="h-4 w-4" />
                    Log In to Your Account
                  </Button>
                </a>
                <Button variant="outline" className="w-full gap-2" onClick={onCreateNew} data-testid="button-create-business">
                  <Plus className="h-4 w-4" />
                  Create Your Business
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
