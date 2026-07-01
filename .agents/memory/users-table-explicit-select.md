---
name: Users table explicit select block
description: Adding a column to the users table breaks a hand-written select and fails tsc until updated.
---

Adding a new column to the `users` table in `shared/schema.ts` will break type-checking because at least one storage query selects user columns explicitly instead of `select()` (the top-sellers query that also computes `productCount`).

**Why:** Most user queries use `db.select().from(users)` (auto-includes new columns), but the top-sellers aggregation lists each column by hand to add a computed `productCount`. A new column is then missing from the returned shape and `tsc` fails with a "missing properties" error on the `User & { productCount }` type.

**How to apply:** After adding any `users` column, grep `server/storage.ts` for `profileImageUrl: users.profileImageUrl` (marks the hand-written block) and add the new column there too. Then run `npx tsc --noEmit`.
