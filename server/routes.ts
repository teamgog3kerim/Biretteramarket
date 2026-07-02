import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupTelegramAuth, notifyAdminsOnTelegram, notifyUserOnTelegram } from "./telegramAuth";
import { initializeMarketReporting } from "./marketReports";
import { initializeSampleData } from "./seedTransactions";
import { initializeSubscriptionReminders } from "./subscriptionReminders";
import { initializeMarketNotifications } from "./marketNotifications";
import { 
  insertProductSchema, 
  insertCategorySchema, 
  insertFavoriteSchema, 
  insertCalculationSchema,
  insertMarketReportSchema,
  insertTransactionSchema,
  insertProductViewSchema,
  insertPriceHistorySchema,
  insertPaymentMethodSchema,
  updateProfileSchema,
  userTypeSchema,
  isSellerType,
  FREE_TRIAL_DAYS
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

  // Start the subscription expiry reminder job (4-day warning via Telegram)
  initializeSubscriptionReminders();

  // Start the daily market notification job (per-user interested categories)
  initializeMarketNotifications();

  // Blocks suspended accounts from performing write actions
  const notSuspended = async (req: any, res: any, next: any) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.status === 'suspended') {
        return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Failed to verify account status" });
    }
  };

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

  app.post('/api/products', isAuthenticated, notSuspended, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isSellerType(user.userType)) {
        return res.status(403).json({ message: "Only seller, dealer, importer, or manufacturer accounts can list products" });
      }

      const subscription = await storage.getUserSubscription(userId);
      const now = new Date();
      const hasActiveSubscription =
        subscription &&
        subscription.status === 'active' &&
        (!subscription.endDate || new Date(subscription.endDate) > now);

      if (!hasActiveSubscription) {
        return res.status(402).json({
          message: "Your free trial or subscription has ended. Subscribe for 990 ETB/month to keep listing products.",
          code: "SUBSCRIPTION_REQUIRED",
        });
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

  app.patch('/api/products/:id', isAuthenticated, notSuspended, async (req: any, res) => {
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

  app.delete('/api/products/:id', isAuthenticated, notSuspended, async (req: any, res) => {
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

  // Top sellers route (optionally filtered by seller type: seller, dealer, importer, manufacturer)
  app.get('/api/sellers/top', async (req, res) => {
    try {
      const { limit, type } = req.query;
      const sellerType = type && isSellerType(type as string) ? (type as string) : undefined;
      const topSellers = await storage.getTopSellers(
        limit ? parseInt(limit as string) : undefined,
        sellerType
      );
      res.json(topSellers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top sellers" });
    }
  });

  // Public seller storefront: profile + products (free for buyers)
  app.get('/api/sellers/:id', async (req, res) => {
    try {
      const seller = await storage.getUser(req.params.id);
      if (!seller || !isSellerType(seller.userType)) {
        return res.status(404).json({ message: "Seller not found" });
      }
      const sellerProducts = await storage.getProducts({ sellerId: seller.id });
      res.json({
        id: seller.id,
        firstName: seller.firstName,
        lastName: seller.lastName,
        profileImageUrl: seller.profileImageUrl,
        businessName: seller.businessName,
        contactPerson: seller.contactPerson,
        phone: seller.phone,
        location: seller.location,
        email: seller.email,
        userType: seller.userType,
        products: sellerProducts.filter((p) => p.active),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seller" });
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

  // Only free trials can be self-activated. Paid plans must go through
  // /api/subscription/submit-payment and be approved by an admin.
  app.post('/api/subscription', isAuthenticated, notSuspended, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const planType = req.body?.planType;

      if (planType !== 'free_trial') {
        return res.status(400).json({
          message: "Paid plans require payment verification. Please submit your payment receipt for approval.",
        });
      }

      // Only one free trial per account
      const previous = await storage.getLatestSubscription(userId);
      if (previous) {
        return res.status(400).json({ message: "Free trial already used. Please subscribe to continue." });
      }

      const now = new Date();
      const endDate = new Date(now.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000); // 20 days

      const subscription = await storage.createSubscription({
        userId,
        planType: 'free_trial',
        status: 'active',
        endDate,
      });
      
      res.status(201).json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Latest subscription regardless of status (used to show pending/rejected states)
  app.get('/api/subscription/latest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getLatestSubscription(userId);
      res.json(subscription ?? null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Submit a payment receipt for admin approval
  app.post('/api/subscription/submit-payment', isAuthenticated, notSuspended, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { planType, receiptImage } = req.body ?? {};

      if (!['monthly', 'yearly'].includes(planType)) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      if (typeof receiptImage !== 'string' || !receiptImage.startsWith('data:image/')) {
        return res.status(400).json({ message: "Please upload a screenshot of your payment receipt" });
      }
      if (receiptImage.length > 7_000_000) {
        return res.status(400).json({ message: "Receipt image is too large. Please upload an image under 5MB." });
      }

      const latest = await storage.getLatestSubscription(userId);
      if (latest && latest.status === 'pending') {
        return res.status(400).json({ message: "You already have a payment awaiting approval" });
      }

      const subscription = await storage.createSubscription({
        userId,
        planType,
        status: 'pending',
        receiptImage,
        endDate: null,
      });

      const user = await storage.getUser(userId);
      const name = user?.businessName
        || [user?.firstName, user?.lastName].filter(Boolean).join(' ')
        || userId;
      const planLabel = planType === 'monthly' ? 'Monthly (990 ETB)' : 'Yearly (9,900 ETB)';
      notifyAdminsOnTelegram(
        `🔔 New subscription payment submitted\n\n👤 User: ${name}${user?.telegramUsername ? ` (@${user.telegramUsername})` : ''}\n📋 Plan: ${planLabel}\n\nOpen Biret Tera → Admin → Subscriptions to review the receipt and approve.`
      );

      res.status(201).json(subscription);
    } catch (error) {
      console.error("Failed to submit payment:", error);
      res.status(500).json({ message: "Failed to submit payment" });
    }
  });

  // Admin middleware — requires an authenticated user with isAdmin
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Failed to verify admin access" });
    }
  };

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      const usersList = await storage.getAllUsersWithSubscription();
      res.json(usersList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  const adminUserUpdateSchema = z.object({
    status: z.enum(['active', 'suspended']).optional(),
    userType: userTypeSchema.optional(),
    isAdmin: z.boolean().optional(),
  });

  app.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const fields = adminUserUpdateSchema.parse(req.body);
      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }
      // Prevent admins from removing their own admin access
      if (fields.isAdmin === false && req.params.id === req.user.claims.sub) {
        return res.status(400).json({ message: "You cannot remove your own admin access" });
      }
      const user = await storage.updateUserAdminFields(req.params.id, fields);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get('/api/admin/subscriptions', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
      const subs = await storage.getSubscriptionsWithUser(status);
      res.json(subs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post('/api/admin/subscriptions/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subscription = await storage.getSubscriptionById(req.params.id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      if (subscription.status !== 'pending') {
        return res.status(400).json({ message: "Only pending subscriptions can be approved" });
      }

      const now = new Date();
      const days = subscription.planType === 'yearly' ? 365 : 30;
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const updated = await storage.updateSubscription(subscription.id, {
        status: 'active',
        startDate: now,
        endDate,
      });

      notifyUserOnTelegram(
        subscription.userId,
        `✅ Your Biret Tera subscription has been approved!\n\nPlan: ${subscription.planType === 'yearly' ? 'Yearly Premium' : 'Monthly Premium'}\nValid until: ${endDate.toDateString()}\n\nYou can now list your products. Thank you!`
      );

      res.json(updated);
    } catch (error) {
      console.error("Failed to approve subscription:", error);
      res.status(500).json({ message: "Failed to approve subscription" });
    }
  });

  app.post('/api/admin/subscriptions/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subscription = await storage.getSubscriptionById(req.params.id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      if (subscription.status !== 'pending') {
        return res.status(400).json({ message: "Only pending subscriptions can be rejected" });
      }

      const updated = await storage.updateSubscription(subscription.id, {
        status: 'rejected',
      });

      notifyUserOnTelegram(
        subscription.userId,
        `❌ Your Biret Tera subscription payment could not be verified.\n\nPlease check your payment receipt and submit it again, or contact support.`
      );

      res.json(updated);
    } catch (error) {
      console.error("Failed to reject subscription:", error);
      res.status(500).json({ message: "Failed to reject subscription" });
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
      const parsed = userTypeSchema.safeParse(req.body?.userType);
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid user type" });
      }
      const userType = parsed.data;

      const updatedUser = await storage.upsertUser({
        id: userId,
        userType,
        accountTypeSelected: true,
        email: req.user.claims.email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
      });

      // Auto-start a 20-day free trial the first time an account becomes a seller type
      if (isSellerType(userType)) {
        const existing = await storage.getLatestSubscription(userId);
        if (!existing) {
          const now = new Date();
          await storage.createSubscription({
            userId,
            planType: 'free_trial',
            status: 'active',
            startDate: now,
            endDate: new Date(now.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000),
          });
        }
      }

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user type" });
    }
  });

  // Update the user's interested categories (min 1, max 5 top-level categories)
  app.put('/api/auth/user/interests', isAuthenticated, notSuspended, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = z.array(z.string().min(1)).min(1).max(5).safeParse(req.body?.categoryIds);
      if (!parsed.success) {
        return res.status(400).json({ message: "Select between 1 and 5 categories" });
      }
      const categoryIds = Array.from(new Set(parsed.data));

      const allCategories = await storage.getCategories();
      const topLevelIds = new Set(allCategories.filter((c) => !c.parentId).map((c) => c.id));
      if (!categoryIds.every((id) => topLevelIds.has(id))) {
        return res.status(400).json({ message: "Invalid category selection" });
      }

      const updatedUser = await storage.updateUserInterests(userId, categoryIds);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update interests" });
    }
  });

  // Profile update route
  app.patch('/api/auth/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = updateProfileSchema.parse(req.body);

      // Business info only applies to seller-type accounts
      const currentUser = await storage.getUser(userId);
      if (!isSellerType(currentUser?.userType)) {
        delete validatedData.businessName;
        delete validatedData.contactPerson;
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
      
      if (!user || !isSellerType(user.userType)) {
        return res.status(403).json({ message: "Only seller accounts can access analytics" });
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
      
      if (!user || !isSellerType(user.userType)) {
        return res.status(403).json({ message: "Only seller accounts can access transactions" });
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
