import { storage } from "./storage";
import { eq, sql } from "drizzle-orm";

/**
 * Generate daily market reports for all categories
 */
export async function generateDailyMarketReports(): Promise<void> {
  try {
    const categories = await storage.getCategories();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const category of categories) {
      await generateCategoryMarketReport(category.id, today);
    }
  } catch (error) {
    throw new Error("Failed to generate daily market reports");
  }
}

/**
 * Generate market report for a specific category
 */
export async function generateCategoryMarketReport(categoryId: string, reportDate: Date): Promise<void> {
  try {
    // Get all active products in this category
    const products = await storage.getProducts({ categoryId, limit: 1000 });
    
    if (products.length === 0) {
      return; // No products in this category
    }

    // Calculate price statistics
    const prices = products.map(p => parseFloat(p.price));
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const totalListings = products.length;

    // Get previous day's report for price change calculation
    const previousDate = new Date(reportDate);
    previousDate.setDate(previousDate.getDate() - 1);
    
    const previousReports = await storage.getMarketReportsByCategory(categoryId, 1);
    const previousReport = previousReports[0];

    let priceChange = 0;
    let priceChangePercent = 0;

    if (previousReport && previousReport.averagePrice) {
      const prevAvg = parseFloat(previousReport.averagePrice);
      priceChange = averagePrice - prevAvg;
      priceChangePercent = prevAvg > 0 ? (priceChange / prevAvg) * 100 : 0;
    }

    // Create the market report
    await storage.createMarketReport({
      categoryId,
      reportDate,
      averagePrice: averagePrice.toFixed(2),
      minPrice: minPrice.toFixed(2),
      maxPrice: maxPrice.toFixed(2),
      totalListings,
      priceChange: priceChange.toFixed(2),
      priceChangePercent: priceChangePercent.toFixed(2),
    });

  } catch (error) {
    throw new Error(`Failed to generate market report for category ${categoryId}`);
  }
}

/**
 * Initialize market reporting - can be called on server startup
 */
export async function initializeMarketReporting(): Promise<void> {
  // Generate reports for today if they don't exist
  const today = new Date();
  const existingReports = await storage.getDailyMarketReports(today);
  
  if (existingReports.length === 0) {
    await generateDailyMarketReports();
  }
}