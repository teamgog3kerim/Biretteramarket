import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { z } from "zod";
import type { Category } from "@shared/schema";

// Define the form schema based on the product schema
const addProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255, "Product name is too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description is too long"),
  price: z.string().min(1, "Price is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Price must be a valid positive number"),
  unit: z.string().min(1, "Unit is required").max(50, "Unit is too long"),
  imageUrl: z.string().url("Please enter a valid image URL").optional().or(z.literal("")),
  categoryId: z.string().min(1, "Category is required"),
});

type AddProductFormData = z.infer<typeof addProductSchema>;

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddProductModal({ open, onOpenChange }: AddProductModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<AddProductFormData>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      unit: "",
      imageUrl: "",
      categoryId: "",
    },
  });

  const createProduct = useMutation({
    mutationFn: async (productData: AddProductFormData) => {
      const payload = {
        ...productData,
        price: productData.price, // Keep as string for backend
        imageUrl: productData.imageUrl || undefined,
      };
      await apiRequest("POST", "/api/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/analytics"] });
      
      toast({
        title: "Product Added",
        description: "Your product has been successfully added to the marketplace.",
      });
      
      form.reset();
      onOpenChange(false);
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
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddProductFormData) => {
    createProduct.mutate(data);
  };

  const commonUnits = [
    "kg", "ton", "meter", "piece", "box", "bag", "bundle", "sheet", "roll", "liter"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Steel Reinforcement Bar TMT 16mm"
                      {...field}
                      data-testid="input-product-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide detailed information about your product, including specifications, quality, and key features..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-product-description"
                    />
                  </FormControl>
                  <FormDescription>
                    Include specifications, quality details, and key features (minimum 10 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (ETB) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-product-price"
                      />
                    </FormControl>
                    <FormDescription>
                      Price in Ethiopian Birr
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Select 
                          value={field.value} 
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="flex-1" data-testid="select-product-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {commonUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        {field.value === "custom" && (
                          <Input 
                            placeholder="Enter unit"
                            onChange={(e) => field.onChange(e.target.value)}
                            className="flex-1"
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Pricing unit (e.g., kg, ton, meter, piece)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger data-testid="select-product-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://example.com/product-image.jpg"
                      {...field}
                      data-testid="input-product-image"
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a URL to your product image. Must be a valid web URL.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createProduct.isPending}
                data-testid="button-cancel-add-product"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProduct.isPending}
                data-testid="button-submit-add-product"
              >
                {createProduct.isPending ? "Adding Product..." : "Add Product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}