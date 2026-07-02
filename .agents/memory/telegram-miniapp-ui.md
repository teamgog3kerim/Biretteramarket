---
name: Telegram Mini App UI constraints
description: Layout/viewport quirks when this app runs inside Telegram's webview (dialogs, dvh support, swipe gestures)
---

# Telegram Mini App UI constraints

- Blocking dialogs must keep their primary action button pinned and visible (flex column, only the list scrolls). Inner-dialog scrolling conflicts with Telegram's vertical swipe gestures, so users on mobile can get stuck unable to reach a below-the-fold button.
- **Why:** A production incident: the account-type onboarding modal cut off its Continue button in the Telegram webview; prod logs showed the confirm request never fired — users were hard-stuck at onboarding.
- Older Telegram Android webviews (~v6.0) do not support `dvh` units. Use a `vh` fallback plus `@supports (height: 1dvh)` override; a bare `max-h-[Xdvh]` is silently ignored there.
- **How to apply:** Any full-screen or blocking overlay/dialog rendered inside the Mini App: bound its height with the vh/dvh fallback pattern and pin footers with flex-shrink-0.
- The Telegram bot's menu button URL is configured via BotFather/API, not code — after publishing, verify it points at the production `.replit.app` URL, not a stale `.replit.dev` dev URL.
