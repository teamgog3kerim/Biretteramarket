import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product-card";
import { Search } from "lucide-react";
import type { Category, Product, User } from "@shared/schema";

type ProductWithRelations = Product & { seller: User; category: Category };

export default function Categories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [] } = useQuery<ProductWithRelations[]>({
    queryKey: ["/api/products", { 
      categoryId: selectedCategory, 
      search: searchQuery || undefined 
    }],
  });

  const categoryFilters = [
    { id: null, name: "All" },
    ...categories.map((cat) => ({ id: cat.id, name: cat.name })),
  ];

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground">
        <h1 className="text-xl font-bold mb-4">Categories</h1>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search in categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background text-foreground pl-10 focus:ring-2 focus:ring-accent"
            data-testid="input-search-categories"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        </div>
      </div>

      <div className="p-4">
        {/* Category Filters */}
        <div className="flex space-x-2 mb-4 overflow-x-auto hide-scrollbar">
          {categoryFilters.map((category) => (
            <Button
              key={category.id || "all"}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              className="flex-none whitespace-nowrap"
              onClick={() => setSelectedCategory(category.id)}
              data-testid={`button-filter-${category.name.toLowerCase()}`}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-3">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {products.length === 0 && (
            <div className="col-span-2 bg-muted rounded-lg p-6 text-center">
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory 
                  ? "No products found matching your criteria" 
                  : "No products available"
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
