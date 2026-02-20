import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, Sparkles, ExternalLink, Wand2 } from "lucide-react";
import type { StyleOption } from "@/lib/portrait-styles";

interface PortraitPreviewProps {
  generatedImage: string | null;
  isGenerating: boolean;
  isEditing?: boolean;
  selectedStyle: StyleOption | null;
  dogName: string;
  adoptionUrl?: string;
  onRegenerate: () => void;
  onDownload: () => void;
  onEdit?: (editPrompt: string) => void;
  editsUsed?: number;
  maxEdits?: number;
}

export function PortraitPreview({
  generatedImage,
  isGenerating,
  isEditing = false,
  selectedStyle,
  dogName,
  adoptionUrl,
  onRegenerate,
  onDownload,
  onEdit,
  editsUsed = 0,
  maxEdits = 3,
}: PortraitPreviewProps) {
  const [editPrompt, setEditPrompt] = useState("");
  const editsRemaining = maxEdits - editsUsed;
  const editsExhausted = editsRemaining <= 0;

  const handleEdit = () => {
    if (editPrompt.trim() && onEdit && !editsExhausted) {
      onEdit(editPrompt.trim());
      setEditPrompt("");
    }
  };

  if (isGenerating || isEditing) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-square relative bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                <Sparkles className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="mt-6 text-lg font-semibold">
                {isEditing ? "Refining Portrait" : "Creating Masterpiece"}
              </h3>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {isEditing 
                  ? "Applying your changes..."
                  : selectedStyle
                    ? `Transforming ${dogName || "your pup"} into ${selectedStyle.name}...`
                    : "Generating portrait..."}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                This may take 20-40 seconds
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!generatedImage) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-square relative bg-gradient-to-br from-muted/50 to-muted flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold text-muted-foreground">Portrait Preview</h3>
            <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
              Upload a photo and select a style to generate a stunning portrait
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-square protected-image-wrapper">
            <img
              src={generatedImage}
              alt={`${dogName} portrait in ${selectedStyle?.name || "artistic"} style`}
              className="w-full h-full object-cover protected-image"
              draggable={false}
              data-testid="img-generated-portrait"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h3 className="text-white font-serif text-2xl font-bold">{dogName || "Portrait"}</h3>
              {selectedStyle && (
                <p className="text-white/80 text-sm">{selectedStyle.name}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onDownload} className="flex-1 gap-2" data-testid="button-download-portrait">
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button variant="outline" onClick={onRegenerate} disabled={editsExhausted} className="gap-2" data-testid="button-regenerate">
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </Button>
        {adoptionUrl && (
          <Button variant="outline" asChild className="gap-2">
            <a href={adoptionUrl} target="_blank" rel="noopener noreferrer" data-testid="link-adoption-page">
              <ExternalLink className="h-4 w-4" />
              Adopt Me
            </a>
          </Button>
        )}
      </div>

      {onEdit && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                Refine Your Portrait
              </h4>
              <span
                className={`text-xs font-medium ${editsExhausted ? "text-destructive" : "text-muted-foreground"}`}
                data-testid="text-edits-remaining"
              >
                {editsExhausted
                  ? "No edits remaining"
                  : `${editsRemaining} of ${maxEdits} edits remaining`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {editsExhausted
                ? "You've used all edits for this portrait. Try a different style!"
                : "Describe what you'd like to adjust. You get 4 free edits per portrait (including regenerations)."}
            </p>
            <div className="flex gap-2">
              <Input
                placeholder={editsExhausted ? "No edits remaining" : "e.g., make the background brighter, add more flowers..."}
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !editsExhausted && handleEdit()}
                className="flex-1"
                disabled={editsExhausted}
                data-testid="input-edit-prompt"
              />
              <Button 
                onClick={handleEdit} 
                disabled={!editPrompt.trim() || editsExhausted}
                className="gap-2"
                data-testid="button-apply-edit"
              >
                <Wand2 className="h-4 w-4" />
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
