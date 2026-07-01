import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, ShoppingBag } from "lucide-react";
import { Link } from "wouter";
import type { Transaction, User as UserType, Product } from "@shared/schema";

type PurchaseTransaction = Transaction & { seller: UserType; product: Product };
type SaleTransaction = Transaction & { buyer: UserType; product: Product };

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(num);
}

function statusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function OrderRow({
  productName,
  counterparty,
  quantity,
  unit,
  total,
  status,
  date,
}: {
  productName: string;
  counterparty: string;
  quantity: string;
  unit: string;
  total: string;
  status: string | null;
  date: Date | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate" data-testid="text-order-product">
              {productName}
            </h4>
            <p className="text-sm text-muted-foreground truncate">{counterparty}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {parseFloat(quantity)} {unit} · {formatCurrency(total)}
            </p>
            {date && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(date).toLocaleDateString()}
              </p>
            )}
          </div>
          <Badge variant={statusVariant(status)} className="capitalize">
            {status || "pending"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Package; message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-40" />
      <p>{message}</p>
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const isSeller = user?.userType === "seller";

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<PurchaseTransaction[]>({
    queryKey: ["/api/buyer/transactions"],
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery<SaleTransaction[]>({
    queryKey: ["/api/seller/transactions"],
    enabled: isSeller,
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
          <h1 className="text-xl font-bold">My Orders</h1>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="purchases">
          <TabsList className={isSeller ? "grid w-full grid-cols-2" : "grid w-full grid-cols-1"}>
            <TabsTrigger value="purchases" data-testid="tab-purchases">
              Purchases
            </TabsTrigger>
            {isSeller && (
              <TabsTrigger value="sales" data-testid="tab-sales">
                Sales
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="purchases" className="mt-4 space-y-3">
            {purchasesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : purchases.length === 0 ? (
              <EmptyState icon={ShoppingBag} message="You haven't placed any orders yet" />
            ) : (
              purchases.map((tx) => (
                <OrderRow
                  key={tx.id}
                  productName={tx.product?.name || "Product"}
                  counterparty={`Sold by ${tx.seller?.firstName || tx.seller?.email?.split("@")[0] || "Seller"}`}
                  quantity={tx.quantity}
                  unit={tx.product?.unit || "unit"}
                  total={tx.totalAmount}
                  status={tx.status}
                  date={tx.transactionDate}
                />
              ))
            )}
          </TabsContent>

          {isSeller && (
            <TabsContent value="sales" className="mt-4 space-y-3">
              {salesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : sales.length === 0 ? (
                <EmptyState icon={Package} message="No sales yet" />
              ) : (
                sales.map((tx) => (
                  <OrderRow
                    key={tx.id}
                    productName={tx.product?.name || "Product"}
                    counterparty={`Bought by ${tx.buyer?.firstName || tx.buyer?.email?.split("@")[0] || "Buyer"}`}
                    quantity={tx.quantity}
                    unit={tx.product?.unit || "unit"}
                    total={tx.totalAmount}
                    status={tx.status}
                    date={tx.transactionDate}
                  />
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
