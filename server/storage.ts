import {
  users,
  products,
  categories,
  subscriptions,
  favorites,
  calculations,
  marketReports,
  transactions,
  productViews,
  priceHistory,
  paymentMethods,
  type User,
  type UpsertUser,
  type UpdateProfile,
  type Product,
  type InsertProduct,
  type Category,
  type InsertCategory,
  type Subscription,
  type InsertSubscription,
  type Favorite,
  type InsertFavorite,
  type Calculation,
  type InsertCalculation,
  type MarketReport,
  type InsertMarketReport,
  type Transaction,
  type InsertTransaction,
  type ProductView,
  type InsertProductView,
  type PriceHistory,
  type InsertPriceHistory,
  type PaymentMethod,
  type InsertPaymentMethod,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, or, sql, gte, lte, count } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profile: UpdateProfile): Promise<User>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Product operations
  getProducts(filters?: {
    categoryId?: string;
    search?: string;
    featured?: boolean;
    sellerId?: string;
    limit?: number;
  }): Promise<(Product & { seller: User; category: Category })[]>;
  getProduct(id: string): Promise<(Product & { seller: User; category: Category }) | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Subscription operations
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription>;
  
  // Favorites operations
  getUserFavorites(userId: string): Promise<(Favorite & { product: Product & { seller: User; category: Category } })[]>;
  addToFavorites(favorite: InsertFavorite): Promise<Favorite>;
  removeFromFavorites(userId: string, productId: string): Promise<void>;
  
  // Calculations operations
  getUserCalculations(userId: string): Promise<Calculation[]>;
  createCalculation(calculation: InsertCalculation): Promise<Calculation>;
  
  // Seller operations
  getTopSellers(limit?: number): Promise<(User & { productCount: number })[]>;
  
  // Market report operations
  createMarketReport(report: InsertMarketReport): Promise<MarketReport>;
  getDailyMarketReports(date?: Date): Promise<(MarketReport & { category: Category })[]>;
  getMarketReportsByCategory(categoryId: string, days?: number): Promise<MarketReport[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getSellerTransactions(sellerId: string, limit?: number): Promise<(Transaction & { buyer: User; product: Product })[]>;
  getBuyerTransactions(buyerId: string, limit?: number): Promise<(Transaction & { seller: User; product: Product })[]>;
  getSellerAnalytics(sellerId: string): Promise<{
    totalSales: number;
    totalRevenue: string;
    avgOrderValue: string;
    topProducts: (Product & { salesCount: number; revenue: string })[];
    monthlySales: { month: string; sales: number; revenue: string }[];
  }>;
  
  // Market analysis operations
  getMarketAnalysis(): Promise<{
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
  }>;

  // Payment method operations
  getPaymentMethods(userId: string): Promise<PaymentMethod[]>;
  createPaymentMethod(userId: string, method: InsertPaymentMethod): Promise<PaymentMethod>;
  deletePaymentMethod(id: string, userId: string): Promise<void>;
  setDefaultPaymentMethod(id: string, userId: string): Promise<boolean>;

  // Product view operations
  createProductView(view: InsertProductView): Promise<ProductView>;
  getProductAnalytics(productId: string): Promise<{
    totalViews: number;
    dailyViews: { date: string; views: number }[];
  }>;
  
  // Price history operations
  createPriceHistory(history: InsertPriceHistory): Promise<PriceHistory>;
  getProductPriceHistory(productId: string): Promise<PriceHistory[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, profile: UpdateProfile): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.sortOrder, categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  // Product operations
  async getProducts(filters?: {
    categoryId?: string;
    search?: string;
    featured?: boolean;
    sellerId?: string;
    limit?: number;
  }): Promise<(Product & { seller: User; category: Category })[]> {
    const conditions = [eq(products.active, true)];

    if (filters?.categoryId) {
      // Include products in the selected category and all of its descendants
      conditions.push(sql`${products.categoryId} in (
        with recursive cat_tree as (
          select id from categories where id = ${filters.categoryId}
          union all
          select c.id from categories c join cat_tree ct on c.parent_id = ct.id
        )
        select id from cat_tree
      )`);
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(products.name, `%${filters.search}%`),
          like(products.description, `%${filters.search}%`)
        )!
      );
    }

    if (filters?.featured) {
      conditions.push(eq(products.featured, true));
    }

    if (filters?.sellerId) {
      conditions.push(eq(products.sellerId, filters.sellerId));
    }

    const baseQuery = db
      .select({
        id: products.id,
        sellerId: products.sellerId,
        categoryId: products.categoryId,
        name: products.name,
        description: products.description,
        price: products.price,
        unit: products.unit,
        imageUrl: products.imageUrl,
        quantityAvailable: products.quantityAvailable,
        imageUrls: products.imageUrls,
        featured: products.featured,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        seller: users,
        category: categories,
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(products.createdAt));

    const results = filters?.limit 
      ? await baseQuery.limit(filters.limit)
      : await baseQuery;
    
    return results.map(row => ({
      ...row,
      seller: row.seller!,
      category: row.category!,
    }));
  }

  async getProduct(id: string): Promise<(Product & { seller: User; category: Category }) | undefined> {
    const [product] = await db
      .select({
        id: products.id,
        sellerId: products.sellerId,
        categoryId: products.categoryId,
        name: products.name,
        description: products.description,
        price: products.price,
        unit: products.unit,
        imageUrl: products.imageUrl,
        quantityAvailable: products.quantityAvailable,
        imageUrls: products.imageUrls,
        featured: products.featured,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        seller: users,
        category: categories,
      })
      .from(products)
      .leftJoin(users, eq(products.sellerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id));
    
    if (!product) return undefined;
    
    return {
      ...product,
      seller: product.seller!,
      category: product.category!,
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    await db
      .update(products)
      .set({ active: false })
      .where(eq(products.id, id));
  }

  // Subscription operations
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db
      .insert(subscriptions)
      .values(subscription)
      .returning();
    return newSubscription;
  }

  async updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription> {
    const [updatedSubscription] = await db
      .update(subscriptions)
      .set(subscription)
      .where(eq(subscriptions.id, id))
      .returning();
    return updatedSubscription;
  }

  // Favorites operations
  async getUserFavorites(userId: string): Promise<(Favorite & { product: Product & { seller: User; category: Category } })[]> {
    const results = await db
      .select({
        id: favorites.id,
        userId: favorites.userId,
        productId: favorites.productId,
        createdAt: favorites.createdAt,
        product: products,
        seller: users,
        category: categories,
      })
      .from(favorites)
      .leftJoin(products, eq(favorites.productId, products.id))
      .leftJoin(users, eq(products.sellerId, users.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(favorites.userId, userId));

    return results.map(row => ({
      id: row.id,
      userId: row.userId,
      productId: row.productId,
      createdAt: row.createdAt,
      product: {
        ...row.product!,
        seller: row.seller!,
        category: row.category!,
      },
    }));
  }

  async addToFavorites(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db
      .insert(favorites)
      .values(favorite)
      .returning();
    return newFavorite;
  }

  async removeFromFavorites(userId: string, productId: string): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
  }

  // Calculations operations
  async getUserCalculations(userId: string): Promise<Calculation[]> {
    return await db
      .select()
      .from(calculations)
      .where(eq(calculations.userId, userId))
      .orderBy(desc(calculations.createdAt))
      .limit(10);
  }

  async createCalculation(calculation: InsertCalculation): Promise<Calculation> {
    const [newCalculation] = await db
      .insert(calculations)
      .values(calculation)
      .returning();
    return newCalculation;
  }

  // Seller operations
  async getTopSellers(limit = 10): Promise<(User & { productCount: number })[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        phone: users.phone,
        location: users.location,
        businessName: users.businessName,
        userType: users.userType,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        productCount: sql<number>`count(${products.id})::int`,
      })
      .from(users)
      .leftJoin(products, and(eq(users.id, products.sellerId), eq(products.active, true)))
      .where(eq(users.userType, "seller"))
      .groupBy(users.id)
      .orderBy(desc(sql`count(${products.id})`))
      .limit(limit);
  }

  // Market report operations
  async createMarketReport(report: InsertMarketReport): Promise<MarketReport> {
    const [newReport] = await db
      .insert(marketReports)
      .values(report)
      .returning();
    return newReport;
  }

  async getDailyMarketReports(date?: Date): Promise<(MarketReport & { category: Category })[]> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const results = await db
      .select({
        id: marketReports.id,
        categoryId: marketReports.categoryId,
        reportDate: marketReports.reportDate,
        averagePrice: marketReports.averagePrice,
        minPrice: marketReports.minPrice,
        maxPrice: marketReports.maxPrice,
        totalListings: marketReports.totalListings,
        priceChange: marketReports.priceChange,
        priceChangePercent: marketReports.priceChangePercent,
        createdAt: marketReports.createdAt,
        category: categories,
      })
      .from(marketReports)
      .leftJoin(categories, eq(marketReports.categoryId, categories.id))
      .where(and(
        gte(marketReports.reportDate, startOfDay),
        lte(marketReports.reportDate, endOfDay)
      ))
      .orderBy(desc(marketReports.createdAt));

    return results.map(row => ({
      ...row,
      category: row.category!,
    }));
  }

  async getMarketReportsByCategory(categoryId: string, days = 30): Promise<MarketReport[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await db
      .select()
      .from(marketReports)
      .where(and(
        eq(marketReports.categoryId, categoryId),
        gte(marketReports.reportDate, startDate)
      ))
      .orderBy(desc(marketReports.reportDate));
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async getSellerTransactions(sellerId: string, limit = 50): Promise<(Transaction & { buyer: User; product: Product })[]> {
    const results = await db
      .select({
        id: transactions.id,
        sellerId: transactions.sellerId,
        buyerId: transactions.buyerId,
        productId: transactions.productId,
        quantity: transactions.quantity,
        unitPrice: transactions.unitPrice,
        totalAmount: transactions.totalAmount,
        status: transactions.status,
        transactionDate: transactions.transactionDate,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        buyer: users,
        product: products,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.buyerId, users.id))
      .leftJoin(products, eq(transactions.productId, products.id))
      .where(eq(transactions.sellerId, sellerId))
      .orderBy(desc(transactions.transactionDate))
      .limit(limit);

    return results.map(row => ({
      ...row,
      buyer: row.buyer!,
      product: row.product!,
    }));
  }

  async getBuyerTransactions(buyerId: string, limit = 50): Promise<(Transaction & { seller: User; product: Product })[]> {
    const results = await db
      .select({
        id: transactions.id,
        sellerId: transactions.sellerId,
        buyerId: transactions.buyerId,
        productId: transactions.productId,
        quantity: transactions.quantity,
        unitPrice: transactions.unitPrice,
        totalAmount: transactions.totalAmount,
        status: transactions.status,
        transactionDate: transactions.transactionDate,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        seller: users,
        product: products,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.sellerId, users.id))
      .leftJoin(products, eq(transactions.productId, products.id))
      .where(eq(transactions.buyerId, buyerId))
      .orderBy(desc(transactions.transactionDate))
      .limit(limit);

    return results.map(row => ({
      ...row,
      seller: row.seller!,
      product: row.product!,
    }));
  }

  // Payment method operations
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    return await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId))
      .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));
  }

  async createPaymentMethod(userId: string, method: InsertPaymentMethod): Promise<PaymentMethod> {
    const existing = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId));

    // First method becomes default automatically
    const shouldBeDefault = method.isDefault || existing.length === 0;

    if (shouldBeDefault) {
      await db
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.userId, userId));
    }

    const [created] = await db
      .insert(paymentMethods)
      .values({ ...method, userId, isDefault: shouldBeDefault })
      .returning();
    return created;
  }

  async deletePaymentMethod(id: string, userId: string): Promise<void> {
    const [deleted] = await db
      .delete(paymentMethods)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)))
      .returning();

    // If the deleted method was the default, promote the most recent remaining one
    if (deleted?.isDefault) {
      const [next] = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.userId, userId))
        .orderBy(desc(paymentMethods.createdAt))
        .limit(1);
      if (next) {
        await db
          .update(paymentMethods)
          .set({ isDefault: true })
          .where(eq(paymentMethods.id, next.id));
      }
    }
  }

  async setDefaultPaymentMethod(id: string, userId: string): Promise<boolean> {
    // Verify ownership first so we never clear defaults for an invalid id
    const [target] = await db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)));
    if (!target) return false;

    await db
      .update(paymentMethods)
      .set({ isDefault: false })
      .where(eq(paymentMethods.userId, userId));
    await db
      .update(paymentMethods)
      .set({ isDefault: true })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)));
    return true;
  }

  // Market analysis operations
  async getMarketAnalysis() {
    const now = new Date();
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Category hierarchy: map every category to its top-level (root) category
    const allCats = await db
      .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
      .from(categories);
    const catById = new Map(allCats.map(c => [c.id, c]));
    const rootOf = (id: string): { id: string; name: string } => {
      let current = catById.get(id);
      let guard = 0;
      while (current?.parentId && guard < 10) {
        const parent = catById.get(current.parentId);
        if (!parent) break;
        current = parent;
        guard++;
      }
      return current ? { id: current.id, name: current.name } : { id, name: "Unknown" };
    };

    // Supply: active listings aggregated per (leaf) category, rolled up to root later
    const supplyRows = await db
      .select({
        categoryId: products.categoryId,
        listings: sql<number>`count(${products.id})::int`,
        supplyQuantity: sql<string>`coalesce(sum(${products.quantityAvailable}), 0)::text`,
        sumPrice: sql<string>`coalesce(sum(${products.price}), 0)::text`,
        minPrice: sql<string | null>`min(${products.price})::text`,
        maxPrice: sql<string | null>`max(${products.price})::text`,
      })
      .from(products)
      .where(eq(products.active, true))
      .groupBy(products.categoryId);

    // Demand = pending + completed sales in last 30 days (cancelled excluded)
    const demandRows = await db
      .select({
        categoryId: products.categoryId,
        transactions30d: sql<number>`count(${transactions.id})::int`,
        soldQuantity30d: sql<string>`coalesce(sum(${transactions.quantity}), 0)::text`,
        revenue30d: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)::text`,
      })
      .from(transactions)
      .innerJoin(products, eq(transactions.productId, products.id))
      .where(and(
        gte(transactions.transactionDate, days30),
        sql`${transactions.status} != 'cancelled'`
      ))
      .groupBy(products.categoryId);

    // Interest: views in last 7 days per category
    const viewRows = await db
      .select({
        categoryId: products.categoryId,
        views7d: sql<number>`count(${productViews.id})::int`,
      })
      .from(productViews)
      .innerJoin(products, eq(productViews.productId, products.id))
      .where(gte(productViews.viewedAt, days7))
      .groupBy(products.categoryId);

    // Interest: favorites per category
    const favoriteRows = await db
      .select({
        categoryId: products.categoryId,
        favoritesCount: sql<number>`count(${favorites.id})::int`,
      })
      .from(favorites)
      .innerJoin(products, eq(favorites.productId, products.id))
      .groupBy(products.categoryId);

    // Price trends: market reports from last 14 days (rolled up to root categories)
    const rawTrendRows = await db
      .select({
        date: sql<string>`to_char(${marketReports.reportDate}, 'YYYY-MM-DD')`,
        categoryId: marketReports.categoryId,
        averagePrice: marketReports.averagePrice,
        priceChangePercent: marketReports.priceChangePercent,
      })
      .from(marketReports)
      .where(gte(marketReports.reportDate, days14))
      .orderBy(marketReports.reportDate);

    // Merge trend rows that fall under the same root category on the same date
    const trendBuckets = new Map<string, { date: string; categoryName: string; prices: number[]; changes: number[] }>();
    for (const row of rawTrendRows) {
      const root = rootOf(row.categoryId);
      const key = `${row.date}|${root.id}`;
      let bucket = trendBuckets.get(key);
      if (!bucket) {
        bucket = { date: row.date, categoryName: root.name, prices: [], changes: [] };
        trendBuckets.set(key, bucket);
      }
      if (row.averagePrice != null) bucket.prices.push(parseFloat(row.averagePrice));
      if (row.priceChangePercent != null) bucket.changes.push(parseFloat(row.priceChangePercent));
    }
    const trendRows = Array.from(trendBuckets.values()).map(b => ({
      date: b.date,
      categoryName: b.categoryName,
      averagePrice: b.prices.length ? (b.prices.reduce((a, v) => a + v, 0) / b.prices.length).toFixed(2) : null,
      priceChangePercent: b.changes.length ? (b.changes.reduce((a, v) => a + v, 0) / b.changes.length).toFixed(2) : null,
    }));

    // Top products by demand signals
    const topProductRows = await db
      .select({
        id: products.id,
        name: products.name,
        categoryName: categories.name,
        price: products.price,
        unit: products.unit,
        quantityAvailable: products.quantityAvailable,
        views7d: sql<number>`(select count(*) from ${productViews} pv where pv.product_id = ${products.id} and pv.viewed_at >= ${days7})::int`,
        favoritesCount: sql<number>`(select count(*) from ${favorites} f where f.product_id = ${products.id})::int`,
        soldQuantity30d: sql<string>`coalesce((select sum(t.quantity) from ${transactions} t where t.product_id = ${products.id} and t.transaction_date >= ${days30} and t.status != 'cancelled'), 0)::text`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.active, true));

    // Overview aggregates
    const [overviewTx] = await db
      .select({
        transactions30d: sql<number>`count(${transactions.id})::int`,
        volumeSold30d: sql<string>`coalesce(sum(${transactions.quantity}), 0)::text`,
        revenue30d: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)::text`,
      })
      .from(transactions)
      .where(and(
        gte(transactions.transactionDate, days30),
        sql`${transactions.status} != 'cancelled'`
      ));

    const [overviewSupply] = await db
      .select({
        totalListings: sql<number>`count(${products.id})::int`,
        totalSupplyQuantity: sql<string>`coalesce(sum(${products.quantityAvailable}), 0)::text`,
        activeSellers: sql<number>`count(distinct ${products.sellerId})::int`,
      })
      .from(products)
      .where(eq(products.active, true));

    // Roll all per-category metrics up to root (main) categories
    type RootAgg = {
      categoryId: string;
      categoryName: string;
      listings: number;
      supplyQuantity: number;
      sumPrice: number;
      minPrice: number | null;
      maxPrice: number | null;
      transactions30d: number;
      soldQuantity30d: number;
      views7d: number;
      favoritesCount: number;
    };
    const rootAggs = new Map<string, RootAgg>();
    const getAgg = (categoryId: string): RootAgg => {
      const root = rootOf(categoryId);
      let agg = rootAggs.get(root.id);
      if (!agg) {
        agg = {
          categoryId: root.id, categoryName: root.name,
          listings: 0, supplyQuantity: 0, sumPrice: 0, minPrice: null, maxPrice: null,
          transactions30d: 0, soldQuantity30d: 0, views7d: 0, favoritesCount: 0,
        };
        rootAggs.set(root.id, agg);
      }
      return agg;
    };

    for (const row of supplyRows) {
      const agg = getAgg(row.categoryId);
      agg.listings += row.listings;
      agg.supplyQuantity += parseFloat(row.supplyQuantity || "0");
      agg.sumPrice += parseFloat(row.sumPrice || "0");
      const rowMin = row.minPrice != null ? parseFloat(row.minPrice) : null;
      const rowMax = row.maxPrice != null ? parseFloat(row.maxPrice) : null;
      if (rowMin != null) agg.minPrice = agg.minPrice == null ? rowMin : Math.min(agg.minPrice, rowMin);
      if (rowMax != null) agg.maxPrice = agg.maxPrice == null ? rowMax : Math.max(agg.maxPrice, rowMax);
    }
    for (const row of demandRows) {
      const agg = getAgg(row.categoryId);
      agg.transactions30d += row.transactions30d;
      agg.soldQuantity30d += parseFloat(row.soldQuantity30d || "0");
    }
    for (const row of viewRows) {
      getAgg(row.categoryId).views7d += row.views7d;
    }
    for (const row of favoriteRows) {
      getAgg(row.categoryId).favoritesCount += row.favoritesCount;
    }

    const categoriesData = Array.from(rootAggs.values())
      .filter(agg => agg.listings > 0 || agg.transactions30d > 0)
      .sort((a, b) => b.listings - a.listings)
      .map(agg => ({
        categoryId: agg.categoryId,
        categoryName: agg.categoryName,
        listings: agg.listings,
        supplyQuantity: agg.supplyQuantity.toFixed(2),
        avgPrice: agg.listings > 0 ? (agg.sumPrice / agg.listings).toFixed(2) : null,
        minPrice: agg.minPrice != null ? agg.minPrice.toFixed(2) : null,
        maxPrice: agg.maxPrice != null ? agg.maxPrice.toFixed(2) : null,
        transactions30d: agg.transactions30d,
        soldQuantity30d: agg.soldQuantity30d.toFixed(2),
        views7d: agg.views7d,
        favoritesCount: agg.favoritesCount,
      }));

    // Rank top products by a composite demand score
    const topProducts = topProductRows
      .map(p => ({
        ...p,
        _score:
          p.views7d * 1 +
          p.favoritesCount * 3 +
          parseFloat(p.soldQuantity30d || "0") * 5,
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 8)
      .map(({ _score, ...p }) => p);

    return {
      overview: {
        totalListings: overviewSupply?.totalListings ?? 0,
        totalSupplyQuantity: overviewSupply?.totalSupplyQuantity ?? "0",
        transactions30d: overviewTx?.transactions30d ?? 0,
        volumeSold30d: overviewTx?.volumeSold30d ?? "0",
        revenue30d: overviewTx?.revenue30d ?? "0",
        activeSellers: overviewSupply?.activeSellers ?? 0,
      },
      categories: categoriesData,
      priceTrends: trendRows,
      topProducts,
    };
  }

  async getSellerAnalytics(sellerId: string): Promise<{
    totalSales: number;
    totalRevenue: string;
    avgOrderValue: string;
    topProducts: (Product & { salesCount: number; revenue: string })[];
    monthlySales: { month: string; sales: number; revenue: string }[];
  }> {
    // Get total sales and revenue
    const [salesSummary] = await db
      .select({
        totalSales: sql<number>`count(*)::int`,
        totalRevenue: sql<string>`coalesce(sum(${transactions.totalAmount}), 0)::text`,
        avgOrderValue: sql<string>`coalesce(avg(${transactions.totalAmount}), 0)::text`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.sellerId, sellerId),
        eq(transactions.status, "completed")
      ));

    // Get top products by sales
    const topProducts = await db
      .select({
        id: products.id,
        sellerId: products.sellerId,
        categoryId: products.categoryId,
        name: products.name,
        description: products.description,
        price: products.price,
        unit: products.unit,
        imageUrl: products.imageUrl,
        quantityAvailable: products.quantityAvailable,
        imageUrls: products.imageUrls,
        featured: products.featured,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        salesCount: sql<number>`count(${transactions.id})::int`,
        revenue: sql<string>`sum(${transactions.totalAmount})::text`,
      })
      .from(products)
      .leftJoin(transactions, and(
        eq(products.id, transactions.productId),
        eq(transactions.status, "completed")
      ))
      .where(eq(products.sellerId, sellerId))
      .groupBy(products.id)
      .orderBy(desc(sql`count(${transactions.id})`))
      .limit(5);

    // Get monthly sales
    const monthlySales = await db
      .select({
        month: sql<string>`to_char(${transactions.transactionDate}, 'YYYY-MM')`,
        sales: sql<number>`count(*)::int`,
        revenue: sql<string>`sum(${transactions.totalAmount})::text`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.sellerId, sellerId),
        eq(transactions.status, "completed"),
        gte(transactions.transactionDate, new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1))
      ))
      .groupBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${transactions.transactionDate}, 'YYYY-MM')`);

    return {
      totalSales: salesSummary?.totalSales || 0,
      totalRevenue: salesSummary?.totalRevenue || "0",
      avgOrderValue: salesSummary?.avgOrderValue || "0",
      topProducts,
      monthlySales,
    };
  }

  // Product view operations
  async createProductView(view: InsertProductView): Promise<ProductView> {
    const [newView] = await db
      .insert(productViews)
      .values(view)
      .returning();
    return newView;
  }

  async getProductAnalytics(productId: string): Promise<{
    totalViews: number;
    dailyViews: { date: string; views: number }[];
  }> {
    // Get total views
    const [totalViewsResult] = await db
      .select({
        totalViews: sql<number>`count(*)::int`,
      })
      .from(productViews)
      .where(eq(productViews.productId, productId));

    // Get daily views for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyViews = await db
      .select({
        date: sql<string>`date(${productViews.viewedAt})::text`,
        views: sql<number>`count(*)::int`,
      })
      .from(productViews)
      .where(and(
        eq(productViews.productId, productId),
        gte(productViews.viewedAt, thirtyDaysAgo)
      ))
      .groupBy(sql`date(${productViews.viewedAt})`)
      .orderBy(sql`date(${productViews.viewedAt})`);

    return {
      totalViews: totalViewsResult?.totalViews || 0,
      dailyViews,
    };
  }

  // Price history operations
  async createPriceHistory(history: InsertPriceHistory): Promise<PriceHistory> {
    const [newHistory] = await db
      .insert(priceHistory)
      .values(history)
      .returning();
    return newHistory;
  }

  async getProductPriceHistory(productId: string): Promise<PriceHistory[]> {
    return await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.productId, productId))
      .orderBy(desc(priceHistory.changedAt))
      .limit(50);
  }
}

export const storage = new DatabaseStorage();
