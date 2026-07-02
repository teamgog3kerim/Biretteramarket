---
name: Category hierarchy conventions
description: Categories are a 3-level self-referencing tree; all category-scoped queries must be descendant/root aware
---

Categories form a 3-level tree (main → subcategory → product type) via `categories.parent_id` (nullable self-reference) + `sort_order`. ~330 rows, 23 mains. Products may reference ANY level.

**Rules:**
- Filtering products by category must include descendants (recursive CTE on parent_id), never a plain equality match.
- Analytics/market reporting must roll leaf metrics UP to root (main) categories, or 300+ near-empty rows appear. Weighted avg price = sum(price)/count, not avg of avgs.
- Seeding is idempotent keyed on (name, parentId) — duplicate names exist under different parents (e.g. "Rollers", "Filters") and are intentional.
- Legacy flat categories (Steel/Iron/Construction) were migrated: Steel row reused as "Steel & Iron"; Iron→Steel & Iron, Construction→Building Materials (products + market_reports remapped, old rows deleted).

**Why:** Buyers browse top-down but sellers list at the most specific level; equality filtering silently hides listings and analytics fragment across leaves.

**How to apply:** Any new query, report, or UI that groups or filters by category must decide: descendant-inclusive (browsing/filtering) or root-rollup (analytics), never raw category_id equality against user-picked categories.
