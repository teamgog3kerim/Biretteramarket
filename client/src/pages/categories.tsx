import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProductCard from "@/components/product-card";
import {
  Search, ChevronRight, ChevronLeft, Package,
  Factory, Layers, Truck, Wrench, HardHat, Home, Droplets, Zap, Flame,
  Settings, Paintbrush, Shield, Cog, Building2, DoorOpen, Grid3X3,
  Square, Waves, Fence, Sprout, Puzzle, Disc, Handshake,
} from "lucide-react";
import type { Category, Product, User } from "@shared/schema";

type ProductWithRelations = Product & { seller: User; category: Category };

const ICON_MAP: Record<string, typeof Package> = {
  Factory, Layers, Truck, Wrench, HardHat, Home, Droplets, Zap, Flame,
  Settings, Paintbrush, Shield, Cog, Building2, DoorOpen, Grid3x3: Grid3X3,
  Square, Waves, Fence, Sprout, Puzzle, Disc, Handshake,
};

function CategoryIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const Icon = (icon && ICON_MAP[icon]) || Package;
  return <Icon className={className} />;
}

export default function Categories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [path, setPath] = useState<Category[]>([]);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const current = path.length > 0 ? path[path.length - 1] : null;

  const children = useMemo(
    () =>
      categories
        .filter((c) => (current ? c.parentId === current.id : !c.parentId))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [categories, current]
  );

  const childCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of categories) {
      if (c.parentId) counts.set(c.parentId, (counts.get(c.parentId) ?? 0) + 1);
    }
    return counts;
  }, [categories]);

  const showProducts = searchQuery.length > 0 || current !== null;

  const { data: products = [], isLoading: productsLoading } = useQuery<ProductWithRelations[]>({
    queryKey: ["/api/products", {
      categoryId: current?.id,
      search: searchQuery || undefined,
    }],
    enabled: showProducts,
  });

  const drillDown = (category: Category) => {
    setPath([...path, category]);
  };

  const goBack = () => {
    setPath(path.slice(0, -1));
  };

  const goToLevel = (index: number) => {
    setPath(path.slice(0, index + 1));
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-center gap-2 mb-4">
          {path.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
              onClick={goBack}
              data-testid="button-category-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-xl font-bold truncate" data-testid="text-categories-title">
            {current ? current.name : "Categories"}
          </h1>
        </div>
        <div className="relative">
          <Input
            type="text"
            placeholder={current ? `Search in ${current.name}...` : "Search all products..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background text-foreground pl-10 focus:ring-2 focus:ring-accent"
            data-testid="input-search-categories"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        </div>
      </div>

      <div className="p-2 sm:p-4">
        {/* Breadcrumb */}
        {path.length > 0 && (
          <div className="flex items-center flex-wrap gap-1 mb-3 text-xs sm:text-sm" data-testid="breadcrumb-categories">
            <button
              className="text-primary font-medium hover:underline"
              onClick={() => setPath([])}
              data-testid="breadcrumb-all"
            >
              All
            </button>
            {path.map((cat, i) => (
              <span key={cat.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                {i === path.length - 1 ? (
                  <span className="text-foreground font-medium">{cat.name}</span>
                ) : (
                  <button
                    className="text-primary font-medium hover:underline"
                    onClick={() => goToLevel(i)}
                    data-testid={`breadcrumb-${i}`}
                  >
                    {cat.name}
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Main category grid (top level) */}
        {!current && !searchQuery && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {children.map((cat) => (
              <Card
                key={cat.id}
                className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                onClick={() => drillDown(cat)}
                data-testid={`card-category-${cat.id}`}
              >
                <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CategoryIcon icon={cat.icon} className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium leading-tight">{cat.name}</span>
                  {(childCounts.get(cat.id) ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {childCounts.get(cat.id)} types
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Subcategory / product-type list (levels 2 & 3) */}
        {current && children.length > 0 && !searchQuery && (
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              Browse {current.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
              {children.map((cat) => (
                <button
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2.5 bg-card border rounded-lg text-left hover:bg-accent/10 transition-colors"
                  onClick={() => drillDown(cat)}
                  data-testid={`button-subcategory-${cat.id}`}
                >
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {(childCounts.get(cat.id) ?? 0) > 0 && (
                      <span className="text-[10px]">{childCounts.get(cat.id)}</span>
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {showProducts && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              {searchQuery ? "Search Results" : `Products in ${current?.name}`}
            </h2>
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-muted rounded-lg h-48 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
                {products.length === 0 && (
                  <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 xl:col-span-6 bg-muted rounded-lg p-3 sm:p-4 md:p-6 text-center">
                    <p className="text-muted-foreground text-sm sm:text-base">
                      {searchQuery
                        ? "No products found matching your criteria"
                        : "No products listed in this category yet"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
