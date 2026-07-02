---
name: Telegram notification job pattern
description: Reliability pattern for background jobs that send Telegram notifications (expiry reminders, daily market updates)
---

**Rule:** Any background job that sends a Telegram notification must (1) atomically claim the row first via a conditional UPDATE (`WHERE flag IS NULL` or `< since`), (2) treat the send helper's boolean return as authoritative, and (3) release the claim on failed delivery so the next cycle retries.

**Why:** An architect review caught that the original expiry-reminder job marked rows as notified even when the Telegram API returned an error (send helper logged instead of throwing), permanently dropping the reminder; separate select-then-mark steps also allowed duplicate sends across concurrent instances/restarts.

**How to apply:** Use the existing helpers as templates: `sendTelegramMessage`/`notifyUserOnTelegram` return booleans (non-Telegram users return true = "no channel, handled"). Storage exposes claim/clear pairs. Daily jobs use a UTC day boundary for the claim window aligned with any UTC send-hour gate. Test the failure path with a fake `telegram:<bogus-id>` user — Telegram returns "chat not found" and the claim must be released.
