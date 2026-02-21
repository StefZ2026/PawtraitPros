import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dog, Cat, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CustomerPortal() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [petCode, setPetCode] = useState("");
  const [searching, setSearching] = useState(false);

  const handleLookup = async () => {
    const code = petCode.trim().toUpperCase();
    if (!code) {
      toast({ title: "Enter a pet code", description: "Check your text or email for the code.", variant: "destructive" });
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/dogs/code/${encodeURIComponent(code)}`);
      if (res.ok) {
        navigate(`/pawfile/code/${code}`);
      } else {
        toast({ title: "Pet not found", description: "Double-check the code and try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-center">
          <a href="/" className="flex items-center gap-1.5 font-serif font-bold text-xl text-primary">
            <span className="flex items-center gap-0.5"><Dog className="h-5 w-5" /><Cat className="h-5 w-5" /></span>
            Pawtrait Pros
          </a>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">View Your Pet's Portrait</CardTitle>
            <CardDescription>
              Enter the pet code from your text or email to view your pet's portrait and order keepsakes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. BEL-2847"
                value={petCode}
                onChange={(e) => setPetCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="text-center text-lg tracking-wider font-mono"
                maxLength={10}
              />
              <Button onClick={handleLookup} disabled={searching} className="gap-2 shrink-0">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Look Up
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Don't have a code? Check your text message or email for a direct link to your pet's portrait.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
