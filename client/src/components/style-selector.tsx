import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStylesBySpecies, getStyleCategoriesBySpecies, stylePreviewImages, type StyleOption } from "@/lib/portrait-styles";
import { Check, Palette, Crown, Sparkles, Wand2, Rocket, Compass, Paintbrush, Dog } from "lucide-react";
import { useState } from "react";

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

interface StyleSelectorProps {
  selectedStyle: StyleOption | null;
  onSelectStyle: (style: StyleOption) => void;
  species?: "dog" | "cat";
}

export function StyleSelector({ selectedStyle, onSelectStyle, species = "dog" }: StyleSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const speciesStyles = getStylesBySpecies(species);
  const speciesCategories = getStyleCategoriesBySpecies(species);

  const filteredStyles = activeCategory
    ? speciesStyles.filter((s) => s.category === activeCategory)
    : speciesStyles;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory(null)}
          data-testid="button-category-all"
        >
          All Styles
        </Button>
        {speciesCategories.map((category) => {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStyles.map((style) => {
          const isSelected = selectedStyle?.id === style.id;
          const Icon = categoryIcons[style.category] || Palette;

          return (
            <Card
              key={style.id}
              className={`cursor-pointer transition-all hover-elevate overflow-visible ${
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : ""
              }`}
              onClick={() => onSelectStyle(style)}
              data-testid={`card-style-${style.id}`}
            >
              {stylePreviewImages[style.name] && (
                <div className="relative aspect-square overflow-hidden rounded-t-md protected-image-wrapper">
                  <img
                    src={stylePreviewImages[style.name]}
                    alt={style.name}
                    className="w-full h-full object-cover protected-image"
                    draggable={false}
                  />
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 text-xs bg-background/80 backdrop-blur-sm"
                  >
                    {style.category}
                  </Badge>
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              )}
              <CardContent className="p-3">
                <h3 className="font-semibold text-sm">{style.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {style.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredStyles.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No styles found in this category</p>
        </div>
      )}
    </div>
  );
}
