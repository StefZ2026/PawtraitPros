import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dog,
  Cat,
  ArrowLeft,
  ExternalLink,
  Heart,
  Printer,
  PawPrint,
  Shield,
} from "lucide-react";
import { useState, useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShareButtons } from "@/components/share-buttons";
import { AdminFloatingButton } from "@/components/admin-button";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { NextdoorIcon } from "@/components/nextdoor-icon";
import { useAuth } from "@/hooks/use-auth";
import type { Dog as DogType, Portrait } from "@shared/schema";

interface DogWithPortrait extends DogType {
  portrait?: Portrait;
}

interface RescueShowcaseData {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  socialFacebook: string | null;
  socialInstagram: string | null;
  socialTwitter: string | null;
  socialNextdoor: string | null;
  dogs: DogWithPortrait[];
}

export default function RescueShowcase() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { isAdmin } = useAuth();
  const showcaseRef = useRef<HTMLDivElement>(null);

  const { data: rescue, isLoading, error } = useQuery<RescueShowcaseData>({
    queryKey: ["/api/rescue", slug],
  });

  const [speciesFilter, setSpeciesFilter] = useState<"all" | "dog" | "cat">("all");

  const shareTitle = `${rescue?.name} - Pet Portraits`;
  const shareText = `Check out the beautiful pet portraits from ${rescue?.name}!`;

  const handlePrint = () => {
    window.print();
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
          <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-16 w-48 mx-auto" />
            <Skeleton className="h-6 w-64 mx-auto" />
            <div className="grid grid-cols-2 gap-4 mt-8">
              <Skeleton className="aspect-square rounded-md" />
              <Skeleton className="aspect-square rounded-md" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !rescue) {
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
          <Dog className="h-20 w-20 mx-auto mb-6 text-muted-foreground/50" />
          <h1 className="text-2xl font-serif font-bold mb-3">Business Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This page doesn't exist or is no longer active.
          </p>
          <Button data-testid="button-back-home" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasDogs = rescue.dogs.some(d => d.species !== "cat");
  const hasCats = rescue.dogs.some(d => d.species === "cat");
  const hasBoth = hasDogs && hasCats;

  const filteredPets = speciesFilter === "all"
    ? rescue.dogs
    : rescue.dogs.filter(d => speciesFilter === "cat" ? d.species === "cat" : d.species !== "cat");

  const dogsWithPortraits = filteredPets.filter(d => d.portrait?.generatedImageUrl);
  const dogsWithoutPortraits = filteredPets.filter(d => !d.portrait?.generatedImageUrl);

  const showcaseHeadline = speciesFilter === "dog"
    ? "Dog Portraits"
    : speciesFilter === "cat"
    ? "Cat Portraits"
    : "Pet Portraits";

  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b print:hidden">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary" data-testid="link-home">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" data-testid="link-gallery" asChild>
              <Link href="/gallery">Gallery</Link>
            </Button>
            {isAdmin && (
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

      <div className="container mx-auto px-4 py-6 print:py-0 print:px-0">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-4 print:hidden" data-testid="button-back" asChild>
          <Link href={isAdmin ? `/admin` : "/dashboard"}>
            <ArrowLeft className="h-4 w-4" />
            {isAdmin ? "Back to Admin" : "Back to Dashboard"}
          </Link>
        </Button>

        <div className="max-w-3xl mx-auto">
          <div
            ref={showcaseRef}
            className="paw-border bg-white dark:bg-card overflow-visible shadow-lg print:shadow-none"
            data-testid="showcase-card"
          >
           <div className="showcase-inner">
            <div className="pt-8 pb-5 px-6 text-center border-b-2 border-primary/15">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-primary tracking-wide mb-3" data-testid="text-rescue-name">
                {rescue.name}
              </h1>
              {rescue.logoUrl && (
                <div className="protected-image-wrapper max-h-28 max-w-[280px] mx-auto mb-3">
                  <img
                    src={rescue.logoUrl}
                    alt={rescue.name}
                    className="max-h-28 max-w-[280px] object-contain protected-image"
                    draggable={false}
                    data-testid="img-rescue-logo"
                  />
                </div>
              )}
              {rescue.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto" data-testid="text-rescue-description">
                  {rescue.description}
                </p>
              )}
              {rescue.websiteUrl && (
                <a
                  href={rescue.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2 print:hidden"
                  data-testid="link-rescue-website"
                >
                  <ExternalLink className="h-3 w-3" />
                  {rescue.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
              {(rescue.socialFacebook || rescue.socialInstagram || rescue.socialTwitter || rescue.socialNextdoor) && (
                <div className="flex items-center justify-center gap-3 mt-3 print:hidden" data-testid="section-social-links">
                  {rescue.socialFacebook && (
                    <a href={rescue.socialFacebook} target="_blank" rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-primary transition-colors" title="Facebook">
                      <SiFacebook className="h-5 w-5" />
                    </a>
                  )}
                  {rescue.socialInstagram && (
                    <a href={rescue.socialInstagram} target="_blank" rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-primary transition-colors" title="Instagram">
                      <SiInstagram className="h-5 w-5" />
                    </a>
                  )}
                  {rescue.socialTwitter && (
                    <a href={rescue.socialTwitter} target="_blank" rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-primary transition-colors" title="X (Twitter)">
                      <FaXTwitter className="h-5 w-5" />
                    </a>
                  )}
                  {rescue.socialNextdoor && (
                    <a href={rescue.socialNextdoor} target="_blank" rel="noopener noreferrer"
                       className="text-muted-foreground hover:text-primary transition-colors" title="Nextdoor">
                      <NextdoorIcon className="h-5 w-5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {rescue.dogs.length > 0 && (
              <div className="py-4 px-6 text-center">
                <h2 className="font-serif text-xl font-semibold text-foreground tracking-wide" data-testid="text-available-headline">
                  {showcaseHeadline}
                </h2>
                <div className="w-16 h-0.5 bg-primary/30 mx-auto mt-2 rounded-full" />
                {hasBoth && (
                  <div className="flex justify-center gap-2 mt-3 print:hidden">
                    <Button
                      variant={speciesFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSpeciesFilter("all")}
                      className="gap-1"
                      data-testid="button-showcase-filter-all"
                    >
                      <PawPrint className="h-3.5 w-3.5" />
                      All Pets
                    </Button>
                    <Button
                      variant={speciesFilter === "dog" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSpeciesFilter("dog")}
                      className="gap-1"
                      data-testid="button-showcase-filter-dogs"
                    >
                      <Dog className="h-3.5 w-3.5" />
                      Pups
                    </Button>
                    <Button
                      variant={speciesFilter === "cat" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSpeciesFilter("cat")}
                      className="gap-1"
                      data-testid="button-showcase-filter-cats"
                    >
                      <Cat className="h-3.5 w-3.5" />
                      Kitties
                    </Button>
                  </div>
                )}
              </div>
            )}

            {filteredPets.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <Heart className="h-12 w-12 mx-auto mb-4 text-primary/40" />
                <p className="text-muted-foreground font-serif text-lg">
                  {rescue.dogs.length === 0 ? "No pet portraits at the moment" : "No pets match this filter"}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {rescue.dogs.length === 0 ? "Check back soon!" : "Try viewing all pets instead"}
                </p>
              </div>
            ) : (
              <div className="p-4">
                <div className={`grid gap-3 ${
                  filteredPets.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
                  filteredPets.length <= 4 ? 'grid-cols-2' :
                  'grid-cols-2 sm:grid-cols-3'
                }`}>
                  {[...dogsWithPortraits, ...dogsWithoutPortraits].map((pet) => {
                    const imgUrl = pet.portrait?.generatedImageUrl || pet.originalPhotoUrl;
                    const petIsCat = pet.species === "cat";
                    return (
                      <Link key={pet.id} href={`/pawfile/${pet.id}`} className="block print:pointer-events-none">
                        <div
                          className="border border-primary/10 rounded-md overflow-hidden hover-elevate cursor-pointer"
                          data-testid={`card-dog-${pet.id}`}
                        >
                          <div className="relative aspect-square protected-image-wrapper">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={pet.name}
                                className="w-full h-full object-cover protected-image"
                                draggable={false}
                                data-testid={`img-dog-${pet.id}`}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                                {petIsCat ? <Cat className="h-10 w-10 text-muted-foreground/40" /> : <Dog className="h-10 w-10 text-muted-foreground/40" />}
                              </div>
                            )}
                          </div>
                          <div className="p-2 text-center bg-white dark:bg-card">
                            <p className="font-serif font-semibold text-sm truncate" data-testid={`text-dog-name-${pet.id}`}>
                              {pet.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {pet.breed || (petIsCat ? "Domestic" : "Mixed Breed")}{pet.age ? ` \u00B7 ${pet.age}` : ""}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t-2 border-primary/15 py-4 pb-6 px-6 flex flex-col items-center justify-center gap-3">
              {(rescue.contactEmail || rescue.contactPhone) && (
                <div className="text-center" data-testid="section-contact-footer">
                  <p className="text-sm font-serif font-semibold text-foreground mb-1">
                    For more information about any of these pets
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                    {rescue.contactEmail && (
                      <a href={`mailto:${rescue.contactEmail}`} className="text-primary hover:underline" data-testid="link-contact-email">
                        {rescue.contactEmail}
                      </a>
                    )}
                    {rescue.contactEmail && rescue.contactPhone && (
                      <span className="text-muted-foreground/40">|</span>
                    )}
                    {rescue.contactPhone && (
                      <a href={`tel:${rescue.contactPhone}`} className="text-primary hover:underline" data-testid="link-contact-phone">
                        {rescue.contactPhone}
                      </a>
                    )}
                  </div>
                </div>
              )}
              <span className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary"><span className="flex items-center gap-0.5"><Dog className="h-4 w-4" /><Cat className="h-4 w-4" /></span>Pawtrait Pros</span>
            </div>
           </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 print:hidden">
            <Button variant="outline" onClick={handlePrint} className="gap-2" data-testid="button-print">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
          <div className="mt-3 print:hidden">
            <p className="text-sm text-muted-foreground mb-2">Share this showcase:</p>
            <ShareButtons title={shareTitle} text={shareText} orgId={rescue.id} orgWebsiteUrl={rescue.websiteUrl || undefined} captureRef={showcaseRef} showcaseName={rescue.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
