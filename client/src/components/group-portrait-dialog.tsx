import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { stylePreviewImages } from "@/lib/portrait-styles";
import { Users, Palette, Loader2, Check } from "lucide-react";
import type { Dog as DogType } from "@shared/schema";

interface DogWithPortrait extends DogType {
  portrait?: { generatedImageUrl?: string };
}

interface GroupPortraitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dogIds: number[];
  dogs: DogWithPortrait[];
  styles: any[];
  organizationId: number;
}

export function GroupPortraitDialog({
  open,
  onOpenChange,
  dogIds,
  dogs,
  styles,
  organizationId,
}: GroupPortraitDialogProps) {
  const { toast } = useToast();
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(dogIds));

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStyleId(null);
      setGenerating(false);
      setResultUrl(null);
      setSelectedIds(new Set(dogIds));
    }
  }, [open, dogIds]);

  const allDogs = dogIds.map(id => dogs.find(d => d.id === id)).filter(Boolean) as DogWithPortrait[];
  const selectedDogs = allDogs.filter(d => selectedIds.has(d.id));
  const petNames = selectedDogs.map(d => d.name).join(" & ");

  const toggleDog = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 2) return prev; // minimum 2
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!selectedStyleId) return;
    setGenerating(true);
    setResultUrl(null);

    try {
      const activeDogIds = Array.from(selectedIds);
      const res = await apiRequest("POST", "/api/generate-group-portrait", {
        dogIds: activeDogIds,
        styleId: selectedStyleId,
      });
      const data = await res.json();

      if (!data.jobId) {
        throw new Error(data.error || "Failed to start generation");
      }

      // Poll for job completion
      const pollJob = async (): Promise<void> => {
        const headers = await getAuthHeaders();
        const pollRes = await fetch(`/api/jobs/${data.jobId}`, { headers });
        if (!pollRes.ok) {
          await new Promise(r => setTimeout(r, 2000));
          return pollJob();
        }
        const job = await pollRes.json();
        if (job.status === "completed") {
          setResultUrl(job.result?.generatedImageUrl || null);
          setGenerating(false);
          queryClient.invalidateQueries({ queryKey: ["/api/my-dogs"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
          toast({ title: "Group portrait created!", description: `${petNames} look amazing together.` });
          return;
        }
        if (job.status === "failed") {
          setGenerating(false);
          toast({ title: "Generation failed", description: job.error || "Please try again.", variant: "destructive" });
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
        return pollJob();
      };

      await pollJob();
    } catch (err: any) {
      setGenerating(false);
      toast({ title: "Error", description: err.message || "Failed to generate group portrait.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={generating ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-600" />
            Group Portrait
          </DialogTitle>
          <DialogDescription>
            Create a portrait of {petNames} together
          </DialogDescription>
        </DialogHeader>

        {/* Pets in the group */}
        <div className="flex gap-3 justify-center py-2">
          {allDogs.map(dog => {
            const isIncluded = selectedIds.has(dog.id);
            const canDeselect = selectedIds.size > 2;
            return (
              <button
                key={dog.id}
                type="button"
                className={`text-center relative transition-opacity ${isIncluded ? "" : "opacity-40"}`}
                onClick={() => toggleDog(dog.id)}
                title={!isIncluded ? "Click to include" : !canDeselect ? "At least 2 pets required" : "Click to exclude"}
              >
                <div className={`w-16 h-16 rounded-full overflow-hidden border-2 bg-muted ${
                  isIncluded ? "border-violet-200 dark:border-violet-800" : "border-muted-foreground/30"
                }`}>
                  {dog.originalPhotoUrl ? (
                    <img src={dog.originalPhotoUrl} alt={dog.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-lg">?</div>
                  )}
                </div>
                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
                  isIncluded ? "bg-violet-500" : "bg-muted-foreground/50"
                }`}>
                  {isIncluded ? <Check className="h-3 w-3" /> : ""}
                </div>
                <p className="text-xs mt-1 font-medium">{dog.name}</p>
              </button>
            );
          })}
        </div>
        {allDogs.length > 2 && (
          <p className="text-xs text-center text-muted-foreground -mt-1">
            {selectedDogs.length} of {allDogs.length} pets selected — tap to toggle
          </p>
        )}

        {/* Result preview */}
        {resultUrl && (
          <div className="rounded-lg overflow-hidden border">
            <img src={resultUrl} alt="Group portrait" className="w-full" />
          </div>
        )}

        {/* Style picker */}
        {!resultUrl && !generating && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Choose a style</p>
              {styles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Select today's pack first to see available styles.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {styles.map((style: any) => {
                    const previewImg = stylePreviewImages[style.name];
                    const isSelected = selectedStyleId === style.id;
                    return (
                      <button
                        key={style.id}
                        className={`relative rounded-lg border-2 overflow-hidden transition-colors ${
                          isSelected
                            ? "border-violet-500 ring-2 ring-violet-300"
                            : "border-border hover:border-violet-300"
                        }`}
                        onClick={() => setSelectedStyleId(style.id)}
                      >
                        <div className="aspect-square bg-muted">
                          {previewImg ? (
                            <img src={previewImg} alt={style.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Palette className="h-6 w-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] p-1 text-center truncate">{style.name}</p>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Uses {selectedDogs.length} credit{selectedDogs.length !== 1 ? "s" : ""} (1 per pet)
              </p>
              <Button
                onClick={handleGenerate}
                disabled={!selectedStyleId || selectedDogs.length < 2}
                className="gap-2 bg-violet-600 hover:bg-violet-700"
              >
                <Users className="h-4 w-4" />
                Generate Group Portrait
              </Button>
            </div>
          </>
        )}

        {/* Loading state */}
        {generating && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <p className="text-sm text-muted-foreground">Creating group portrait of {petNames}...</p>
            <p className="text-xs text-muted-foreground">This usually takes 15-30 seconds</p>
          </div>
        )}

        {/* Done state */}
        {resultUrl && (
          <div className="flex justify-end pt-2">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
