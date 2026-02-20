import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dog,
  Cat,
  ArrowLeft,
  ExternalLink,
  Heart,
  Printer,
  Pencil,
  Download,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareButtons } from "@/components/share-buttons";
import { AdminFloatingButton } from "@/components/admin-button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { Dog as DogType, Portrait, Organization } from "@shared/schema";

interface DogWithPortrait extends DogType {
  portrait?: Portrait;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  organizationWebsiteUrl?: string | null;
}

export default function DogProfile() {
  const params = useParams<{ id: string }>();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const dogId = params.id;

  const { data: dog, isLoading, error } = useQuery<DogWithPortrait>({
    queryKey: ["/api/dogs", dogId],
  });

  const { data: myOrg } = useQuery<Organization>({
    queryKey: ["/api/my-organization"],
    enabled: isAuthenticated,
  });

  const canEdit = isAuthenticated && (isAdmin || (myOrg && dog?.organizationId === myOrg.id));

  const isCat = dog?.species === "cat";
  const speciesWord = isCat ? "cat" : "dog";
  const rescueName = dog?.organizationName;
  const shareTitle = `${dog?.name}'s Pawfile${rescueName ? ` from ${rescueName}` : ''} - Available for Adoption`;
  const shareText = `Meet ${dog?.name}, a beautiful ${dog?.breed || (isCat ? "cat" : "dog")} looking for a forever home${rescueName ? ` through ${rescueName}` : ''}!`;

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
            This pet might have already found their forever home!
          </p>
          <Button data-testid="button-back-to-gallery" asChild>
            <Link href="/dashboard">Back to My Rescue</Link>
          </Button>
        </div>
      </div>
    );
  }

  const imageUrl = dog.portrait?.generatedImageUrl || dog.originalPhotoUrl;

  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b print:hidden">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary" data-testid="link-home-profile">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" data-testid="link-gallery-profile" asChild>
              <Link href="/gallery">Gallery</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <AdminFloatingButton />

      <div className="container mx-auto px-4 py-6 print:py-0 print:px-0">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-4 print:hidden" data-testid="button-back-dashboard" asChild>
          <Link href={isAdmin ? `/dashboard?org=${dog.organizationId}` : "/dashboard"}>
            <ArrowLeft className="h-4 w-4" />
            Back to My Rescue
          </Link>
        </Button>

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
                  alt={dog.organizationName || "Rescue"}
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

            {dog.isAvailable && (
              <div className="px-6 pb-4 text-center">
                {dog.adoptionUrl ? (
                  <a
                    href={dog.adoptionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg text-base font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
                    data-testid="link-adopt"
                  >
                    <Heart className="h-4 w-4" />
                    Learn More & Adopt
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
                    <Heart className="h-3.5 w-3.5" />
                    Available for Adoption
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-primary/10 py-2.5 px-6 flex items-center justify-center gap-2">
              {isCat ? <Cat className="h-3.5 w-3.5 text-primary/60" /> : <Dog className="h-3.5 w-3.5 text-primary/60" />}
              <span className="text-xs text-muted-foreground/70 font-serif tracking-wider">
                Pawtrait Pros
              </span>
            </div>
          </div>

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
          <div className="mt-3 print:hidden">
            <p className="text-sm text-muted-foreground mb-2">Share {dog.name}'s pawfile:</p>
            <ShareButtons title={shareTitle} text={shareText} dogId={dog.id} dogName={dog.name} dogBreed={dog.breed || undefined} orgId={dog.organizationId} adoptionUrl={dog.adoptionUrl || undefined} orgWebsiteUrl={dog.organizationWebsiteUrl || undefined} captureRef={cardRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
