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
import { X, Upload, Image } from "lucide-react";
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
  discountPrice: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Discount price must be a valid positive number"),
  specifications: z.string().max(2000, "Specifications are too long").optional(),
  features: z.string().max(2000, "Features are too long").optional(),
  unit: z.string().min(1, "Unit is required").max(50, "Unit is too long"),
  quantityAvailable: z.string().min(1, "Quantity is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Quantity must be a valid non-negative number"),
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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const byOrder = (a: Category, b: Category) =>
    (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);
  const mainCategories = categories.filter((c) => !c.parentId).sort(byOrder);
  const subCategories = categories.filter((c) => c.parentId === mainCategoryId).sort(byOrder);
  const productTypes = categories.filter((c) => c.parentId === subCategoryId).sort(byOrder);

  const form = useForm<AddProductFormData>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      discountPrice: "",
      specifications: "",
      features: "",
      unit: "",
      quantityAvailable: "",
      categoryId: "",
    },
  });

  const createProduct = useMutation({
    mutationFn: async (productData: AddProductFormData) => {
      // Convert images to base64 for now (in a real app, you'd upload to a file storage service)
      const imageUrls: string[] = [];
      for (const file of selectedImages) {
        const base64 = await convertToBase64(file);
        imageUrls.push(base64);
      }
      
      const payload = {
        ...productData,
        price: productData.price, // Keep as string for backend
        discountPrice: productData.discountPrice ? productData.discountPrice : undefined,
        specifications: productData.specifications || undefined,
        features: productData.features || undefined,
        quantityAvailable: productData.quantityAvailable,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : undefined, // Backwards compatibility
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
      setSelectedImages([]);
      setMainCategoryId("");
      setSubCategoryId("");
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

      if (error instanceof Error && error.message.startsWith("402")) {
        toast({
          title: "Subscription Required",
          description: "Your free trial or subscription has ended. Subscribe for 990 ETB/month to keep listing products.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length + selectedImages.length > 3) {
      toast({
        title: "Too Many Images",
        description: "You can upload a maximum of 3 images.",
        variant: "destructive",
      });
      return;
    }

    // Validate file types only
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    setSelectedImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: AddProductFormData) => {
    createProduct.mutate(data);
  };

  const commonUnits = [
    "kg", "ton", "meter", "piece", "box", "bag", "bundle", "sheet", "roll", "liter"
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setMainCategoryId("");
          setSubCategoryId("");
          form.setValue("categoryId", "");
        }
        onOpenChange(nextOpen);
      }}
    >
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                name="discountPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Price (ETB)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Optional"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-product-discount-price"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional discounted price
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantityAvailable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Available *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-product-quantity"
                      />
                    </FormControl>
                    <FormDescription>
                      Available stock quantity
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
              render={() => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <div className="space-y-2">
                    <Select
                      value={mainCategoryId}
                      onValueChange={(value) => {
                        setMainCategoryId(value);
                        setSubCategoryId("");
                        form.setValue("categoryId", value, { shouldValidate: true });
                      }}
                    >
                      <SelectTrigger data-testid="select-product-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {mainCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {subCategories.length > 0 && (
                      <Select
                        value={subCategoryId}
                        onValueChange={(value) => {
                          setSubCategoryId(value);
                          form.setValue("categoryId", value, { shouldValidate: true });
                        }}
                      >
                        <SelectTrigger data-testid="select-product-subcategory">
                          <SelectValue placeholder="Select a subcategory (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {subCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {productTypes.length > 0 && (
                      <Select
                        value={
                          productTypes.some((t) => t.id === form.watch("categoryId"))
                            ? form.watch("categoryId")
                            : ""
                        }
                        onValueChange={(value) => {
                          form.setValue("categoryId", value, { shouldValidate: true });
                        }}
                      >
                        <SelectTrigger data-testid="select-product-type">
                          <SelectValue placeholder="Select a product type (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {productTypes.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <FormDescription>
                    Pick the closest match — the more specific, the easier buyers can find it
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specifications</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Grade 60, Diameter 16mm, Length 12m, Standard: ES EN 10080"
                      className="min-h-[80px]"
                      {...field}
                      value={field.value ?? ""}
                      data-testid="textarea-product-specifications"
                    />
                  </FormControl>
                  <FormDescription>
                    Technical specifications (size, grade, standard, material)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="features"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Features</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Corrosion resistant, High tensile strength, Factory certified"
                      className="min-h-[80px]"
                      {...field}
                      value={field.value ?? ""}
                      data-testid="textarea-product-features"
                    />
                  </FormControl>
                  <FormDescription>
                    Highlight what makes this product stand out
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Product Images (Optional - Max 3)</FormLabel>
              <div className="mt-2">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, JPEG (any size)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      data-testid="input-product-images"
                    />
                  </label>
                </div>
                
                {selectedImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Selected Images ({selectedImages.length}/3):</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedImages.map((file, index) => (
                        <div key={index} className="relative">
                          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                            <Image className="h-8 w-8 text-muted-foreground" />
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <p className="text-xs text-center mt-1 truncate">{file.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <FormDescription className="mt-2">
                  Upload up to 3 images of your product. Any file size is supported.
                </FormDescription>
              </div>
            </div>

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