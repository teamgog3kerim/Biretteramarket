import crypto from "crypto";
import type { Express } from "express";
import { storage } from "./storage";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

// Validates the initData string that Telegram provides to Mini Apps.
// See https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function validateTelegramInitData(
  initData: string,
  botToken: string,
): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckArr: string[] = [];
  const keys = Array.from(params.keys()).sort();
  for (const key of keys) {
    dataCheckArr.push(`${key}=${params.get(key)}`);
  }
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Constant-time comparison to avoid timing attacks
  const computedBuf = Buffer.from(computedHash, "hex");
  const hashBuf = Buffer.from(hash, "hex");
  if (
    computedBuf.length !== hashBuf.length ||
    !crypto.timingSafeEqual(computedBuf, hashBuf)
  ) {
    return null;
  }

  // auth_date is mandatory: reject if missing/invalid, too old, or in the future
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Number.isNaN(authDate)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 24 * 60 * 60) return null;
  if (authDate - now > 60) return null; // allow small clock skew

  const userJson = params.get("user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as TelegramUser;
  } catch {
    return null;
  }
}

export function setupTelegramAuth(app: Express) {
  app.post("/api/auth/telegram", async (req: any, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res
        .status(500)
        .json({ message: "Telegram authentication is not configured" });
    }

    const initData: string | undefined = req.body?.initData;
    if (!initData) {
      return res.status(400).json({ message: "Missing initData" });
    }

    const tgUser = validateTelegramInitData(initData, botToken);
    if (!tgUser) {
      return res.status(401).json({ message: "Invalid Telegram data" });
    }

    const userId = `telegram:${tgUser.id}`;

    await storage.upsertUser({
      id: userId,
      email: null,
      firstName: tgUser.first_name ?? null,
      lastName: tgUser.last_name ?? null,
      profileImageUrl: tgUser.photo_url ?? null,
    });

    const sessionUser = {
      authType: "telegram",
      claims: {
        sub: userId,
        email: null,
        first_name: tgUser.first_name ?? null,
        last_name: tgUser.last_name ?? null,
        profile_image_url: tgUser.photo_url ?? null,
      },
    };

    req.login(sessionUser, (err: any) => {
      if (err) {
        return res.status(500).json({ message: "Failed to establish session" });
      }
      res.json({ success: true });
    });
  });
}
