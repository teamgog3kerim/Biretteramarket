import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { Favorite, Product, User as UserType, Category } from "@shared/schema";

type ProductWithRelations = Product & { seller: UserType; category: Category };
type FavoriteWithRelations = Favorite & { product: ProductWithRelations };

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(num);
}

export default function Favorites() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery<FavoriteWithRelations[]>({
    queryKey: ["/api/favorites"],
  });

  const removeFavorite = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("DELETE", `/api/favorites/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: "Removed", description: "Removed from favorites" });
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
        description: "Failed to remove favorite",
        variant: "destructive",
      });
    },
  });

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
          <h1 className="text-xl font-bold">Favorites</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No favorites yet</p>
            <Link href="/">
              <Button variant="outline" className="mt-4" data-testid="button-browse">
                Browse Products
              </Button>
            </Link>
          </div>
        ) : (
          favorites.map((fav) => (
            <Card key={fav.id}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <Link href={`/product/${fav.product?.id}`} className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {fav.product?.imageUrl ? (
                        <img
                          src={fav.product.imageUrl}
                          alt={fav.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Heart className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate" data-testid="text-favorite-name">
                        {fav.product?.name || "Product"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {fav.product?.category?.name || ""}
                      </p>
                      <p className="text-sm font-medium text-primary">
                        {fav.product ? formatCurrency(fav.product.price) : ""}
                        {fav.product?.unit ? `/${fav.product.unit}` : ""}
                      </p>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => removeFavorite.mutate(fav.product.id)}
                    disabled={removeFavorite.isPending}
                    data-testid="button-remove-favorite"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
