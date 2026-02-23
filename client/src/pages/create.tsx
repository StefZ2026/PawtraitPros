import { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { ImageUpload } from "@/components/image-upload";
import { StyleSelector } from "@/components/style-selector";
import { PortraitPreview } from "@/components/portrait-preview";
import { BreedSelector } from "@/components/breed-selector";
import { portraitStyles, stylePreviewImages, type StyleOption } from "@/lib/portrait-styles";
import type { Pack } from "@shared/pack-config";
import { validatePetName } from "@shared/content-filter";
import { ArrowLeft, Dog, Cat, Sparkles, Eye, AlertTriangle, Plus, Shield, Undo2, Palette, Check } from "lucide-react";
import { PetLimitModal } from "@/components/pet-limit-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminFloatingButton } from "@/components/admin-button";
import { useAuth } from "@/hooks/use-auth";

interface PortraitView {
  id: number;
  image: string;
  style: StyleOption;
  editsUsed: number;
  portraitId?: number;
  hasPreviousImage?: boolean;
}

const MAX_EDITS_PER_VIEW = 4;

export default function Create() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const editingDogId = params.get("dog") ? parseInt(params.get("dog")!) : null;
  const orgParam = params.get("org");
  const speciesParam = params.get("species") as "dog" | "cat" | null;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, authLoading]);

  const { data: existingDog } = useQuery<any>({
    queryKey: ["/api/dogs", editingDogId],
    enabled: !!editingDogId,
  });

  const { data: myOrg } = useQuery<any>({
    queryKey: ["/api/my-organization"],
  });

  const { data: adminTargetOrg } = useQuery<any>({
    queryKey: ["/api/admin/organizations", orgParam],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/organizations/${orgParam}`, { headers });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!orgParam,
  });

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null);
  const [petName, setPetName] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petAge, setPetAge] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [petDescription, setPetDescription] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat" | null>(speciesParam || null);
  const [speciesConfirmed, setSpeciesConfirmed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [views, setViews] = useState<PortraitView[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);
  const [nextViewId, setNextViewId] = useState(1);

  const activeView = views.find(v => v.id === activeViewId) || null;
  const generatedImage = activeView?.image || null;

  const [showLimitModal, setShowLimitModal] = useState(false);
  const targetOrg = orgParam ? adminTargetOrg : myOrg;
  const orgSpecies = targetOrg?.speciesHandled || myOrg?.speciesHandled || "dogs";
  const petCount = targetOrg?.petCount ?? 0;
  const petLimit = targetOrg?.petLimit ?? null;
  const basePetLimit = targetOrg?.basePetLimit ?? petLimit;
  const additionalPetSlots = targetOrg?.additionalPetSlots ?? 0;
  const maxAdditionalSlots = targetOrg?.maxAdditionalSlots ?? 5;
  const isPaidPlan = targetOrg?.isPaidPlan ?? false;
  const isNewPet = !editingDogId;
  const atPetLimit = isNewPet && petLimit != null && petCount >= petLimit;

  useEffect(() => {
    if (existingDog && !loaded) {
      setPetName(existingDog.name || "");
      setPetBreed(existingDog.breed || "");
      setPetAge(existingDog.age || "");
      setOwnerEmail(existingDog.ownerEmail || "");
      setOwnerPhone(existingDog.ownerPhone || "");
      setPetDescription(existingDog.description || "");
      setSpecies(existingDog.species || "dog");
      setSpeciesConfirmed(true);
      if (existingDog.originalPhotoUrl) setUploadedImage(existingDog.originalPhotoUrl);
      const allPortraits = existingDog.portraits || (existingDog.portrait ? [existingDog.portrait] : []);
      if (allPortraits.length > 0) {
        const loadedViews: PortraitView[] = [];
        let viewIdCounter = 1;
        let selectedViewId = 1;
        const selectedPortraitId = existingDog.portrait?.id;
        for (const p of allPortraits) {
          if (p.generatedImageUrl && p.styleId) {
            const serverStyle = p.style;
            const match = portraitStyles.find(s => s.id === p.styleId) ||
              (serverStyle ? { id: serverStyle.id, name: serverStyle.name, description: serverStyle.description || "", promptTemplate: serverStyle.promptTemplate || "", category: serverStyle.category || "classic", species: serverStyle.species || "both", previewImageUrl: serverStyle.previewImageUrl || null } as StyleOption : null);
            if (match) {
              const thisViewId = viewIdCounter;
              if (p.id === selectedPortraitId || p.isSelected) {
                selectedViewId = thisViewId;
              }
              loadedViews.push({
                id: thisViewId,
                image: p.generatedImageUrl,
                style: match,
                editsUsed: p.editCount || 0,
                portraitId: p.id,
                hasPreviousImage: !!p.previousImageUrl,
              });
              viewIdCounter++;
            }
          }
        }
        if (loadedViews.length > 0) {
          const activeIdx = loadedViews.findIndex(v => v.id === selectedViewId);
          const defaultView = activeIdx >= 0 ? loadedViews[activeIdx] : loadedViews[0];
          setSelectedStyle(defaultView.style);
          setViews(loadedViews);
          setActiveViewId(defaultView.id);
          setNextViewId(viewIdCounter);
        }
      }
      setLoaded(true);
    }
  }, [existingDog, loaded]);

  useEffect(() => {
    if (!editingDogId && speciesParam) {
      setSpecies(speciesParam);
      setSpeciesConfirmed(true);
    }
  }, [editingDogId, speciesParam]);

  useEffect(() => {
    const resolvedOrg = targetOrg || myOrg;
    if (!editingDogId && !speciesParam && resolvedOrg) {
      if (orgSpecies === "cats") {
        setSpecies("cat");
        setSpeciesConfirmed(true);
      } else if (orgSpecies === "dogs") {
        setSpecies("dog");
        setSpeciesConfirmed(true);
      } else if (orgSpecies === "both") {
        setSpecies(null);
        setSpeciesConfirmed(false);
      }
    }
  }, [orgSpecies, editingDogId, speciesParam, myOrg, targetOrg]);

  const handleSpeciesSelect = (s: "dog" | "cat") => {
    if (s !== species) {
      setPetBreed("");
      setSelectedStyle(null);
      setViews([]);
      setActiveViewId(null);
      setNextViewId(1);
    }
    setSpecies(s);
    setSpeciesConfirmed(true);
  };

  const showSpeciesToggle = !editingDogId && !!(targetOrg || myOrg) && (orgSpecies === "both" || (speciesParam === null && orgSpecies !== "dogs" && orgSpecies !== "cats"));

  const backUrl = orgParam ? `/dashboard?stay=1&org=${orgParam}` : "/dashboard";

  const effectiveSpecies = species || "dog";
  const speciesLabel = effectiveSpecies === "cat" ? "cat" : "dog";

  // Fetch today's daily pack to constrain style selection
  const today = new Date().toISOString().split("T")[0];
  const packOrgId = targetOrg?.id || existingDog?.organizationId || myOrg?.id;
  const { data: dailyPack } = useQuery<{ pack_type: string }>({
    queryKey: ["/api/daily-pack", today, effectiveSpecies, packOrgId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const orgQuery = packOrgId ? `&orgId=${packOrgId}` : "";
      const res = await fetch(`/api/daily-pack?date=${today}&species=${effectiveSpecies}${orgQuery}`, { headers });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch pack details to get style IDs
  const { data: packs = [] } = useQuery<(Pack & { styles?: any[] })[]>({
    queryKey: ["/api/packs", effectiveSpecies],
    queryFn: async () => {
      const res = await fetch(`/api/packs?species=${effectiveSpecies}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Get style IDs from today's selected pack
  const selectedDailyPack = dailyPack?.pack_type
    ? packs.find((p: any) => p.type === dailyPack.pack_type)
    : null;
  const packStyleIds = selectedDailyPack?.styleIds || undefined;
  const noPackSelected = dailyPack === null || (dailyPack && !dailyPack.pack_type);

  // Inline pack selection (if no pack chosen for today)
  const [previewPackType, setPreviewPackType] = useState<string | null>(null);
  const setPackMutation = useMutation({
    mutationFn: async (packType: string) => {
      return apiRequest("POST", "/api/daily-pack", { packType, species: effectiveSpecies, date: today });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-pack"] });
      toast({ title: "Pack selected!", description: "Today's pack is set. Now pick a style!" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const sanitize = (s: string) => s.replace(/[^\w\s\-'.,:;!?()]/g, '').substring(0, 200).trim();
      const breed = sanitize(petBreed || (effectiveSpecies === "cat" ? "domestic" : "mixed breed"));
      const safeName = sanitize(petName);
      const realismNote = effectiveSpecies === "cat"
        ? " CRITICAL: The cat must look like a REAL, LIVING cat — photorealistic fur texture, natural eye reflections, realistic whiskers and anatomy. Do NOT make the cat look like a stuffed animal, cartoon, CGI render, or plastic figurine. The artistic style should be applied to the scene, clothing, and background — but the cat itself must always look like a genuine photograph of a real cat."
        : " CRITICAL: The dog must look like a REAL, LIVING dog — photorealistic fur texture, natural eye reflections, realistic nose and anatomy. Do NOT make the dog look like a stuffed animal, cartoon, caricature, CGI render, or plastic figurine. The artistic style should be applied to the scene, clothing, and background — but the dog itself must always look like a genuine photograph of a real dog.";
      const prompt = `Transform the provided photo of this ${breed} ${speciesLabel} named "${safeName}" into the following artistic style. CRITICALLY IMPORTANT: Preserve the ${speciesLabel}'s EXACT coat color pattern — including where each color appears on the body (lighter vs darker areas, two-tone patterns, patches, markings). Do NOT simplify into one uniform color. Keep all of the ${speciesLabel}'s actual appearance and features recognizable.${realismNote} Style: ${selectedStyle!.promptTemplate.replace("{breed}", breed)}`;
      const body: Record<string, any> = { prompt, originalImage: uploadedImage, dogName: safeName, styleId: selectedStyle!.id, species: effectiveSpecies };
      if (editingDogId) body.dogId = editingDogId;
      if (orgParam) body.organizationId = orgParam;
      return (await apiRequest("POST", "/api/generate-portrait", body)).json();
    },
    onSuccess: (data: any) => {
      if (data.generatedImage) {
        if (activeView && activeView.style.id === selectedStyle?.id) {
          const newEditsUsed = data.editCount ?? (activeView.editsUsed + 1);
          setViews(prev => prev.map(v =>
            v.id === activeViewId
              ? { ...v, image: data.generatedImage, editsUsed: newEditsUsed, portraitId: data.portraitId || v.portraitId, hasPreviousImage: data.hasPreviousImage ?? true }
              : v
          ));
          toast({ title: "Portrait Regenerated!", description: `${petName}'s ${selectedStyle?.name} portrait has been updated! (${newEditsUsed}/${MAX_EDITS_PER_VIEW} edits used)` });
        } else {
          const newView: PortraitView = {
            id: nextViewId,
            image: data.generatedImage,
            style: selectedStyle!,
            editsUsed: data.editCount ?? 0,
            portraitId: data.portraitId,
          };
          setViews(prev => [...prev, newView]);
          setActiveViewId(nextViewId);
          setNextViewId(prev => prev + 1);
          toast({ title: "Portrait Generated!", description: `${petName}'s ${selectedStyle?.name} portrait is ready!` });
        }
      }
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (editPrompt: string) => {
      const body: Record<string, any> = { currentImage: activeView!.image, editPrompt };
      if (editingDogId) body.dogId = editingDogId;
      if (activeView?.portraitId) body.portraitId = activeView.portraitId;
      return (await apiRequest("POST", "/api/edit-portrait", body)).json();
    },
    onSuccess: (data: any) => {
      if (data.editedImage && activeViewId !== null) {
        setViews(prev => prev.map(v =>
          v.id === activeViewId
            ? { ...v, image: data.editedImage, editsUsed: data.editCount ?? (v.editsUsed + 1), hasPreviousImage: !!data.hasPreviousImage }
            : v
        ));
        const usedCount = data.editCount ?? (activeView?.editsUsed ? activeView.editsUsed + 1 : 1);
        toast({ title: "Portrait Updated!", description: `${usedCount}/${data.maxEdits || MAX_EDITS_PER_VIEW} edits used` });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Edit Failed", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  const revertMutation = useMutation({
    mutationFn: async () => {
      if (!activeView?.portraitId) throw new Error("No portrait to revert");
      return (await apiRequest("POST", "/api/revert-portrait", { portraitId: activeView.portraitId })).json();
    },
    onSuccess: (data: any) => {
      if (data.revertedImage && activeViewId !== null) {
        setViews(prev => prev.map(v =>
          v.id === activeViewId
            ? { ...v, image: data.revertedImage, hasPreviousImage: !!data.hasPreviousImage }
            : v
        ));
        toast({ title: "Image Reverted!", description: "Your previous portrait has been restored." });
        queryClient.invalidateQueries({ queryKey: ["/api/dogs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Revert Failed", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nameCheck = validatePetName(petName);
      if (!nameCheck.valid) throw new Error(nameCheck.error || "Invalid name");
      if (!petBreed) throw new Error("Please select a breed");
      if (!ownerEmail && !ownerPhone) throw new Error("Please provide the owner's email or phone number so we can send them their portrait");

      const data: Record<string, any> = {
        name: petName, breed: petBreed || undefined, age: petAge || undefined,
        ownerEmail: ownerEmail || undefined, ownerPhone: ownerPhone || undefined,
        description: petDescription || undefined,
        originalPhotoUrl: uploadedImage, species: effectiveSpecies,
      };

      if (editingDogId) {
        if (activeView?.portraitId) {
          data.selectedPortraitId = activeView.portraitId;
        }
        return apiRequest("PATCH", `/api/dogs/${editingDogId}`, data);
      }

      const saveStyle = activeView?.style || selectedStyle;
      const saveImage = activeView?.image || null;
      if (saveImage) data.generatedPortraitUrl = saveImage;
      if (saveStyle) data.styleId = saveStyle.id;
      if (orgParam) data.organizationId = parseInt(orgParam);
      return apiRequest("POST", "/api/dogs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dogs"] });
      if (editingDogId) {
        queryClient.invalidateQueries({ queryKey: ["/api/dogs", editingDogId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Saved!", description: `${petName}'s portrait has been saved to the gallery.` });
      navigate(backUrl);
    },
    onError: (error: Error) => {
      toast({ title: "Save Failed", description: error.message || "Please try again.", variant: "destructive" });
    },
  });

  const handleGenerate = useCallback(() => {
    if (!uploadedImage) return toast({ title: "Upload a photo first", variant: "destructive" });
    const nameCheck = validatePetName(petName);
    if (!nameCheck.valid) return toast({ title: nameCheck.error || "Invalid name", variant: "destructive" });
    if (!petBreed) return toast({ title: "Select a breed", variant: "destructive" });
    if (!selectedStyle) return toast({ title: "Pick an art style", variant: "destructive" });
    generateMutation.mutate();
  }, [uploadedImage, selectedStyle, petName, petBreed, generateMutation, toast]);

  const handleDownload = useCallback(() => {
    if (!activeView) return;
    const a = document.createElement("a");
    a.href = activeView.image;
    a.download = `${petName || "portrait"}-${activeView.style?.name || "art"}.png`;
    a.click();
  }, [activeView, petName]);

  const handleSwitchView = (viewId: number) => {
    setActiveViewId(viewId);
    const view = views.find(v => v.id === viewId);
    if (view) {
      setSelectedStyle(view.style);
    }
  };

  const canGenerate = !!uploadedImage && !!selectedStyle && !!petName.trim() && !!petBreed;
  const hasViews = views.length > 0;
  const displayStyle = activeView?.style || selectedStyle;
  const styleChanged = !!(hasViews && selectedStyle && activeView && selectedStyle.id !== activeView.style.id);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Dog className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary" data-testid="link-home-header">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" data-testid="link-gallery-header" asChild>
              <Link href="/gallery">Gallery</Link>
            </Button>
            {orgParam && (
              <Button variant="outline" size="sm" className="gap-1" data-testid="button-back-to-admin" asChild>
                <Link href="/admin">
                  <Shield className="h-3 w-3" />
                  Admin Panel
                </Link>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <AdminFloatingButton />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2" data-testid="button-back" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="h-4 w-4" />
              {orgParam ? "Back to Admin" : "Back to Dashboard"}
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2" data-testid="text-create-heading">
            {editingDogId && existingDog ? `Edit ${existingDog.name}'s Profile` : "Create a Portrait"}
          </h1>
          <p className="text-muted-foreground">
            {editingDogId && existingDog
              ? "Update info, change the style, or generate a new portrait"
              : "Upload a photo, pick a style, and watch the magic happen"}
          </p>
        </div>

        {atPetLimit ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold" data-testid="text-pet-limit-heading">Pet Limit Reached</h2>
              <p className="text-muted-foreground max-w-md mx-auto" data-testid="text-pet-limit-message">
                You've reached your limit of {petLimit} pets ({petCount}/{petLimit} used). 
                Free up a spot, add extra slots, or upgrade your plan.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button className="gap-2" onClick={() => setShowLimitModal(true)} data-testid="button-need-more-room-create">
                  <Plus className="h-4 w-4" />
                  Need More Room?
                </Button>
                <Button variant="outline" className="gap-2" data-testid="button-back-to-dashboard" asChild>
                  <Link href={backUrl}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
              <PetLimitModal
                open={showLimitModal}
                onOpenChange={setShowLimitModal}
                petCount={petCount}
                petLimit={petLimit!}
                basePetLimit={basePetLimit ?? petLimit!}
                additionalPetSlots={additionalPetSlots}
                maxAdditionalSlots={maxAdditionalSlots}
                isPaidPlan={isPaidPlan}
                hasStripeSubscription={!!(targetOrg as any)?.hasActiveSubscription}
                orgId={targetOrg?.id}
                isAdmin={!!orgParam}
              />
            </CardContent>
          </Card>
        ) : (
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            {showSpeciesToggle && (
              <div>
                <h2 className="text-lg font-semibold mb-4" data-testid="text-section-species">What kind of pet?</h2>
                <div className="flex gap-3">
                  <Button
                    variant={species === "dog" ? "default" : "outline"}
                    onClick={() => handleSpeciesSelect("dog")}
                    className="gap-2 flex-1"
                    data-testid="button-species-dog"
                  >
                    <Dog className="h-4 w-4" />
                    Dog
                  </Button>
                  <Button
                    variant={species === "cat" ? "default" : "outline"}
                    onClick={() => handleSpeciesSelect("cat")}
                    className="gap-2 flex-1"
                    data-testid="button-species-cat"
                  >
                    <Cat className="h-4 w-4" />
                    Cat
                  </Button>
                </div>
              </div>
            )}

            {speciesConfirmed && (
              <div>
                <h2 className="text-lg font-semibold mb-4" data-testid="text-section-photo">Upload Photo</h2>
                <ImageUpload
                  onImageUpload={(img) => { setUploadedImage(img); setViews([]); setActiveViewId(null); setNextViewId(1); }}
                  currentImage={uploadedImage}
                  onClear={() => { setUploadedImage(null); setViews([]); setActiveViewId(null); setNextViewId(1); }}
                />
              </div>
            )}

            {speciesConfirmed && uploadedImage && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold" data-testid="text-section-info">
                  About This {effectiveSpecies === "cat" ? "Kitty" : "Pup"}
                </h2>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Input placeholder="Name *" aria-label="Pet name" value={petName} onChange={(e) => setPetName(e.target.value)} data-testid="input-pet-name" />
                  <BreedSelector species={effectiveSpecies} value={petBreed} onChange={setPetBreed} />
                  <Input placeholder="Age (optional)" aria-label="Pet age" value={petAge} onChange={(e) => setPetAge(e.target.value)} data-testid="input-pet-age" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Owner email" aria-label="Owner email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} data-testid="input-owner-email" />
                  <Input placeholder="Owner phone" aria-label="Owner phone" type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} data-testid="input-owner-phone" />
                </div>
                <p className="text-xs text-muted-foreground -mt-1">At least one contact method required to send the portrait.</p>
                <Textarea
                  placeholder="Tell people about this pet — personality, quirks, likes... (optional)"
                  value={petDescription}
                  onChange={(e) => setPetDescription(e.target.value)}
                  className="resize-none text-sm"
                  rows={3}
                  data-testid="input-pet-description"
                />
              </div>
            )}

            {speciesConfirmed && uploadedImage && noPackSelected && (
              <div>
                <h2 className="text-lg font-semibold mb-4" data-testid="text-section-pack">
                  Choose Today's Pack
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a portrait pack before choosing styles. This sets the pack for all pets today.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {packs.map((pack: any) => {
                    const isPreview = previewPackType === pack.type;
                    return (
                      <div
                        key={pack.type}
                        className={`rounded-lg border-2 transition-colors cursor-pointer ${isPreview ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        onClick={() => setPreviewPackType(isPreview ? null : pack.type)}
                      >
                        <div className="p-4 text-center">
                          <span className="font-semibold capitalize text-base">{pack.name}</span>
                          <p className="text-xs text-muted-foreground mt-1">{pack.description}</p>
                        </div>
                        {isPreview && pack.styles && (
                          <div className="px-3 pb-3">
                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                              {pack.styles.slice(0, 6).map((style: any) => {
                                const previewImg = stylePreviewImages[style.name];
                                return (
                                  <div key={style.id} className="text-center">
                                    <div className="aspect-square rounded bg-muted overflow-hidden">
                                      {previewImg ? (
                                        <img src={previewImg} alt={style.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Palette className="h-4 w-4 text-muted-foreground/30" />
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{style.name}</p>
                                  </div>
                                );
                              })}
                            </div>
                            <Button
                              className="w-full gap-2"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPackMutation.mutate(pack.type);
                              }}
                              disabled={setPackMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                              Use This Pack
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {speciesConfirmed && uploadedImage && !noPackSelected && packStyleIds && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" data-testid="text-section-style">
                    Pick a Style
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      apiRequest("DELETE", `/api/daily-pack?date=${today}&species=${effectiveSpecies}`).then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/daily-pack"] });
                        setSelectedStyle(null);
                      });
                    }}
                    data-testid="button-change-pack"
                  >
                    Change Pack
                  </Button>
                </div>
                <StyleSelector
                  selectedStyle={selectedStyle}
                  onSelectStyle={(s) => { setSelectedStyle(s); }}
                  species={effectiveSpecies}
                  allowedStyleIds={packStyleIds}
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-2 lg:sticky lg:top-20 self-start space-y-4">
            <h2 className="text-lg font-semibold">Preview</h2>

            {views.length > 1 && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Compare Views</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {views.map((view, index) => (
                      <div key={view.id} className="relative group">
                        <Button
                          variant={activeViewId === view.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSwitchView(view.id)}
                          className="gap-1"
                          data-testid={`button-view-${view.id}`}
                        >
                          View {index + 1}
                          <span className="text-xs opacity-70">({view.style.name})</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Switch between views to compare, then save the one you like best
                  </p>
                </CardContent>
              </Card>
            )}

            {editingDogId && uploadedImage && generatedImage && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 text-center">Original Photo</p>
                      <div className="aspect-square rounded-md border overflow-hidden protected-image-wrapper">
                        <img src={uploadedImage} alt={`${petName} original`} className="w-full h-full object-cover protected-image" draggable={false} data-testid="img-original-photo" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 text-center">Current Portrait</p>
                      <div className="aspect-square rounded-md border overflow-hidden protected-image-wrapper">
                        <img src={generatedImage} alt={`${petName} portrait`} className="w-full h-full object-cover protected-image" draggable={false} data-testid="img-current-portrait" />
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{petName}</p>
                    <p className="text-xs text-muted-foreground">
                      {petBreed || (effectiveSpecies === "cat" ? "Domestic" : "Mixed breed")}{petAge ? ` · ${petAge}` : ""}{displayStyle ? ` · ${displayStyle.name}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!editingDogId && uploadedImage && petName.trim() && selectedStyle && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md flex-shrink-0 border overflow-hidden">
                      <img src={uploadedImage} alt={petName} className="w-full h-full object-cover" data-testid="summary-pet-photo" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{petName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {petBreed || (effectiveSpecies === "cat" ? "Domestic" : "Mixed breed")}{petAge ? ` · ${petAge}` : ""} · {selectedStyle.name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {styleChanged && (
              <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full gap-2" size="lg" data-testid="button-generate-new-style">
                <Sparkles className="h-5 w-5" />
                {generateMutation.isPending ? "Generating..." : `Generate "${selectedStyle?.name}" Portrait`}
              </Button>
            )}

            <PortraitPreview
              generatedImage={generatedImage}
              isGenerating={generateMutation.isPending}
              isEditing={editMutation.isPending}
              selectedStyle={generateMutation.isPending ? selectedStyle : displayStyle}
              dogName={petName}
              onRegenerate={handleGenerate}
              onDownload={handleDownload}
              onEdit={(prompt) => editMutation.mutate(prompt)}
              editsUsed={activeView?.editsUsed || 0}
              maxEdits={MAX_EDITS_PER_VIEW}
            />

            {!hasViews && (
              <Button onClick={handleGenerate} disabled={!canGenerate || generateMutation.isPending} className="w-full gap-2" size="lg" data-testid="button-generate-preview">
                <Sparkles className="h-5 w-5" />
                {generateMutation.isPending ? "Generating..." : "Generate Preview"}
              </Button>
            )}

            {hasViews && canGenerate && (!activeView || selectedStyle?.id === activeView.style.id) && (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || (activeView ? activeView.editsUsed >= MAX_EDITS_PER_VIEW : false)}
                  variant="outline"
                  className="w-full gap-2"
                  data-testid="button-generate-another"
                >
                  <Sparkles className="h-4 w-4" />
                  {generateMutation.isPending ? "Regenerating..." : activeView && activeView.editsUsed >= MAX_EDITS_PER_VIEW ? "No edits remaining" : "Regenerate"}
                </Button>
                {activeView?.hasPreviousImage && activeView?.portraitId && (
                  <Button
                    onClick={() => revertMutation.mutate()}
                    disabled={revertMutation.isPending}
                    variant="outline"
                    className="w-full gap-2"
                    data-testid="button-revert-portrait"
                  >
                    <Undo2 className="h-4 w-4" />
                    {revertMutation.isPending ? "Reverting..." : "Undo - Restore Previous Image"}
                  </Button>
                )}
              </div>
            )}

            {generatedImage && (
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full gap-2" size="lg" data-testid="button-save-portrait">
                {saveMutation.isPending ? "Saving..." : views.length > 1 ? `Save View ${views.findIndex(v => v.id === activeViewId) + 1} to Gallery` : "Save to Gallery"}
              </Button>
            )}

            {editingDogId && !hasViews && (
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !petName.trim() || !petBreed}
                className="w-full gap-2"
                data-testid="button-save-info-only"
              >
                {saveMutation.isPending ? "Saving..." : "Save Info Changes"}
              </Button>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
