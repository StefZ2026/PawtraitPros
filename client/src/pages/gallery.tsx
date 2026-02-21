import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dog, Cat, Plus, ExternalLink, Palette, Heart } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminFloatingButton } from "@/components/admin-button";
import { useAuth } from "@/hooks/use-auth";
import type { Dog as DogType, Portrait, PortraitStyle, Organization } from "@shared/schema";

interface DogWithPortrait extends DogType {
  portrait?: Portrait & { style?: PortraitStyle };
}

export default function Gallery() {
  const { user } = useAuth();
  const [speciesFilter, setSpeciesFilter] = useState<"all" | "dog" | "cat">("all");
  
  const { data: dogs, isLoading, error } = useQuery<DogWithPortrait[]>({
    queryKey: ["/api/dogs"],
  });

  const { data: organization } = useQuery<Organization>({
    queryKey: ["/api/my-organization"],
    enabled: !!user,
  });

  const isLoggedIn = !!user && !!organization;

  const filteredDogs = dogs?.filter(d => speciesFilter === "all" || d.species === speciesFilter) || [];

  const hasDogs = dogs?.some(d => d.species === "dog");
  const hasCats = dogs?.some(d => d.species === "cat");
  const showSpeciesFilter = hasDogs && hasCats;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary" data-testid="link-home-gallery">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros
          </Link>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1" data-testid="button-add-pet" asChild>
              <Link href="/create">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Pet</span>
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <AdminFloatingButton />

      <div className="container mx-auto px-4 py-8">
        {isLoggedIn && organization && (
          <div className="flex flex-col items-center mb-8 pb-6 border-b">
            {organization.logoUrl ? (
              <div className="protected-image-wrapper h-20 w-20 rounded-lg mb-4">
                <img 
                  src={organization.logoUrl} 
                  alt={`${organization.name} logo`}
                  className="h-full w-full object-contain protected-image"
                  draggable={false}
                  data-testid="img-org-logo"
                />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-10 w-10 text-primary" />
              </div>
            )}
            <h2 className="text-2xl font-serif font-bold text-center" data-testid="text-org-name">
              {organization.name}
            </h2>
            {organization.description && (
              <p className="text-muted-foreground text-center max-w-lg mt-2">
                {organization.description}
              </p>
            )}
            {organization.websiteUrl && (
              <a 
                href={organization.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                data-testid="link-org-website"
              >
                <ExternalLink className="h-3 w-3" />
                Visit our website
              </a>
            )}
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">
            {isLoggedIn ? "Pet Portraits" : "Portrait Gallery"}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {isLoggedIn
              ? "Beautiful AI portraits of your clients' pets"
              : "Stunning AI-generated pet portraits by Pawtrait Pros"
            }
          </p>
        </div>

        {showSpeciesFilter && !isLoading && (
          <div className="flex justify-center gap-2 mb-8" data-testid="species-filter-tabs">
            <Button
              variant={speciesFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSpeciesFilter("all")}
              data-testid="button-filter-all"
            >
              All Pets
            </Button>
            <Button
              variant={speciesFilter === "dog" ? "default" : "outline"}
              size="sm"
              onClick={() => setSpeciesFilter("dog")}
              className="gap-1"
              data-testid="button-filter-dogs"
            >
              <Dog className="h-3.5 w-3.5" />
              Dogs
            </Button>
            <Button
              variant={speciesFilter === "cat" ? "default" : "outline"}
              size="sm"
              onClick={() => setSpeciesFilter("cat")}
              className="gap-1"
              data-testid="button-filter-cats"
            >
              <Cat className="h-3.5 w-3.5" />
              Cats
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square" />
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <Dog className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Gallery</h2>
            <p className="text-muted-foreground mb-4">Please try refreshing the page.</p>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          </div>
        )}

        {!isLoading && !error && filteredDogs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-3">No Portraits Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {speciesFilter !== "all"
                ? `No ${speciesFilter === "dog" ? "dog" : "cat"} portraits yet. Try viewing all pets!`
                : "Start creating stunning AI portraits for your clients' pets."
              }
            </p>
            {speciesFilter !== "all" ? (
              <Button size="lg" variant="outline" className="gap-2" onClick={() => setSpeciesFilter("all")} data-testid="button-show-all">
                View All Pets
              </Button>
            ) : (
              <Button size="lg" className="gap-2" data-testid="button-create-first" asChild>
                <Link href="/create">
                  <Plus className="h-5 w-5" />
                  Create Your First Portrait
                </Link>
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && filteredDogs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDogs.map((dog) => {
              const SpeciesIcon = dog.species === "cat" ? Cat : Dog;
              return (
                <Card key={dog.id} className="overflow-visible hover-elevate cursor-pointer group" data-testid={`card-dog-${dog.id}`}>
                  <div className="relative aspect-square overflow-hidden protected-image-wrapper">
                    {dog.portrait?.generatedImageUrl ? (
                      <img
                        src={dog.portrait.generatedImageUrl}
                        alt={`${dog.name} portrait`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 protected-image"
                        draggable={false}
                      />
                    ) : dog.originalPhotoUrl ? (
                      <img
                        src={dog.originalPhotoUrl}
                        alt={dog.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 protected-image"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <SpeciesIcon className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                    )}
                    
                    <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 via-black/40 to-transparent">
                      <h3 className="font-serif font-bold text-xl text-white drop-shadow-lg" data-testid={`text-pet-name-${dog.id}`}>
                        {dog.name}
                      </h3>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    {dog.isAvailable && (
                      <Badge className="absolute top-12 right-3 bg-accent text-accent-foreground">
                        Available
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {dog.breed || (dog.species === "cat" ? "Domestic" : "Mixed Breed")} {dog.age ? `\u2022 ${dog.age}` : ""}
                        </p>
                      </div>
                      {dog.portrait?.style && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Palette className="h-3 w-3" />
                          <span className="hidden sm:inline">{dog.portrait.style.category}</span>
                        </div>
                      )}
                    </div>
                    {dog.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {dog.description}
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <Button variant="outline" size="sm" className="w-full gap-1" data-testid={`button-view-${dog.id}`} asChild>
                        <Link href={`/pawfile/${dog.id}`}>
                          <SpeciesIcon className="h-3 w-3" />
                          View Portrait
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <footer className="py-8 border-t mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Beautiful AI pet portraits by Pawtrait Pros
          </p>
        </div>
      </footer>
    </div>
  );
}
