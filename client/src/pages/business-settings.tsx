import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminFloatingButton } from "@/components/admin-button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dog, Cat, Shield, ArrowLeft, Building2, Users, MapPin,
  StickyNote, Pencil, X, Check, LogOut, PawPrint,
  Phone, Mail, Globe, CreditCard, ImageIcon, Upload,
  Crown, Heart, Plus, Bell, Smartphone, MessageSquare
} from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { NextdoorIcon } from "@/components/nextdoor-icon";
import { LogoCropDialog } from "@/components/logo-crop-dialog";
import type { Organization, SubscriptionPlan, Dog as DogType } from "@shared/schema";

const IG_PREFIX = '/api/instagram-native';

interface OrgDetail extends Organization {
  dogCount?: number;
}

type SectionName = "business" | "contact" | "social" | "billing" | "notes" | "plan" | "logo";

export default function BusinessSettings() {
  const params = useParams<{ id: string }>();
  const adminOrgId = params.id ? parseInt(params.id) : null;
  const isAdminView = adminOrgId !== null && adminOrgId > 0;

  const [, navigate] = useLocation();
  const { user, session, isLoading: authLoading, isAuthenticated, isAdmin, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<SectionName | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [igDisconnecting, setIgDisconnecting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
    } else if (!authLoading && isAuthenticated && isAdminView && !isAdmin) {
      navigate("/dashboard");
    }
  }, [authLoading, isAuthenticated, isAdmin, isAdminView, navigate]);

  const { data: adminOrg, isLoading: adminOrgLoading } = useQuery<OrgDetail>({
    queryKey: ["/api/admin/organizations", adminOrgId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/organizations/${adminOrgId}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch organization");
      return res.json();
    },
    enabled: isAuthenticated && isAdminView && isAdmin && adminOrgId! > 0,
  });

  const { data: ownerOrg, isLoading: ownerOrgLoading } = useQuery<Organization>({
    queryKey: ["/api/my-organization"],
    enabled: isAuthenticated && !isAdminView,
  });

  const org = isAdminView ? adminOrg : ownerOrg;
  const isLoading = isAdminView ? adminOrgLoading : ownerOrgLoading;

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"],
  });
  const orgIndustryType = org?.industryType || null;
  const filteredPlans = (plans || []).filter(p => p.isActive && (!p.vertical || p.vertical === orgIndustryType));

  const { data: myDogs = [] } = useQuery<DogType[]>({
    queryKey: ["/api/my-dogs"],
    enabled: isAuthenticated && !isAdminView,
  });

  const { data: igStatus, refetch: refetchIg } = useQuery<{ connected: boolean; username?: string; orgId?: number }>({
    queryKey: [`${IG_PREFIX}/status`, isAdminView ? adminOrgId : undefined],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const url = isAdminView && adminOrgId ? `${IG_PREFIX}/status?orgId=${adminOrgId}` : `${IG_PREFIX}/status`;
      const res = await fetch(url, { headers });
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Handle Instagram callback redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const igResult = params.get('instagram');
    if (igResult === 'connected') {
      toast({ title: "Instagram Connected!", description: `Your Instagram account is now linked.` });
      refetchIg();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (igResult === 'no_page') {
      toast({ title: "No Facebook Page Found", description: "Your Instagram must be linked to a Facebook Page. Create one in Facebook settings first.", variant: "destructive" });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (igResult === 'no_ig_account') {
      toast({ title: "No Instagram Business Account", description: "Switch your Instagram to a Business or Creator account and link it to your Facebook Page.", variant: "destructive" });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (igResult === 'error') {
      const detail = params.get('detail');
      toast({ title: "Instagram Connection Failed", description: detail || "Something went wrong. Please try again.", variant: "destructive" });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const currentPlan = plans?.find(p => p.id === org?.planId);
  const petCount = isAdminView ? (adminOrg as OrgDetail)?.dogCount || 0 : myDogs.length;
  const hasPlan = !!org?.planId && org?.subscriptionStatus !== "inactive";

  const apiBase = isAdminView
    ? `/api/admin/organizations/${adminOrgId}`
    : "/api/my-organization";

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("PATCH", apiBase, data);
      return res.json();
    },
    onSuccess: () => {
      if (isAdminView) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations", adminOrgId] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
      }
      setEditingSection(null);
      setEditValues({});
      setLogoPreview(null);
      toast({ title: "Saved", description: "Changes saved successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await apiRequest("PATCH", apiBase, { isActive });
      return res.json();
    },
    onSuccess: () => {
      if (isAdminView) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations", adminOrgId] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      }
      toast({ title: "Updated", description: `Business ${org?.isActive ? "deactivated" : "activated"}.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
          <div className="container mx-auto px-4 h-14 flex items-center">
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !org) {
    if (!isAuthenticated) return null;
    if (!isAdminView) {
      navigate("/dashboard");
    }
    return null;
  }

  const startEditing = (section: SectionName) => {
    if (section === "business") {
      setEditValues({
        name: org.name || "",
        contactEmail: org.contactEmail || "",
        websiteUrl: org.websiteUrl || "",
        description: org.description || "",
        speciesHandled: org.speciesHandled || "dogs",
      });
    } else if (section === "contact") {
      setEditValues({
        contactName: org.contactName || "",
        contactPhone: org.contactPhone || "",
      });
    } else if (section === "social") {
      setEditValues({
        socialFacebook: org.socialFacebook || "",
        socialInstagram: org.socialInstagram || "",
        socialTwitter: org.socialTwitter || "",
        socialNextdoor: org.socialNextdoor || "",
      });
    } else if (section === "billing") {
      setEditValues({
        billingStreet: org.billingStreet || "",
        billingCity: org.billingCity || "",
        billingState: org.billingState || "",
        billingZip: org.billingZip || "",
        billingCountry: org.billingCountry || "",
      });
    } else if (section === "notes") {
      setEditValues({
        notes: org.notes || "",
      });
    } else if (section === "plan") {
      setEditValues({
        planId: org.planId?.toString() || "",
      });
    } else if (section === "logo") {
      setLogoPreview(null);
    }
    setEditingSection(section);
  };

  const saveSection = () => {
    if (editingSection === "plan") {
      const planId = editValues.planId ? parseInt(editValues.planId) : null;
      const selectedPlan = plans?.find(p => p.id === planId);
      if (selectedPlan && selectedPlan.priceMonthly > 0 && isAdminView && adminOrgId) {
        setEditingSection(null);
        navigate(`/choose-plan/${adminOrgId}`);
        return;
      }
      updateMutation.mutate({ planId });
    } else if (editingSection === "logo" && logoPreview) {
      updateMutation.mutate({ logoUrl: logoPreview });
    } else {
      updateMutation.mutate(editValues);
    }
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditValues({});
    setLogoPreview(null);
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

  const getStatusBadge = () => {
    if (org.isActive) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">Active</Badge>;
    }
    return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-0">Inactive</Badge>;
  };

  const trialDaysRemaining = org.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const backLink = isAdminView ? "/admin" : "/dashboard";
  const backLabel = isAdminView ? "Back to Admin" : "Back to Dashboard";

  const editButton = (section: SectionName, testId: string) => {
    if (editingSection === section) {
      return (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={saveSection} disabled={updateMutation.isPending || (section === "logo" && !logoPreview)} data-testid={`button-save-${testId}`}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={cancelEditing} data-testid={`button-cancel-${testId}`}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }
    return (
      <Button size="icon" variant="ghost" onClick={() => startEditing(section)} data-testid={`button-edit-${testId}`}>
        <Pencil className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-serif font-bold text-primary" data-testid="link-home-business-settings">
            <Dog className="h-5 w-5" />
            Pawtrait Pros
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link href={isAdminView ? `/dashboard?org=${org.id}` : "/dashboard"}>
                <PawPrint className="h-3.5 w-3.5" />
                Pups
              </Link>
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1" data-testid="button-back-to-admin" asChild>
                <Link href="/admin">
                  <Shield className="h-3 w-3" />
                  Admin Panel
                </Link>
              </Button>
            )}
            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                  <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline">
                  {user?.firstName || user?.email?.split("@")[0]}
                </span>
                <Button variant="ghost" size="icon" data-testid="button-logout-business-settings" onClick={() => logout()} disabled={isLoggingOut}>
                    <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <AdminFloatingButton />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" className="gap-1 mb-6" data-testid="button-back" asChild>
          <Link href={backLink}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {org.logoUrl ? (
                <AvatarImage src={org.logoUrl} alt={org.name} />
              ) : null}
              <AvatarFallback className="bg-primary/10">
                <Heart className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap" data-testid="text-business-name-header">
                {org.name}
                {isAdminView && getStatusBadge()}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isAdminView ? "Manage business details and billing" : "Manage your business profile and settings"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isAdminView && (
              <>
                <Button variant="outline" className="gap-2" data-testid="button-view-pups" asChild>
                  <Link href={`/dashboard?stay=1&org=${org.id}`}>
                    <PawPrint className="h-4 w-4" />
                    {org.speciesHandled === "cats" ? "Kitties" : org.speciesHandled === "both" ? "Pets" : "Pups"}
                  </Link>
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <Switch
                    checked={org.isActive}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate(checked)}
                    disabled={toggleActiveMutation.isPending}
                    data-testid="switch-active"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {hasPlan && petCount === 0 && !isAdminView && (
            <Card className="border-primary/30 bg-primary/5" data-testid="card-next-step">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <PawPrint className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-lg" data-testid="text-next-step-title">You're all set! Add your first pet</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Fill in your business details below, then add your first pet and create a beautiful portrait.
                    </p>
                  </div>
                  <Button className="gap-2 shrink-0" data-testid="button-add-first-pet-settings" asChild>
                    <Link href="/create">
                      <Plus className="h-4 w-4" />
                      Add Your First Pet
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logo */}
          <Card data-testid="section-logo">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Logo</CardTitle>
                  <CardDescription>Logo shown on public pages</CardDescription>
                </div>
              </div>
              {editButton("logo", "logo")}
            </CardHeader>
            <CardContent>
              {editingSection === "logo" ? (
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    {logoPreview ? (
                      <AvatarImage src={logoPreview} alt="Logo preview" />
                    ) : org.logoUrl ? (
                      <AvatarImage src={org.logoUrl} alt={org.name} />
                    ) : null}
                    <AvatarFallback className="text-2xl bg-primary/10">
                      <Heart className="h-10 w-10 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <label htmlFor="logo-upload">
                      <Button variant="outline" className="gap-2" asChild>
                        <span>
                          <Upload className="h-4 w-4" />
                          Upload New Logo
                        </span>
                      </Button>
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleLogoUpload}
                      data-testid="input-logo-upload"
                    />
                    <p className="text-xs text-muted-foreground mt-2">JPG, PNG, or WebP. 256x256px recommended. Max 5MB.</p>
                    <p className="text-xs text-muted-foreground">You'll be able to crop and resize after uploading.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4" data-testid="text-logo">
                  <Avatar className="h-16 w-16">
                    {org.logoUrl ? (
                      <AvatarImage src={org.logoUrl} alt={org.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10">
                      <Heart className="h-8 w-8 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {org.logoUrl ? "Logo uploaded" : "No logo uploaded yet"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Subscription Plan */}
          <Card data-testid="section-plan">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Subscription Plan</CardTitle>
                  <CardDescription>Current billing plan</CardDescription>
                </div>
              </div>
              {isAdminView && editButton("plan", "plan")}
            </CardHeader>
            <CardContent>
              {editingSection === "plan" && isAdminView ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Select Plan</label>
                    <Select
                      value={editValues.planId || ""}
                      onValueChange={(value) => setEditValues({ ...editValues, planId: value })}
                    >
                      <SelectTrigger data-testid="select-plan">
                        <SelectValue placeholder="Choose a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id.toString()} data-testid={`select-plan-option-${plan.id}`}>
                            {plan.name} - ${(plan.priceMonthly / 100).toFixed(0)}/mo ({
                              (plan as any).unitType === 'grooms' ? `${(plan as any).unitLimit} grooms/mo`
                              : (plan as any).unitType === 'dogs_in_program' ? `${(plan as any).unitLimit} in program`
                              : (plan as any).unitType === 'dogs_boarded' ? `${(plan as any).unitLimit} boarded/mo`
                              : plan.dogsLimit != null ? `${plan.dogsLimit} dogs`
                              : 'unlimited'
                            })
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Plan</p>
                    <p className="flex items-center gap-1.5" data-testid="text-plan-name">
                      <Crown className="h-3.5 w-3.5 text-muted-foreground" />
                      {currentPlan ? currentPlan.name : <span className="text-muted-foreground">No plan selected</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Price</p>
                    <p data-testid="text-plan-price">
                      {currentPlan ? (currentPlan.priceMonthly === 0 ? "Free" : `$${(currentPlan.priceMonthly / 100).toFixed(0)}/month`) : <span className="text-muted-foreground">&mdash;</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Pet Limit</p>
                    <p data-testid="text-plan-dogs">
                      {currentPlan ? (currentPlan.dogsLimit != null ? `${currentPlan.dogsLimit} pets` : "Custom") : <span className="text-muted-foreground">&mdash;</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Status</p>
                    <div data-testid="text-subscription-status">
                      {org.subscriptionStatus ? (
                        <Badge variant="secondary" className={
                          org.subscriptionStatus === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0" :
                          org.subscriptionStatus === "trial" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0" :
                          "border-0"
                        }>
                          {org.subscriptionStatus.charAt(0).toUpperCase() + org.subscriptionStatus.slice(1)}
                        </Badge>
                      ) : <span className="text-muted-foreground">&mdash;</span>}
                    </div>
                  </div>
                  {org.subscriptionStatus === "trial" && trialDaysRemaining > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">
                        {trialDaysRemaining} days remaining in free trial
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card data-testid="section-business">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Organization Info</CardTitle>
                  <CardDescription>Basic details and public profile</CardDescription>
                </div>
              </div>
              {editButton("business", "business")}
            </CardHeader>
            <CardContent>
              {editingSection === "business" ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Business Name</label>
                    <Input
                      value={editValues.name || ""}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      data-testid="input-business-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Business Email</label>
                    <Input
                      value={editValues.contactEmail || ""}
                      onChange={(e) => setEditValues({ ...editValues, contactEmail: e.target.value })}
                      data-testid="input-business-email"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Website</label>
                    <Input
                      value={editValues.websiteUrl || ""}
                      onChange={(e) => setEditValues({ ...editValues, websiteUrl: e.target.value })}
                      data-testid="input-business-website"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Species Handled</label>
                    <Select
                      value={editValues.speciesHandled || "dogs"}
                      onValueChange={(value) => setEditValues({ ...editValues, speciesHandled: value })}
                    >
                      <SelectTrigger data-testid="select-species-handled">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dogs">Dogs Only</SelectItem>
                        <SelectItem value="cats">Cats Only</SelectItem>
                        <SelectItem value="both">Dogs & Cats</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block">Description</label>
                    <Textarea
                      value={editValues.description || ""}
                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      data-testid="input-business-description"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Business Name</p>
                    <p className="flex items-center gap-1.5" data-testid="text-business-name">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Business Email</p>
                    <p className="flex items-center gap-1.5" data-testid="text-business-email">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.contactEmail || <span className="text-muted-foreground">&mdash;</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Website</p>
                    <p className="flex items-center gap-1.5" data-testid="text-business-website">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.websiteUrl ? (
                        <a href={org.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {org.websiteUrl}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Species Handled <span className="text-xs font-normal">(click to change)</span></p>
                    <div className="flex items-center gap-2" data-testid="text-species-handled">
                      <button
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                          org.speciesHandled === "dogs" || org.speciesHandled === "both"
                            ? "border-2 border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                        }`}
                        onClick={() => {
                          const current = org.speciesHandled || "dogs";
                          const hasDogs = current === "dogs" || current === "both";
                          updateMutation.mutate({ speciesHandled: hasDogs ? (current === "both" ? "cats" : "both") : "dogs" });
                        }}
                        disabled={updateMutation.isPending}
                        data-testid="button-toggle-dogs"
                      >
                        <Dog className="h-4 w-4" />
                        Dogs
                        {!(org.speciesHandled === "dogs" || org.speciesHandled === "both") && (
                          <Plus className="h-3 w-3 ml-0.5" />
                        )}
                      </button>
                      <button
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                          org.speciesHandled === "cats" || org.speciesHandled === "both"
                            ? "border-2 border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                        }`}
                        onClick={() => {
                          const current = org.speciesHandled || "dogs";
                          const hasCats = current === "cats" || current === "both";
                          updateMutation.mutate({ speciesHandled: hasCats ? (current === "both" ? "dogs" : "both") : (current === "dogs" ? "both" : "cats") });
                        }}
                        disabled={updateMutation.isPending}
                        data-testid="button-toggle-cats"
                      >
                        <Cat className="h-4 w-4" />
                        Cats
                        {!(org.speciesHandled === "cats" || org.speciesHandled === "both") && (
                          <Plus className="h-3 w-3 ml-0.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {org.description && (
                    <div className="sm:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground mb-0.5">Description</p>
                      <p className="text-sm" data-testid="text-business-description">{org.description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Primary Contact */}
          <Card data-testid="section-contact">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Who to Reach Out To</CardTitle>
                  <CardDescription>Primary contact information</CardDescription>
                </div>
              </div>
              {editButton("contact", "contact")}
            </CardHeader>
            <CardContent>
              {editingSection === "contact" ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Contact Name</label>
                    <Input
                      value={editValues.contactName || ""}
                      onChange={(e) => setEditValues({ ...editValues, contactName: e.target.value })}
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
                    <Input
                      value={editValues.contactPhone || ""}
                      onChange={(e) => setEditValues({ ...editValues, contactPhone: e.target.value })}
                      data-testid="input-contact-phone"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Contact Name</p>
                    <p className="flex items-center gap-1.5" data-testid="text-contact-name">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.contactName || <span className="text-muted-foreground">&mdash;</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Phone Number</p>
                    <p className="flex items-center gap-1.5" data-testid="text-contact-phone">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.contactPhone || <span className="text-muted-foreground">&mdash;</span>}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card data-testid="section-notifications">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Customer Notifications</CardTitle>
                  <CardDescription>How customers receive portrait links at departure</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { value: "both", label: "Email & Text", description: "Send both for maximum reach", icon: <Bell className="h-5 w-5" /> },
                  { value: "sms", label: "Text Message Only", description: "Quick and direct via SMS", icon: <Smartphone className="h-5 w-5" /> },
                  { value: "email", label: "Email Only", description: "Professional email notification", icon: <Mail className="h-5 w-5" /> },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all ${
                      (org as any).notificationMode === opt.value || (!((org as any).notificationMode) && opt.value === "both")
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      updateMutation.mutate({ notificationMode: opt.value } as any);
                    }}
                    data-testid={`button-notification-${opt.value}`}
                  >
                    <span className="text-primary">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {((org as any).notificationMode === opt.value || (!((org as any).notificationMode) && opt.value === "both")) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SMS Send Method */}
          <Card data-testid="section-sms-method">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">SMS Send Method</CardTitle>
                  <CardDescription>How text messages are sent to customers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { value: "platform", label: "Pawtrait Pros Number", description: "Send from our dedicated business number", icon: <Globe className="h-5 w-5" /> },
                  { value: "native", label: "Send from My Phone", description: "Messages go from your personal number via companion app", icon: <Smartphone className="h-5 w-5" /> },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all ${
                      (org as any).smsSendMethod === opt.value || (!((org as any).smsSendMethod) && opt.value === "platform")
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      updateMutation.mutate({ smsSendMethod: opt.value } as any);
                    }}
                    data-testid={`button-sms-method-${opt.value}`}
                  >
                    <span className="text-primary">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {((org as any).smsSendMethod === opt.value || (!((org as any).smsSendMethod) && opt.value === "platform")) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
              {(org as any).smsSendMethod === "native" && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    <strong>Companion app required.</strong> Download the Pawtrait Send app on your phone to enable native sending. Messages will queue until your phone is connected.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portrait Cadence (daycare only) */}
          {orgIndustryType === "daycare" && (
            <Card data-testid="section-portrait-cadence">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Portrait Schedule</CardTitle>
                    <CardDescription>How often regular clients receive updated portraits</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { value: "weekly", label: "Weekly", description: "New portrait every 7 days for regulars" },
                    { value: "biweekly", label: "Biweekly", description: "New portrait every 14 days for regulars" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all ${
                        (org as any).portraitCadence === opt.value || (!((org as any).portraitCadence) && opt.value === "weekly")
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        updateMutation.mutate({ portraitCadence: opt.value } as any);
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                      {((org as any).portraitCadence === opt.value || (!((org as any).portraitCadence) && opt.value === "weekly")) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">Occasional visitors get a portrait on check-out instead.</p>
              </CardContent>
            </Card>
          )}

          {/* Social Media */}
          <Card data-testid="section-social">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Social Media</CardTitle>
                  <CardDescription>Social media profile links</CardDescription>
                </div>
              </div>
              {editButton("social", "social")}
            </CardHeader>
            <CardContent>
              {editingSection === "social" ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Facebook</label>
                    <Input
                      value={editValues.socialFacebook || ""}
                      onChange={(e) => setEditValues({ ...editValues, socialFacebook: e.target.value })}
                      placeholder="https://facebook.com/yourbusiness"
                      data-testid="input-social-facebook"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Instagram</label>
                    <Input
                      value={editValues.socialInstagram || ""}
                      onChange={(e) => setEditValues({ ...editValues, socialInstagram: e.target.value })}
                      placeholder="https://instagram.com/yourbusiness"
                      data-testid="input-social-instagram"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">X (Twitter)</label>
                    <Input
                      value={editValues.socialTwitter || ""}
                      onChange={(e) => setEditValues({ ...editValues, socialTwitter: e.target.value })}
                      placeholder="https://x.com/yourbusiness"
                      data-testid="input-social-twitter"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Nextdoor</label>
                    <Input
                      value={editValues.socialNextdoor || ""}
                      onChange={(e) => setEditValues({ ...editValues, socialNextdoor: e.target.value })}
                      placeholder="https://nextdoor.com/pages/yourbusiness"
                      data-testid="input-social-nextdoor"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Facebook</p>
                    <p className="flex items-center gap-1.5" data-testid="text-social-facebook">
                      <SiFacebook className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.socialFacebook ? (
                        <a href={org.socialFacebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {org.socialFacebook.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      ) : <span className="text-muted-foreground">&mdash;</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Instagram</p>
                    <p className="flex items-center gap-1.5" data-testid="text-social-instagram">
                      <SiInstagram className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.socialInstagram ? (
                        <a href={org.socialInstagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {org.socialInstagram.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      ) : <span className="text-muted-foreground">&mdash;</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">X (Twitter)</p>
                    <p className="flex items-center gap-1.5" data-testid="text-social-twitter">
                      <FaXTwitter className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.socialTwitter ? (
                        <a href={org.socialTwitter} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {org.socialTwitter.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      ) : <span className="text-muted-foreground">&mdash;</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">Nextdoor</p>
                    <p className="flex items-center gap-1.5" data-testid="text-social-nextdoor">
                      <NextdoorIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {org.socialNextdoor ? (
                        <a href={org.socialNextdoor} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {org.socialNextdoor.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      ) : <span className="text-muted-foreground">&mdash;</span>}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instagram Integration */}
          <Card data-testid="section-instagram">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <SiInstagram className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Instagram Posting</CardTitle>
                  <CardDescription>Connect your Instagram to post pet portraits directly</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {igStatus?.connected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Connected
                    </Badge>
                    {igStatus.username && (
                      <span className="text-sm text-muted-foreground">@{igStatus.username}</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={igDisconnecting}
                    onClick={async () => {
                      setIgDisconnecting(true);
                      try {
                        const headers = await getAuthHeaders();
                        const url = isAdminView && adminOrgId
                          ? `${IG_PREFIX}/disconnect?orgId=${adminOrgId}`
                          : `${IG_PREFIX}/disconnect`;
                        await fetch(url, { method: 'DELETE', headers });
                        toast({ title: "Instagram Disconnected" });
                        refetchIg();
                      } catch {
                        toast({ title: "Failed to disconnect", variant: "destructive" });
                      } finally {
                        setIgDisconnecting(false);
                      }
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect your Instagram Business account to post pet portraits with one click from any pet's profile page.
                  </p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const token = session?.access_token || '';
                      const url = isAdminView && adminOrgId
                        ? `${IG_PREFIX}/connect?orgId=${adminOrgId}&token=${encodeURIComponent(token)}`
                        : `${IG_PREFIX}/connect?token=${encodeURIComponent(token)}`;
                      window.location.href = url;
                    }}
                  >
                    <SiInstagram className="h-4 w-4" />
                    Connect Instagram
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card data-testid="section-billing">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Address for Invoicing</CardTitle>
                  <CardDescription>Billing address on file</CardDescription>
                </div>
              </div>
              {editButton("billing", "billing")}
            </CardHeader>
            <CardContent>
              {editingSection === "billing" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Street Address</label>
                    <Input
                      value={editValues.billingStreet || ""}
                      onChange={(e) => setEditValues({ ...editValues, billingStreet: e.target.value })}
                      data-testid="input-billing-street"
                    />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">City</label>
                      <Input
                        value={editValues.billingCity || ""}
                        onChange={(e) => setEditValues({ ...editValues, billingCity: e.target.value })}
                        data-testid="input-billing-city"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">State</label>
                      <Input
                        value={editValues.billingState || ""}
                        onChange={(e) => setEditValues({ ...editValues, billingState: e.target.value })}
                        data-testid="input-billing-state"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">ZIP</label>
                      <Input
                        value={editValues.billingZip || ""}
                        onChange={(e) => setEditValues({ ...editValues, billingZip: e.target.value })}
                        data-testid="input-billing-zip"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Country</label>
                    <Input
                      value={editValues.billingCountry || ""}
                      onChange={(e) => setEditValues({ ...editValues, billingCountry: e.target.value })}
                      data-testid="input-billing-country"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p data-testid="text-billing-street">{org.billingStreet || <span className="text-muted-foreground">No street address</span>}</p>
                  <p data-testid="text-billing-city-state">{
                    org.billingCity || org.billingState || org.billingZip
                      ? [org.billingCity, org.billingState, org.billingZip].filter(Boolean).join(", ")
                      : <span className="text-muted-foreground">No city/state/zip</span>
                  }</p>
                  <p data-testid="text-billing-country">{org.billingCountry || <span className="text-muted-foreground">No country</span>}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes - Admin only */}
          {isAdminView && (
            <Card data-testid="section-notes">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">Internal Notes</CardTitle>
                    <CardDescription>Private notes (not visible to business)</CardDescription>
                  </div>
                </div>
                {editButton("notes", "notes")}
              </CardHeader>
              <CardContent>
                {editingSection === "notes" ? (
                  <Textarea
                    value={editValues.notes || ""}
                    onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                    className="min-h-[100px]"
                    data-testid="input-notes"
                  />
                ) : (
                  <p data-testid="text-notes" className={!org.notes ? "text-muted-foreground" : ""}>
                    {org.notes || "No notes yet"}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
