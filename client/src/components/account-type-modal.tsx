import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingCart, Store, Truck, Ship, Factory, Check } from "lucide-react";
import { USER_TYPES, isSellerType, type UserType } from "@shared/schema";

const TYPE_INFO: Record<string, { label: string; description: string; icon: typeof Store }> = {
  buyer: {
    label: "Buyer",
    description: "Browse products, view seller contacts and use calculators — completely free",
    icon: ShoppingCart,
  },
  seller: {
    label: "Seller",
    description: "Sell construction materials to buyers across Ethiopia",
    icon: Store,
  },
  dealer: {
    label: "Dealer",
    description: "Distribute and resell construction materials",
    icon: Truck,
  },
  importer: {
    label: "Importer",
    description: "Import and supply construction materials",
    icon: Ship,
  },
  manufacturer: {
    label: "Manufacturer",
    description: "Produce and sell your own construction materials",
    icon: Factory,
  },
};

interface AccountTypeModalProps {
  isOpen: boolean;
}

export default function AccountTypeModal({ isOpen }: AccountTypeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<UserType | null>(null);

  const updateUserType = useMutation({
    mutationFn: async (userType: string) => {
      await apiRequest("PATCH", "/api/auth/user/type", { userType });
    },
    onSuccess: (_, userType) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Welcome to Biret Tera!",
        description: isSellerType(userType)
          ? "Your 20-day free trial has started. List your products now!"
          : "Your buyer account is ready. Start browsing!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set account type. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="max-w-md mx-auto account-type-dialog flex flex-col gap-3 p-4 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-center">Choose Your Account Type</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Select how you want to use Biret Tera. You can change this later in your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {USER_TYPES.map((type) => {
            const info = TYPE_INFO[type];
            const Icon = info.icon;
            const isSelected = selected === type;
            return (
              <Card
                key={type}
                className={`cursor-pointer transition-colors ${
                  isSelected ? "ring-2 ring-primary" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelected(type)}
                data-testid={`card-account-type-${type}`}
              >
                <CardContent className="p-3 flex items-center space-x-3">
                  <div className="w-9 h-9 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{info.label}</h3>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex-shrink-0 space-y-2">
          {selected && isSellerType(selected) && (
            <p className="text-xs text-muted-foreground text-center">
              Seller accounts include a 20-day free trial. After the trial, listing products
              costs 990 ETB/month.
            </p>
          )}
          <Button
            className="w-full"
            disabled={!selected || updateUserType.isPending}
            onClick={() => selected && updateUserType.mutate(selected)}
            data-testid="button-confirm-account-type"
          >
            {updateUserType.isPending ? "Setting up..." : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
