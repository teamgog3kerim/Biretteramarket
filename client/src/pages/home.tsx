import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product-card";
import SubscriptionModal from "@/components/subscription-modal";
import { useState } from "react";
import { Search, Filter, Bell, User, Calculator, Hammer, Factory, HardHat } from "lucide-react";
import type { Product, User as UserType, Category } from "@shared/schema";

type ProductWithRelations = Product & { seller: UserType; category: Category };
type TopSeller = UserType & { productCount: number };

export default function Home() {
  const { user } = useAuth();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: featuredProducts = [] } = useQuery<ProductWithRelations[]>({
    queryKey: ["/api/products", { featured: true, limit: 10 }],
  });

  const { data: topSellers = [] } = useQuery<TopSeller[]>({
    queryKey: ["/api/sellers/top", { limit: 5 }],
  });

  const { data: recentProducts = [] } = useQuery<ProductWithRelations[]>({
    queryKey: ["/api/products", { limit: 6 }],
  });

  const quickCategories = [
    { name: "Steel", icon: Hammer, color: "text-secondary" },
    { name: "Iron", icon: Factory, color: "text-secondary" },
    { name: "Construction", icon: HardHat, color: "text-secondary" },
    { name: "Calculators", icon: Calculator, color: "text-secondary" },
  ];

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Biret Tera</h1>
            <p className="text-sm opacity-90">Construction Materials Marketplace</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="relative" data-testid="button-notifications">
              <Bell className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 bg-accent text-xs rounded-full w-4 h-4 flex items-center justify-center text-accent-foreground">3</span>
            </button>
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-accent-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search steel, iron, construction materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background text-foreground pl-10 focus:ring-2 focus:ring-accent"
            data-testid="input-search"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Button
            size="sm"
            variant="secondary"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="button-filter"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Categories */}
      <div className="px-2 sm:px-4 py-3 sm:py-4">
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-1 sm:gap-2 md:gap-3">
          {quickCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.name}
                variant="outline"
                className="flex flex-col p-3 sm:p-4 h-auto space-y-1 sm:space-y-2"
                data-testid={`button-category-${category.name.toLowerCase()}`}
              >
                <Icon className={`h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 ${category.color}`} />
                <span className="text-xs sm:text-sm font-medium">{category.name}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Featured Products Carousel */}
      <div className="px-2 sm:px-4 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg md:text-xl font-bold">Featured Products</h2>
          <Button variant="link" className="text-primary p-0 text-xs sm:text-sm" data-testid="link-view-all-featured">
            View All
          </Button>
        </div>
        <div className="flex space-x-2 sm:space-x-3 md:space-x-4 overflow-x-auto hide-scrollbar">
          {featuredProducts.map((product: any) => (
            <div key={product.id} className="flex-none w-36 sm:w-44 md:w-48 lg:w-52">
              <ProductCard product={product} compact />
            </div>
          ))}
          {featuredProducts.length === 0 && (
            <div className="flex-none w-36 sm:w-44 md:w-48 bg-muted rounded-lg p-3 sm:p-4 md:p-6 text-center">
              <p className="text-muted-foreground text-xs sm:text-sm">No featured products available</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Sellers Section */}
      <div className="px-2 sm:px-4 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Top Sellers</h2>
          <Button variant="link" className="text-primary p-0" data-testid="link-view-all-sellers">
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {topSellers.map((seller: any, index: number) => (
            <Card key={seller.id}>
              <CardContent className="p-3 flex items-center space-x-3">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                  {seller.profileImageUrl ? (
                    <img 
                      src={seller.profileImageUrl} 
                      alt={seller.firstName || "Seller"}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <i className="fas fa-store text-accent-foreground"></i>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {seller.firstName && seller.lastName 
                      ? `${seller.firstName} ${seller.lastName}`
                      : seller.email?.split('@')[0] || "Seller"
                    }
                  </h3>
                  <p className="text-xs text-muted-foreground">Construction materials specialist</p>
                  <div className="flex items-center mt-1">
                    <div className="flex text-accent text-xs mr-2">
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className="fas fa-star"></i>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">4.9 (234 reviews)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground" data-testid={`text-product-count-${seller.id}`}>
                    {seller.productCount} products
                  </span>
                  <Button size="sm" className="block mt-1" data-testid={`button-follow-${seller.id}`}>
                    Follow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {topSellers.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No sellers available yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Products */}
      <div className="px-2 sm:px-4 mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3">Recent Products</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {recentProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {recentProducts.length === 0 && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-5 bg-muted rounded-lg p-4 sm:p-6 text-center">
              <p className="text-muted-foreground text-sm sm:text-base">No products available</p>
            </div>
          )}
        </div>
      </div>

      {/* Free Trial Banner */}
      {(!user?.subscription || user.subscription.planType === 'free_trial') && (
        <div className="mx-4 mb-6 bg-gradient-to-r from-primary to-accent rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1">Start Your Free Trial!</h3>
              <p className="text-xs opacity-90">Get 1 month free access to seller contacts</p>
            </div>
            <Button
              onClick={() => setShowSubscriptionModal(true)}
              className="bg-white text-primary hover:bg-white/90"
              size="sm"
              data-testid="button-start-trial"
            >
              Start Now
            </Button>
          </div>
        </div>
      )}

      <SubscriptionModal 
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
}
