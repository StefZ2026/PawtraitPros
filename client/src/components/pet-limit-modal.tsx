import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Crown,
  Plus,
  Minus,
  ArrowRight,
  Heart,
  ShoppingCart,
} from "lucide-react";

interface PetLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petCount: number;
  petLimit: number;
  basePetLimit: number;
  additionalPetSlots: number;
  maxAdditionalSlots: number;
  isPaidPlan: boolean;
  hasStripeSubscription: boolean;
  orgId?: number;
  isAdmin?: boolean;
}

export function PetLimitModal({
  open,
  onOpenChange,
  petCount,
  petLimit,
  basePetLimit,
  additionalPetSlots,
  maxAdditionalSlots,
  isPaidPlan,
  hasStripeSubscription,
  orgId,
  isAdmin,
}: PetLimitModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [slotQuantity, setSlotQuantity] = useState(
    Math.min(additionalPetSlots + 1, maxAdditionalSlots)
  );

  const canBuySlots = isPaidPlan && hasStripeSubscription && additionalPetSlots < maxAdditionalSlots;
  const slotsRemaining = maxAdditionalSlots - additionalPetSlots;

  const purchaseSlotsMutation = useMutation({
    mutationFn: async (quantity: number) => {
      const body: any = { quantity };
      if (orgId) {
        body.orgId = orgId;
      }
      const res = await apiRequest("POST", "/api/addon-slots", body);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/addon-slots"] });
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations", orgId] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      }
      toast({ title: "Pet slots added", description: data.message });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-pet-limit">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-pet-limit-title">
            <Heart className="h-5 w-5 text-primary" />
            Pet Limit Reached
          </DialogTitle>
          <DialogDescription data-testid="text-pet-limit-description">
            You have {petCount} of {petLimit} pet slots filled. Here are your options to add more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-3">
            <div className="p-4 rounded-md border">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
                  <Heart className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" data-testid="text-free-up-spot-title">Free up a spot</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Has a pet been adopted? Remove them from your roster to make room for a new one.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-swap-pet"
                    asChild
                  >
                    <Link href={isAdmin && orgId ? `/dashboard?org=${orgId}` : "/dashboard"}>
                      <ArrowRight className="h-3 w-3" />
                      Manage Pets
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {canBuySlots && (
              <div className="p-4 rounded-md border border-primary/30 bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm" data-testid="text-add-slots-title">Add extra pet slots</p>
                      <Badge variant="secondary">$3/slot/mo</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add up to {slotsRemaining} more slot{slotsRemaining > 1 ? "s" : ""} ({additionalPetSlots} of {maxAdditionalSlots} add-ons used).
                    </p>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSlotQuantity(Math.max(additionalPetSlots + 1, slotQuantity - 1))}
                          disabled={slotQuantity <= additionalPetSlots + 1}
                          data-testid="button-decrease-slots"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-10 text-center font-mono font-medium" data-testid="text-slot-quantity">
                          {slotQuantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSlotQuantity(Math.min(maxAdditionalSlots, slotQuantity + 1))}
                          disabled={slotQuantity >= maxAdditionalSlots}
                          data-testid="button-increase-slots"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid="text-total-slots">
                        = {basePetLimit + slotQuantity} total slots
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                      <span className="text-sm font-medium" data-testid="text-addon-cost">
                        ${(slotQuantity * 3).toFixed(2)}/mo total add-on
                      </span>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => purchaseSlotsMutation.mutate(slotQuantity)}
                        disabled={purchaseSlotsMutation.isPending}
                        data-testid="button-purchase-slots"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        {purchaseSlotsMutation.isPending ? "Processing..." : "Add Slots"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isPaidPlan && (
              <div className="p-4 rounded-md border bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-muted shrink-0 mt-0.5">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground" data-testid="text-free-plan-slots-title">Extra pet slots</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Available on paid plans only. Upgrade to unlock add-on slots.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-md border">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
                  <Crown className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" data-testid="text-upgrade-plan-title">Upgrade your plan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get more pet slots, portrait credits, and features with a higher-tier plan.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-upgrade-plan-modal"
                    asChild
                  >
                    <Link href={orgId ? `/choose-plan/${orgId}` : "/choose-plan"}>
                      <Crown className="h-3 w-3" />
                      View Plans
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
