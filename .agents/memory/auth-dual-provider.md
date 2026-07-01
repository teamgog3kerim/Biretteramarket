---
name: Dual auth (Replit OIDC + Telegram Mini App)
description: How Replit login and Telegram Mini App login share one session/user model
---

# Dual authentication: Replit OIDC + Telegram

The app supports two login paths that share ONE Passport/express-session and one `users` table.

- **Unified session user shape**: every logged-in user object has `claims.sub` (the user id) so all
  protected routes can uniformly read `req.user.claims.sub`. Telegram sessions additionally carry
  `authType: "telegram"`.
- **`isAuthenticated` branches on `authType`**: Telegram users are session-only (no OIDC token to
  refresh) and pass through immediately; OIDC users still go through expiry/refresh logic.
  **Why:** Telegram has no refresh token; forcing the OIDC `expires_at` check would 401 them.
- **User id convention**: Telegram users are stored with id `telegram:<telegram_user_id>`; email is
  null (Telegram gives no email — `users.email` is nullable + unique, so multiple nulls are fine).
- **initData validation** (Telegram): secret key = `HMAC_SHA256("WebAppData", botToken)`, then compare
  `HMAC_SHA256(secretKey, dataCheckString)` to the `hash` param using a constant-time compare.
  `auth_date` is mandatory (reject missing/NaN, >24h old, or >60s in the future).
  **Why:** this is Telegram's required scheme; skipping auth_date enables replay.
- **Bot token** lives in the `TELEGRAM_BOT_TOKEN` secret, never in code.

**How to apply:** when adding new protected routes, keep reading `req.user.claims.sub` — do not assume
OIDC-only fields. When touching `isAuthenticated`, preserve the `authType === "telegram"` early return.
