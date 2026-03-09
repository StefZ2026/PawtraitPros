import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { ImageUpload } from "@/components/image-upload";
import { BreedSelector } from "@/components/breed-selector";
import {
  Dog, Cat, Plus, LogOut, Image, Crown,
  Sparkles, ExternalLink,
  Heart, Trash2, LogIn, Eye, X, Settings,
  Calendar, Palette, Send, Check, Camera, Loader2, Phone, Mail,
  ChevronDown, ChevronUp, Zap, Search, Users, Clock, AlertTriangle, RefreshCw, Archive, RotateCcw
} from "lucide-react";
import { PetLimitModal } from "@/components/pet-limit-modal";
import { stylePreviewImages } from "@/lib/portrait-styles";
import { GroupPortraitDialog } from "@/components/group-portrait-dialog";
import type { Organization, Dog as DogType } from "@shared/schema";
import type { Plan } from "./create-business";

export interface DogWithPortrait extends DogType {
  portrait?: {
    generatedImageUrl?: string;
    style?: { name: string };
  };
}

export interface OrgWithStats extends Organization {
  dogCount?: number;
  portraitCount?: number;
}

export function OrgDashboard({ organization, dogs, dogsLoading, trialDaysRemaining, isAdmin, onDeleteDog, onArchiveDog }: {
  organization: Organization | OrgWithStats;
  dogs: DogWithPortrait[];
  dogsLoading: boolean;
  trialDaysRemaining: number;
  isAdmin: boolean;
  onDeleteDog: (dogId: number) => void;
  onArchiveDog: (dogId: number, archive: boolean) => void;
}) {
  const { toast } = useToast();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ done: number; total: number } | null>(null);

  // All Pets search + expand + archived
  const [allPetsSearch, setAllPetsSearch] = useState("");
  const [showAllPets, setShowAllPets] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activeDogs = dogs.filter(d => d.isAvailable !== false);
  const archivedDogs = dogs.filter(d => d.isAvailable === false);

  // Quick-add client form state
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState<"dog" | "cat">("dog");
  const [newPetBreed, setNewPetBreed] = useState("");
  const [newPetOwnerPhone, setNewPetOwnerPhone] = useState("");
  const [newPetOwnerEmail, setNewPetOwnerEmail] = useState("");
  const [newPetPhoto, setNewPetPhoto] = useState<string | null>(null);
  const [newPetVisitFrequency, setNewPetVisitFrequency] = useState<string>("daily");
  const [newPetUpdatePreference, setNewPetUpdatePreference] = useState<string>("weekly");
  const [newPetStayNights, setNewPetStayNights] = useState<string>("");

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
  const visitPhotoLimit = industryType === "groomer" ? 3 : industryType === "daycare" ? 4 : 5;

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

  // Portrait Queue: dogs queued for portrait generation today
  const portraitQueueDogs = useMemo(() => {
    return activeDogs.filter(d => (d as any).portraitQueueDate === today);
  }, [activeDogs, today]);

  // Checked In: dogs physically present today but NOT in portrait queue
  const checkedInDogs = useMemo(() => {
    return activeDogs.filter(d => {
      const checkedIn = (d as any).checkedInAt;
      if (checkedIn !== today) return false;
      return (d as any).portraitQueueDate !== today;
    });
  }, [activeDogs, today]);

  // Keep todaysDogs as union for backward compat (visit photos, etc.)
  const todaysDogs = useMemo(() => {
    return [...portraitQueueDogs, ...checkedInDogs];
  }, [portraitQueueDogs, checkedInDogs]);

  // All Pets: not checked in today (for search/check-in)
  const allPetsExceptToday = useMemo(() => {
    const todaySet = new Set(todaysDogs.map(d => d.id));
    return activeDogs.filter(d => !todaySet.has(d.id));
  }, [activeDogs, todaysDogs]);

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

  const readyForGeneration = portraitQueueDogs.filter(d => d.originalPhotoUrl && !d.portrait?.generatedImageUrl);
  const generatedToday = portraitQueueDogs.filter(d => d.portrait?.generatedImageUrl);

  // Owner grouping: group today's dogs by normalized ownerEmail or ownerPhone
  const ownerGroups = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const dog of todaysDogs) {
      const email = (dog as any).ownerEmail?.trim().toLowerCase() || null;
      const phone = (dog as any).ownerPhone?.replace(/\D/g, '') || null;
      const key = email || phone;
      if (!key) continue;
      let found = false;
      for (const [gKey, ids] of groups) {
        const firstDog = todaysDogs.find(d => d.id === ids[0]);
        if (!firstDog) continue;
        const gEmail = (firstDog as any).ownerEmail?.trim().toLowerCase() || null;
        const gPhone = (firstDog as any).ownerPhone?.replace(/\D/g, '') || null;
        if ((email && gEmail && email === gEmail) || (phone && gPhone && phone === gPhone)) {
          ids.push(dog.id);
          found = true;
          break;
        }
      }
      if (!found) groups.set(key + '-' + dog.id, [dog.id]);
    }
    return groups;
  }, [todaysDogs]);

  // Set of dogIds that have a same-owner sibling also checked in today
  const groupedDogIds = useMemo(() => {
    const ids = new Set<number>();
    for (const [, dogIds] of ownerGroups) {
      if (dogIds.length >= 2) {
        for (const id of dogIds) ids.add(id);
      }
    }
    return ids;
  }, [ownerGroups]);

  // Get sibling dog ids for a given dog
  const getSiblingIds = (dogId: number): number[] => {
    for (const [, ids] of ownerGroups) {
      if (ids.includes(dogId) && ids.length >= 2) {
        return ids;
      }
    }
    return [];
  };

  // Group portrait dialog state
  const [groupPortraitDogs, setGroupPortraitDogs] = useState<number[]>([]);
  const [showGroupPortraitDialog, setShowGroupPortraitDialog] = useState(false);

  // Same-owner check-in suggestions
  const { data: ownerSuggestions } = useQuery({
    queryKey: ["/api/organizations", organization?.id, "same-owner-suggestions", today],
    queryFn: async () => {
      if (!organization?.id) return { suggestions: [] };
      const res = await apiRequest("GET", `/api/organizations/${organization.id}/same-owner-suggestions?date=${today}`);
      return res.json();
    },
    enabled: !!organization?.id,
    refetchInterval: 30000,
  });

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
  const [messageTemplate, setMessageTemplate] = useState(
    "Hi from {orgName}! We created a portrait of {dogName} and it's ready for you. View it and order a keepsake: {link}"
  );

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

  // Check out a pet (remove from today's clients)
  const checkOutMutation = useMutation({
    mutationFn: async (dogId: number) => {
      return apiRequest("POST", `/api/dogs/${dogId}/check-out`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({ title: "Checked out", description: "Pet removed from today's list." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add pet to portrait queue
  const queuePortraitMutation = useMutation({
    mutationFn: async (dogId: number) => {
      return apiRequest("POST", `/api/dogs/${dogId}/queue-portrait`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({ title: "Queued", description: "Pet added to portrait queue." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Remove pet from portrait queue
  const dequeuePortraitMutation = useMutation({
    mutationFn: async (dogId: number) => {
      return apiRequest("POST", `/api/dogs/${dogId}/dequeue-portrait`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({ title: "Removed", description: "Pet removed from portrait queue." });
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
        breed: newPetBreed,
        ownerPhone: newPetOwnerPhone || undefined,
        ownerEmail: newPetOwnerEmail || undefined,
        originalPhotoUrl: newPetPhoto || undefined,
      };
      if (industryType === "daycare") {
        body.visitFrequency = newPetVisitFrequency;
      }
      if (industryType === "boarding" && newPetStayNights) {
        body.stayNights = parseInt(newPetStayNights, 10);
      }
      if (isAdmin) body.organizationId = organization.id;
      return apiRequest("POST", "/api/dogs", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      setShowAddClient(false);
      setNewPetName("");
      setNewPetBreed("");
      setNewPetOwnerPhone("");
      setNewPetOwnerEmail("");
      setNewPetPhoto(null);
      setNewPetVisitFrequency("daily");
      setNewPetUpdatePreference("weekly");
      setNewPetStayNights("");
      toast({ title: "Client added!", description: `${newPetName} has been checked in.` });
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

      {/* Trial warning banner */}
      {organization.subscriptionStatus === 'trial' && organization.trialEndsAt && (
        <div className={`rounded-lg px-4 py-3 flex items-center justify-between gap-3 text-sm ${
          trialDaysRemaining <= 3 ? 'bg-red-50 border border-red-200 text-red-800'
          : trialDaysRemaining <= 7 ? 'bg-orange-50 border border-orange-200 text-orange-800'
          : 'bg-amber-50 border border-amber-200 text-amber-800'
        }`}>
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            {trialDaysRemaining === 0
              ? 'Your free trial has expired. Upgrade to continue adding clients.'
              : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left in your free trial.`}
          </span>
          <Link href="/choose-plan">
            <Button size="sm" variant="outline" className="shrink-0 whitespace-nowrap">Upgrade Now</Button>
          </Link>
        </div>
      )}

      {/* Capacity warning banner (at 80%+) */}
      {petLimit != null && petCount >= Math.floor(petLimit * 0.8) && (
        <div className={`rounded-lg px-4 py-3 flex items-center justify-between gap-3 text-sm ${
          petCount >= petLimit ? 'bg-red-50 border border-red-200 text-red-800'
          : 'bg-amber-50 border border-amber-200 text-amber-800'
        }`}>
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {petCount >= petLimit
              ? `You've reached your ${petLimit}-client limit. Upgrade your plan to add more.`
              : `${petCount} of ${petLimit} client slots used — you're approaching your limit.`}
          </span>
          <Link href="/choose-plan">
            <Button size="sm" variant="outline" className="shrink-0 whitespace-nowrap">Upgrade</Button>
          </Link>
        </div>
      )}

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
                <>
                  <Badge className="capitalize">{selectedPackType} Pack</Badge>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                    const orgQuery = isAdmin ? `&orgId=${organization.id}` : "";
                    apiRequest("DELETE", `/api/daily-pack?date=${today}&species=${packSpecies}${orgQuery}`).then(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/daily-pack"] });
                    });
                  }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Change Pack
                  </Button>
                </>
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

      {/* SECTION 2: Portrait Queue */}
      <div>
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Portrait Queue
            <Badge variant="secondary">{portraitQueueDogs.length}</Badge>
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
            {organization.slug && (
              <Button variant="ghost" size="sm" className="gap-1" asChild>
                <Link href={`/business/${organization.slug}`}><Eye className="h-3.5 w-3.5" /> Showcase</Link>
              </Button>
            )}
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
                    <label className="text-sm font-medium mb-1 block">Breed *</label>
                    <BreedSelector species={newPetSpecies} value={newPetBreed} onChange={setNewPetBreed} />
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
                  {/* Daycare-specific: visit frequency */}
                  {industryType === "daycare" && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">How often do they visit?</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { value: "daily", label: "Daily" },
                          { value: "several_weekly", label: "Several/wk" },
                          { value: "weekly", label: "Weekly" },
                          { value: "occasional", label: "Occasional" },
                        ].map((opt) => (
                          <Button
                            key={opt.value}
                            variant={newPetVisitFrequency === opt.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNewPetVisitFrequency(opt.value)}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Occasional visitors get a portrait on check-out.</p>
                    </div>
                  )}
                  {/* Boarding-specific: number of nights */}
                  {industryType === "boarding" && (
                    <div>
                      <label className="text-sm font-medium mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Number of Nights</label>
                      <Input
                        type="number"
                        min="1"
                        max="90"
                        placeholder="e.g. 5"
                        value={newPetStayNights}
                        onChange={(e) => setNewPetStayNights(e.target.value)}
                      />
                      {newPetStayNights && parseInt(newPetStayNights) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {parseInt(newPetStayNights) <= 3
                            ? "1 portrait on checkout day"
                            : parseInt(newPetStayNights) <= 7
                            ? "2 portraits spaced across the stay"
                            : parseInt(newPetStayNights) <= 14
                            ? "3 portraits spaced across the stay"
                            : `${Math.ceil(parseInt(newPetStayNights) / 14) * 3} portraits across the stay`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium mb-1 block">Photo *</label>
                  <ImageUpload onImageUpload={(img) => setNewPetPhoto(img)} currentImage={newPetPhoto ?? null} onClear={() => setNewPetPhoto(null)} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => addClientMutation.mutate()}
                  disabled={!newPetName || !newPetBreed || !newPetPhoto || addClientMutation.isPending || (industryType === "boarding" && !newPetStayNights)}
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

        {/* Same-owner check-in suggestions */}
        {(ownerSuggestions?.suggestions || []).length > 0 && (
          <div className="space-y-2 mb-4">
            {ownerSuggestions.suggestions.map((s: any) => (
              <div key={`${s.checkedInDog.id}-${s.suggestedDog.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <Users className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm flex-1">
                  <strong>{s.suggestedDog.name}</strong> has the same owner as <strong>{s.checkedInDog.name}</strong>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1"
                  onClick={() => checkInMutation.mutate(s.suggestedDog.id)}
                  disabled={checkInMutation.isPending}
                >
                  <LogIn className="h-3 w-3" /> Check In
                </Button>
              </div>
            ))}
          </div>
        )}

        {dogsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : portraitQueueDogs.length === 0 ? (
          <Card className="py-8">
            <CardContent className="text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-medium mb-1">Portrait queue is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">Check in pets below, then add them to the queue</p>
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
            {portraitQueueDogs.map((dog) => (
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
                    <button
                      className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 hover:bg-red-500 flex items-center justify-center shadow transition-colors z-10"
                      title="Remove from portrait queue"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dequeuePortraitMutation.mutate(dog.id);
                      }}
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
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
                  {/* Group Portrait button — only shown when sibling is also checked in */}
                  {groupedDogIds.has(dog.id) && (
                    <div className="px-2 pt-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 h-7 text-xs border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950"
                        onClick={() => {
                          const siblings = getSiblingIds(dog.id);
                          setGroupPortraitDogs(siblings);
                          setShowGroupPortraitDialog(true);
                        }}
                      >
                        <Users className="h-3 w-3" /> Group Portrait
                      </Button>
                    </div>
                  )}
                  <div className="p-2 pt-1 flex items-center gap-1">
                    {(dog as any).ownerPhone && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 truncate">
                        <Phone className="h-3 w-3" /> {(dog as any).ownerPhone}
                      </span>
                    )}
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onArchiveDog(dog.id, true);
                      }}
                    >
                      <Archive className="h-3 w-3" /> Archive
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/50 hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Permanently delete ${dog.name} and all portraits?`)) onDeleteDog(dog.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
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
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <button
                      className="p-6 rounded-lg border-2 border-border hover:border-primary/40 transition-colors text-center"
                      onClick={() => {
                        const styles = selectedPack?.styles || [];
                        if (styles.length === 0) return;
                        const dogs = readyForGeneration.filter(d => selectedPetIds.has(d.id));
                        const newAssignments = new Map<number, number>();
                        dogs.forEach((dog, i) => {
                          newAssignments.set(dog.id, styles[i % styles.length].id);
                        });
                        setStyleAssignments(newAssignments);
                        setStyleMode("individual");
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
                  <div>
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      {deliveryResults.some(r => r.method === "queued_native") ? "Queued for Your Phone" : "Delivery Complete"}
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
                                  ) : result.method === "queued_native" ? (
                                    <><strong>Queued</strong> — <a href="/send-queue" className="underline text-primary">open Send Queue</a> on your phone to send to {ownerLabel}</>
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
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Send to Clients</h3>
                    <p className="text-sm text-muted-foreground mb-2">Customize your message, then send to all selected clients.</p>

                    <div className="mb-4">
                      <label className="text-sm font-medium mb-1 block">Message Template</label>
                      <Textarea
                        value={messageTemplate}
                        onChange={(e) => setMessageTemplate(e.target.value)}
                        rows={3}
                        className="resize-none text-sm"
                        placeholder="Type your message..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use <code className="bg-muted px-1 rounded">{"{dogName}"}</code>, <code className="bg-muted px-1 rounded">{"{orgName}"}</code>, and <code className="bg-muted px-1 rounded">{"{link}"}</code> — they'll be replaced for each pet.
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      {todaysDogs.filter(d => d.portrait?.generatedImageUrl && selectedPetIds.has(d.id)).map(dog => {
                        const isDeliverySelected = deliverySelections.has(dog.id);
                        const phone = (dog as any).ownerPhone;
                        const email = (dog as any).ownerEmail;
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
                                      if (!updated.sms && !updated.email) return;
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
                                      if (!updated.sms && !updated.email) return;
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
                                messageTemplate: messageTemplate.trim() || undefined,
                              }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              if (data.method === "native") {
                                // Messages queued for companion app — show queued status
                                const nativeResults = (data.queued || []).map((q: any) => ({
                                  dogId: q.dogId,
                                  sent: true,
                                  method: "queued_native",
                                }));
                                const nativeErrors = (data.errors || []).map((e: any) => ({
                                  dogId: e.dogId,
                                  sent: false,
                                  error: e.error,
                                }));
                                setDeliveryResults([...nativeResults, ...nativeErrors]);
                                if (data.totalQueued > 0) {
                                  toast({
                                    title: "Queued for Your Phone",
                                    description: `${data.totalQueued} message${data.totalQueued !== 1 ? "s" : ""} ready — open Send Queue on your phone to send from your number.`,
                                  });
                                }
                              } else {
                                setDeliveryResults(data.results || []);
                              }
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

      {/* SECTION 3: Checked In (physically present, not in portrait queue) */}
      {checkedInDogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <LogIn className="h-5 w-5 text-amber-500" />
              Checked In
              <Badge variant="secondary">{checkedInDogs.length}</Badge>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {checkedInDogs.map((dog) => (
              <div key={dog.id} className="flex items-center gap-3 p-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors">
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
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs border-primary/50 text-primary hover:bg-primary/10"
                    onClick={() => queuePortraitMutation.mutate(dog.id)}
                    disabled={queuePortraitMutation.isPending}
                  >
                    <Sparkles className="h-3 w-3" />
                    Queue
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs text-muted-foreground"
                    onClick={() => checkOutMutation.mutate(dog.id)}
                    disabled={checkOutMutation.isPending}
                  >
                    <LogOut className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Pets — searchable, expandable */}
      {allPetsExceptToday.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">All Pets ({allPetsExceptToday.length})</h2>
          </div>

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
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => checkInMutation.mutate(dog.id)}
                    disabled={checkInMutation.isPending}
                  >
                    <LogIn className="h-3 w-3" />
                    Check In
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => onArchiveDog(dog.id, true)}
                    title="Archive pet"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive/50 hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Permanently delete ${dog.name} and all portraits?`)) onDeleteDog(dog.id);
                    }}
                    title="Delete pet permanently"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {allPetsSearch && filteredAllPets.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pets found matching "{allPetsSearch}"
            </p>
          )}

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

      {/* Archived Pets */}
      {archivedDogs.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground mb-2"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-4 w-4" />
            Archived Pets ({archivedDogs.length})
            {showArchived ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          {showArchived && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {archivedDogs.map((dog) => (
                <div key={dog.id} className="flex items-center gap-3 p-2 rounded-lg border border-dashed opacity-70 hover:opacity-100 transition-opacity">
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
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => onArchiveDog(dog.id, false)}
                    >
                      <RotateCcw className="h-3 w-3" /> Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/50 hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Permanently delete ${dog.name} and all portraits?`)) onDeleteDog(dog.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
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
      <GroupPortraitDialog
        open={showGroupPortraitDialog}
        onOpenChange={setShowGroupPortraitDialog}
        dogIds={groupPortraitDogs}
        dogs={todaysDogs}
        styles={selectedPack?.styles || []}
        organizationId={organization.id}
      />
    </div>
  );
}
