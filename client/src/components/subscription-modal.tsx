import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Crown, Check } from "lucide-react";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createSubscription = useMutation({
    mutationFn: async (planType: string) => {
      await apiRequest("POST", "/api/subscription", { 
        planType,
        status: "active"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: "Subscription Created",
        description: "Your subscription has been activated successfully",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create subscription. Payment integration coming soon!",
        variant: "destructive",
      });
    },
  });

  const plans = [
    {
      id: "free_trial",
      name: "Free Trial",
      price: "Free",
      duration: "30 days",
      features: [
        "Browse all products freely",
        "View product images and details",
        "Limited seller contact access",
      ],
      buttonText: "Start Free Trial",
      badge: "Active",
      badgeVariant: "secondary" as const,
    },
    {
      id: "monthly",
      name: "Monthly Premium",
      price: "₹299",
      duration: "per month",
      features: [
        "Unlimited seller contacts",
        "Priority customer support", 
        "Advanced search filters",
      ],
      buttonText: "Choose Monthly",
      popular: false,
    },
    {
      id: "yearly",
      name: "Yearly Premium", 
      price: "₹2,999",
      duration: "per year",
      originalPrice: "₹3,588",
      savings: "Save ₹589!",
      features: [
        "Everything in Monthly plan",
        "2 months free",
        "Premium seller badge",
      ],
      buttonText: "Choose Yearly",
      badge: "BEST VALUE",
      badgeVariant: "default" as const,
      popular: true,
    },
  ];

  const paymentMethods = [
    { name: "CBE Birr", icon: "fas fa-university", description: "Commercial Bank of Ethiopia" },
    { name: "Dashen", icon: "fas fa-mobile-alt", description: "Dashen Bank Mobile" },
    { name: "Awash", icon: "fas fa-credit-card", description: "Awash Bank Card" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Choose Your Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plans */}
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative ${plan.popular ? 'ring-2 ring-accent' : ''}`}
            >
              {plan.badge && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge variant={plan.badgeVariant} className="px-3 py-1">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-primary">{plan.price}</span>
                    <span className="text-sm text-muted-foreground ml-1">{plan.duration}</span>
                  </div>
                  {plan.originalPrice && (
                    <div className="mt-1">
                      <span className="text-sm line-through text-muted-foreground">{plan.originalPrice}</span>
                      <span className="text-sm text-accent font-medium ml-2">{plan.savings}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <Check className="h-4 w-4 text-accent mr-2 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => createSubscription.mutate(plan.id)}
                  disabled={createSubscription.isPending}
                  className={`w-full ${
                    plan.popular 
                      ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                      : ""
                  }`}
                  variant={plan.id === "free_trial" ? "outline" : "default"}
                  data-testid={`button-select-${plan.id}`}
                >
                  {createSubscription.isPending ? "Processing..." : plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Payment Methods */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3 flex items-center">
                <Crown className="h-4 w-4 mr-2" />
                Payment Methods
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.name}
                    variant="outline"
                    className="flex flex-col p-3 h-auto space-y-1"
                    data-testid={`button-payment-${method.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <i className={`${method.icon} text-secondary text-lg`}></i>
                    <span className="text-xs font-medium">{method.name}</span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Payment integration with Ethiopian banks coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
