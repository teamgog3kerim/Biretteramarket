import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product-card";
import SubscriptionModal from "@/components/subscription-modal";
import { useState } from "react";
import { Search, Filter, Bell, User, Calculator, Factory, HardHat, Wrench } from "lucide-react";
import { useLocation } from "wouter";
import { isSellerType } from "@shared/schema";
import type { Product, User as UserType, Category } from "@shared/schema";

type ProductWithRelations = Product & { seller: UserType; category: Category };
type TopSeller = UserType & { productCount: number };

function SellerListSection({
  title,
  sellers,
  emptyMessage,
  onSellerClick,
}: {
  title: string;
  sellers: TopSeller[];
  emptyMessage?: string;
  onSellerClick: (id: string) => void;
}) {
  return (
    <div className="px-2 sm:px-4 mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="space-y-3">
        {sellers.map((seller) => (
          <Card
            key={seller.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onSellerClick(seller.id)}
            data-testid={`card-seller-${seller.id}`}
          >
            <CardContent className="p-3 flex items-center space-x-3">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center overflow-hidden">
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
                  {seller.businessName ||
                    (seller.firstName && seller.lastName
                      ? `${seller.firstName} ${seller.lastName}`
                      : seller.email?.split("@")[0] || "Seller")}
                </h3>
                {seller.contactPerson && (
                  <p className="text-xs text-muted-foreground">Contact: {seller.contactPerson}</p>
                )}
                {seller.location && (
                  <p className="text-xs text-muted-foreground">{seller.location}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground" data-testid={`text-product-count-${seller.id}`}>
                  {seller.productCount} products
                </span>
                <Button
                  size="sm"
                  className="block mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSellerClick(seller.id);
                  }}
                  data-testid={`button-view-store-${seller.id}`}
                >
                  View Store
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {sellers.length === 0 && emptyMessage && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">{emptyMessage}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: featuredProducts = [] } = useQuery<ProductWithRelations[]>({
    queryKey: ["/api/products", { featured: true, limit: 10 }],
  });

  const { data: topSellers = [] } = useQuery<TopSeller[]>({
    queryKey: ["/api/sellers/top", { limit: 5 }],
  });

  const { data: topImporters = [] } = useQuery<TopSeller[]>({
    queryKey: ["/api/sellers/top", { limit: 3, type: "importer" }],
  });

  const { data: topManufacturers = [] } = useQuery<TopSeller[]>({
    queryKey: ["/api/sellers/top", { limit: 3, type: "manufacturer" }],
  });

  const { data: recentProducts = [] } = useQuery<ProductWithRelations[]>({
    queryKey: ["/api/products", { limit: 6 }],
  });

  const quickCategories = [
    { name: "Steel & Iron", icon: Factory, color: "text-secondary", href: "/categories" },
    { name: "Building", icon: HardHat, color: "text-secondary", href: "/categories" },
    { name: "Tools", icon: Wrench, color: "text-secondary", href: "/categories" },
    { name: "Calculators", icon: Calculator, color: "text-secondary", href: "/calculators" },
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
                onClick={() => setLocation(category.href)}
                data-testid={`button-category-${category.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
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
      <SellerListSection
        title="Top Sellers"
        sellers={topSellers}
        emptyMessage="No sellers available yet"
        onSellerClick={(id) => setLocation(`/seller/${id}`)}
      />

      {/* Top Importers Section */}
      {topImporters.length > 0 && (
        <SellerListSection
          title="Top Importers"
          sellers={topImporters}
          onSellerClick={(id) => setLocation(`/seller/${id}`)}
        />
      )}

      {/* Top Manufacturers Section */}
      {topManufacturers.length > 0 && (
        <SellerListSection
          title="Top Manufacturers"
          sellers={topManufacturers}
          onSellerClick={(id) => setLocation(`/seller/${id}`)}
        />
      )}

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

      {/* Free Trial Banner — only for seller-type accounts without an active paid plan */}
      {isSellerType(user?.userType) && (!user?.subscription || user.subscription.planType === 'free_trial') && (
        <div className="mx-4 mb-6 bg-gradient-to-r from-primary to-accent rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1">Grow Your Business!</h3>
              <p className="text-xs opacity-90">20-day free trial, then 990 ETB/month to list products</p>
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
