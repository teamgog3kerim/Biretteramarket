import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Check, Upload, Clock, ArrowLeft, ImageIcon, XCircle } from "lucide-react";
import type { Subscription } from "@shared/schema";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const { data: latestSubscription } = useQuery<Subscription | null>({
    queryKey: ["/api/subscription/latest"],
    enabled: isOpen,
  });

  const startFreeTrial = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/subscription", {
        planType: "free_trial",
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/latest"] });
      toast({
        title: "Free Trial Started",
        description: "Your 20-day free trial is now active",
      });
      onClose();
    },
    onError: (error: any) => {
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
        description: error?.message?.replace(/^\d+:\s*/, "") || "Failed to start free trial",
        variant: "destructive",
      });
    },
  });

  const submitPayment = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/subscription/submit-payment", {
        planType: selectedPlan,
        receiptImage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/latest"] });
      setSelectedPlan(null);
      setReceiptImage(null);
      toast({
        title: "Payment Submitted",
        description: "Your receipt has been sent for review. You'll be notified once it's approved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message?.replace(/^\d+:\s*/, "") || "Failed to submit payment",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image (screenshot)", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "File too large", description: "Please upload an image under 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setReceiptImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const plans = [
    {
      id: "free_trial" as const,
      name: "Free Trial",
      price: "Free",
      duration: "20 days",
      features: [
        "List your products for 20 days",
        "Product images, specs and pricing",
        "Reach buyers across Ethiopia",
      ],
      buttonText: "Start Free Trial",
      badge: "20 DAYS FREE",
      badgeVariant: "secondary" as const,
    },
    {
      id: "monthly" as const,
      name: "Monthly Premium",
      price: "ETB 990",
      duration: "per month",
      features: [
        "Unlimited product listings",
        "Featured on Top Sellers lists",
        "Sales analytics dashboard",
      ],
      buttonText: "Choose Monthly",
      badge: "MOST POPULAR",
      badgeVariant: "default" as const,
      popular: true,
    },
    {
      id: "yearly" as const,
      name: "Yearly Premium",
      price: "ETB 9,900",
      duration: "per year",
      originalPrice: "ETB 11,880",
      savings: "Save ETB 1,980!",
      features: [
        "Everything in Monthly plan",
        "2 months free",
        "Premium seller badge",
      ],
      buttonText: "Choose Yearly",
      popular: false,
    },
  ];

  const isPending = latestSubscription?.status === "pending";
  const isRejected = latestSubscription?.status === "rejected";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isPending
              ? "Payment Under Review"
              : selectedPlan
                ? "Submit Your Payment"
                : "Choose Your Plan"}
          </DialogTitle>
        </DialogHeader>

        {isPending ? (
          <div className="text-center space-y-4 py-6" data-testid="status-pending-approval">
            <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Clock className="h-8 w-8 text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Waiting for Approval</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your payment receipt has been submitted and is being reviewed by our team.
                You'll receive a Telegram notification once your subscription is approved.
              </p>
            </div>
            <Button variant="outline" onClick={onClose} data-testid="button-close-pending">
              Close
            </Button>
          </div>
        ) : selectedPlan ? (
          <div className="space-y-4">
            <button
              onClick={() => { setSelectedPlan(null); setReceiptImage(null); }}
              className="flex items-center text-sm text-muted-foreground"
              data-testid="button-back-to-plans"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to plans
            </button>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="text-center">
                  <h3 className="font-bold">
                    {selectedPlan === "monthly" ? "Monthly Premium — ETB 990" : "Yearly Premium — ETB 9,900"}
                  </h3>
                </div>
                <div className="text-sm space-y-2 bg-muted rounded-lg p-3">
                  <p className="font-medium">How to pay:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Transfer {selectedPlan === "monthly" ? "990 ETB" : "9,900 ETB"} using CBE Birr, Telebirr, or bank transfer</li>
                    <li>Take a screenshot of the payment confirmation</li>
                    <li>Upload the screenshot below and submit</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-receipt-file"
            />

            {receiptImage ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={receiptImage} alt="Payment receipt" className="w-full max-h-64 object-contain bg-muted" data-testid="img-receipt-preview" />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-change-receipt"
                >
                  <ImageIcon className="h-4 w-4 mr-2" /> Change Screenshot
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                data-testid="button-upload-receipt"
              >
                <Upload className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">Upload payment receipt screenshot</span>
                <span className="text-xs mt-1">PNG or JPG, max 5MB</span>
              </button>
            )}

            <Button
              className="w-full"
              disabled={!receiptImage || submitPayment.isPending}
              onClick={() => submitPayment.mutate()}
              data-testid="button-submit-payment"
            >
              {submitPayment.isPending ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isRejected && (
              <Card className="border-destructive">
                <CardContent className="p-4 flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Previous payment was rejected</p>
                    <p className="text-muted-foreground mt-1">
                      Your last receipt could not be verified. Please check your payment and submit a new screenshot.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? "ring-2 ring-accent" : ""}`}
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
                    onClick={() => {
                      if (plan.id === "free_trial") {
                        startFreeTrial.mutate();
                      } else {
                        setSelectedPlan(plan.id);
                      }
                    }}
                    disabled={startFreeTrial.isPending}
                    className={`w-full ${
                      plan.popular
                        ? "bg-accent text-accent-foreground hover:bg-accent/90"
                        : ""
                    }`}
                    variant={plan.id === "free_trial" ? "outline" : "default"}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {plan.id === "free_trial" && startFreeTrial.isPending ? "Processing..." : plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}

            <p className="text-xs text-muted-foreground text-center">
              Pay via CBE Birr, Telebirr, or bank transfer, then upload your receipt.
              Your subscription activates after admin approval.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
