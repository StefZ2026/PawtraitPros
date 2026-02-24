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
  ChevronDown, ChevronUp, Zap, Search
} from "lucide-react";
import { PetLimitModal } from "@/components/pet-limit-modal";
import { stylePreviewImages } from "@/lib/portrait-styles";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LogoCropDialog } from "@/components/logo-crop-dialog";
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
            onSubscriptionConfirmed();
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
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

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
      setRawImageSrc(result);
      setCropDialogOpen(true);
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
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = ""; } }} data-testid="input-logo-replace" />
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
          <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = ""; } }} data-testid="input-logo-upload" />
          <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center hover-elevate transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">Upload logo</p>
        </label>
      )}
      <p className="text-xs text-muted-foreground text-center">JPG, PNG, or WebP. You can crop after upload.</p>
      <LogoCropDialog
        open={cropDialogOpen}
        imageSrc={rawImageSrc}
        onApply={(croppedDataUrl) => {
          onLogoChange(croppedDataUrl);
          setCropDialogOpen(false);
          setRawImageSrc(null);
        }}
        onCancel={() => {
          setCropDialogOpen(false);
          setRawImageSrc(null);
        }}
      />
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

  // All Pets search + expand
  const [allPetsSearch, setAllPetsSearch] = useState("");
  const [showAllPets, setShowAllPets] = useState(false);

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
  const visitPhotoLimit = industryType === "groomer" ? 4 : 5;

  // Species-aware pack selection
  const speciesHandled = organization.speciesHandled || "dogs";
  const handlesBoth = speciesHandled === "both";
  const defaultPackSpecies = speciesHandled === "cats" ? "cat" : "dog";
  const [packSpecies, setPackSpecies] = useState<"dog" | "cat">(defaultPackSpecies);

  // Today's date
  const today = new Date().toISOString().split("T")[0];
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Daily pack selection (per species)
  const { data: dailyPack } = useQuery<any>({
    queryKey: ["/api/daily-pack", today, packSpecies, organization.id],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const orgQuery = isAdmin ? `&orgId=${organization.id}` : "";
      const res = await fetch(`/api/daily-pack?date=${today}&species=${packSpecies}${orgQuery}`, { headers });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: hasPlan,
  });

  // Packs for this species
  const { data: packs = [] } = useQuery<any[]>({
    queryKey: ["/api/packs", packSpecies],
    queryFn: async () => {
      const res = await fetch(`/api/packs?species=${packSpecies}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: hasPlan,
  });

  const selectedPackType = dailyPack?.pack_type || null;
  const selectedPack = packs.find((p: any) => p.type === selectedPackType);
  const [previewPackType, setPreviewPackType] = useState<string | null>(null);

  // Filter dogs to today's clients (checked-in today OR created today)
  const todaysDogs = useMemo(() => {
    return dogs.filter(d => {
      if ((d as any).checkedInAt === today) return true;
      const created = new Date(d.createdAt).toISOString().split("T")[0];
      return created === today;
    });
  }, [dogs, today]);

  // All Pets except today (for search/check-in)
  const allPetsExceptToday = useMemo(() => {
    return dogs.filter(d => !todaysDogs.includes(d));
  }, [dogs, todaysDogs]);

  const filteredAllPets = useMemo(() => {
    if (!allPetsSearch.trim()) return allPetsExceptToday;
    const q = allPetsSearch.toLowerCase().trim();
    return allPetsExceptToday.filter(d => {
      const name = (d.name || "").toLowerCase();
      const breed = (d.breed || "").toLowerCase();
      const phone = ((d as any).ownerPhone || "").toLowerCase();
      const email = ((d as any).ownerEmail || "").toLowerCase();
      return name.includes(q) || breed.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [allPetsExceptToday, allPetsSearch]);

  // Pet selection for batch generation
  const [selectedPetIds, setSelectedPetIds] = useState<Set<number>>(new Set());

  const readyForGeneration = todaysDogs.filter(d => d.originalPhotoUrl && !d.portrait?.generatedImageUrl);
  const generatedToday = todaysDogs.filter(d => d.portrait?.generatedImageUrl);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<number | null>(null);
  const [styleMode, setStyleMode] = useState<"one-for-all" | "individual">("one-for-all");
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null);
  const [styleAssignments, setStyleAssignments] = useState<Map<number, number>>(new Map());
  const [contactEdits, setContactEdits] = useState<Map<number, { phone: string; email: string }>>(new Map());
  const [deliverySelections, setDeliverySelections] = useState<Set<number>>(new Set());
  const [deliveryChannels, setDeliveryChannels] = useState<Map<number, { sms: boolean; email: boolean }>>(new Map());
  const [deliveryResults, setDeliveryResults] = useState<Array<{ dogId: number; sent: boolean; method: string; error?: string }> | null>(null);
  const [savingContacts, setSavingContacts] = useState(false);
  const [sendingDelivery, setSendingDelivery] = useState(false);

  // Check in a pet for today (All Pets section)
  const checkInMutation = useMutation({
    mutationFn: async (dogId: number) => {
      return apiRequest("POST", `/api/dogs/${dogId}/check-in`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({ title: "Checked in!", description: "Pet added to today's list." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Visit photos for today's dogs
  const { data: visitPhotosMap = {} } = useQuery<Record<number, any[]>>({
    queryKey: ["/api/visit-photos-today", organization.id, today],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const result: Record<number, any[]> = {};
      await Promise.all(
        todaysDogs.map(async (dog) => {
          try {
            const res = await fetch(`/api/dogs/${dog.id}/visit-photos?date=${today}`, { headers });
            if (res.ok) result[dog.id] = await res.json();
          } catch {}
        })
      );
      return result;
    },
    enabled: hasPlan && todaysDogs.length > 0,
  });

  // Upload a visit photo
  const uploadVisitPhotoMutation = useMutation({
    mutationFn: async ({ dogId, photo, caption }: { dogId: number; photo: string; caption?: string }) => {
      return apiRequest("POST", `/api/dogs/${dogId}/visit-photos`, { photo, caption });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visit-photos-today"] });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  // Delete a visit photo
  const deleteVisitPhotoMutation = useMutation({
    mutationFn: async ({ dogId, photoId }: { dogId: number; photoId: number }) => {
      return apiRequest("DELETE", `/api/dogs/${dogId}/visit-photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visit-photos-today"] });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const handleStartWizard = () => {
    setSelectedPetIds(new Set(readyForGeneration.map(d => d.id)));
    setStyleMode("one-for-all");
    setSelectedStyleId(null);
    setStyleAssignments(new Map());
    setContactEdits(new Map());
    setDeliverySelections(new Set());
    setDeliveryChannels(new Map());
    setDeliveryResults(null);
    setSavingContacts(false);
    setSendingDelivery(false);
    setWizardStep(1);
  };

  const handleExitWizard = () => {
    setWizardStep(null);
    setGenerating(false);
    setGenerationProgress(null);
    setDeliveryResults(null);
    setDeliveryChannels(new Map());
    setSendingDelivery(false);
  };

  // Set daily pack (per species)
  const setPackMutation = useMutation({
    mutationFn: async (packType: string) => {
      const body: any = { packType, species: packSpecies, date: today };
      if (isAdmin) body.organizationId = organization.id;
      return apiRequest("POST", "/api/daily-pack", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-pack"] });
      toast({ title: "Pack selected!", description: `Today's ${packSpecies === "cat" ? "cat" : "dog"} portrait pack has been set.` });
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

  // Batch generate — async with polling, wizard-aware
  const handleBatchGenerate = async () => {
    if (!selectedPackType) {
      toast({ title: "Select a pack first", description: "Choose today's pack before generating.", variant: "destructive" });
      return;
    }
    const dogIds = readyForGeneration.filter(d => selectedPetIds.has(d.id)).map(d => d.id);
    if (dogIds.length === 0) {
      toast({ title: "No pets selected", description: "Select pets with photos to generate portraits.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setGenerationProgress({ done: 0, total: dogIds.length });

    try {
      const headers = await getAuthHeaders();
      let allJobEntries: { dogId: number; jobId: string }[] = [];

      if (styleMode === "individual" && styleAssignments.size > 0) {
        // Group dogs by assigned style, one batch call per style group
        const groups = new Map<number, number[]>();
        for (const id of dogIds) {
          const sId = styleAssignments.get(id);
          if (!sId) continue;
          const list = groups.get(sId) || [];
          list.push(id);
          groups.set(sId, list);
        }
        for (const [sId, ids] of groups) {
          const res = await fetch("/api/generate-batch", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              dogIds: ids,
              packType: selectedPackType,
              styleId: sId,
              organizationId: isAdmin ? organization.id : undefined,
            }),
          });
          const data = await res.json();
          if (res.ok && data.jobIds) allJobEntries.push(...data.jobIds);
        }
      } else {
        // One style for all
        const res = await fetch("/api/generate-batch", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            dogIds,
            packType: selectedPackType,
            styleId: selectedStyleId || undefined,
            organizationId: isAdmin ? organization.id : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast({ title: "Generation failed", description: data.error, variant: "destructive" });
          setGenerating(false);
          setGenerationProgress(null);
          return;
        }
        allJobEntries = data.jobIds || [];
      }

      if (allJobEntries.length === 0) {
        toast({ title: "No portraits queued", description: "All pets were skipped.", variant: "destructive" });
        setGenerating(false);
        setGenerationProgress(null);
        return;
      }

      const totalJobs = allJobEntries.length;
      const jobIdList = allJobEntries.map(j => j.jobId);
      setGenerationProgress({ done: 0, total: totalJobs });

      // Poll until all jobs complete
      const poll = async (): Promise<void> => {
        const pollHeaders = await getAuthHeaders();
        const pollRes = await fetch(`/api/jobs?ids=${jobIdList.join(",")}`, { headers: pollHeaders });
        if (!pollRes.ok) return;
        const jobs: any[] = await pollRes.json();
        const completed = jobs.filter(j => j?.status === "completed").length;
        const failed = jobs.filter(j => j?.status === "failed").length;
        const done = completed + failed;
        setGenerationProgress({ done: completed, total: totalJobs });

        if (done >= totalJobs) {
          queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
          setGenerating(false);
          setGenerationProgress(null);
          // Auto-advance wizard to review step
          setDeliverySelections(new Set(allJobEntries.map(j => j.dogId)));
          setWizardStep(5);
          if (failed > 0) {
            toast({ title: "Batch complete", description: `${completed} portrait${completed !== 1 ? "s" : ""} created, ${failed} failed.` });
          } else {
            toast({ title: "Portraits generated!", description: `${completed} portrait${completed !== 1 ? "s" : ""} created.` });
          }
          return;
        }

        await new Promise(r => setTimeout(r, 2000));
        return poll();
      };

      await poll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setGenerating(false);
      setGenerationProgress(null);
    }
  };

  // Batch deliver

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
            <Link href={isAdmin ? `/admin/business/${organization.id}` : "/settings"}>
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
            <div className="flex items-center gap-2">
              {selectedPackType && (
                <Badge className="capitalize">{selectedPackType} Pack</Badge>
              )}
            </div>
          </div>
          {/* Species toggle for orgs that handle both */}
          {handlesBoth && (
            <div className="flex gap-1 mt-2">
              <Button
                variant={packSpecies === "dog" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => { setPackSpecies("dog"); setPreviewPackType(null); }}
              >
                <Dog className="h-4 w-4" />
                Dogs
              </Button>
              <Button
                variant={packSpecies === "cat" ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => { setPackSpecies("cat"); setPreviewPackType(null); }}
              >
                <Cat className="h-4 w-4" />
                Cats
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!selectedPackType ? (
            <div className="py-4">
              <div className="text-center mb-4">
                <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">Choose today's portrait pack</p>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {packs.map((pack: any) => (
                  <div
                    key={pack.type}
                    className="rounded-lg border-2 border-border hover:border-primary/40 transition-colors cursor-pointer p-4 text-center"
                    onClick={() => setPackMutation.mutate(pack.type)}
                  >
                    <span className="font-semibold capitalize text-base">{pack.name}</span>
                    <p className="text-xs text-muted-foreground mt-1">{pack.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground">Styles in this pack:</span>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => {
                  const orgQuery = isAdmin ? `&orgId=${organization.id}` : "";
                  apiRequest("DELETE", `/api/daily-pack?date=${today}&species=${packSpecies}${orgQuery}`).then(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/daily-pack"] });
                  });
                }}>
                  Change
                </Button>
              </div>
              {selectedPack?.styles && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedPack.styles.map((style: any) => {
                    const previewImg = stylePreviewImages[style.name];
                    return (
                      <div key={style.id} className="shrink-0 w-20 text-center">
                        <div className="w-20 h-20 rounded-lg bg-muted border overflow-hidden">
                          {previewImg ? (
                            <img src={previewImg} alt={style.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Palette className="h-6 w-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">{style.name}</p>
                      </div>
                    );
                  })}
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
                    <p className="text-xs text-muted-foreground mt-1">Optional — needed for delivery later.</p>
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
              <Link key={dog.id} href={`/pawfile/${dog.id}`}>
                <Card className="overflow-hidden group">
                  <div className="aspect-square relative bg-muted">
                    {dog.portrait?.generatedImageUrl ? (
                      <img src={dog.portrait.generatedImageUrl} alt={dog.name} className="w-full h-full object-cover object-top" draggable={false} />
                    ) : dog.originalPhotoUrl ? (
                      <img src={dog.originalPhotoUrl} alt={dog.name} className="w-full h-full object-cover object-top opacity-60" draggable={false} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {dog.species === "cat" ? <Cat className="h-12 w-12 text-muted-foreground/30" /> : <Dog className="h-12 w-12 text-muted-foreground/30" />}
                      </div>
                    )}
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
                  {/* Visit photo strip */}
                  <div className="px-2 pt-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                    <div className="flex gap-1.5 items-center overflow-x-auto">
                      {(visitPhotosMap[dog.id] || []).map((p: any) => (
                        <div key={p.id} className="relative w-9 h-9 rounded shrink-0 overflow-hidden border group/thumb">
                          <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                          <button
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm("Delete this photo?")) {
                                deleteVisitPhotoMutation.mutate({ dogId: dog.id, photoId: p.id });
                              }
                            }}
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {(visitPhotosMap[dog.id] || []).length < visitPhotoLimit && (
                        <label className="w-9 h-9 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer shrink-0 hover:border-primary/50 transition-colors">
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 20 * 1024 * 1024) {
                                toast({ title: "File too large", description: "Max 20 MB", variant: "destructive" });
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const dataUrl = ev.target?.result as string;
                                if (!dataUrl) return;
                                // Resize to max 1024px
                                const img = new window.Image();
                                img.onload = () => {
                                  let { width, height } = img;
                                  if (width > 1024 || height > 1024) {
                                    if (width > height) {
                                      height = Math.round(height * (1024 / width));
                                      width = 1024;
                                    } else {
                                      width = Math.round(width * (1024 / height));
                                      height = 1024;
                                    }
                                  }
                                  const canvas = document.createElement("canvas");
                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext("2d")!;
                                  ctx.drawImage(img, 0, 0, width, height);
                                  const resized = canvas.toDataURL("image/jpeg", 0.85);
                                  uploadVisitPhotoMutation.mutate({ dogId: dog.id, photo: resized });
                                };
                                img.src = dataUrl;
                              };
                              reader.readAsDataURL(file);
                              e.target.value = "";
                            }}
                          />
                          {uploadVisitPhotoMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </label>
                      )}
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {(visitPhotosMap[dog.id] || []).length}/{visitPhotoLimit}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 pt-1 flex items-center gap-1">
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Remove ${dog.name}?`)) onDeleteDog(dog.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* End-of-Day: Prompt (when wizard is NOT active) */}
      {selectedPackType && wizardStep === null && (readyForGeneration.length > 0 || generatedToday.length > 0) && (
        <div className="space-y-3">
          {readyForGeneration.length > 0 && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="pt-6 pb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Ready to create today's portraits?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {readyForGeneration.length} pet{readyForGeneration.length !== 1 ? "s" : ""} with photos — let's make some portraits!
                    </p>
                  </div>
                  <Button className="gap-2 shrink-0" size="lg" onClick={handleStartWizard}>
                    Let's Go
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {generatedToday.length > 0 && (
            <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      {generatedToday.length} Portrait{generatedToday.length !== 1 ? "s" : ""} Ready
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Generated earlier — ready to deliver!</p>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => {
                    setSelectedPetIds(new Set(generatedToday.map(d => d.id)));
                    setDeliverySelections(new Set(generatedToday.map(d => d.id)));
                    setDeliveryResults(null);
                    setWizardStep(6);
                  }}>
                    <Send className="h-4 w-4" />
                    Send to Clients
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* End-of-Day Wizard */}
      {wizardStep !== null && (
        <Card className="border-primary/30">
          <CardContent className="pt-6">
            {/* Progress bar */}
            <div className="flex items-center gap-1.5 mb-6">
              {[1, 2, 3, 4, 5, 6].map(step => (
                <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${step <= wizardStep ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            {/* Step 1: Select Pets */}
            {wizardStep === 1 && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Select Pets</h3>
                <p className="text-sm text-muted-foreground mb-4">Choose which pets to create portraits for.</p>

                <div className="flex items-center gap-2 mb-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPetIds(new Set(readyForGeneration.map(d => d.id)))}>Select All</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPetIds(new Set())}>Deselect All</Button>
                  <span className="text-sm text-muted-foreground ml-auto">{selectedPetIds.size} selected</span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
                  {readyForGeneration.map(dog => {
                    const isSelected = selectedPetIds.has(dog.id);
                    return (
                      <div
                        key={dog.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                        onClick={() => setSelectedPetIds(prev => {
                          const next = new Set(prev);
                          if (next.has(dog.id)) next.delete(dog.id); else next.add(dog.id);
                          return next;
                        })}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-gray-300"}`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                          {dog.originalPhotoUrl && <img src={dog.originalPhotoUrl} alt={dog.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{dog.name}</p>
                          <p className="text-xs text-muted-foreground">{dog.breed || dog.species}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center">
                  <Button variant="ghost" onClick={handleExitWizard}>Cancel</Button>
                  <Button
                    onClick={() => {
                      const selected = readyForGeneration.filter(d => selectedPetIds.has(d.id));
                      const missing = selected.filter(d => !(d as any).ownerPhone && !(d as any).ownerEmail);
                      if (missing.length > 0) {
                        const edits = new Map<number, { phone: string; email: string }>();
                        missing.forEach(d => edits.set(d.id, { phone: "", email: "" }));
                        setContactEdits(edits);
                        setWizardStep(2);
                      } else {
                        setWizardStep(3);
                      }
                    }}
                    disabled={selectedPetIds.size === 0}
                  >
                    Continue with {selectedPetIds.size} pet{selectedPetIds.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Validate Contact Info */}
            {wizardStep === 2 && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Contact Info Needed</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We need at least an email or phone for each pet so we can deliver their portrait.
                </p>

                <div className="space-y-3 mb-6">
                  {Array.from(contactEdits.entries()).map(([dogId, contact]) => {
                    const dog = readyForGeneration.find(d => d.id === dogId);
                    if (!dog) return null;
                    const hasContact = !!(contact.phone.trim() || contact.email.trim());
                    return (
                      <div key={dogId} className={`p-3 rounded-lg border ${hasContact ? "border-green-300 bg-green-50 dark:bg-green-950/20" : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                            {dog.originalPhotoUrl && <img src={dog.originalPhotoUrl} alt={dog.name} className="w-full h-full object-cover" />}
                          </div>
                          <span className="font-medium text-sm">{dog.name}</span>
                          {hasContact && <Check className="h-4 w-4 text-green-600 ml-auto" />}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Phone className="h-3 w-3" /> Phone</label>
                            <Input
                              placeholder="(555) 123-4567"
                              value={contact.phone}
                              onChange={(e) => setContactEdits(prev => {
                                const next = new Map(prev);
                                next.set(dogId, { ...contact, phone: e.target.value });
                                return next;
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Mail className="h-3 w-3" /> Email</label>
                            <Input
                              placeholder="owner@email.com"
                              value={contact.email}
                              onChange={(e) => setContactEdits(prev => {
                                const next = new Map(prev);
                                next.set(dogId, { ...contact, email: e.target.value });
                                return next;
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center">
                  <Button variant="ghost" onClick={() => setWizardStep(1)}>Back</Button>
                  <Button
                    onClick={async () => {
                      setSavingContacts(true);
                      try {
                        const headers = await getAuthHeaders();
                        for (const [dogId, contact] of contactEdits.entries()) {
                          if (contact.phone.trim() || contact.email.trim()) {
                            await fetch(`/api/dogs/${dogId}`, {
                              method: "PATCH",
                              headers: { ...headers, "Content-Type": "application/json" },
                              body: JSON.stringify({
                                ownerPhone: contact.phone.trim() || undefined,
                                ownerEmail: contact.email.trim() || undefined,
                              }),
                            });
                          }
                        }
                        queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
                        setWizardStep(3);
                      } catch (err: any) {
                        toast({ title: "Error saving contacts", description: err.message, variant: "destructive" });
                      } finally {
                        setSavingContacts(false);
                      }
                    }}
                    disabled={
                      savingContacts ||
                      Array.from(contactEdits.values()).some(c => !c.phone.trim() && !c.email.trim())
                    }
                  >
                    {savingContacts && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Choose Styles */}
            {wizardStep === 3 && (
              <div>
                <h3 className="font-semibold text-lg mb-1">Choose Styles</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  How would you like to style {selectedPetIds.size} portrait{selectedPetIds.size !== 1 ? "s" : ""}?
                </p>

                {styleMode === "one-for-all" ? (
                  /* Initial choice: Choose for me vs I'll pick */
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <button
                      className="p-6 rounded-lg border-2 border-border hover:border-primary/40 transition-colors text-center"
                      onClick={() => {
                        // Auto-assign styles: distribute across pack styles for variety
                        const styles = selectedPack?.styles || [];
                        if (styles.length === 0) return;
                        const dogs = readyForGeneration.filter(d => selectedPetIds.has(d.id));
                        const newAssignments = new Map<number, number>();
                        dogs.forEach((dog, i) => {
                          newAssignments.set(dog.id, styles[i % styles.length].id);
                        });
                        setStyleAssignments(newAssignments);
                        setStyleMode("individual");
                        // Go straight to generation
                        setWizardStep(4);
                        handleBatchGenerate();
                      }}
                    >
                      <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <span className="font-semibold text-base block">Choose for me</span>
                      <p className="text-xs text-muted-foreground mt-1">We'll pick the best style for each pet</p>
                    </button>
                    <button
                      className="p-6 rounded-lg border-2 border-border hover:border-primary/40 transition-colors text-center"
                      onClick={() => { setStyleMode("individual"); setStyleAssignments(new Map()); }}
                    >
                      <Palette className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <span className="font-semibold text-base block">I'll pick</span>
                      <p className="text-xs text-muted-foreground mt-1">Choose a style for each pet yourself</p>
                    </button>
                  </div>
                ) : (
                  /* Individual style picker per pet */
                  <>
                    {selectedPack?.styles && (
                      <div className="space-y-3 mb-4">
                        {readyForGeneration.filter(d => selectedPetIds.has(d.id)).map(dog => {
                          const assignedId = styleAssignments.get(dog.id);
                          return (
                            <div key={dog.id} className="p-3 rounded-lg border">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                                  {dog.originalPhotoUrl && <img src={dog.originalPhotoUrl} alt={dog.name} className="w-full h-full object-cover" />}
                                </div>
                                <span className="font-medium text-sm">{dog.name}</span>
                                {assignedId && <Check className="h-4 w-4 text-green-600 ml-auto" />}
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {selectedPack.styles.map((style: any) => {
                                  const previewImg = stylePreviewImages[style.name];
                                  const isChosen = assignedId === style.id;
                                  return (
                                    <button
                                      key={style.id}
                                      className={`w-16 text-center rounded border-2 p-0.5 transition-colors ${isChosen ? "border-primary bg-primary/10" : "border-transparent hover:border-primary/30"}`}
                                      onClick={() => setStyleAssignments(prev => { const next = new Map(prev); next.set(dog.id, style.id); return next; })}
                                    >
                                      <div className="w-full aspect-square rounded bg-muted overflow-hidden">
                                        {previewImg ? (
                                          <img src={previewImg} alt={style.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Palette className="h-3 w-3 text-muted-foreground/30" />
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{style.name}</p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <Button variant="ghost" onClick={() => { setStyleMode("one-for-all"); setStyleAssignments(new Map()); }}>Back</Button>
                      <Button
                        onClick={() => { setWizardStep(4); handleBatchGenerate(); }}
                        disabled={readyForGeneration.filter(d => selectedPetIds.has(d.id)).some(d => !styleAssignments.has(d.id))}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Portraits
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Generating */}
            {wizardStep === 4 && (
              <div className="text-center py-8">
                <Loader2 className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
                <h3 className="font-semibold text-lg mb-1">Creating Portraits</h3>
                <p className="text-sm text-muted-foreground">This usually takes about 10 seconds per pet.</p>
                {generationProgress && (
                  <div className="max-w-xs mx-auto mt-4">
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, (generationProgress.done / generationProgress.total) * 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      {generationProgress.done} of {generationProgress.total} complete
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {wizardStep === 5 && (() => {
              const generatedInWizard = todaysDogs.filter(d => d.portrait?.generatedImageUrl && selectedPetIds.has(d.id));
              if (generatedInWizard.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading portraits...</p>
                  </div>
                );
              }
              return (
                <div>
                  <h3 className="font-semibold text-lg mb-1">Review Portraits</h3>
                  <p className="text-sm text-muted-foreground mb-4">Check the results. You can redo any you'd like to change.</p>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {generatedInWizard.map(dog => (
                      <div key={dog.id} className="rounded-lg border overflow-hidden">
                        <div className="aspect-square bg-muted">
                          <img src={dog.portrait!.generatedImageUrl!} alt={dog.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{dog.name}</p>
                            <p className="text-xs text-muted-foreground">{dog.portrait?.style?.name || "Portrait"}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => {
                              window.location.href = isAdmin ? `/create?org=${organization.id}&dog=${dog.id}` : `/create?dog=${dog.id}`;
                            }}
                          >
                            <Sparkles className="h-3 w-3" />
                            Redo
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <Button variant="ghost" onClick={() => setWizardStep(3)}>Back</Button>
                    <Button onClick={() => {
                      const generatedIds = todaysDogs
                        .filter(d => d.portrait?.generatedImageUrl && selectedPetIds.has(d.id))
                        .map(d => d.id);
                      setDeliverySelections(new Set(generatedIds));
                      setWizardStep(6);
                    }}>
                      <Check className="h-4 w-4 mr-2" />
                      Looks Good — Send
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Step 6: Send */}
            {wizardStep === 6 && (
              <div>
                {deliveryResults ? (
                  /* Post-send summary */
                  <div>
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      Delivery Complete
                    </h3>
                    <div className="space-y-2 mt-4 mb-6">
                      {deliveryResults.map(result => {
                        const dog = todaysDogs.find(d => d.id === result.dogId);
                        if (!dog) return null;
                        const ownerLabel = (dog as any).ownerName || dog.name + "'s owner";
                        return (
                          <div key={result.dogId} className={`flex items-center gap-3 p-3 rounded-lg border ${result.sent ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                            <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                              {dog.portrait?.generatedImageUrl && <img src={dog.portrait.generatedImageUrl} alt={dog.name} className="w-full h-full object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              {result.sent ? (
                                <p className="text-sm">
                                  {result.method.includes("email") && result.method.includes("sms") ? (
                                    <><strong>Email + SMS</strong> sent to {ownerLabel}</>
                                  ) : result.method.includes("email") ? (
                                    <><strong>Email</strong> sent to {ownerLabel}</>
                                  ) : result.method.includes("sms") ? (
                                    <><strong>SMS</strong> sent to {ownerLabel}</>
                                  ) : (
                                    <>Link created for {ownerLabel}</>
                                  )}
                                </p>
                              ) : (
                                <p className="text-sm text-red-600">Failed to deliver to {ownerLabel}</p>
                              )}
                            </div>
                            {result.sent ? <Check className="h-4 w-4 text-green-500 shrink-0" /> : <X className="h-4 w-4 text-red-500 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleExitWizard}>Done</Button>
                    </div>
                  </div>
                ) : (
                  /* Pre-send: show delivery methods per pet */
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Send to Clients</h3>
                    <p className="text-sm text-muted-foreground mb-4">Review delivery methods and deselect any you'd like to skip.</p>

                    <div className="space-y-3 mb-6">
                      {todaysDogs.filter(d => d.portrait?.generatedImageUrl && selectedPetIds.has(d.id)).map(dog => {
                        const isDeliverySelected = deliverySelections.has(dog.id);
                        const phone = (dog as any).ownerPhone;
                        const email = (dog as any).ownerEmail;
                        // Initialize channels if not set
                        if (!deliveryChannels.has(dog.id) && isDeliverySelected) {
                          const init = { sms: !!phone, email: !!email };
                          deliveryChannels.set(dog.id, init);
                        }
                        const channels = deliveryChannels.get(dog.id) || { sms: !!phone, email: !!email };
                        return (
                          <div
                            key={dog.id}
                            className={`p-3 rounded-lg border-2 transition-colors ${isDeliverySelected ? "border-primary bg-primary/5" : "border-border opacity-50"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer ${isDeliverySelected ? "bg-primary border-primary" : "border-gray-300"}`}
                                onClick={() => setDeliverySelections(prev => {
                                  const next = new Set(prev);
                                  if (next.has(dog.id)) next.delete(dog.id); else next.add(dog.id);
                                  return next;
                                })}
                              >
                                {isDeliverySelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                                <img src={dog.portrait!.generatedImageUrl!} alt={dog.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">{dog.name}</p>
                                {(dog as any).ownerName && <p className="text-xs text-muted-foreground">{(dog as any).ownerName}</p>}
                              </div>
                            </div>
                            {isDeliverySelected && (
                              <div className="ml-8 mt-2 flex flex-wrap gap-2">
                                {phone && (
                                  <button
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${channels.sms ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                                    onClick={() => {
                                      const updated = { ...channels, sms: !channels.sms };
                                      if (!updated.sms && !updated.email) return; // keep at least one
                                      setDeliveryChannels(prev => { const next = new Map(prev); next.set(dog.id, updated); return next; });
                                    }}
                                  >
                                    <Phone className="h-3 w-3" />
                                    SMS: {phone}
                                  </button>
                                )}
                                {email && (
                                  <button
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${channels.email ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                                    onClick={() => {
                                      const updated = { ...channels, email: !channels.email };
                                      if (!updated.sms && !updated.email) return; // keep at least one
                                      setDeliveryChannels(prev => { const next = new Map(prev); next.set(dog.id, updated); return next; });
                                    }}
                                  >
                                    <Mail className="h-3 w-3" />
                                    Email: {email}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center">
                      <Button variant="ghost" onClick={() => setWizardStep(5)}>Back</Button>
                      <Button
                        disabled={deliverySelections.size === 0 || sendingDelivery}
                        className="gap-2"
                        onClick={async () => {
                          const dogIds = Array.from(deliverySelections);
                          if (dogIds.length === 0) return;
                          setSendingDelivery(true);
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
                              setDeliveryResults(data.results || []);
                            } else {
                              toast({ title: "Error", description: data.error || "Delivery failed", variant: "destructive" });
                            }
                          } catch (err: any) {
                            toast({ title: "Error", description: err.message, variant: "destructive" });
                          } finally {
                            setSendingDelivery(false);
                          }
                        }}
                      >
                        {sendingDelivery && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        <Send className="h-4 w-4" />
                        Send to {deliverySelections.size} Client{deliverySelections.size !== 1 ? "s" : ""}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* All Pets — searchable, expandable */}
      {allPetsExceptToday.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">All Pets ({allPetsExceptToday.length})</h2>
            <div className="flex gap-2">
              {organization.slug && (
                <Button variant="ghost" size="sm" className="gap-1" asChild>
                  <Link href={`/business/${organization.slug}`}><Eye className="h-3.5 w-3.5" /> Showcase</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, breed, phone, or email..."
              value={allPetsSearch}
              onChange={(e) => { setAllPetsSearch(e.target.value); setShowAllPets(false); }}
              className="pl-9"
            />
            {allPetsSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => { setAllPetsSearch(""); setShowAllPets(false); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Results */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredAllPets.slice(0, showAllPets ? undefined : 8).map((dog) => (
              <div key={dog.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                <Link href={`/pawfile/${dog.id}`} className="flex items-center gap-3 min-w-0 flex-1">
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
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => checkInMutation.mutate(dog.id)}
                  disabled={checkInMutation.isPending}
                >
                  <LogIn className="h-3 w-3" />
                  Check In
                </Button>
              </div>
            ))}
          </div>

          {/* No results */}
          {allPetsSearch && filteredAllPets.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pets found matching "{allPetsSearch}"
            </p>
          )}

          {/* Show more / show less */}
          {filteredAllPets.length > 8 && (
            <div className="text-center mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPets(!showAllPets)}
              >
                {showAllPets
                  ? "Show less"
                  : `Show all ${filteredAllPets.length} pets`}
              </Button>
            </div>
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
