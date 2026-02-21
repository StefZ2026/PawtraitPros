import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminFloatingButton } from "@/components/admin-button";
import { ImageUpload } from "@/components/image-upload";
import {
  Dog, Cat, Plus, LogOut, Building2, Image, Crown,
  Sparkles, ExternalLink, LayoutDashboard, Shield,
  ArrowLeft, Heart, Trash2, LogIn, Eye, Upload, X, Settings,
  Calendar, Palette, Send, Check, Camera, Loader2, Phone, Mail,
  ChevronDown, ChevronUp, Zap
} from "lucide-react";
import { PetLimitModal } from "@/components/pet-limit-modal";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Organization, Dog as DogType } from "@shared/schema";

interface DogWithPortrait extends DogType {
  portrait?: {
    generatedImageUrl?: string;
    style?: { name: string };
  };
}

interface OrgWithStats extends Organization {
  dogCount?: number;
  portraitCount?: number;
}

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
          navigate(`/admin/rescue/${returnOrgId}`);
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
          .catch(onSubscriptionConfirmed);
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
      toast({ title: "Pet removed", description: "The pet has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const activeOrg = isAdmin ? (selectedOrgId ? allOrgs.find(o => o.id === selectedOrgId) : null) : myOrganization;
  const needsPlanSelection = activeOrg && !activeOrg.planId && activeOrg.subscriptionStatus === "inactive";
  const hasBaseline = activeOrg?.name && activeOrg?.speciesHandled && activeOrg?.planId;
  const needsOnboarding = activeOrg && activeOrg.planId && !activeOrg.onboardingCompleted && !hasBaseline;

  useEffect(() => {
    if (needsPlanSelection && isAuthenticated && activeOrg) {
      navigate(`/choose-plan/${activeOrg.id}`);
    } else if (needsOnboarding && isAuthenticated && activeOrg) {
      navigate(isAdmin ? `/onboarding/${activeOrg.id}` : "/onboarding");
    }
  }, [needsPlanSelection, needsOnboarding, isAuthenticated, activeOrg, navigate]);

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
              if (confirm("Are you sure you want to remove this dog?")) {
                deleteDogMutation.mutate(dogId);
              }
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
                <Button className="w-full gap-2" onClick={onCreateNew} data-testid="button-create-rescue">
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
                  <Button className="w-full gap-2" data-testid="button-login-rescue">
                    <LogIn className="h-4 w-4" />
                    Log In to Your Account
                  </Button>
                </a>
                <Button variant="outline" className="w-full gap-2" onClick={onCreateNew} data-testid="button-create-rescue">
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

interface Plan {
  id: number;
  name: string;
  description: string | null;
  priceMonthly: number;
  dogsLimit: number | null;
  monthlyPortraitCredits: number | null;
  overagePriceCents: number | null;
  trialDays: number | null;
  stripePriceId: string | null;
  isActive: boolean;
}


function LogoUpload({ logoData, onLogoChange }: { logoData: string | null; onLogoChange: (data: string | null) => void }) {
  const { toast } = useToast();
  const handleFile = (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please use JPG, PNG, or WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;
      const img = new window.Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        onLogoChange(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-medium text-center">Logo (optional)</span>
      {logoData ? (
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={logoData} alt="Organization logo" data-testid="img-org-logo-preview" />
            <AvatarFallback><Building2 className="h-8 w-8" /></AvatarFallback>
          </Avatar>
          <div className="flex items-center justify-center gap-2 mt-2">
            <label>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} data-testid="input-logo-replace" />
              <Button asChild variant="outline" size="sm" className="gap-1 cursor-pointer">
                <span><Upload className="h-3 w-3" /> Replace</span>
              </Button>
            </label>
            <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => onLogoChange(null)} data-testid="button-clear-logo">
              <X className="h-3 w-3" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer">
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} data-testid="input-logo-upload" />
          <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center hover-elevate transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">Upload logo</p>
        </label>
      )}
    </div>
  );
}

