import { storage } from "./storage";
import { generateDailyMarketReports } from "./marketReports";

/**
 * Seed sample transaction data for testing the seller dashboard
 */
export async function seedSampleTransactions(): Promise<void> {
  try {
    // Get existing users, products, and categories
    const categories = await storage.getCategories();
    const products = await storage.getProducts({ limit: 100 });
    
    if (products.length === 0) {
      console.log("No products found. Please seed products first.");
      return;
    }

    // Create sample buyers if needed
    const sampleBuyers = [
      { id: "buyer-001", email: "buyer1@gmail.com", firstName: "Ahmed", lastName: "Hassan", userType: "buyer" },
      { id: "buyer-002", email: "buyer2@gmail.com", firstName: "Fatima", lastName: "Mohammed", userType: "buyer" },
      { id: "buyer-003", email: "buyer3@gmail.com", firstName: "Ibrahim", lastName: "Ali", userType: "buyer" },
      { id: "buyer-004", email: "buyer4@gmail.com", firstName: "Zara", lastName: "Bekele", userType: "buyer" },
      { id: "buyer-005", email: "buyer5@gmail.com", firstName: "Omar", lastName: "Negash", userType: "buyer" },
    ];

    // Upsert sample buyers
    for (const buyer of sampleBuyers) {
      await storage.upsertUser(buyer);
    }

    // Generate sample transactions
    const transactionData = [];
    
    // Create transactions for the last 6 months
    const now = new Date();
    for (let monthsBack = 0; monthsBack < 6; monthsBack++) {
      const month = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      
      // Create 5-15 transactions per month
      const transactionsThisMonth = Math.floor(Math.random() * 10) + 5;
      
      for (let i = 0; i < transactionsThisMonth; i++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const randomBuyer = sampleBuyers[Math.floor(Math.random() * sampleBuyers.length)];
        
        const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 tons/pieces
        const unitPrice = parseFloat(randomProduct.price);
        const totalAmount = quantity * unitPrice;
        
        // Random date within the month
        const transactionDate = new Date(
          month.getFullYear(),
          month.getMonth(),
          Math.floor(Math.random() * 28) + 1,
          Math.floor(Math.random() * 24),
          Math.floor(Math.random() * 60)
        );
        
        // Most transactions are completed, some pending
        const status = Math.random() > 0.15 ? 'completed' : 'pending';
        
        transactionData.push({
          sellerId: randomProduct.sellerId,
          buyerId: randomBuyer.id,
          productId: randomProduct.id,
          quantity: quantity.toString(),
          unitPrice: unitPrice.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          status,
          transactionDate,
        });
      }
    }

    // Insert transactions
    for (const transaction of transactionData) {
      await storage.createTransaction(transaction);
    }

    console.log(`Created ${transactionData.length} sample transactions`);

    // Generate market reports for the last 30 days
    for (let daysBack = 0; daysBack < 30; daysBack++) {
      const reportDate = new Date();
      reportDate.setDate(reportDate.getDate() - daysBack);
      reportDate.setHours(0, 0, 0, 0);
      
      // Check if report already exists
      const existingReports = await storage.getDailyMarketReports(reportDate);
      if (existingReports.length === 0) {
        await generateDailyMarketReports();
      }
    }

    console.log("Generated market reports for the last 30 days");

    // Create some product views for analytics
    const productViews = [];
    for (let daysBack = 0; daysBack < 30; daysBack++) {
      const viewDate = new Date();
      viewDate.setDate(viewDate.getDate() - daysBack);
      
      // 20-50 views per day across all products
      const viewsPerDay = Math.floor(Math.random() * 30) + 20;
      
      for (let i = 0; i < viewsPerDay; i++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const randomBuyer = Math.random() > 0.3 ? sampleBuyers[Math.floor(Math.random() * sampleBuyers.length)] : null;
        
        const viewTime = new Date(
          viewDate.getFullYear(),
          viewDate.getMonth(),
          viewDate.getDate(),
          Math.floor(Math.random() * 24),
          Math.floor(Math.random() * 60)
        );
        
        productViews.push({
          productId: randomProduct.id,
          userId: randomBuyer?.id || null,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: "Mozilla/5.0 (Mobile; rv:89.0) Gecko/89.0 Firefox/89.0",
          viewedAt: viewTime,
        });
      }
    }

    // Insert product views
    for (const view of productViews) {
      await storage.createProductView(view);
    }

    console.log(`Created ${productViews.length} sample product views`);

  } catch (error) {
    console.error("Error seeding transaction data:", error);
    throw error;
  }
}

/**
 * Initialize sample data if needed
 */
export async function initializeSampleData(): Promise<void> {
  try {
    // Check if we already have transactions
    const existingTransactions = await storage.getSellerTransactions("seller-001", 1);
    
    if (existingTransactions.length === 0) {
      console.log("No transactions found. Seeding sample data...");
      await seedSampleTransactions();
      console.log("Sample data seeding completed.");
    }
  } catch (error) {
    console.error("Error checking/initializing sample data:", error);
  }
}