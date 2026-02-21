import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dog, Cat, Camera, Upload, Image, Check,
  ArrowLeft, Sparkles, Trash2, Plus,
} from "lucide-react";
import type { Dog as DogType } from "@shared/schema";

interface BatchPhoto {
  id: number;
  dogId: number | null;
  dogName: string | null;
  dogBreed: string | null;
  assignedAt: string | null;
  previewUrl?: string; // local preview before upload
}

type BatchStep = "upload" | "assign" | "generate";

export default function BatchUpload() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<BatchStep>("upload");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<BatchPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<string>("seasonal");

  // Fetch org's dogs for assignment
  const { data: myDogs } = useQuery<DogType[]>({
    queryKey: ["/api/my-dogs"],
    enabled: isAuthenticated,
  });

  // Start batch mutation
  const startBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/batch/start", {});
      return res.json();
    },
    onSuccess: (data) => {
      setBatchId(data.batchId);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ batchSessionId, photo }: { batchSessionId: number; photo: string }) => {
      const res = await apiRequest("POST", `/api/batch/${batchSessionId}/photos`, { photo });
      return res.json();
    },
  });

  // Assign photo mutation
  const assignPhotoMutation = useMutation({
    mutationFn: async ({ batchSessionId, photoId, dogId }: { batchSessionId: number; photoId: number; dogId: number }) => {
      const res = await apiRequest("PATCH", `/api/batch/${batchSessionId}/photos/${photoId}`, { dogId });
      return res.json();
    },
    onSuccess: () => {
      if (batchId) {
        queryClient.invalidateQueries({ queryKey: ["/api/batch", batchId] });
      }
    },
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!batchId) throw new Error("No batch session");
      const res = await apiRequest("POST", `/api/batch/${batchId}/generate`, { packType: selectedPack });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Generation started!", description: data.message });
      setStep("generate");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (!batchId && !startBatchMutation.isPending) {
      // Start batch first, then upload
      const result = await startBatchMutation.mutateAsync();
      await uploadFiles(files, result.batchId);
    } else if (batchId) {
      await uploadFiles(files, batchId);
    }
  }, [batchId]);

  const uploadFiles = async (files: FileList, sessionId: number) => {
    setUploading(true);
    const maxPhotos = 20;
    const remaining = maxPhotos - photos.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    for (const file of filesToUpload) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB limit`, variant: "destructive" });
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        const result = await uploadPhotoMutation.mutateAsync({
          batchSessionId: sessionId,
          photo: dataUrl,
        });

        setPhotos((prev) => [
          ...prev,
          {
            id: result.photoId,
            dogId: null,
            dogName: null,
            dogBreed: null,
            assignedAt: null,
            previewUrl: dataUrl,
          },
        ]);
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
    }
    setUploading(false);
  };

  const handleAssign = async (photoId: number, dogId: number) => {
    if (!batchId) return;
    const dog = myDogs?.find((d) => d.id === dogId);
    try {
      await assignPhotoMutation.mutateAsync({ batchSessionId: batchId, photoId, dogId });
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, dogId, dogName: dog?.name || null, dogBreed: dog?.breed || null, assignedAt: new Date().toISOString() }
            : p
        )
      );
    } catch (err: any) {
      toast({ title: "Assign failed", description: err.message, variant: "destructive" });
    }
  };

  const assignedCount = photos.filter((p) => p.dogId !== null).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary">
            <Camera className="h-5 w-5" /> Batch Upload
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{photos.length}/20 photos</Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {(["upload", "assign", "generate"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : photos.length > 0 && i === 0
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm ${step === s ? "font-medium" : "text-muted-foreground"}`}>
                {s === "upload" ? "Upload" : s === "assign" ? "Assign" : "Generate"}
              </span>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === "generate" ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="inline-flex p-4 rounded-full bg-primary/10">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              </div>
              <h2 className="text-xl font-serif font-bold">Generating Portraits</h2>
              <p className="text-muted-foreground">
                {assignedCount} portrait{assignedCount !== 1 ? "s" : ""} are being generated with the {selectedPack} pack.
                This may take a few minutes.
              </p>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : step === "assign" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" className="gap-1" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <p className="text-sm text-muted-foreground">
                {assignedCount} of {photos.length} assigned
              </p>
            </div>

            <h2 className="text-lg font-serif font-bold">Assign Photos to Pets</h2>
            <p className="text-sm text-muted-foreground">
              Select which pet is in each photo. Only assigned photos will be used for portraits.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo) => (
                <Card key={photo.id} className={photo.dogId ? "border-primary/50" : ""}>
                  <CardContent className="p-3 space-y-2">
                    {photo.previewUrl && (
                      <img
                        src={photo.previewUrl}
                        alt="Batch photo"
                        className="w-full h-32 object-cover rounded-md"
                      />
                    )}
                    <select
                      className="w-full px-2 py-1.5 rounded-md border bg-background text-sm"
                      value={photo.dogId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) handleAssign(photo.id, parseInt(val));
                      }}
                    >
                      <option value="">Select a pet...</option>
                      {(myDogs || []).map((dog) => (
                        <option key={dog.id} value={dog.id}>
                          {dog.name} {dog.breed ? `(${dog.breed})` : ""}
                        </option>
                      ))}
                    </select>
                    {photo.dogId && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" /> {photo.dogName}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pack selection */}
            <div className="pt-4 border-t space-y-3">
              <label className="text-sm font-medium block">Portrait Pack</label>
              <div className="flex gap-2">
                {["seasonal", "fun", "artistic"].map((pack) => (
                  <button
                    key={pack}
                    className={`px-4 py-2 rounded-md border text-sm capitalize ${
                      selectedPack === pack
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border"
                    }`}
                    onClick={() => setSelectedPack(pack)}
                  >
                    {pack}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full gap-2"
              disabled={assignedCount === 0 || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              <Sparkles className="h-4 w-4" />
              {generateMutation.isPending
                ? "Starting..."
                : `Generate ${assignedCount} Portrait${assignedCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        ) : (
          /* Upload step */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" className="gap-1" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Button>
            </div>

            {/* Drop zone */}
            <Card
              className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById("batch-file-input")?.click()}
            >
              <CardContent className="pt-12 pb-12 text-center space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-serif font-bold">
                    {photos.length > 0 ? "Add More Photos" : "Upload Photos"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drag & drop or click to select. Up to 20 photos, 10MB each.
                  </p>
                </div>
                {uploading && (
                  <Badge variant="secondary">Uploading...</Badge>
                )}
              </CardContent>
            </Card>
            <input
              id="batch-file-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files);
                }
              }}
            />

            {/* Photo grid */}
            {photos.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      {photo.previewUrl && (
                        <img
                          src={photo.previewUrl}
                          alt="Uploaded"
                          className="w-full h-20 object-cover rounded-md"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={() => setStep("assign")}
                >
                  Assign to Pets ({photos.length} photos) <Sparkles className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
