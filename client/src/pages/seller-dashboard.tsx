import { isSellerType } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  ShoppingCart, 
  Eye,
  Calendar,
  BarChart3,
  Target,
  Users,
  Star,
  ArrowLeft,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import AddProductModal from "@/components/add-product-modal";
import type { Product, User as UserType, Category, Transaction, MarketReport } from "@shared/schema";

type ProductWithRelations = Product & { seller: UserType; category: Category };
type TransactionWithRelations = Transaction & { buyer: UserType; product: Product };
type MarketReportWithCategory = MarketReport & { category: Category };

interface SellerAnalytics {
  totalSales: number;
  totalRevenue: string;
  avgOrderValue: string;
  topProducts: (Product & { salesCount: number; revenue: string })[];
  monthlySales: { month: string; sales: number; revenue: string }[];
}

export default function SellerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Redirect if not a seller
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isSellerType(user?.userType))) {
      toast({
        title: "Access Denied",
        description: "Only sellers can access this dashboard",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, isLoading, user?.userType, toast]);

  const { data: sellerProducts = [] } = useQuery<ProductWithRelations[]>({
    queryKey: ["/api/seller/products"],
    enabled: isSellerType(user?.userType),
  });

  const { data: sellerAnalytics } = useQuery<SellerAnalytics>({
    queryKey: ["/api/seller/analytics"],
    enabled: isSellerType(user?.userType),
  });

  const { data: recentTransactions = [] } = useQuery<TransactionWithRelations[]>({
    queryKey: ["/api/seller/transactions", { limit: 10 }],
    enabled: isSellerType(user?.userType),
  });

  const { data: marketReports = [] } = useQuery<MarketReportWithCategory[]>({
    queryKey: ["/api/market-reports"],
    enabled: isSellerType(user?.userType),
  });

  if (isLoading) {
    return (
      <div className="pb-20 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isSellerType(user?.userType)) {
    return (
      <div className="pb-20 p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">Only sellers can access this dashboard</p>
            <Link href="/profile">
              <Button>Go to Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-ET', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 mr-2 p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Seller Dashboard</h1>
              <p className="text-sm opacity-90">Your business insights and analytics</p>
            </div>
          </div>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setShowAddProductModal(true)}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="button-add-product"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-lg font-bold" data-testid="text-total-sales">
                    {sellerAnalytics?.totalSales || 0}
                  </p>
                </div>
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold" data-testid="text-total-revenue">
                    {formatCurrency(sellerAnalytics?.totalRevenue || "0")}
                  </p>
                </div>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Products</p>
                  <p className="text-lg font-bold" data-testid="text-product-count">
                    {sellerProducts.length}
                  </p>
                </div>
                <Package className="h-5 w-5 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Order</p>
                  <p className="text-lg font-bold" data-testid="text-avg-order">
                    {formatCurrency(sellerAnalytics?.avgOrderValue || "0")}
                  </p>
                </div>
                <Target className="h-5 w-5 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Market Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Market Reports - Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {marketReports.length > 0 ? (
              <div className="space-y-3">
                {marketReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-medium">{report.category.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Avg: {formatCurrency(report.averagePrice || "0")} | 
                        Range: {formatCurrency(report.minPrice || "0")} - {formatCurrency(report.maxPrice || "0")}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center">
                        {parseFloat(report.priceChangePercent || "0") >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={`text-sm font-medium ${
                          parseFloat(report.priceChangePercent || "0") >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {report.priceChangePercent}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {report.totalListings} listings
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No market reports available for today
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sellerAnalytics?.topProducts && sellerAnalytics.topProducts.length > 0 ? (
              <div className="space-y-3">
                {sellerAnalytics.topProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(product.price)} per {product.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-500">
                        {formatCurrency(product.revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.salesCount} sales
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No sales data available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-medium">{transaction.product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Buyer: {transaction.buyer.firstName} {transaction.buyer.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.transactionDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(transaction.totalAmount)}
                      </p>
                      <Badge variant={
                        transaction.status === 'completed' ? 'default' :
                        transaction.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No transactions yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Sales Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Monthly Sales Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sellerAnalytics?.monthlySales && sellerAnalytics.monthlySales.length > 0 ? (
              <div className="space-y-2">
                {sellerAnalytics.monthlySales.map((monthData) => (
                  <div key={monthData.month} className="flex items-center justify-between p-2 border-b">
                    <span className="text-sm font-medium">{monthData.month}</span>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(monthData.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{monthData.sales} sales</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No monthly sales data available yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Product Modal */}
      <AddProductModal 
        open={showAddProductModal} 
        onOpenChange={setShowAddProductModal} 
      />
    </div>
  );
}