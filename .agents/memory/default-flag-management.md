---
name: Single-default flag management
description: Rule for safely maintaining an is_default flag across a user's owned rows (payment methods, addresses, etc.).
---

When a set of user-owned rows has a single "default" flag (e.g. `payment_methods.isDefault`), any "set default" operation must verify the target row exists and is owned by the user BEFORE clearing the existing defaults.

**Why:** A naive implementation clears all defaults first, then sets the new one. If the target id is invalid or belongs to another user, the second update matches 0 rows and the user is left with NO default at all. Caught in code review.

**How to apply:** In the storage method, `select` the target by `(id, userId)` first; return false / 404 if missing, and only then clear + set. On delete of a default row, promote the most-recent remaining row to default. Concurrency-hardening (DB transaction + partial unique index `where is_default = true`) is optional at small scale but is the correct next step if races matter.
