import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LogoCropDialog } from "@/components/logo-crop-dialog";
import { ArrowLeft, Building2, Upload, X } from "lucide-react";

export interface Plan {
  id: number;
  name: string;
  description: string | null;
  priceMonthly: number;
  dogsLimit: number | null;
  monthlyPortraitCredits: number | null;
  overagePriceCents: number | null;
  trialDays: number | null;
  stripePriceId: string | null;
  isActive: boolean;
}


function LogoUpload({ logoData, onLogoChange }: { logoData: string | null; onLogoChange: (data: string | null) => void }) {
  const { toast } = useToast();
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please use JPG, PNG, or WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;
      setRawImageSrc(result);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-medium text-center">Logo (optional)</span>
      {logoData ? (
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={logoData} alt="Organization logo" data-testid="img-org-logo-preview" />
            <AvatarFallback><Building2 className="h-8 w-8" /></AvatarFallback>
          </Avatar>
          <div className="flex items-center justify-center gap-2 mt-2">
            <label>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = ""; } }} data-testid="input-logo-replace" />
              <Button asChild variant="outline" size="sm" className="gap-1 cursor-pointer">
                <span><Upload className="h-3 w-3" /> Replace</span>
              </Button>
            </label>
            <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => onLogoChange(null)} data-testid="button-clear-logo">
              <X className="h-3 w-3" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer">
          <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = ""; } }} data-testid="input-logo-upload" />
          <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center hover-elevate transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">Upload logo</p>
        </label>
      )}
      <p className="text-xs text-muted-foreground text-center">JPG, PNG, or WebP. You can crop after upload.</p>
      <LogoCropDialog
        open={cropDialogOpen}
        imageSrc={rawImageSrc}
        onApply={(croppedDataUrl) => {
          onLogoChange(croppedDataUrl);
          setCropDialogOpen(false);
          setRawImageSrc(null);
        }}
        onCancel={() => {
          setCropDialogOpen(false);
          setRawImageSrc(null);
        }}
      />
    </div>
  );
}

export function CreateOrgForm({ form, mutation, onBack, logoData, onLogoChange }: {
  form: any;
  mutation: any;
  onBack: () => void;
  logoData: string | null;
  onLogoChange: (data: string | null) => void;
}) {
  return (
    <div className="max-w-xl mx-auto">
      <Button variant="ghost" className="gap-1 mb-4" onClick={onBack} data-testid="button-back-to-welcome">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <Card>
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>Set Up Your Business</CardTitle>
          <CardDescription>
            Set up your business to start creating beautiful portraits for your clients' pets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUpload logoData={logoData} onLogoChange={onLogoChange} />
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data: any) => mutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Organization name is required" }}
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Paws & Suds Grooming" {...field} data-testid="input-org-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your business..."
                        {...field}
                        data-testid="input-org-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Website URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yourbusiness.com" {...field} data-testid="input-org-website" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
                data-testid="button-create-org"
              >
                {mutation.isPending ? "Getting Started..." : "Get Started"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
