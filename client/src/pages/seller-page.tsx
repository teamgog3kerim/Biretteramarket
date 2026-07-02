import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product-card";
import { ArrowLeft, Store, Phone, MapPin, UserRound, Mail, Package } from "lucide-react";
import type { Product, User as UserType } from "@shared/schema";

const TYPE_LABELS: Record<string, string> = {
  seller: "Seller",
  dealer: "Dealer",
  importer: "Importer",
  manufacturer: "Manufacturer",
};

type SellerProfile = Pick<
  UserType,
  | "id"
  | "firstName"
  | "lastName"
  | "profileImageUrl"
  | "businessName"
  | "contactPerson"
  | "phone"
  | "location"
  | "email"
  | "userType"
> & { products: Product[] };

export default function SellerPage() {
  const [, params] = useRoute("/seller/:id");
  const sellerId = params?.id;

  const { data: seller, isLoading } = useQuery<SellerProfile>({
    queryKey: ["/api/sellers", sellerId],
    enabled: !!sellerId,
  });

  if (isLoading) {
    return (
      <div className="pb-20 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="pb-20 p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Seller not found</h2>
            <p className="text-muted-foreground mb-4">
              This seller does not exist or is no longer active.
            </p>
            <Link href="/">
              <Button data-testid="button-back-home">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName =
    seller.businessName ||
    (seller.firstName && seller.lastName
      ? `${seller.firstName} ${seller.lastName}`
      : seller.email?.split("@")[0] || "Seller");

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-center space-x-3 mb-3">
          <Link href="/">
            <button className="p-1" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <h1 className="text-xl font-bold">Seller Profile</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Seller Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center overflow-hidden">
                {seller.profileImageUrl ? (
                  <img
                    src={seller.profileImageUrl}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <Store className="h-8 w-8 text-accent-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg" data-testid="text-seller-name">
                  {displayName}
                </h2>
                <Badge variant="default" className="mt-1">
                  {TYPE_LABELS[seller.userType || "seller"] || "Seller"}
                </Badge>
              </div>
            </div>

            {/* Contact info — free for all buyers */}
            <div className="space-y-2 border-t border-border pt-3">
              {seller.businessName && (
                <div className="flex items-center text-sm">
                  <Store className="h-4 w-4 mr-2 text-secondary" />
                  <span data-testid="text-seller-business">{seller.businessName}</span>
                </div>
              )}
              {seller.contactPerson && (
                <div className="flex items-center text-sm">
                  <UserRound className="h-4 w-4 mr-2 text-secondary" />
                  <span data-testid="text-seller-contact-person">
                    Contact: {seller.contactPerson}
                  </span>
                </div>
              )}
              {seller.phone && (
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-secondary" />
                  <a
                    href={`tel:${seller.phone}`}
                    className="text-primary underline"
                    data-testid="link-seller-phone"
                  >
                    {seller.phone}
                  </a>
                </div>
              )}
              {seller.email && (
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-secondary" />
                  <a
                    href={`mailto:${seller.email}`}
                    className="text-primary underline"
                    data-testid="link-seller-email"
                  >
                    {seller.email}
                  </a>
                </div>
              )}
              {seller.location && (
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-secondary" />
                  <span data-testid="text-seller-location">{seller.location}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center">
            <Package className="h-5 w-5 mr-2 text-secondary" />
            Products ({seller.products.length})
          </h2>
          {seller.products.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No products listed yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {seller.products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
