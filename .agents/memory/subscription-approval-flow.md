---
name: Subscription approval flow invariants
description: Rules that must hold for the receipt-based payment approval system
---
- Paid plans (monthly/yearly) must NEVER be self-activatable. `POST /api/subscription` only accepts `free_trial`; paid plans go through `submit-payment` -> status `pending` -> admin approve/reject.
- **Why:** an earlier version let clients POST `{planType:'monthly', status:'active'}` and bypass admin approval entirely — architect review caught it. Any new subscription endpoint must ignore client-provided `status`.
- **How to apply:** when touching subscription routes, keep server-side status assignment and re-check that pending subscriptions never unlock product listing (gating uses `getUserSubscription`, which filters status='active').
- `users.status='suspended'` is only meaningful because the `notSuspended` middleware guards write routes (products CRUD, subscription creation). New write routes should include it.
- Admin auto-grant: telegram login sets isAdmin only when username matches (never passes false), so manually granted admins aren't demoted on next login.
- Publishing note: prod DB needs the new columns (users.telegram_username/is_admin/status, subscriptions.receipt_image) synced when deploying schema changes.
