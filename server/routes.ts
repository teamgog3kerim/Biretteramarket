import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupTelegramAuth } from "./telegramAuth";
import { initializeMarketReporting } from "./marketReports";
import { initializeSampleData } from "./seedTransactions";
import { 
  insertProductSchema, 
  insertCategorySchema, 
  insertSubscriptionSchema, 
  insertFavoriteSchema, 
  insertCalculationSchema,
  insertMarketReportSchema,
  insertTransactionSchema,
  insertProductViewSchema,
  insertPriceHistorySchema,
  insertPaymentMethodSchema,
  updateProfileSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  setupTelegramAuth(app);

  // Initialize default categories
  const initCategories = async () => {
    const existingCategories = await storage.getCategories();
    if (existingCategories.length === 0) {
      await Promise.all([
        storage.createCategory({ name: "Steel", icon: "fas fa-hammer" }),
        storage.createCategory({ name: "Iron", icon: "fas fa-industry" }),
        storage.createCategory({ name: "Construction", icon: "fas fa-hard-hat" }),
      ]);
    }
  };
  await initCategories();

  // Initialize market reporting
  await initializeMarketReporting();

  // Initialize sample data for development
  await initializeSampleData();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's subscription
      const subscription = await storage.getUserSubscription(userId);
      
      res.json({
        ...user,
        subscription,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Categories routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Products routes
  app.get('/api/products', async (req, res) => {
    try {
      const { categoryId, search, featured, limit } = req.query;
      const products = await storage.getProducts({
        categoryId: categoryId as string,
        search: search as string,
        featured: featured === 'true',
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userType !== 'seller') {
        return res.status(403).json({ message: "Only sellers can create products" });
      }

      const validatedData = insertProductSchema.parse({
        ...req.body,
        sellerId: userId,
      });

      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const product = await storage.getProduct(req.params.id);
      
      if (!product || product.sellerId !== userId) {
        return res.status(403).json({ message: "You can only edit your own products" });
      }

      const updatedProduct = await storage.updateProduct(req.params.id, req.body);
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const product = await storage.getProduct(req.params.id);
      
      if (!product || product.sellerId !== userId) {
        return res.status(403).json({ message: "You can only delete your own products" });
      }

      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Seller products route
  app.get('/api/seller/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const products = await storage.getProducts({ sellerId: userId });
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seller products" });
    }
  });

  // Top sellers route
  app.get('/api/sellers/top', async (req, res) => {
    try {
      const { limit } = req.query;
      const topSellers = await storage.getTopSellers(
        limit ? parseInt(limit as string) : undefined
      );
      res.json(topSellers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top sellers" });
    }
  });

  // Subscription routes
  app.get('/api/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getUserSubscription(userId);
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post('/api/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertSubscriptionSchema.parse({
        ...req.body,
        userId,
      });

      // Set end date based on plan type
      const now = new Date();
      let endDate: Date;
      
      switch (validatedData.planType) {
        case 'free_trial':
          endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
          break;
        case 'monthly':
          endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
          break;
        case 'yearly':
          endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days
          break;
        default:
          endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      const subscription = await storage.createSubscription({
        ...validatedData,
        endDate,
      });
      
      res.status(201).json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid subscription data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Favorites routes
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFavoriteSchema.parse({
        ...req.body,
        userId,
      });

      const favorite = await storage.addToFavorites(validatedData);
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid favorite data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete('/api/favorites/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.removeFromFavorites(userId, req.params.productId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // Calculations routes
  app.get('/api/calculations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const calculations = await storage.getUserCalculations(userId);
      res.json(calculations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calculations" });
    }
  });

  app.post('/api/calculations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCalculationSchema.parse({
        ...req.body,
        userId,
      });

      const calculation = await storage.createCalculation(validatedData);
      res.status(201).json(calculation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid calculation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create calculation" });
    }
  });

  // User type update route
  app.patch('/api/auth/user/type', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { userType } = req.body;
      
      if (!['buyer', 'seller'].includes(userType)) {
        return res.status(400).json({ message: "Invalid user type" });
      }

      const updatedUser = await storage.upsertUser({
        id: userId,
        userType,
        email: req.user.claims.email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
      });

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user type" });
    }
  });

  // Profile update route
  app.patch('/api/auth/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = updateProfileSchema.parse(req.body);

      // Business name only applies to sellers
      const currentUser = await storage.getUser(userId);
      if (currentUser?.userType !== "seller") {
        delete validatedData.businessName;
      }

      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Buyer transactions (purchase history)
  app.get('/api/buyer/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit } = req.query;
      const transactions = await storage.getBuyerTransactions(
        userId,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch buyer transactions" });
    }
  });

  // Payment method routes
  app.get('/api/payment-methods', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const methods = await storage.getPaymentMethods(userId);
      res.json(methods);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post('/api/payment-methods', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPaymentMethodSchema.parse(req.body);
      const method = await storage.createPaymentMethod(userId, validatedData);
      res.status(201).json(method);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment method data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment method" });
    }
  });

  app.patch('/api/payment-methods/:id/default', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updated = await storage.setDefaultPaymentMethod(req.params.id, userId);
      if (!updated) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.json({ message: "Default payment method updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update default payment method" });
    }
  });

  app.delete('/api/payment-methods/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deletePaymentMethod(req.params.id, userId);
      res.json({ message: "Payment method deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  // Market analysis route
  app.get('/api/market-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const analysis = await storage.getMarketAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error("Market analysis error:", error);
      res.status(500).json({ message: "Failed to generate market analysis" });
    }
  });

  // Market report routes
  app.get('/api/market-reports', async (req, res) => {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : undefined;
      const reports = await storage.getDailyMarketReports(targetDate);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market reports" });
    }
  });

  app.get('/api/market-reports/category/:categoryId', async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { days } = req.query;
      const reports = await storage.getMarketReportsByCategory(
        categoryId, 
        days ? parseInt(days as string) : undefined
      );
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category market reports" });
    }
  });

  // Seller analytics routes
  app.get('/api/seller/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userType !== 'seller') {
        return res.status(403).json({ message: "Only sellers can access analytics" });
      }

      const analytics = await storage.getSellerAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seller analytics" });
    }
  });

  app.get('/api/seller/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userType !== 'seller') {
        return res.status(403).json({ message: "Only sellers can access transactions" });
      }

      const { limit } = req.query;
      const transactions = await storage.getSellerTransactions(
        userId,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seller transactions" });
    }
  });

  // Product analytics routes
  app.post('/api/products/:id/view', async (req, res) => {
    try {
      const productId = req.params.id;
      const { userId, ipAddress, userAgent } = req.body;
      
      const view = await storage.createProductView({
        productId,
        userId: userId || null,
        ipAddress,
        userAgent,
      });
      
      res.status(201).json(view);
    } catch (error) {
      res.status(500).json({ message: "Failed to record product view" });
    }
  });

  app.get('/api/products/:id/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const productId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Check if user owns this product
      const product = await storage.getProduct(productId);
      if (!product || product.sellerId !== userId) {
        return res.status(403).json({ message: "You can only view analytics for your own products" });
      }

      const analytics = await storage.getProductAnalytics(productId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product analytics" });
    }
  });

  // Transaction routes
  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const buyerId = req.user.claims.sub;
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        buyerId,
      });

      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
