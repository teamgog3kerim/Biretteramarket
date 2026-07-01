import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  insertPaymentMethodSchema,
  type InsertPaymentMethod,
  type PaymentMethod,
} from "@shared/schema";
import { ArrowLeft, CreditCard, Building, Smartphone, Trash2, Star, Plus } from "lucide-react";
import { Link } from "wouter";

const BANK_PROVIDERS = [
  "Commercial Bank of Ethiopia (CBE)",
  "Dashen Bank",
  "Awash Bank",
  "Abyssinia Bank",
  "Bank of Abyssinia",
  "Cooperative Bank of Oromia",
  "Wegagen Bank",
  "Nib International Bank",
];

const WALLET_PROVIDERS = ["telebirr", "CBE Birr", "M-Pesa", "HelloCash", "Amole"];

function maskAccount(num: string) {
  if (num.length <= 4) return num;
  return `•••• ${num.slice(-4)}`;
}

export default function PaymentMethods() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const form = useForm<InsertPaymentMethod>({
    resolver: zodResolver(insertPaymentMethodSchema),
    defaultValues: {
      type: "bank",
      provider: "",
      accountName: "",
      accountNumber: "",
      isDefault: false,
    },
  });

  const selectedType = form.watch("type");

  const handleUnauthorized = (error: unknown) => {
    if (isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return true;
    }
    return false;
  };

  const createMethod = useMutation({
    mutationFn: async (data: InsertPaymentMethod) => {
      await apiRequest("POST", "/api/payment-methods", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Added", description: "Payment method added" });
      form.reset({
        type: "bank",
        provider: "",
        accountName: "",
        accountNumber: "",
        isDefault: false,
      });
      setIsAddOpen(false);
    },
    onError: (error) => {
      if (handleUnauthorized(error)) return;
      toast({ title: "Error", description: "Failed to add payment method", variant: "destructive" });
    },
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Removed", description: "Payment method removed" });
    },
    onError: (error) => {
      if (handleUnauthorized(error)) return;
      toast({ title: "Error", description: "Failed to remove payment method", variant: "destructive" });
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/payment-methods/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Updated", description: "Default payment method updated" });
    },
    onError: (error) => {
      if (handleUnauthorized(error)) return;
      toast({ title: "Error", description: "Failed to update default", variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertPaymentMethod) => {
    createMethod.mutate(data);
  };

  const providerOptions = selectedType === "mobile_wallet" ? WALLET_PROVIDERS : BANK_PROVIDERS;

  return (
    <div className="pb-20">
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-center">
          <Link href="/profile">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20 mr-2 p-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Payment Methods</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : methods.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No payment methods yet</p>
            <p className="text-sm mt-1">Add a bank account or mobile wallet to get paid.</p>
          </div>
        ) : (
          methods.map((method) => (
            <Card key={method.id} data-testid={`card-payment-${method.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    {method.type === "mobile_wallet" ? (
                      <Smartphone className="h-5 w-5 text-secondary" />
                    ) : (
                      <Building className="h-5 w-5 text-secondary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate" data-testid="text-provider">
                        {method.provider}
                      </h4>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{method.accountName}</p>
                    <p className="text-sm font-mono text-muted-foreground">
                      {maskAccount(method.accountNumber)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {!method.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-secondary h-8 px-2"
                        onClick={() => setDefault.mutate(method.id)}
                        disabled={setDefault.isPending}
                        data-testid="button-set-default"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 px-2"
                      onClick={() => deleteMethod.mutate(method.id)}
                      disabled={deleteMethod.isPending}
                      data-testid="button-delete-payment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" data-testid="button-add-payment">
              <Plus className="h-4 w-4 mr-2" /> Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("provider", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bank">Bank Account</SelectItem>
                          <SelectItem value="mobile_wallet">Mobile Wallet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{selectedType === "mobile_wallet" ? "Wallet" : "Bank"}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-provider">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providerOptions.map((provider) => (
                            <SelectItem key={provider} value={provider}>
                              {provider}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name on account" {...field} data-testid="input-account-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedType === "mobile_wallet" ? "Phone / Wallet Number" : "Account Number"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={selectedType === "mobile_wallet" ? "09..." : "Account number"}
                          {...field}
                          data-testid="input-account-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMethod.isPending} data-testid="button-save-payment">
                    {createMethod.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
