import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Paintbrush, Dog, Cat, Palette, PartyPopper } from "lucide-react";
import { useState } from "react";
import { stylePreviewImages } from "@/lib/portrait-styles";
import { useAuth } from "@/hooks/use-auth";
import { AdminFloatingButton } from "@/components/admin-button";
import type { PackType } from "@shared/pack-config";

interface ShowcaseStyle {
  name: string;
  description: string;
  species: "dog" | "cat";
  pack: PackType;
}

// Curated 5 per pack — best images, mix of dog + cat
const SHOWCASE_STYLES: ShowcaseStyle[] = [
  // Celebrate
  { name: "Holiday Spirit", description: "Festive seasonal celebration", species: "dog", pack: "celebrate" },
  { name: "Spring Flower Crown", description: "Whimsical garden beauty", species: "dog", pack: "celebrate" },
  { name: "Halloween Pumpkin", description: "Whimsical spooky season costume", species: "dog", pack: "celebrate" },
  { name: "Holiday Stocking", description: "Festive kitty in holiday cheer", species: "cat", pack: "celebrate" },
  { name: "Sunbeam Napper", description: "Cozy cat basking in a warm sunbeam", species: "cat", pack: "celebrate" },
  // Fun
  { name: "Superhero", description: "Caped crusader ready to save the day", species: "dog", pack: "fun" },
  { name: "Pirate Captain", description: "Swashbuckling adventure on the high seas", species: "dog", pack: "fun" },
  { name: "Space Explorer", description: "Futuristic astronaut among the stars", species: "dog", pack: "fun" },
  { name: "Purrista Barista", description: "Your favorite feline coffee artist", species: "cat", pack: "fun" },
  { name: "Box Inspector", description: "Classic cat-in-a-box charm", species: "cat", pack: "fun" },
  // Artistic
  { name: "Renaissance Noble", description: "A dignified portrait in the style of Italian Renaissance masters", species: "dog", pack: "artistic" },
  { name: "Art Nouveau Beauty", description: "Elegant flowing lines and natural motifs", species: "dog", pack: "artistic" },
  { name: "Impressionist Garden", description: "Soft, light-filled garden scene", species: "dog", pack: "artistic" },
  { name: "Egyptian Royalty", description: "Ancient Egyptian deity with golden adornments", species: "cat", pack: "artistic" },
  { name: "Victorian Lady", description: "Prim and proper Victorian elegance", species: "cat", pack: "artistic" },
];

const PACK_TABS: Array<{ key: PackType | null; label: string; icon: typeof Sparkles }> = [
  { key: null, label: "All Styles", icon: Palette },
  { key: "celebrate", label: "Celebrate", icon: PartyPopper },
  { key: "fun", label: "Fun", icon: Sparkles },
  { key: "artistic", label: "Artistic", icon: Paintbrush },
];

const packTypeColors: Record<PackType, string> = {
  celebrate: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  fun: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  artistic: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

export default function StylesPage() {
  const [activePackType, setActivePackType] = useState<PackType | null>(null);
  const { isAuthenticated } = useAuth();

  const filteredStyles = activePackType
    ? SHOWCASE_STYLES.filter((s) => s.pack === activePackType)
    : SHOWCASE_STYLES;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-2" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <span className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary"><span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros</span>
            {isAuthenticated ? (
              <Button size="sm" asChild>
                <Link href="/create">Create Portrait</Link>
              </Button>
            ) : (
              <a href="/login">
                <Button size="sm">Get Started</Button>
              </a>
            )}
          </div>
        </div>
      </header>
      <AdminFloatingButton />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">
            Portrait Style Packs
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Three curated packs — Celebrate, Fun, and Artistic — each with styles tailored for dogs and cats
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {PACK_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key ?? "all"}
                variant={activePackType === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActivePackType(tab.key)}
                className="gap-1"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {filteredStyles.map((style) => {
            const previewImage = stylePreviewImages[style.name];

            return (
              <Card
                key={style.name}
                className="overflow-hidden hover-elevate group"
              >
                <div className="aspect-square relative bg-muted protected-image-wrapper">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={style.name}
                      className="w-full h-full object-cover protected-image"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <Palette className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className={`text-xs ${packTypeColors[style.pack]}`}>
                      {style.pack.charAt(0).toUpperCase() + style.pack.slice(1)}
                    </Badge>
                  </div>
                  <div className="absolute top-2 left-2">
                    {style.species === "dog" ? (
                      <Dog className="h-4 w-4 text-white drop-shadow-md" />
                    ) : (
                      <Cat className="h-4 w-4 text-white drop-shadow-md" />
                    )}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{style.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {style.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          {isAuthenticated ? (
            <Button size="lg" className="gap-2" asChild>
              <Link href="/create">
                <Palette className="h-5 w-5" />
                Create Your Portrait Now
              </Link>
            </Button>
          ) : (
            <a href="/login">
              <Button size="lg" className="gap-2">
                <Sparkles className="h-5 w-5" />
                Start Your 30-Day Free Trial
              </Button>
            </a>
          )}
        </div>
      </div>

      <footer className="py-8 border-t mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Beautiful AI art portraits for your clients' pets
          </p>
        </div>
      </footer>
    </div>
  );
}