function CreateOrgForm({ form, mutation, onBack, logoData, onLogoChange }: {
  form: any;
  mutation: any;
  onBack: () => void;
  logoData: string | null;
  onLogoChange: (data: string | null) => void;
}) {
  return (
    <div className="max-w-xl mx-auto">
      <Button variant="ghost" className="gap-1 mb-4" onClick={onBack} data-testid="button-back-to-welcome">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <Card>
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>Set Up Your Business</CardTitle>
          <CardDescription>
            Set up your business to start creating beautiful portraits for your clients' pets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUpload logoData={logoData} onLogoChange={onLogoChange} />
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data: any) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Organization name is required" }}
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Paws & Suds Grooming" {...field} data-testid="input-org-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your business..."
                        {...field}
                        data-testid="input-org-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Website URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourbusiness.com" {...field} data-testid="input-org-website" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
                data-testid="button-create-org"
              >
                {mutation.isPending ? "Getting Started..." : "Get Started"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function OrgDashboard({ organization, dogs, dogsLoading, trialDaysRemaining, isAdmin, onDeleteDog }: {
  organization: Organization | OrgWithStats;
  dogs: DogWithPortrait[];
  dogsLoading: boolean;
  trialDaysRemaining: number;
  isAdmin: boolean;
  onDeleteDog: (dogId: number) => void;
}) {
  const { toast } = useToast();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ done: number; total: number } | null>(null);

  // Quick-add client form state
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState<"dog" | "cat">("dog");
  const [newPetOwnerPhone, setNewPetOwnerPhone] = useState("");
  const [newPetOwnerEmail, setNewPetOwnerEmail] = useState("");
  const [newPetPhoto, setNewPetPhoto] = useState<string | null>(null);

  const { data: plans } = useQuery<Plan[]>({ queryKey: ["/api/plans"] });
  const currentPlan = plans?.find(p => p.id === organization.planId);
  const petLimit = (organization as any).petLimit ?? currentPlan?.dogsLimit ?? null;
  const basePetLimit = (organization as any).basePetLimit ?? currentPlan?.dogsLimit ?? null;
  const additionalPetSlots = (organization as any).additionalPetSlots ?? 0;
  const maxAdditionalSlots = (organization as any).maxAdditionalSlots ?? 5;
  const isPaidPlan = (organization as any).isPaidPlan ?? (currentPlan ? currentPlan.priceMonthly > 0 : false);
  const petCount = (organization as any).petCount ?? dogs.length;
  const atPetLimit = petLimit != null && petCount >= petLimit;
  const isCanceled = organization.subscriptionStatus === "canceled";
  const trialEndDate = organization.trialEndsAt
    ? new Date(organization.trialEndsAt)
    : organization.createdAt ? new Date(new Date(organization.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const isTrialExpired = organization.subscriptionStatus === "trial" && trialEndDate && trialEndDate < new Date();
  const planName = isCanceled ? "Canceled" : isTrialExpired ? "Trial Expired" : currentPlan?.name || (organization.subscriptionStatus === "trial" ? "Free Trial" : "No Plan");
  const hasPlan = !!organization.planId && organization.subscriptionStatus !== "inactive" && !isCanceled && !isTrialExpired;

  const industryType = (organization as any).industryType || "groomer";

  // Today's date
  const today = new Date().toISOString().split("T")[0];
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Daily pack selection
  const { data: dailyPack } = useQuery<any>({
    queryKey: ["/api/daily-pack", today],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/daily-pack?date=${today}`, { headers });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: hasPlan,
  });

  // Packs for this org's industry
  const { data: packs = [] } = useQuery<any[]>({
    queryKey: ["/api/packs", industryType],
    queryFn: async () => {
      const res = await fetch(`/api/packs?industryType=${industryType}&species=${newPetSpecies}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: hasPlan,
  });

  const selectedPackType = dailyPack?.pack_type || null;
  const selectedPack = packs.find((p: any) => p.type === selectedPackType);

  // Filter dogs to today's clients
  const todaysDogs = useMemo(() => {
    return dogs.filter(d => {
      const created = new Date(d.createdAt).toISOString().split("T")[0];
      return created === today;
    });
  }, [dogs, today]);

  const readyForGeneration = todaysDogs.filter(d => d.originalPhotoUrl && !d.portrait?.generatedImageUrl);
  const generatedToday = todaysDogs.filter(d => d.portrait?.generatedImageUrl);

  // Set daily pack
  const setPackMutation = useMutation({
    mutationFn: async (packType: string) => {
      return apiRequest("POST", "/api/daily-pack", { packType, date: today });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-pack"] });
      toast({ title: "Pack selected!", description: "Today's portrait pack has been set." });
    },
  });

  // Quick add client
  const addClientMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        name: newPetName,
        species: newPetSpecies,
        breed: "Mixed", // default — can be edited later
        ownerPhone: newPetOwnerPhone || undefined,
        ownerEmail: newPetOwnerEmail || undefined,
        originalPhotoUrl: newPetPhoto || undefined,
      };
      if (isAdmin) body.organizationId = organization.id;
      return apiRequest("POST", "/api/dogs", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      setShowAddClient(false);
      setNewPetName("");
      setNewPetOwnerPhone("");
      setNewPetOwnerEmail("");
      setNewPetPhoto(null);
      toast({ title: "Client added!", description: `${newPetName} has been added to today's list.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Batch generate
  const handleBatchGenerate = async (autoSelect: boolean) => {
    if (!selectedPackType) {
      toast({ title: "Select a pack first", description: "Choose today's pack before generating.", variant: "destructive" });
      return;
    }
    const dogIds = readyForGeneration.map(d => d.id);
    if (dogIds.length === 0) {
      toast({ title: "No pets ready", description: "Add pets with photos first.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setGenerationProgress({ done: 0, total: dogIds.length });

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/generate-batch", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          dogIds,
          packType: selectedPackType,
          autoSelect,
          organizationId: isAdmin ? organization.id : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerationProgress({ done: data.totalGenerated, total: dogIds.length });
        queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
        toast({ title: "Portraits generated!", description: `${data.totalGenerated} portraits created.` });
      } else {
        toast({ title: "Generation failed", description: data.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
      setGenerationProgress(null);
    }
  };

  // Batch deliver
  const handleBatchDeliver = async () => {
    const dogIds = generatedToday.map(d => d.id);
    if (dogIds.length === 0) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/deliver-batch", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          dogIds,
          organizationId: isAdmin ? organization.id : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Links sent!", description: `Sent to ${data.totalSent} client(s).` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {organization.logoUrl ? (
              <AvatarImage src={organization.logoUrl} alt={organization.name} />
            ) : null}
            <AvatarFallback className="bg-primary/10">
              <Heart className="h-6 w-6 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-serif font-bold" data-testid="text-org-name">{organization.name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">{industryType}</Badge>
              <Badge variant={organization.subscriptionStatus === "active" ? "default" : "secondary"} className="text-xs">
                {planName}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowAccountDetails(!showAccountDetails)} className="gap-1">
            {showAccountDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Account
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href={isAdmin ? `/admin/rescue/${organization.id}` : "/settings"}>
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Collapsible account details */}
      {showAccountDetails && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Dog className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className={`text-2xl font-bold ${atPetLimit ? "text-destructive" : ""}`}>{petCount}{petLimit ? ` / ${petLimit}` : ""}</p>
                  <p className="text-sm text-muted-foreground">{petLimit ? "Pets Used" : "Total Pets"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Image className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{organization.portraitsUsedThisMonth || 0}{currentPlan?.monthlyPortraitCredits ? ` / ${currentPlan.monthlyPortraitCredits}` : ""}</p>
                  <p className="text-sm text-muted-foreground">Monthly Credits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Crown className="h-5 w-5 text-primary" /></div>
                <div>
                  <Badge variant={organization.subscriptionStatus === "active" ? "default" : "secondary"}>{planName}</Badge>
                  {organization.subscriptionStatus === "trial" && trialDaysRemaining > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">{trialDaysRemaining} days left</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 1: Today's Pack */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{todayLabel}</CardTitle>
            </div>
            {selectedPackType && (
              <Badge className="capitalize">{selectedPackType} Pack</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedPackType ? (
            <div className="text-center py-4">
              <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium mb-4">Choose today's portrait pack</p>
              <div className="flex flex-wrap justify-center gap-3">
                {packs.map((pack: any) => (
                  <Button
                    key={pack.type}
                    variant="outline"
                    className="gap-2 h-auto py-3 px-5 flex-col"
                    onClick={() => setPackMutation.mutate(pack.type)}
                    disabled={setPackMutation.isPending}
                  >
                    <span className="font-semibold capitalize">{pack.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">{pack.description}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Styles in this pack:</span>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => {
                  // Allow changing pack
                  queryClient.invalidateQueries({ queryKey: ["/api/daily-pack"] });
                }}>
                  Change
                </Button>
              </div>
              {selectedPack?.styles && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedPack.styles.map((style: any) => (
                    <div key={style.id} className="shrink-0 w-20 text-center">
                      <div className="w-20 h-20 rounded-lg bg-muted border overflow-hidden">
                        {style.previewImageUrl ? (
                          <img src={style.previewImageUrl} alt={style.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Palette className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{style.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: Today's Clients */}
      <div>
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Today's Clients
            <Badge variant="secondary">{todaysDogs.length}</Badge>
          </h2>
          <div className="flex items-center gap-2">
            {hasPlan && !atPetLimit && (
              <Button className="gap-2" size="sm" onClick={() => setShowAddClient(true)}>
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link href={isAdmin ? `/create?org=${organization.id}` : "/create"}>
                Full Editor
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Add Client Drawer */}
        {showAddClient && (
          <Card className="mb-4 border-primary/30">
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Pet Name *</label>
                    <Input placeholder="Bella" value={newPetName} onChange={(e) => setNewPetName(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={newPetSpecies === "dog" ? "default" : "outline"}
                      size="sm"
                      className="gap-1 flex-1"
                      onClick={() => setNewPetSpecies("dog")}
                    >
                      <Dog className="h-4 w-4" /> Dog
                    </Button>
                    <Button
                      variant={newPetSpecies === "cat" ? "default" : "outline"}
                      size="sm"
                      className="gap-1 flex-1"
                      onClick={() => setNewPetSpecies("cat")}
                    >
                      <Cat className="h-4 w-4" /> Cat
                    </Button>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Owner Phone</label>
                    <Input placeholder="(555) 123-4567" value={newPetOwnerPhone} onChange={(e) => setNewPetOwnerPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 flex items-center gap-1"><Mail className="h-3 w-3" /> Owner Email</label>
                    <Input placeholder="owner@email.com" value={newPetOwnerEmail} onChange={(e) => setNewPetOwnerEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium mb-1 block">Photo *</label>
                  <ImageUpload onImageSelect={(img) => setNewPetPhoto(img)} currentImage={newPetPhoto || undefined} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => addClientMutation.mutate()}
                  disabled={!newPetName || !newPetPhoto || addClientMutation.isPending}
                  className="gap-2"
                >
                  {addClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Client
                </Button>
                <Button variant="ghost" onClick={() => setShowAddClient(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {dogsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : todaysDogs.length === 0 ? (
          <Card className="py-8">
            <CardContent className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-medium mb-1">No clients yet today</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your first client to get started</p>
              {hasPlan && !atPetLimit && (
                <Button className="gap-2" onClick={() => setShowAddClient(true)}>
                  <Plus className="h-4 w-4" />
                  Add First Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {todaysDogs.map((dog) => (
              <Card key={dog.id} className="overflow-hidden group">
                <Link href={`/pawfile/${dog.id}`}>
                  <div className="aspect-square relative bg-muted">
                    {dog.portrait?.generatedImageUrl ? (
                      <img src={dog.portrait.generatedImageUrl} alt={dog.name} className="w-full h-full object-cover" draggable={false} />
                    ) : dog.originalPhotoUrl ? (
                      <img src={dog.originalPhotoUrl} alt={dog.name} className="w-full h-full object-cover opacity-60" draggable={false} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {dog.species === "cat" ? <Cat className="h-12 w-12 text-muted-foreground/30" /> : <Dog className="h-12 w-12 text-muted-foreground/30" />}
                      </div>
                    )}
                    {/* Status badge */}
                    <div className="absolute top-2 right-2">
                      {dog.portrait?.generatedImageUrl ? (
                        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : dog.originalPhotoUrl ? (
                        <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow">
                          <Camera className="h-4 w-4 text-white" />
                        </div>
                      ) : null}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                      <h3 className="font-semibold text-white text-sm">{dog.name}</h3>
                    </div>
                  </div>
                </Link>
                <div className="p-2 flex items-center gap-1">
                  {(dog as any).ownerPhone && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 truncate">
                      <Phone className="h-3 w-3" /> {(dog as any).ownerPhone}
                    </span>
                  )}
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      if (confirm(`Remove ${dog.name}?`)) onDeleteDog(dog.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: End-of-Day Actions */}
      {todaysDogs.length > 0 && selectedPackType && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  End-of-Day Actions
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {readyForGeneration.length > 0
                    ? `${readyForGeneration.length} pet(s) ready for portraits`
                    : generatedToday.length > 0
                      ? `${generatedToday.length} portrait(s) generated — ready to send!`
                      : "All done for today!"}
                </p>
                {generationProgress && (
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden w-48">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(generationProgress.done / generationProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{generationProgress.done} / {generationProgress.total}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {readyForGeneration.length > 0 && (
                  <>
                    <Button
                      className="gap-2"
                      onClick={() => handleBatchGenerate(true)}
                      disabled={generating}
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Auto-Generate All
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      asChild
                    >
                      <Link href={isAdmin ? `/create?org=${organization.id}` : "/create"}>
                        <Palette className="h-4 w-4" />
                        Choose Styles Manually
                      </Link>
                    </Button>
                  </>
                )}
                {generatedToday.length > 0 && (
                  <Button variant="outline" className="gap-2" onClick={handleBatchDeliver}>
                    <Send className="h-4 w-4" />
                    Send to {generatedToday.length} Client(s)
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Pets (collapsed, expandable) */}
      {dogs.length > todaysDogs.length && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">All Pets ({dogs.length})</h2>
            <div className="flex gap-2">
              {organization.slug && (
                <Button variant="ghost" size="sm" className="gap-1" asChild>
                  <Link href={`/rescue/${organization.slug}`}><Eye className="h-3.5 w-3.5" /> Showcase</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {dogs.filter(d => !todaysDogs.includes(d)).slice(0, 8).map((dog) => (
              <Link key={dog.id} href={`/pawfile/${dog.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                    {dog.portrait?.generatedImageUrl ? (
                      <img src={dog.portrait.generatedImageUrl} alt={dog.name} className="w-full h-full object-cover" />
                    ) : dog.originalPhotoUrl ? (
                      <img src={dog.originalPhotoUrl} alt={dog.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {dog.species === "cat" ? <Cat className="h-5 w-5 text-muted-foreground/30" /> : <Dog className="h-5 w-5 text-muted-foreground/30" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{dog.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{dog.breed}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {dogs.length > todaysDogs.length + 8 && (
            <p className="text-sm text-muted-foreground text-center mt-3">
              + {dogs.length - todaysDogs.length - 8} more pets
            </p>
          )}
        </div>
      )}

      {/* Pet limit modal */}
      <PetLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        petCount={petCount}
        petLimit={petLimit}
        basePetLimit={basePetLimit ?? petLimit}
        additionalPetSlots={additionalPetSlots}
        maxAdditionalSlots={maxAdditionalSlots}
        isPaidPlan={isPaidPlan}
        hasStripeSubscription={!!(organization as any).hasActiveSubscription}
        orgId={organization.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
