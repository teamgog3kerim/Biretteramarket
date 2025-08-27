import {
  users,
  products,
  categories,
  subscriptions,
  favorites,
  calculations,
  type User,
  type UpsertUser,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, or, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
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
      conditions.push(eq(products.categoryId, filters.categoryId));
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
}

export const storage = new DatabaseStorage();
