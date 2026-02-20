import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Palette, Crown, Sparkles, Wand2, Rocket, Compass, Paintbrush, Dog, Cat } from "lucide-react";
import { useState } from "react";
import { portraitStyles, styleCategories, stylePreviewImages } from "@/lib/portrait-styles";
import { useAuth } from "@/hooks/use-auth";
import { AdminFloatingButton } from "@/components/admin-button";

const categoryIcons: Record<string, typeof Palette> = {
  Classical: Crown,
  Artistic: Paintbrush,
  Modern: Sparkles,
  Fantasy: Wand2,
  "Sci-Fi": Rocket,
  Adventure: Compass,
  Fun: Sparkles,
  Adoption: Dog,
  Humanizing: Sparkles,
  Seasonal: Sparkles,
  Celebration: Sparkles,
};

export default function StylesPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const filteredStyles = activeCategory
    ? portraitStyles.filter((s) => s.category === activeCategory)
    : portraitStyles;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <span className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary"><span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>Pawtrait Pros</span>
            {isAuthenticated ? (
              <Button size="sm" data-testid="button-create-portrait" asChild>
                <Link href="/create">Create Portrait</Link>
              </Button>
            ) : (
              <a href="/login">
                <Button size="sm" data-testid="button-get-started">Get Started</Button>
              </a>
            )}
          </div>
        </div>
      </header>
      <AdminFloatingButton />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">
            40+ Artistic Portrait Styles
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From Renaissance masters to modern pop art, find the perfect style to showcase your rescue pets
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(null)}
            data-testid="button-category-all"
          >
            All Styles
          </Button>
          {styleCategories.map((category) => {
            const Icon = categoryIcons[category] || Palette;
            return (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className="gap-1"
                data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {category}
              </Button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStyles.map((style) => {
            const Icon = categoryIcons[style.category] || Palette;
            const previewImage = stylePreviewImages[style.name];

            return (
              <Card
                key={style.id}
                className="overflow-hidden hover-elevate group"
                data-testid={`card-style-${style.id}`}
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
                      <Icon className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      {style.category}
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
            <Button size="lg" className="gap-2" data-testid="button-create-portrait-cta" asChild>
              <Link href="/create">
                <Palette className="h-5 w-5" />
                Create Your Portrait Now
              </Link>
            </Button>
          ) : (
            <a href="/login">
              <Button size="lg" className="gap-2" data-testid="button-get-started-cta">
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
            Helping rescue pets find their furever homes through beautiful AI art
          </p>
        </div>
      </footer>
    </div>
  );
}
