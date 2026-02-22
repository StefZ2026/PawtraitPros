import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Paintbrush, Dog, Cat, Palette, Sun } from "lucide-react";
import { useState } from "react";
import { portraitStyles, stylePreviewImages } from "@/lib/portrait-styles";
import { useAuth } from "@/hooks/use-auth";
import { AdminFloatingButton } from "@/components/admin-button";
import { getAllPackStyleIds, getStyleIdsForPackType } from "@shared/pack-config";
import type { PackType } from "@shared/pack-config";

const allPackIds = getAllPackStyleIds();
const packStyles = portraitStyles.filter((s) => allPackIds.has(s.id));

const PACK_TABS: Array<{ key: PackType | null; label: string; icon: typeof Sparkles }> = [
  { key: null, label: "All Styles", icon: Palette },
  { key: "seasonal", label: "Seasonal", icon: Sun },
  { key: "fun", label: "Fun", icon: Sparkles },
  { key: "artistic", label: "Artistic", icon: Paintbrush },
];

function getPackTypesForStyle(styleId: number): PackType[] {
  const types: PackType[] = [];
  if (getStyleIdsForPackType("seasonal").has(styleId)) types.push("seasonal");
  if (getStyleIdsForPackType("fun").has(styleId)) types.push("fun");
  if (getStyleIdsForPackType("artistic").has(styleId)) types.push("artistic");
  return types;
}

const packTypeColors: Record<PackType, string> = {
  seasonal: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  fun: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  artistic: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

export default function StylesPage() {
  const [activePackType, setActivePackType] = useState<PackType | null>(null);
  const { isAuthenticated } = useAuth();

  const filteredStyles = activePackType
    ? packStyles.filter((s) => getStyleIdsForPackType(activePackType).has(s.id))
    : packStyles;

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
            Three curated packs — Seasonal, Fun, and Artistic — each with styles tailored to your business
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStyles.map((style) => {
            const previewImage = stylePreviewImages[style.name];
            const packs = getPackTypesForStyle(style.id);

            return (
              <Card
                key={style.id}
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
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {packs.map((pt) => (
                      <Badge key={pt} variant="secondary" className={`text-xs ${packTypeColors[pt]}`}>
                        {pt.charAt(0).toUpperCase() + pt.slice(1)}
                      </Badge>
                    ))}
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      {style.species === "dog" ? "Dog" : "Cat"}
                    </Badge>
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
