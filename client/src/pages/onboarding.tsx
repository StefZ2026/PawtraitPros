import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dog, Cat, Heart, Upload, MapPin, Globe,
  Mail, ArrowRight, ArrowLeft, PawPrint,
  Check, Sparkles, PartyPopper, Zap, Plus,
  Scissors, Building2, Sun, Bell, MessageSquare, Smartphone,
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { NextdoorIcon } from "@/components/nextdoor-icon";
import { LogoCropDialog } from "@/components/logo-crop-dialog";
import type { Organization, SubscriptionPlan } from "@shared/schema";

type Step = "welcome" | "industry" | "logo" | "species" | "contact" | "notifications" | "social" | "location" | "billing" | "plan" | "finish";

const STEPS: Step[] = ["welcome", "industry", "logo", "species", "contact", "notifications", "social", "location", "billing", "plan", "finish"];

type AddressPrefix = "location" | "billing";
type AddressField = "Street" | "City" | "State" | "Zip" | "Country";

type FormData = {
  industryType: string;
  speciesHandled: string;
  notificationMode: string;
  websiteUrl: string;
  contactEmail: string;
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  socialNextdoor: string;
  locationStreet: string;
  locationCity: string;
  locationState: string;
  locationZip: string;
  locationCountry: string;
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  billingSameAsLocation: boolean;
  billingLater: boolean;
};

const INDUSTRY_OPTIONS = [
  {
    value: "groomer",
    label: "Grooming",
    description: "Capture the perfect 'after' shot",
    icon: <Scissors className="h-10 w-10 text-primary" />,
    captureMode: "hero" as const,
  },
  {
    value: "boarding",
    label: "Boarding",
    description: "Share candid moments while they're away",
    icon: <Building2 className="h-10 w-10 text-primary" />,
    captureMode: "batch" as const,
  },
  {
    value: "daycare",
    label: "Daycare",
    description: "Daily snapshots that keep owners smiling",
    icon: <Sun className="h-10 w-10 text-primary" />,
    captureMode: "batch" as const,
  },
];

const SPECIES_OPTIONS = [
  { value: "dogs", label: "Dogs Only", icon: <Dog className="h-10 w-10 text-primary" /> },
  { value: "cats", label: "Cats Only", icon: <Cat className="h-10 w-10 text-primary" /> },
  { value: "both", label: "Both", icon: (
    <div className="flex items-center gap-1">
      <Dog className="h-8 w-8 text-primary" />
      <Cat className="h-8 w-8 text-primary" />
    </div>
  )},
];

function addressPayload(readFrom: AddressPrefix, data: FormData, saveAs: AddressPrefix = readFrom) {
  return {
    [`${saveAs}Street`]: data[`${readFrom}Street`] || null,
    [`${saveAs}City`]: data[`${readFrom}City`] || null,
    [`${saveAs}State`]: data[`${readFrom}State`] || null,
    [`${saveAs}Zip`]: data[`${readFrom}Zip`] || null,
    [`${saveAs}Country`]: data[`${readFrom}Country`] || null,
  };
}

function AddressFields({
  prefix,
  values,
  onChange,
}: {
  prefix: AddressPrefix;
  values: Record<AddressField, string>;
  onChange: (field: `${AddressPrefix}${AddressField}`, value: string) => void;
}) {
  const testSlug = prefix === "location" ? "" : "billing-";
  const tid = (f: string) => `input-onboarding-${testSlug}${f.toLowerCase()}`;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-muted-foreground" /> Street Address
        </label>
        <Input
          placeholder="123 Main Street"
          value={values.Street}
          onChange={(e) => onChange(`${prefix}Street`, e.target.value)}
          data-testid={tid("street")}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium mb-1.5 block">City</label>
          <Input
            placeholder="City"
            value={values.City}
            onChange={(e) => onChange(`${prefix}City`, e.target.value)}
            data-testid={tid("city")}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">State</label>
          <Input
            placeholder="State"
            value={values.State}
            onChange={(e) => onChange(`${prefix}State`, e.target.value)}
            data-testid={tid("state")}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">ZIP</label>
          <Input
            placeholder="ZIP"
            value={values.Zip}
            onChange={(e) => onChange(`${prefix}Zip`, e.target.value)}
            data-testid={tid("zip")}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Country</label>
        <Input
          placeholder="United States"
          value={values.Country}
          onChange={(e) => onChange(`${prefix}Country`, e.target.value)}
          data-testid={tid("country")}
        />
      </div>
    </div>
  );
}

