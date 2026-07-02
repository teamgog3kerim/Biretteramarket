import { storage } from "./storage";
import { notifyUserOnTelegram } from "./telegramAuth";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly
// Addis Ababa is UTC+3; don't send before 9:00 AM local time (06:00 UTC)
const EARLIEST_SEND_HOUR_UTC = 6;

function startOfToday(): Date {
  // UTC day boundary, aligned with the UTC-based send-hour gate
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatEtb(value: string | null): string {
  const num = value ? parseFloat(value) : NaN;
  if (isNaN(num)) return "-";
  return `${num.toLocaleString("en-US", { maximumFractionDigits: 0 })} ETB`;
}

async function sendDailyMarketNotifications() {
  try {
    if (new Date().getUTCHours() < EARLIEST_SEND_HOUR_UTC) return;

    const since = startOfToday();
    const pendingUsers = await storage.getUsersForMarketNotification(since);
    if (pendingUsers.length === 0) return;

    const [todayReports, allCategories] = await Promise.all([
      storage.getDailyMarketReports(new Date()),
      storage.getCategories(),
    ]);
    if (todayReports.length === 0) return; // reports not generated yet; retry next hour

    // Map each category to its top-level ancestor so child-category reports
    // roll up into the user's selected top-level interests
    const parentOf = new Map(allCategories.map((c) => [c.id, c.parentId]));
    const nameOf = new Map(allCategories.map((c) => [c.id, c.name]));
    const topLevelOf = (id: string): string => {
      let current = id;
      let hops = 0;
      while (hops < 10) {
        const parent = parentOf.get(current);
        if (!parent) return current;
        current = parent;
        hops++;
      }
      return current;
    };

    const reportsByTopLevel = new Map<string, typeof todayReports>();
    for (const report of todayReports) {
      const top = topLevelOf(report.categoryId);
      const list = reportsByTopLevel.get(top) ?? [];
      list.push(report);
      reportsByTopLevel.set(top, list);
    }

    for (const user of pendingUsers) {
      const interests = (user.interestedCategoryIds ?? []).filter((id) => nameOf.has(id));
      if (interests.length === 0) continue;

      const sections: string[] = [];
      for (const catId of interests) {
        const reports = reportsByTopLevel.get(topLevelOf(catId)) ?? [];
        const catName = nameOf.get(catId) ?? "Category";
        if (reports.length === 0) {
          sections.push(`📦 ${catName}\n   No price data today`);
          continue;
        }
        const totalListings = reports.reduce((sum, r) => sum + (r.totalListings ?? 0), 0);
        const avgs = reports
          .map((r) => parseFloat(r.averagePrice ?? ""))
          .filter((n) => !isNaN(n));
        const mins = reports.map((r) => parseFloat(r.minPrice ?? "")).filter((n) => !isNaN(n));
        const maxs = reports.map((r) => parseFloat(r.maxPrice ?? "")).filter((n) => !isNaN(n));
        const avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : NaN;
        const changes = reports
          .map((r) => parseFloat(r.priceChangePercent ?? ""))
          .filter((n) => !isNaN(n) && n !== 0);
        const avgChange = changes.length
          ? changes.reduce((a, b) => a + b, 0) / changes.length
          : 0;
        const trend =
          avgChange > 0.05 ? `📈 +${avgChange.toFixed(1)}%` : avgChange < -0.05 ? `📉 ${avgChange.toFixed(1)}%` : "➡️ stable";

        sections.push(
          `📦 ${catName}\n` +
            `   Avg: ${isNaN(avg) ? "-" : formatEtb(String(avg))} (${mins.length ? formatEtb(String(Math.min(...mins))) : "-"} – ${maxs.length ? formatEtb(String(Math.max(...maxs))) : "-"})\n` +
            `   ${trend} · ${totalListings} listing${totalListings === 1 ? "" : "s"}`,
        );
      }
      if (sections.length === 0) continue;

      const dateStr = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const message =
        `📊 Biret Tera Daily Market Update — ${dateStr}\n` +
        `የዕለቱ የገበያ ዋጋ ማጠቃለያ\n\n` +
        sections.join("\n\n") +
        `\n\nOpen Biret Tera to browse the latest listings in your categories.`;

      try {
        // Claim first so concurrent instances can't double-send
        const claimed = await storage.claimMarketNotification(user.id, since);
        if (!claimed) continue;

        const sent = await notifyUserOnTelegram(user.id, message);
        if (sent) {
          console.log(`Sent daily market notification to user ${user.id}`);
        } else {
          await storage.clearMarketNotification(user.id);
          console.error(`Market notification delivery failed for user ${user.id}; will retry next hour`);
        }
      } catch (err) {
        console.error(`Failed to send market notification to user ${user.id}:`, err);
        try {
          await storage.clearMarketNotification(user.id);
        } catch {
          /* leave claimed; better to miss than spam */
        }
      }
    }
  } catch (err) {
    console.error("Failed to send daily market notifications:", err);
  }
}

export function initializeMarketNotifications() {
  setTimeout(sendDailyMarketNotifications, 30 * 1000);
  setInterval(sendDailyMarketNotifications, CHECK_INTERVAL_MS);
}
