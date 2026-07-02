import { storage } from "./storage";
import { notifyUserOnTelegram } from "./telegramAuth";

const EXPIRY_WARNING_DAYS = 4;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

async function checkExpiringSubscriptions() {
  try {
    const expiring = await storage.getSubscriptionsExpiringSoon(EXPIRY_WARNING_DAYS);
    for (const sub of expiring) {
      if (!sub.endDate) continue;
      const daysLeft = Math.max(
        1,
        Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      );
      const planLabel =
        sub.planType === "yearly"
          ? "Yearly Premium (9,900 ETB)"
          : sub.planType === "monthly"
            ? "Monthly Premium (990 ETB)"
            : "Free Trial";

      try {
        // Claim first so concurrent instances can't double-send
        const claimed = await storage.claimExpiryNotification(sub.id);
        if (!claimed) continue;

        const sent = await notifyUserOnTelegram(
          sub.userId,
          `⏰ Reminder: Your Biret Tera subscription expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}!\n\n` +
            `Plan: ${planLabel}\n` +
            `Expires: ${new Date(sub.endDate).toDateString()}\n\n` +
            `To keep your products listed, renew now:\n` +
            `1. Pay via CBE Birr, Telebirr, or bank transfer\n` +
            `2. Open Biret Tera → Profile → Subscription\n` +
            `3. Upload your payment receipt for approval\n\n` +
            `ማሳሰቢያ፡ የቢረት ተራ ምዝገባዎ በ${daysLeft} ቀን ውስጥ ያበቃል። ምርቶችዎ እንዲቀጥሉ እባክዎ ምዝገባዎን ያድሱ።`,
        );

        if (sent) {
          console.log(`Sent expiry reminder for subscription ${sub.id} (user ${sub.userId})`);
        } else {
          // Release the claim so the next run (every 6h) retries within the 4-day window
          await storage.clearExpiryNotification(sub.id);
          console.error(`Expiry reminder delivery failed for subscription ${sub.id}; will retry next cycle`);
        }
      } catch (err) {
        console.error(`Failed to send expiry reminder for subscription ${sub.id}:`, err);
        try {
          await storage.clearExpiryNotification(sub.id);
        } catch {
          /* leave claimed; better to miss than spam */
        }
      }
    }
  } catch (err) {
    console.error("Failed to check expiring subscriptions:", err);
  }
}

export function initializeSubscriptionReminders() {
  // Run shortly after startup, then on a fixed interval
  setTimeout(checkExpiringSubscriptions, 15 * 1000);
  setInterval(checkExpiringSubscriptions, CHECK_INTERVAL_MS);
}
