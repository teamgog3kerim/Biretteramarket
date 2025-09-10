import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import { Heart, Star, ShoppingCart } from "lucide-react";
import { Link } from "wouter";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string;
    price: string;
    unit?: string;
    imageUrl?: string;
    seller: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
    category: {
      id: string;
      name: string;
    };
  };
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: ProductCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addToFavorites = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/favorites", { productId: product.id });
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

  const sellerName = product.seller.firstName && product.seller.lastName 
    ? `${product.seller.firstName} ${product.seller.lastName}`
    : product.seller.email.split('@')[0];

  const price = parseFloat(product.price);
  const formattedPrice = price.toLocaleString('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 0,
  });

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        <div className="relative">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className={cn(
                "w-full object-cover",
                compact ? "h-20" : "h-24"
              )}
            />
          ) : (
            <div className={cn(
              "w-full bg-muted flex items-center justify-center",
              compact ? "h-20" : "h-24"
            )}>
              <i className="fas fa-box text-muted-foreground text-2xl"></i>
            </div>
          )}
          
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addToFavorites.mutate();
            }}
            disabled={addToFavorites.isPending}
            data-testid={`button-favorite-${product.id}`}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>

      <CardContent className={cn("p-1.5 sm:p-2 md:p-3", compact && "p-1.5")}>
        <div className="mb-1">
          <Badge variant="outline" className="text-xs leading-none">
            {product.category.name}
          </Badge>
        </div>
        
        <h3 className={cn(
          "font-medium mb-1 line-clamp-1 leading-tight",
          compact ? "text-xs sm:text-sm" : "text-xs sm:text-sm md:text-base"
        )} data-testid={`text-product-name-${product.id}`}>
          {product.name}
        </h3>
        
        {product.description && (
          <p className={cn(
            "text-muted-foreground mb-2 line-clamp-2 leading-tight",
            compact ? "text-xs" : "text-xs sm:text-sm"
          )}>
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <span className="text-primary font-bold text-xs sm:text-sm md:text-base" data-testid={`text-product-price-${product.id}`}>
              {formattedPrice}
              {product.unit && <span className="text-xs text-muted-foreground">/{product.unit}</span>}
            </span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Star className="h-3 w-3 text-accent mr-1 fill-current" />
            <span className="hidden sm:inline text-xs">4.8</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate leading-tight" data-testid={`text-seller-name-${product.id}`}>
              by {sellerName}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="ml-1 sm:ml-2 h-6 w-6 sm:h-7 sm:w-7 p-0 flex-shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            data-testid={`button-add-cart-${product.id}`}
          >
            <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
