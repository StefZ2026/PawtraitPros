import { Link, useParams, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dog,
  Cat,
  ArrowLeft,
  Heart,
  Phone,
  Mail,
  Printer,
  Pencil,
  Download,
  Loader2,
  ShoppingBag,
  Palette,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareButtons } from "@/components/share-buttons";
import { AdminFloatingButton } from "@/components/admin-button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { Dog as DogType, Portrait, Organization } from "@shared/schema";

interface DogWithPortrait extends DogType {
  portrait?: Portrait;
  portraits?: Portrait[];
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  organizationWebsiteUrl?: string | null;
}

export default function DogProfile() {
  const params = useParams<{ id: string; petCode: string }>();
  const [isCodeRoute] = useRoute("/pawfile/code/:petCode");
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [activePortraitIdx, setActivePortraitIdx] = useState(0);

  // Determine access mode
  const isCustomerView = !!isCodeRoute;
  const petCode = params.petCode;
  const dogId = params.id;

  // Fetch by pet code (public) or by ID (auth)
  const { data: dog, isLoading, error } = useQuery<DogWithPortrait>({
    queryKey: isCustomerView ? ["/api/dogs/code", petCode] : ["/api/dogs", dogId],
    queryFn: async () => {
      const url = isCustomerView ? `/api/dogs/code/${petCode}` : `/api/dogs/${dogId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: myOrg } = useQuery<Organization>({
    queryKey: ["/api/my-organization"],
    enabled: isAuthenticated && !isCustomerView,
  });

  const canEdit = !isCustomerView && isAuthenticated && (isAdmin || (myOrg && dog?.organizationId === myOrg.id));

  // Create customer session for "Order a Keepsake" (uses public endpoint for customer view)
  const orderSessionMutation = useMutation({
    mutationFn: async () => {
      if (!dog?.petCode) throw new Error("No pet code available");
      const res = await fetch("/api/customer-session/from-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petCode: dog.petCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to create session" }));
        throw new Error(data.error);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.token) {
        window.location.href = `/order/${data.token}`;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const queryClient = useQueryClient();

  // Fetch available pack styles for customer style switching
  const { data: packData } = useQuery<{
    packs: Array<{
      type: string;
      name: string;
      styles: Array<{ id: number; name: string; category: string; generated: boolean }>;
    }>;
  }>({
    queryKey: ["/api/dogs/code", petCode, "styles"],
    queryFn: async () => {
      const res = await fetch(`/api/dogs/code/${petCode}/styles`);
      if (!res.ok) throw new Error("Failed to fetch styles");
      return res.json();
    },
    enabled: isCustomerView && !!petCode,
  });

  // Generate portrait with a new style
  const [generatingStyleId, setGeneratingStyleId] = useState<number | null>(null);
  const styleGenMutation = useMutation({
    mutationFn: async (styleId: number) => {
      setGeneratingStyleId(styleId);
      const res = await fetch(`/api/dogs/code/${petCode}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(data.error);
      }
      return res.json();
    },
    onSuccess: () => {
      // Refetch dog data to get the new portrait
      queryClient.invalidateQueries({ queryKey: ["/api/dogs/code", petCode] });
      queryClient.invalidateQueries({ queryKey: ["/api/dogs/code", petCode, "styles"] });
      setGeneratingStyleId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
      setGeneratingStyleId(null);
    },
  });

  const isCat = dog?.species === "cat";
  const businessName = dog?.organizationName;
  const shareTitle = `${dog?.name}'s Pawfile${businessName ? ` from ${businessName}` : ''}`;
  const shareText = `Check out ${dog?.name}'s beautiful portrait${businessName ? ` from ${businessName}` : ''}! A gorgeous ${dog?.breed || (isCat ? "cat" : "dog")}.`;

  // Multiple portraits support
  const allPortraits = dog?.portraits || (dog?.portrait ? [dog.portrait] : []);
  const activePortrait = allPortraits[activePortraitIdx] || allPortraits[0];

  const handlePrint = () => {
    window.print();
  };

  const handleSavePawfile = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${dog?.name || "pawfile"}-pawfile.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Pawfile Saved!", description: `${dog?.name}'s pawfile has been downloaded.` });
    } catch (err) {
      console.error("Failed to save pawfile:", err);
      toast({ title: "Save Failed", description: "Could not save the pawfile image. Try the Print button instead.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b print:hidden">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary">
              <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto">
            <Skeleton className="aspect-[4/5] rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !dog) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary">
              <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <Heart className="h-20 w-20 mx-auto mb-6 text-muted-foreground/50" />
          <h1 className="text-2xl font-serif font-bold mb-3">Pet Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {isCustomerView
              ? "This pet code may be incorrect or expired. Check your text/email for the correct link."
              : "This pet could not be found."
            }
          </p>
          {isCustomerView ? (
            <Button data-testid="button-try-portal" asChild>
              <Link href="/portal">Try Another Code</Link>
            </Button>
          ) : (
            <Button data-testid="button-back-to-gallery" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const imageUrl = activePortrait?.generatedImageUrl || dog.originalPhotoUrl;

  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b print:hidden">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary" data-testid="link-home-profile">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
          </Link>
          <div className="flex items-center gap-2">
            {!isCustomerView && (
              <Button variant="ghost" size="sm" data-testid="link-gallery-profile" asChild>
                <Link href="/gallery">Gallery</Link>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {!isCustomerView && <AdminFloatingButton />}

      <div className="container mx-auto px-4 py-6 print:py-0 print:px-0">
        {!isCustomerView && (
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-4 print:hidden" data-testid="button-back-dashboard" asChild>
            <Link href={isAdmin ? `/dashboard?org=${dog.organizationId}` : "/dashboard"}>
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        )}
        {isCustomerView && (
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-4 print:hidden" asChild>
            <Link href="/portal">
              <ArrowLeft className="h-4 w-4" />
              Look up another pet
            </Link>
          </Button>
        )}

        <div className="max-w-lg mx-auto">
          <div
            ref={cardRef}
            className="bg-white dark:bg-card border-[3px] border-primary/20 dark:border-primary/30 rounded-lg overflow-hidden shadow-lg print:shadow-none print:border-[3px] print:rounded-none"
            data-testid="showcase-card"
          >
            {dog.organizationLogoUrl ? (
              <div className="flex items-center justify-center py-5 px-6 border-b border-primary/10">
                <img
                  src={dog.organizationLogoUrl}
                  alt={dog.organizationName || "Business"}
                  className="max-h-16 max-w-[200px] object-contain"
                  data-testid="img-org-logo"
                />
              </div>
            ) : dog.organizationName ? (
              <div className="flex items-center justify-center py-4 px-6 border-b border-primary/10">
                <h2 className="font-serif text-lg font-semibold text-primary tracking-wide" data-testid="text-org-header">
                  {dog.organizationName}
                </h2>
              </div>
            ) : null}

            <div className="relative">
              <div className="p-3">
                <div className="border-2 border-primary/10 rounded-md overflow-hidden protected-image-wrapper">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${dog.name} portrait`}
                      className="w-full aspect-square object-cover protected-image"
                      draggable={false}
                      data-testid="img-dog-portrait"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      {isCat ? <Cat className="h-24 w-24 text-muted-foreground/50" /> : <Dog className="h-24 w-24 text-muted-foreground/50" />}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Portrait carousel thumbnails (when multiple portraits) */}
            {allPortraits.length > 1 && (
              <div className="px-3 pb-2 flex gap-2 overflow-x-auto">
                {allPortraits.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePortraitIdx(idx)}
                    className={`w-14 h-14 rounded border-2 overflow-hidden shrink-0 transition-colors ${
                      idx === activePortraitIdx ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={p.generatedImageUrl || dog.originalPhotoUrl || ""}
                      alt={`Style ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="px-6 pb-2 pt-1 text-center">
              <h1 className="font-serif text-3xl font-bold text-foreground" data-testid="text-dog-name">
                {dog.name}
              </h1>
              <div className="flex items-center justify-center gap-3 mt-1 text-muted-foreground text-sm flex-wrap">
                {dog.breed && <span data-testid="text-dog-breed">{dog.breed}</span>}
                {dog.breed && dog.age && <span className="text-primary/30">|</span>}
                {dog.age && <span data-testid="text-dog-age">{dog.age}</span>}
              </div>
            </div>

            {dog.description && (
              <div className="px-6 pb-3 text-center">
                <p className="text-sm text-muted-foreground italic leading-relaxed" data-testid="text-dog-description">
                  "{dog.description}"
                </p>
              </div>
            )}

            {/* Owner contact info (staff view only) */}
            {canEdit && (dog.ownerEmail || dog.ownerPhone) && (
              <div className="px-6 pb-3 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                {dog.ownerPhone && (
                  <a href={`tel:${dog.ownerPhone}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                    <Phone className="h-3.5 w-3.5" />
                    {dog.ownerPhone}
                  </a>
                )}
                {dog.ownerEmail && (
                  <a href={`mailto:${dog.ownerEmail}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                    {dog.ownerEmail}
                  </a>
                )}
              </div>
            )}

            {/* Pet code badge */}
            {dog.petCode && (
              <div className="px-6 pb-4 text-center">
                <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium font-mono">
                  {dog.petCode}
                </div>
              </div>
            )}

            <div className="border-t border-primary/10 py-2.5 px-6 flex items-center justify-center gap-2">
              {isCat ? <Cat className="h-3.5 w-3.5 text-primary/60" /> : <Dog className="h-3.5 w-3.5 text-primary/60" />}
              <span className="text-xs text-muted-foreground/70 font-serif tracking-wider">
                Pawtrait Pros
              </span>
            </div>
          </div>

          {/* Customer-facing: Style picker + Order CTA */}
          {isCustomerView && (
            <div className="mt-4 print:hidden space-y-4">
              {/* Style picker — try other styles from the pack */}
              {packData?.packs && packData.packs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">Try a different style</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {packData.packs.flatMap(pack =>
                      pack.styles
                        .filter((s) => s.id !== activePortrait?.styleId)
                        .slice(0, 5)
                        .map((style) => (
                          <button
                            key={style.id}
                            onClick={() => styleGenMutation.mutate(style.id)}
                            disabled={generatingStyleId !== null}
                            className={`relative rounded-lg border-2 p-3 text-center transition-all hover:border-primary/50 hover:bg-primary/5 ${
                              generatingStyleId === style.id ? "border-primary bg-primary/10" : "border-muted"
                            }`}
                          >
                            {generatingStyleId === style.id ? (
                              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1 text-primary" />
                            ) : style.generated ? (
                              <Sparkles className="h-5 w-5 mx-auto mb-1 text-primary" />
                            ) : (
                              <Palette className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                            )}
                            <span className="text-xs font-medium leading-tight block">{style.name}</span>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* Order a Keepsake */}
              {activePortrait?.generatedImageUrl && (
                <div>
                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => orderSessionMutation.mutate()}
                    disabled={orderSessionMutation.isPending}
                  >
                    {orderSessionMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ShoppingBag className="h-5 w-5" />
                    )}
                    Order a Keepsake
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Framed prints, mugs, tote bags, and more
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Staff: Edit button */}
          {canEdit && (
            <div className="mt-4 print:hidden">
              <Button variant="outline" className="w-full gap-2" data-testid="button-edit-dog" asChild>
                <Link href={isAdmin ? `/create?dog=${dog.id}&org=${dog.organizationId}` : `/create?dog=${dog.id}`}>
                  <Pencil className="h-4 w-4" />
                  Edit {dog.name}'s Info & Style
                </Link>
              </Button>
            </div>
          )}

          {/* Save/Print — staff only, not customer view */}
          {!isCustomerView && (
            <div className="flex flex-wrap gap-2 mt-2 print:hidden">
              <Button variant="outline" onClick={handleSavePawfile} disabled={saving} className="gap-2" data-testid="button-save-pawfile">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Save Pawfile
              </Button>
              <Button variant="outline" onClick={handlePrint} className="gap-2" data-testid="button-print">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          )}

          {!isCustomerView && (
            <div className="mt-3 print:hidden">
              <p className="text-sm text-muted-foreground mb-2">Share {dog.name}'s pawfile:</p>
              <ShareButtons title={shareTitle} text={shareText} dogId={dog.id} dogName={dog.name} dogBreed={dog.breed || undefined} orgId={dog.organizationId} orgWebsiteUrl={dog.organizationWebsiteUrl || undefined} captureRef={cardRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