function StepNavigation({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  backTestId,
  nextTestId,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  backTestId: string;
  nextTestId: string;
}) {
  return (
    <div className="flex items-center justify-between pt-4">
      <Button variant="ghost" className="gap-1" onClick={onBack} data-testid={backTestId}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <Button className="gap-2" onClick={onNext} disabled={nextDisabled} data-testid={nextTestId}>
        {nextLabel} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function resizeLogoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function getAddressValues(prefix: AddressPrefix, data: FormData): Record<AddressField, string> {
  return {
    Street: data[`${prefix}Street`],
    City: data[`${prefix}City`],
    State: data[`${prefix}State`],
    Zip: data[`${prefix}Zip`],
    Country: data[`${prefix}Country`],
  };
}

export default function Onboarding() {
  const params = useParams<{ orgId: string }>();
  const adminOrgId = params.orgId ? parseInt(params.orgId) : null;
  const [, navigate] = useLocation();
  const { isLoading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const isAdminFlow = !!adminOrgId && isAdmin;

  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    industryType: "",
    speciesHandled: "",
    notificationMode: "both",
    websiteUrl: "",
    contactEmail: "",
    socialFacebook: "",
    socialInstagram: "",
    socialTwitter: "",
    socialNextdoor: "",
    locationStreet: "",
    locationCity: "",
    locationState: "",
    locationZip: "",
    locationCountry: "",
    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    billingCountry: "",
    billingSameAsLocation: true,
    billingLater: false,
  });
  const [initialized, setInitialized] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const apiBase = isAdminFlow ? `/api/admin/organizations/${adminOrgId}` : "/api/my-organization";
  const orgQueryKey: any[] = isAdminFlow ? ["/api/admin/organizations", adminOrgId] : ["/api/my-organization"];

  const { data: ownerOrg, isLoading: ownerOrgLoading } = useQuery<Organization>({
    queryKey: ["/api/my-organization"],
    enabled: isAuthenticated && !isAdminFlow,
  });

  const { data: adminOrg, isLoading: adminOrgLoading } = useQuery<any>({
    queryKey: ["/api/admin/organizations", adminOrgId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/organizations/${adminOrgId}`, { headers });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated && isAdminFlow,
  });

  const org = isAdminFlow ? adminOrg : ownerOrg;
  const orgLoading = isAdminFlow ? adminOrgLoading : ownerOrgLoading;
  const effectiveOrgId = isAdminFlow ? adminOrgId : (ownerOrg as any)?.id || null;

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"],
    enabled: isAuthenticated,
  });

  const activePlans = (plans || []).filter(p => p.isActive).sort((a, b) => a.priceMonthly - b.priceMonthly);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [authLoading, isAuthenticated]);

  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    if (!org) return;
    if (org.onboardingCompleted) {
      if (isAdminFlow) {
        navigate(`/admin/business/${adminOrgId}`);
      } else {
        navigate("/dashboard");
      }
    }
  }, [org, navigate, isAdminFlow, adminOrgId]);

  // Auto-fill industry from edition landing page (stored in sessionStorage)
  useEffect(() => {
    const storedEdition = sessionStorage.getItem("pawtrait-pros-edition");
    if (storedEdition && ["groomer", "boarding", "daycare"].includes(storedEdition)) {
      setFormData((prev: FormData) => prev.industryType ? prev : { ...prev, industryType: storedEdition });
      sessionStorage.removeItem("pawtrait-pros-edition");
    }
  }, []);

  useEffect(() => {
    if (!org || initialized) return;

    setFormData((prev) => ({
      ...prev,
      industryType: (org as any).industryType || prev.industryType || "",
      speciesHandled: org.speciesHandled || "",
      notificationMode: (org as any).notificationMode || "both",
      websiteUrl: org.websiteUrl || "",
      contactEmail: org.contactEmail || "",
      socialFacebook: org.socialFacebook || "",
      socialInstagram: org.socialInstagram || "",
      socialTwitter: org.socialTwitter || "",
      socialNextdoor: org.socialNextdoor || "",
      locationStreet: org.locationStreet || "",
      locationCity: org.locationCity || "",
      locationState: org.locationState || "",
      locationZip: org.locationZip || "",
      locationCountry: org.locationCountry || "",
      billingStreet: org.billingStreet || "",
      billingCity: org.billingCity || "",
      billingState: org.billingState || "",
      billingZip: org.billingZip || "",
      billingCountry: org.billingCountry || "",
    }));

    if (org.logoUrl) {
      setLogoPreview(org.logoUrl);
    }

    const hasIndustry = Boolean((org as any).industryType);
    const hasSpecies = Boolean(org.speciesHandled);
    const hasContact = Boolean(org.websiteUrl || org.contactEmail);
    const hasSocial = Boolean(org.socialFacebook || org.socialInstagram || org.socialTwitter || org.socialNextdoor);
    const hasLocation = Boolean(org.locationStreet);
    const hasBilling = Boolean(org.billingStreet);
    const hasPlan = Boolean(org.planId);

    const alreadyStarted = hasIndustry || hasSpecies || hasContact || hasLocation || hasBilling || Boolean(org.logoUrl);
    setIsResuming(alreadyStarted);

    let startStep: Step = "welcome";
    if (hasSpecies && hasContact && hasLocation && hasBilling && hasPlan) {
      startStep = "finish";
    } else if (hasSpecies && hasContact && hasLocation && hasBilling) {
      startStep = "plan";
    } else if (hasSpecies && hasContact && hasLocation) {
      startStep = "billing";
    } else if (hasSpecies && hasContact && (hasSocial || hasLocation)) {
      startStep = "location";
    } else if (hasSpecies && hasContact) {
      startStep = "social";
    } else if (hasSpecies) {
      startStep = "contact";
    } else if (hasIndustry) {
      startStep = "logo";
    }

    setCurrentStep(startStep);
    setInitialized(true);
  }, [org, initialized]);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("PATCH", apiBase, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgQueryKey });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const selectPlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const url = isAdminFlow
        ? `/api/admin/organizations/${adminOrgId}/select-plan`
        : "/api/select-plan";
      const res = await apiRequest("POST", url, { planId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgQueryKey });
      if (isAdminFlow) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      }
      toast({ title: "Plan selected!", description: "Your business is ready to go." });
      goNext();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planId: number) => {
      const body: any = { planId };
      if (effectiveOrgId) body.orgId = effectiveOrgId;
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

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (plan.priceMonthly === 0) {
      selectPlanMutation.mutate(plan.id);
    } else {
      checkoutMutation.mutate(plan.id);
    }
  };

  const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (authLoading || orgLoading || !currentStep) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Dog className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!org) {
    if (isAdminFlow) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
    return null;
  }

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  const goNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex]);
  };

  const goBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) setCurrentStep(STEPS[prevIndex]);
  };

  const saveAndNext = (data: Record<string, any>) => {
    updateMutation.mutate(data, { onSuccess: goNext });
  };

  const saveIndustryAndNext = () => {
    if (!formData.industryType) {
      toast({ title: "Please select one", description: "Let us know what type of business you run.", variant: "destructive" });
      return;
    }
    const option = INDUSTRY_OPTIONS.find(o => o.value === formData.industryType);
    saveAndNext({
      industryType: formData.industryType,
      captureMode: option?.captureMode || "hero",
      deliveryMode: "receipt",
    });
  };

  const saveSpeciesAndNext = () => {
    if (!formData.speciesHandled) {
      toast({ title: "Please select one", description: "Let us know which animals your business works with.", variant: "destructive" });
      return;
    }
    saveAndNext({ speciesHandled: formData.speciesHandled });
  };

  const saveBillingAndNext = () => {
    if (formData.billingSameAsLocation) {
      saveAndNext(addressPayload("location", formData, "billing"));
    } else if (formData.billingLater) {
      goNext();
    } else {
      saveAndNext(addressPayload("billing", formData));
    }
  };

  const finishOnboarding = (destination: "create" | "settings" | "admin") => {
    setFinishing(true);
    updateMutation.mutate({ onboardingCompleted: true }, {
      onSuccess: () => {
        if (destination === "admin") {
          navigate(`/admin/business/${adminOrgId}`);
        } else if (destination === "create") {
          navigate(isAdminFlow ? `/create?org=${adminOrgId}` : "/create");
        } else {
          navigate(isAdminFlow ? `/admin/business/${adminOrgId}` : "/settings");
        }
      },
      onError: () => setFinishing(false),
    });
  };

  const hasContactData = Boolean(formData.websiteUrl || formData.contactEmail);
  const hasLocationData = Boolean(formData.locationStreet);
  const hasPlan = Boolean(org.planId);
  const isPlanMutating = selectPlanMutation.isPending || checkoutMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Getting started</span>
            <span className="text-xs text-muted-foreground">{stepIndex + 1} of {STEPS.length}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden" data-testid="progress-bar">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {currentStep === "welcome" && (
          <Card data-testid="step-welcome">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="inline-flex p-4 rounded-full bg-primary/10">
                <PartyPopper className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-serif font-bold" data-testid="text-welcome-title">
                  {isResuming
                    ? `Welcome back, ${org.name}!`
                    : `Welcome! We're so glad to see you, ${org.name}!`}
                </h1>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {isResuming
                    ? "We noticed there are a few things you didn't fill in last time. Let's finish getting you set up — it'll only take a moment."
                    : "Let's get your business set up so you can start creating beautiful portraits for your clients' pets."}
                </p>
              </div>
              {!isResuming && (
                <p className="text-sm text-muted-foreground">This will only take a minute or two.</p>
              )}
              <Button className="gap-2" onClick={goNext} data-testid="button-get-started">
                {isResuming ? "Let's Finish Up" : "Let's Go"} <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === "industry" && (
          <Card data-testid="step-industry">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-serif font-bold" data-testid="text-industry-title">
                  What type of business do you run?
                </h2>
                <p className="text-muted-foreground">
                  This helps us tailor the experience — from the styles we show to how photos are captured.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {INDUSTRY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`flex flex-col items-center gap-3 p-6 rounded-md border-2 transition-colors cursor-pointer ${
                      formData.industryType === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => updateField("industryType", option.value)}
                    data-testid={`button-industry-${option.value}`}
                  >
                    {option.icon}
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                  </button>
                ))}
              </div>

              <StepNavigation
                onBack={goBack}
                onNext={saveIndustryAndNext}
                nextLabel="Continue"
                nextDisabled={updateMutation.isPending || !formData.industryType}
                backTestId="button-back-industry"
                nextTestId="button-next-industry"
              />
            </CardContent>
          </Card>
        )}

        {currentStep === "logo" && (
          <Card data-testid="step-logo">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-serif font-bold" data-testid="text-logo-title">
                  {org.logoUrl && !logoPreview ? "Your current logo" : logoPreview ? "Looking good!" : "Upload your business logo"}
                </h2>
                <p className="text-muted-foreground">
                  {org.logoUrl && !logoPreview
                    ? "This is the logo we have on file. You can keep it or upload a new one."
                    : "Your logo appears on pawfiles, customer portals, and everything your clients see. It's what makes it yours."}
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  {logoPreview ? (
                    <AvatarImage src={logoPreview} alt="Logo preview" />
                  ) : org.logoUrl ? (
                    <AvatarImage src={org.logoUrl} alt={org.name} />
                  ) : null}
                  <AvatarFallback className="text-2xl bg-primary/10">
                    <Heart className="h-12 w-12 text-primary" />
                  </AvatarFallback>
                </Avatar>

                <label htmlFor="onboarding-logo-upload">
                  <Button variant="outline" className="gap-2" asChild>
                    <span>
                      <Upload className="h-4 w-4" />
                      {logoPreview || org.logoUrl ? "Change Logo" : "Upload Logo"}
                    </span>
                  </Button>
                </label>
                <input
                  id="onboarding-logo-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                  data-testid="input-onboarding-logo"
                />
                {logoPreview && logoPreview !== org.logoUrl && (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" /> New logo ready
                  </Badge>
                )}
                {org.logoUrl && !logoPreview && (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" /> Logo on file
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. 256x256px recommended, max 5MB</p>
                <p className="text-xs text-muted-foreground">You'll be able to crop and resize after uploading.</p>

                <LogoCropDialog
                  open={cropDialogOpen}
                  imageSrc={rawImageSrc}
                  onApply={(croppedDataUrl) => {
                    setLogoPreview(croppedDataUrl);
                    setCropDialogOpen(false);
                    setRawImageSrc(null);
                  }}
                  onCancel={() => {
                    setCropDialogOpen(false);
                    setRawImageSrc(null);
                  }}
                />
              </div>

              <StepNavigation
                onBack={goBack}
                onNext={() => {
                  const newLogo = logoPreview && logoPreview !== org.logoUrl;
                  newLogo ? saveAndNext({ logoUrl: logoPreview }) : goNext();
                }}
                nextLabel={logoPreview && logoPreview !== org.logoUrl ? "Save & Continue" : org.logoUrl ? "Looks Good" : "Upload to Continue"}
                nextDisabled={updateMutation.isPending || (!logoPreview && !org.logoUrl)}
                backTestId="button-back-logo"
                nextTestId="button-next-logo"
              />
            </CardContent>
          </Card>
        )}

        {currentStep === "species" && (
          <Card data-testid="step-species">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-serif font-bold" data-testid="text-species-title">
                  {org.speciesHandled ? "Confirm your species" : "What kind of animals does your business work with?"}
                </h2>
                <p className="text-muted-foreground">
                  {org.speciesHandled
                    ? "We have this on file. Feel free to change it if needed."
                    : "This helps us tailor the experience for your organization."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {SPECIES_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`flex flex-col items-center gap-3 p-6 rounded-md border-2 transition-colors cursor-pointer ${
                      formData.speciesHandled === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => updateField("speciesHandled", option.value)}
                    data-testid={`button-species-${option.value}`}
                  >
                    {option.icon}
                    <span className="font-medium text-sm">{option.label}</span>
                  </button>
                ))}
              </div>

              <StepNavigation
                onBack={goBack}
                onNext={saveSpeciesAndNext}
                nextLabel="Continue"
                nextDisabled={updateMutation.isPending || !formData.speciesHandled}
                backTestId="button-back-species"
                nextTestId="button-next-species"
              />
            </CardContent>
          </Card>
        )}

        {currentStep === "contact" && (
          <Card data-testid="step-contact">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-serif font-bold" data-testid="text-contact-title">
                  {hasContactData ? "Your contact info" : "How can clients reach your business?"}
                </h2>
                <p className="text-muted-foreground">
                  {hasContactData
                    ? "Here's what we have. Feel free to update anything."
                    : "We'll include this on your profile so clients know how to get in touch. You can always update these later."}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-muted-foreground" /> Website
                  </label>
                  <Input
                    placeholder="https://www.yourbusiness.com"
                    value={formData.websiteUrl}
                    onChange={(e) => updateField("websiteUrl", e.target.value)}
                    data-testid="input-onboarding-website"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-muted-foreground" /> Contact Email
                  </label>
                  <Input
                    placeholder="info@yourbusiness.com"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => updateField("contactEmail", e.target.value)}
                    data-testid="input-onboarding-email"
                  />
                </div>
              </div>

              <StepNavigation
                onBack={goBack}
                onNext={() => saveAndNext({
                  websiteUrl: formData.websiteUrl || null,
                  contactEmail: formData.contactEmail || null,
                })}
                nextLabel={hasContactData ? "Save & Continue" : "Skip for Now"}
                nextDisabled={updateMutation.isPending}
                backTestId="button-back-contact"
                nextTestId="button-next-contact"
              />
            </CardContent>
          </Card>
        )}

        {currentStep === "notifications" && (
          <Card data-testid="step-notifications">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-serif font-bold" data-testid="text-notifications-title">
                  How should we notify your customers?
                </h2>
                <p className="text-muted-foreground">
                  When a pet's portrait is ready and you send it out, how would you like customers to receive the link?
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  { value: "both", label: "Email & Text", description: "Send both for maximum reach", icon: <Bell className="h-8 w-8 text-primary" /> },
                  { value: "sms", label: "Text Message Only", description: "Quick and direct via SMS", icon: <Smartphone className="h-8 w-8 text-primary" /> },
                  { value: "email", label: "Email Only", description: "Professional email notification", icon: <Mail className="h-8 w-8 text-primary" /> },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      formData.notificationMode === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => updateField("notificationMode", opt.value)}
                    data-testid={`button-notification-${opt.value}`}
                  >
                    {opt.icon}
                    <div>
                      <p className="font-semibold">{opt.label}</p>
                      <p className="text-sm text-muted-foreground">{opt.description}</p>
                    </div>
                    {formData.notificationMode === opt.value && (
                      <Check className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              <StepNavigation
                onBack={goBack}
                onNext={() => saveAndNext({ notificationMode: formData.notificationMode })}
                nextLabel="Save & Continue"
                nextDisabled={updateMutation.isPending}
                backTestId="button-back-notifications"
                nextTestId="button-next-notifications"
              />
            </CardContent>
          </Card>
        )}

        {currentStep === "social" && (
          <Card data-testid="step-social">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-serif font-bold" data-testid="text-social-title">
                  Social Media Profiles
                </h2>
                <p className="text-muted-foreground">
                  Help clients follow your business on social media. All fields are optional.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <SiFacebook className="h-4 w-4 text-muted-foreground" /> Facebook
                  </label>
                  <Input
                    placeholder="https://facebook.com/yourbusiness"
                    value={formData.socialFacebook}
                    onChange={(e) => updateField("socialFacebook", e.target.value)}
                    data-testid="input-onboarding-facebook"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <SiInstagram className="h-4 w-4 text-muted-foreground" /> Instagram
                  </label>
                  <Input
                    placeholder="https://instagram.com/yourbusiness"
                    value={formData.socialInstagram}
                    onChange={(e) => updateField("socialInstagram", e.target.value)}
                    data-testid="input-onboarding-instagram"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <FaXTwitter className="h-4 w-4 text-muted-foreground" /> X (Twitter)
                  </label>
                  <Input
                    placeholder="https://x.com/yourbusiness"
                    value={formData.socialTwitter}
                    onChange={(e) => updateField("socialTwitter", e.target.value)}
                    data-testid="input-onboarding-twitter"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <NextdoorIcon className="h-4 w-4 text-muted-foreground" /> Nextdoor
                  </label>
                  <Input
                    placeholder="https://nextdoor.com/pages/yourbusiness"
                    value={formData.socialNextdoor}
                    onChange={(e) => updateField("socialNextdoor", e.target.value)}
                    data-testid="input-onboarding-nextdoor"
                  />
                </div>
              </div>

              <StepNavigation
                onBack={goBack}
                onNext={() => {
                  const socialData: Record<string, string | null> = {
                    socialFacebook: formData.socialFacebook || null,
                    socialInstagram: formData.socialInstagram || null,
                    socialTwitter: formData.socialTwitter || null,
                    socialNextdoor: formData.socialNextdoor || null,
                  };
                  const hasAny = Object.values(socialData).some(v => v !== null);
                  hasAny ? saveAndNext(socialData) : goNext();
                }}
                nextLabel={
                  (formData.socialFacebook || formData.socialInstagram || formData.socialTwitter || formData.socialNextdoor)
                    ? "Save & Continue"
                    : "Skip for Now"
                }
                nextDisabled={updateMutation.isPending}
                backTestId="button-back-social"
                nextTestId="button-next-social"
              />
            </CardContent>
          </Card>
        )}

        {currentStep === "location" && (
          <Card data-testid="step-location">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-serif font-bold" data-testid="text-location-title">
                  {hasLocationData ? "Your business location" : "Where is your business located?"}
                </h2>
                <p className="text-muted-foreground">
                  {hasLocationData
                    ? "Here's the address we have. Feel free to update anything."
                    : "This helps clients find you. You can skip this for now if you'd prefer."}
                </p>
              </div>

              <AddressFields
                prefix="location"
                values={getAddressValues("location", formData)}
                onChange={updateField}
              />

              <StepNavigation
                onBack={goBack}
                onNext={() => saveAndNext(addressPayload("location", formData))}
                nextLabel={hasLocationData ? "Save & Continue" : "Skip for Now"}
                nextDisabled={updateMutation.isPending}
                backTestId="button-back-location"
                nextTestId="button-next-location"
              />
            </CardContent>
          </Card>
        )}

        {currentStep === "billing" && (
          <Card data-testid="step-billing">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-serif font-bold" data-testid="text-billing-title">Billing Address</h2>
                <p className="text-muted-foreground">
                  Is your billing address the same as your business location?
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  <button
                    className={`flex flex-col items-center gap-2 p-4 rounded-md border-2 transition-colors cursor-pointer ${
                      formData.billingSameAsLocation
                        ? "border-primary bg-primary/5"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => setFormData((prev) => ({ ...prev, billingSameAsLocation: true, billingLater: false }))}
                    data-testid="button-billing-same"
                  >
                    <Check className="h-6 w-6 text-primary" />
                    <span className="font-medium text-sm">Yes, same address</span>
                  </button>
                  <button
                    className={`flex flex-col items-center gap-2 p-4 rounded-md border-2 transition-colors cursor-pointer ${
                      !formData.billingSameAsLocation
                        ? "border-primary bg-primary/5"
                        : "border-border hover-elevate"
                    }`}
                    onClick={() => setFormData((prev) => ({ ...prev, billingSameAsLocation: false, billingLater: false }))}
                    data-testid="button-billing-different"
                  >
                    <MapPin className="h-6 w-6 text-primary" />
                    <span className="font-medium text-sm">No, different address</span>
                  </button>
                </div>
              </div>

              {!formData.billingSameAsLocation && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant={!formData.billingLater ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => updateField("billingLater", false)}
                      data-testid="button-billing-enter-now"
                    >
                      Enter it now
                    </Button>
                    <Button
                      variant={formData.billingLater ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => updateField("billingLater", true)}
                      data-testid="button-billing-later"
                    >
                      Come back later
                    </Button>
                  </div>

                  {!formData.billingLater && (
                    <AddressFields
                      prefix="billing"
                      values={getAddressValues("billing", formData)}
                      onChange={updateField}
                    />
                  )}
                </div>
              )}

              <StepNavigation
                onBack={goBack}
                onNext={saveBillingAndNext}
                nextLabel="Continue"
                nextDisabled={updateMutation.isPending}
                backTestId="button-back-billing"
                nextTestId="button-next-billing"
              />
            </CardContent>
          </Card>
        )}

        {currentStep === "plan" && (
          <div className="space-y-6" data-testid="step-plan">
            {hasPlan ? (
              <Card>
                <CardContent className="pt-8 pb-8 text-center space-y-6">
                  <div className="inline-flex p-4 rounded-full bg-primary/10">
                    <Check className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-serif font-bold" data-testid="text-plan-already">Plan Already Selected</h2>
                    <p className="text-muted-foreground">This business already has a plan. You're good to go!</p>
                  </div>
                  <StepNavigation
                    onBack={goBack}
                    onNext={goNext}
                    nextLabel="Continue"
                    nextDisabled={false}
                    backTestId="button-back-plan"
                    nextTestId="button-next-plan"
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="text-center space-y-3">
                  <Sparkles className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-2xl font-serif font-bold" data-testid="text-choose-plan-title">Choose a Plan</h2>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Start with a free trial or pick the plan that fits your business. You can upgrade or change plans anytime.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activePlans.map((plan) => {
                    const isFree = plan.priceMonthly === 0;
                    const isPopular = plan.name === "Professional" || plan.name === "Pro";
                    return (
                      <Card key={plan.id} className={`relative flex flex-col ${isPopular ? "border-primary" : ""}`} data-testid={`card-plan-${plan.id}`}>
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                          </div>
                        )}
                        <CardHeader className="text-center pb-2">
                          <CardTitle className="text-base" data-testid={`text-plan-name-${plan.id}`}>{plan.name}</CardTitle>
                          <div className="mt-1">
                            {isFree ? (
                              <div className="text-2xl font-bold" data-testid={`text-plan-price-${plan.id}`}>Free</div>
                            ) : (
                              <div>
                                <span className="text-2xl font-bold" data-testid={`text-plan-price-${plan.id}`}>${(plan.priceMonthly / 100).toFixed(0)}</span>
                                <span className="text-muted-foreground text-sm">/mo</span>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2 text-sm">
                          {plan.description && (
                            <p className="text-muted-foreground text-xs" data-testid={`text-plan-description-${plan.id}`}>{plan.description}</p>
                          )}
                          <ul className="space-y-1.5">
                            <li className="flex items-start gap-2">
                              <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <span>Up to {plan.dogsLimit} pets</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{plan.monthlyPortraitCredits || 20} portrait credits/mo</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <span>4 free edits per portrait</span>
                            </li>
                            {isFree && plan.trialDays ? (
                              <li className="flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                <span>{plan.trialDays}-day free trial</span>
                              </li>
                            ) : null}
                            {!isFree && plan.overagePriceCents ? (
                              <li className="flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                <span>${(plan.overagePriceCents / 100).toFixed(0)} per extra portrait</span>
                              </li>
                            ) : null}
                            {!isFree && (
                              <li className="flex items-start gap-2">
                                <Plus className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                <span>Add up to 5 extra pets ($3/pet/mo)</span>
                              </li>
                            )}
                          </ul>
                        </CardContent>
                        <CardFooter>
                          <Button
                            className="w-full gap-1"
                            variant={isPopular ? "default" : "outline"}
                            onClick={() => handleSelectPlan(plan)}
                            disabled={isPlanMutating}
                            data-testid={`button-select-plan-${plan.id}`}
                          >
                            {isPlanMutating ? "Please wait..." : isFree ? "Start Free Trial" : (
                              <><Zap className="h-4 w-4" /> Subscribe</>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" className="gap-1" onClick={goBack} data-testid="button-back-plan">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {currentStep === "finish" && (
          <Card data-testid="step-finish">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="inline-flex p-4 rounded-full bg-primary/10">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold" data-testid="text-finish-title">You're all set!</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {isAdminFlow
                    ? `${org.name} is ready to go! What would you like to do next?`
                    : "What would you like to do next? You can add your first pet or review your organization details."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button className="gap-2 w-full sm:w-auto" onClick={() => finishOnboarding("create")} disabled={finishing} data-testid="button-finish-add-pet">
                  <PawPrint className="h-4 w-4" /> Add Your First Pet
                </Button>
                <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => finishOnboarding("settings")} disabled={finishing} data-testid="button-finish-review">
                  {isAdminFlow ? "View Business Info" : "Review My Info"}
                </Button>
              </div>

              <Button variant="ghost" className="gap-1" onClick={goBack} data-testid="button-back-finish">
                <ArrowLeft className="h-4 w-4" /> Go Back
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
