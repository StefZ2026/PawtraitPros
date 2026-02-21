import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dog, Cat, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Organization } from "@shared/schema";

export default function CounterDisplay() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [petCode, setPetCode] = useState("");
  const [searching, setSearching] = useState(false);

  const { data: org } = useQuery<Organization>({
    queryKey: ["/api/rescue", params.slug],
    queryFn: async () => {
      const res = await fetch(`/api/rescue/${params.slug}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!params.slug,
  });

  // Generate QR code URL pointing to the customer portal
  const portalUrl = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/portal`;
  }, []);

  const qrCodeSrc = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(portalUrl)}&size=256x256&format=svg&margin=0`;
  }, [portalUrl]);

  const handleLookup = async () => {
    const code = petCode.trim().toUpperCase();
    if (!code) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/dogs/code/${encodeURIComponent(code)}`);
      if (res.ok) {
        navigate(`/pawfile/code/${code}`);
      } else {
        toast({ title: "Pet not found", description: "Check the code and try again.", variant: "destructive" });
        setPetCode("");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      {/* Org branding */}
      <div className="mb-8 text-center">
        {org?.logoUrl ? (
          <img src={org.logoUrl} alt={org?.name || "Business"} className="max-h-24 mx-auto mb-4 object-contain" />
        ) : org?.name ? (
          <h1 className="text-3xl font-serif font-bold text-primary mb-4">{org.name}</h1>
        ) : null}
      </div>

      {/* Main content */}
      <div className="text-center max-w-lg mx-auto space-y-8">
        <div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Dog className="h-10 w-10 text-primary" />
            <Cat className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-4xl font-serif font-bold mb-3">View Your Pet's Portrait</h2>
          <p className="text-xl text-muted-foreground">
            Scan the QR code or enter your pet's code to see their portrait and order keepsakes!
          </p>
        </div>

        {/* QR Code */}
        <div className="w-56 h-56 mx-auto rounded-xl overflow-hidden bg-white p-3 shadow-md border">
          <img
            src={qrCodeSrc}
            alt="Scan to view your pet's portrait"
            className="w-full h-full"
          />
        </div>

        {/* Code entry */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Or enter your pet code:</p>
          <div className="flex gap-3 max-w-xs mx-auto">
            <Input
              placeholder="PET CODE"
              value={petCode}
              onChange={(e) => setPetCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="text-center text-2xl tracking-[0.3em] font-mono h-14"
              maxLength={10}
            />
            <Button onClick={handleLookup} disabled={searching} size="lg" className="h-14 px-6">
              {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Go"}
            </Button>
          </div>
        </div>
      </div>

      {/* Branding footer */}
      <div className="mt-auto pt-8 flex items-center gap-2 text-muted-foreground/50">
        <Dog className="h-4 w-4" />
        <span className="text-xs font-serif tracking-wider">Powered by Pawtrait Pros</span>
        <Cat className="h-4 w-4" />
      </div>
    </div>
  );
}
