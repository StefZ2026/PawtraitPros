import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dog, Cat, ShoppingBag, Loader2, Heart, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Dog as DogType, Portrait } from "@shared/schema";

interface DogWithPortrait extends DogType {
  portrait?: Portrait;
  portraits?: Portrait[];
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  organizationContactPhone?: string | null;
  organizationContactEmail?: string | null;
}

export default function CustomerPawfile() {
  const params = useParams<{ petCode: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const petCode = params.petCode;
  const { data: dog, isLoading, error } = useQuery<DogWithPortrait>({
    queryKey: ["/api/dogs/code", petCode],
    queryFn: async () => {
      const res = await fetch(`/api/dogs/code/${petCode}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!petCode,
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/customer-session/from-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(data.error || "Failed to start order");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.token) navigate(`/order/${data.token}`);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isCat = dog?.species === "cat";
  const selectedPortrait = dog?.portrait || dog?.portraits?.[0] || null;
  const imageUrl = selectedPortrait?.generatedImageUrl || dog?.originalPhotoUrl;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Skeleton className="aspect-square rounded-2xl w-full" />
          <Skeleton className="h-8 w-48 mx-auto mt-4" />
          <Skeleton className="h-12 w-full mt-6" />
        </div>
      </div>
    );
  }

  if (error || !dog) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h1 className="text-xl font-serif font-bold mb-2">Portrait Not Found</h1>
          <p className="text-muted-foreground text-sm">
            This link may have expired. Check your text or email for the correct link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-sm mx-auto px-4 py-8">
        {/* Org branding */}
        {dog.organizationLogoUrl ? (
          <div className="flex justify-center mb-6">
            <img
              src={dog.organizationLogoUrl}
              alt={dog.organizationName || ""}
              className="max-h-14 max-w-[180px] object-contain"
            />
          </div>
        ) : dog.organizationName ? (
          <p className="text-center font-serif font-semibold text-primary text-lg mb-6">
            {dog.organizationName}
          </p>
        ) : null}

        {/* Portrait card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-amber-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${dog.name}'s portrait`}
              className="w-full aspect-square object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full aspect-square bg-amber-50 flex items-center justify-center">
              {isCat ? (
                <Cat className="h-24 w-24 text-muted-foreground/30" />
              ) : (
                <Dog className="h-24 w-24 text-muted-foreground/30" />
              )}
            </div>
          )}

          <div className="px-5 py-4 text-center">
            <h1 className="font-serif text-2xl font-bold text-gray-900">{dog.name}</h1>
            {(dog.breed || dog.age) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {[dog.breed, dog.age].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Order CTA */}
        {selectedPortrait?.generatedImageUrl && (
          <div className="mt-5">
            <Button
              size="lg"
              className="w-full gap-2 text-base py-6"
              onClick={() => orderMutation.mutate()}
              disabled={orderMutation.isPending}
            >
              {orderMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShoppingBag className="h-5 w-5" />
              )}
              Order a Keepsake
            </Button>
            <p className="text-xs text-center text-gray-400 mt-2">
              Framed prints, mugs, tote bags, and more
            </p>
          </div>
        )}

        {/* Contact Us */}
        {(dog.organizationContactPhone || dog.organizationContactEmail) && (
          <div className="mt-5 bg-white rounded-2xl border border-amber-100 shadow-sm px-5 py-4">
            <p className="text-sm font-semibold text-gray-700 mb-3 text-center">Contact Us</p>
            <div className="flex flex-col gap-2">
              {dog.organizationContactPhone && (
                <a
                  href={`tel:${dog.organizationContactPhone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 text-primary font-medium text-sm hover:underline"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {dog.organizationContactPhone}
                </a>
              )}
              {dog.organizationContactEmail && (
                <a
                  href={`mailto:${dog.organizationContactEmail}`}
                  className="flex items-center gap-3 text-primary font-medium text-sm hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {dog.organizationContactEmail}
                </a>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 mt-8 font-serif">
          Pawtrait Pros
        </p>
      </div>
    </div>
  );
}
