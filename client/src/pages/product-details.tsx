import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  ShoppingCart, 
  Star, 
  MapPin, 
  Truck, 
  Shield, 
  Clock,
  User,
  Phone,
  Mail
} from "lucide-react";
import type { Product, User as UserType, Category } from "@shared/schema";

type ProductWithRelations = Product & { seller: UserType; category: Category };

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading, error } = useQuery<ProductWithRelations>({
    queryKey: ["/api/products", id],
  });

  const addToFavorites = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/favorites", { productId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Added to Favorites",
        description: "Product added to your favorites",
      });
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
        description: "Failed to add to favorites",
        variant: "destructive",
      });
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (orderData: { quantity: number; totalAmount: number }) => {
      if (!product) throw new Error("Product not found");
      await apiRequest("POST", "/api/transactions", {
        sellerId: product.sellerId,
        productId: id,
        quantity: orderData.quantity.toString(),
        unitPrice: product.price,
        totalAmount: orderData.totalAmount.toString(),
        status: "pending",
      });
    },
    onSuccess: () => {
      toast({
        title: "Order Placed",
        description: "Your order has been placed successfully. The seller will contact you soon.",
      });
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
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="pb-20">
        <div className="bg-primary p-4 text-primary-foreground">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 mr-2 p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Product Details</h1>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="animate-pulse">
            <div className="h-48 bg-muted rounded-lg mb-4"></div>
            <div className="h-6 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded mb-4 w-3/4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pb-20">
        <div className="bg-primary p-4 text-primary-foreground">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 mr-2 p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Product Not Found</h1>
          </div>
        </div>
        <div className="p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-bold mb-2">Product Not Found</h2>
              <p className="text-muted-foreground mb-4">The product you're looking for doesn't exist or has been removed.</p>
              <Link href="/">
                <Button>Back to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleOrder = () => {
    if (!product) return;
    const quantity = 1; // Default quantity, can be made configurable
    const totalAmount = parseFloat(product.price) * quantity;
    createTransaction.mutate({ quantity, totalAmount });
  };

  const sellerName = product.seller?.firstName && product.seller?.lastName 
    ? `${product.seller.firstName} ${product.seller.lastName}`
    : product.seller?.email?.split('@')[0] || 'Unknown Seller';

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 mr-2 p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Product Details</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
              data-testid="button-share"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
              onClick={() => addToFavorites.mutate()}
              disabled={addToFavorites.isPending}
              data-testid="button-favorite"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Product Image and Basic Info */}
        <Card>
          <CardContent className="p-0">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-full h-48 sm:h-64 object-cover rounded-t-lg"
              />
            ) : (
              <div className="w-full h-48 sm:h-64 bg-muted flex items-center justify-center rounded-t-lg">
                <i className="fas fa-box text-muted-foreground text-4xl"></i>
              </div>
            )}
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className="mb-2">
                  {product.category?.name || 'N/A'}
                </Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Star className="h-4 w-4 text-accent mr-1 fill-current" />
                  <span>4.8 (234 reviews)</span>
                </div>
              </div>
              
              <h1 className="text-2xl font-bold mb-2" data-testid="text-product-name">
                {product.name}
              </h1>
              
              <div className="flex items-baseline mb-4">
                <span className="text-3xl font-bold text-primary" data-testid="text-product-price">
                  {formatCurrency(product.price)}
                </span>
                {product.unit && (
                  <span className="text-muted-foreground ml-2">per {product.unit}</span>
                )}
              </div>

              {product.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Features */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Product Features</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm">Quality Assured</span>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Fast Delivery</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="text-sm">Ethiopia Wide</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller Information */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Seller Information</h3>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                {product.seller?.profileImageUrl ? (
                  <img 
                    src={product.seller.profileImageUrl} 
                    alt={sellerName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-accent-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium" data-testid="text-seller-name">
                  {sellerName}
                </h4>
                <p className="text-sm text-muted-foreground">Construction materials specialist</p>
                <div className="flex items-center mt-1">
                  <div className="flex text-accent text-xs mr-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">4.9 (567 reviews)</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" data-testid="button-contact-phone">
                <Phone className="h-4 w-4 mr-2" />
                Call Seller
              </Button>
              <Button variant="outline" size="sm" data-testid="button-contact-email">
                <Mail className="h-4 w-4 mr-2" />
                Email Seller
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Specifications</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span>{product.category?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit:</span>
                <span>{product.unit || 'Piece'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Availability:</span>
                <span className="text-green-600">In Stock</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum Order:</span>
                <span>1 {product.unit || 'Piece'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-background border-t border-border p-4">
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1"
            onClick={() => addToFavorites.mutate()}
            disabled={addToFavorites.isPending}
            data-testid="button-add-favorite"
          >
            <Heart className="h-4 w-4 mr-2" />
            Add to Favorites
          </Button>
          <Button 
            size="lg" 
            className="flex-1"
            onClick={handleOrder}
            disabled={createTransaction.isPending}
            data-testid="button-order-now"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {createTransaction.isPending ? "Ordering..." : "Order Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}