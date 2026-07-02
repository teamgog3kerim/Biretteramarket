import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  Users,
  Eye,
  BarChart3,
  Minus,
} from "lucide-react";

interface MarketAnalysis {
  overview: {
    totalListings: number;
    totalSupplyQuantity: string;
    transactions30d: number;
    volumeSold30d: string;
    revenue30d: string;
    activeSellers: number;
  };
  categories: {
    categoryId: string;
    categoryName: string;
    listings: number;
    supplyQuantity: string;
    avgPrice: string | null;
    minPrice: string | null;
    maxPrice: string | null;
    transactions30d: number;
    soldQuantity30d: string;
    views7d: number;
    favoritesCount: number;
  }[];
  priceTrends: {
    date: string;
    categoryName: string;
    averagePrice: string | null;
    priceChangePercent: string | null;
  }[];
  topProducts: {
    id: string;
    name: string;
    categoryName: string;
    price: string;
    unit: string | null;
    quantityAvailable: string | null;
    views7d: number;
    favoritesCount: number;
    soldQuantity30d: string;
  }[];
}

const CHART_COLORS = ["#BB3E00", "#657C6A", "#F7AD45", "#3B82F6", "#8B5CF6"];

function formatCurrency(amount: string | number | null) {
  if (amount === null || amount === undefined) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatNumber(value: string | number | null) {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("en-ET", { maximumFractionDigits: 1 }).format(num);
}

function demandSignal(cat: MarketAnalysis["categories"][number]) {
  const demandScore =
    cat.views7d * 1 + cat.favoritesCount * 3 + parseFloat(cat.soldQuantity30d || "0") * 5 + cat.transactions30d * 4;
  const supplyScore = cat.listings * 2 + parseFloat(cat.supplyQuantity || "0") * 0.1;
  if (cat.listings === 0 && demandScore > 0) return { label: "Supply Shortage", tone: "high" as const };
  if (demandScore === 0 && cat.listings === 0) return { label: "Inactive", tone: "low" as const };
  const ratio = supplyScore > 0 ? demandScore / supplyScore : demandScore > 0 ? 99 : 0;
  if (ratio >= 1.5) return { label: "High Demand", tone: "high" as const };
  if (ratio >= 0.5) return { label: "Balanced", tone: "mid" as const };
  return { label: "Oversupplied", tone: "low" as const };
}

export default function MarketAnalysisPage() {
  const { data, isLoading } = useQuery<MarketAnalysis>({
    queryKey: ["/api/market-analysis"],
    refetchInterval: 60_000, // refresh every minute for near real-time data
  });

  // Pivot price trends: one row per date, one key per category
  const trendData = (() => {
    if (!data) return [] as Record<string, string | number>[];
    const byDate = new Map<string, Record<string, string | number>>();
    for (const t of data.priceTrends) {
      if (!t.averagePrice) continue;
      const row = byDate.get(t.date) ?? { date: t.date.slice(5) };
      row[t.categoryName] = parseFloat(t.averagePrice);
      byDate.set(t.date, row);
    }
    return Array.from(byDate.values());
  })();

  const trendCategories = data
    ? Array.from(new Set(data.priceTrends.map((t) => t.categoryName)))
    : [];

  const demandSupplyData =
    data?.categories.map((c) => ({
      name: c.categoryName,
      Listings: c.listings,
      "Views (7d)": c.views7d,
      Favorites: c.favoritesCount,
      "Sales (30d)": c.transactions30d,
    })) ?? [];

  const latestChange = (categoryName: string) => {
    if (!data) return null;
    const entries = data.priceTrends.filter((t) => t.categoryName === categoryName);
    const last = entries[entries.length - 1];
    return last?.priceChangePercent ? parseFloat(last.priceChangePercent) : null;
  };

  return (
    <div className="pb-24">
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6" />
          <div>
            <h1 className="text-xl font-bold">Market Analysis</h1>
            <p className="text-xs text-primary-foreground/80">
              Live trends, demand &amp; supply across the marketplace
            </p>
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Overview */}
          <div className="grid grid-cols-2 gap-3">
            <Card data-testid="card-overview-listings">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 text-muted-foreground text-xs mb-1">
                  <Package className="h-3.5 w-3.5" /> <span>Active Listings</span>
                </div>
                <p className="text-xl font-bold">{data.overview.totalListings}</p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(data.overview.totalSupplyQuantity)} units in supply
                </p>
              </CardContent>
            </Card>
            <Card data-testid="card-overview-sellers">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 text-muted-foreground text-xs mb-1">
                  <Users className="h-3.5 w-3.5" /> <span>Active Sellers</span>
                </div>
                <p className="text-xl font-bold">{data.overview.activeSellers}</p>
                <p className="text-xs text-muted-foreground">supplying the market</p>
              </CardContent>
            </Card>
            <Card data-testid="card-overview-transactions">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 text-muted-foreground text-xs mb-1">
                  <ShoppingCart className="h-3.5 w-3.5" /> <span>Sales (30d)</span>
                </div>
                <p className="text-xl font-bold">{data.overview.transactions30d}</p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(data.overview.volumeSold30d)} units sold
                </p>
              </CardContent>
            </Card>
            <Card data-testid="card-overview-revenue">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="h-3.5 w-3.5" /> <span>Volume (30d)</span>
                </div>
                <p className="text-xl font-bold">{formatCurrency(data.overview.revenue30d)}</p>
                <p className="text-xs text-muted-foreground">traded value</p>
              </CardContent>
            </Card>
          </div>

          {/* Price trends */}
          <Card data-testid="card-price-trends">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Price Trends (14 days)</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              {trendData.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  Not enough price history yet. Trends appear as daily market reports accumulate.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {trendCategories.map((cat, i) => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Demand vs supply */}
          <Card data-testid="card-demand-supply">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Demand vs Supply by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={demandSupplyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Listings" fill="#657C6A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Views (7d)" fill="#BB3E00" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Favorites" fill="#F7AD45" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Sales (30d)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category insights */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Category Insights
            </h2>
            {data.categories.map((cat) => {
              const signal = demandSignal(cat);
              const change = latestChange(cat.categoryName);
              return (
                <Card key={cat.categoryId} data-testid={`card-category-${cat.categoryId}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{cat.categoryName}</h3>
                      <div className="flex items-center gap-2">
                        {change !== null && (
                          <span
                            className={`flex items-center text-xs font-medium ${
                              change > 0
                                ? "text-red-600"
                                : change < 0
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {change > 0 ? (
                              <TrendingUp className="h-3 w-3 mr-0.5" />
                            ) : change < 0 ? (
                              <TrendingDown className="h-3 w-3 mr-0.5" />
                            ) : (
                              <Minus className="h-3 w-3 mr-0.5" />
                            )}
                            {change > 0 ? "+" : ""}
                            {change.toFixed(1)}%
                          </span>
                        )}
                        <Badge
                          variant={signal.tone === "high" ? "destructive" : "secondary"}
                          className={
                            signal.tone === "mid"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : signal.tone === "low"
                              ? "bg-muted text-muted-foreground"
                              : ""
                          }
                        >
                          {signal.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-muted/60 rounded-md p-2">
                        <p className="text-muted-foreground">Avg Price</p>
                        <p className="font-semibold">{formatCurrency(cat.avgPrice)}</p>
                      </div>
                      <div className="bg-muted/60 rounded-md p-2">
                        <p className="text-muted-foreground">Range</p>
                        <p className="font-semibold text-[11px]">
                          {formatCurrency(cat.minPrice)} – {formatCurrency(cat.maxPrice)}
                        </p>
                      </div>
                      <div className="bg-muted/60 rounded-md p-2">
                        <p className="text-muted-foreground">Supply</p>
                        <p className="font-semibold">
                          {cat.listings} listings
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" /> {cat.views7d} views (7d)
                      </span>
                      <span>{cat.favoritesCount} favorites</span>
                      <span>
                        {cat.transactions30d} sales · {formatNumber(cat.soldQuantity30d)} units (30d)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Top products */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Most In-Demand Products
            </h2>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No products listed yet.</p>
            ) : (
              data.topProducts.map((p, idx) => (
                <Card key={p.id} data-testid={`card-top-product-${p.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate text-sm">{p.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {p.categoryName} · {formatCurrency(p.price)}
                          {p.unit ? `/${p.unit}` : ""}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                        <p className="flex items-center justify-end">
                          <Eye className="h-3 w-3 mr-1" /> {p.views7d}
                        </p>
                        <p>{p.favoritesCount} ♥ · {formatNumber(p.soldQuantity30d)} sold</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center pb-2">
            Data refreshes automatically every minute · Based on live marketplace activity
          </p>
        </div>
      )}
    </div>
  );
}
