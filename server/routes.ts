import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProductSchema, insertCategorySchema, insertSubscriptionSchema, insertFavoriteSchema, insertCalculationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Categories routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
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
      console.error("Error fetching products:", error);
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
      console.error("Error fetching product:", error);
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
      console.error("Error creating product:", error);
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
      console.error("Error updating product:", error);
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
      console.error("Error deleting product:", error);
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
      console.error("Error fetching seller products:", error);
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
      console.error("Error fetching top sellers:", error);
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
      console.error("Error fetching subscription:", error);
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
      console.error("Error creating subscription:", error);
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
      console.error("Error fetching favorites:", error);
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
      console.error("Error adding to favorites:", error);
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
      console.error("Error removing from favorites:", error);
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
      console.error("Error fetching calculations:", error);
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
      console.error("Error creating calculation:", error);
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
      console.error("Error updating user type:", error);
      res.status(500).json({ message: "Failed to update user type" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
