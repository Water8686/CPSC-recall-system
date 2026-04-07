# Recall Date Fix, "Added to System" Column & Listings Data Integrity

**Date:** 2026-04-07
**Status:** Approved

## Problem

Three issues affecting the recall system's data quality and investigator experience:

1. **Recall date not showing** — The RecallsPage date column shows "—" for every recall because `mapRecallRow()` maps `recall_date` into a field called `created_at`, but the frontend reads `recall.recall_date`.

2. **No "date added to system"** — The `recall` table tracks when CPSC issued the recall (`recall_date`) but not when the recall was imported into this system. Investigators have no visibility into data freshness.

3. **Listings misaligned to recalls** — Some listings (e.g., "Flyindream Cobelae Busy Book") are linked to unrelated recalls (e.g., "17 Stories Furniture 14-Drawer Dressers"), likely from seed data errors. No schema constraint prevents orphaned listings.

## Design

### 1. Bug Fix — Recall Date Mapping

**Files:** `server/src/lib/supabaseRecallData.js`

- Add `recall_date: row.recall_date ?? null` to the `mapRecallRow()` return object (line ~52).
- The existing `created_at` field remains for backward compatibility.
- No frontend changes needed — `RecallsPage.jsx` line 264 already reads `recall.recall_date`.
- The sort on `recall_date` in RecallsPage will also start working correctly.

### 2. "Added to System" Column

**Database migration:**
- `ALTER TABLE recall ADD COLUMN added_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Backfill existing rows: `UPDATE recall SET added_at = COALESCE(recall_date, now())`

**API layer (`server/src/lib/supabaseRecallData.js`):**
- Add `added_at` to the select list in `dbFetchRecalls` and `dbFetchRecallDetailByRecallNumber`
- Add `added_at: row.added_at ?? null` to `mapRecallRow()` return object
- Add `added_at: row.added_at ?? null` to `mapRecallDetailRow()` return object

**Frontend (`client/src/pages/RecallDetailPage.jsx`):**
- Add "Added to System" field in the Details tab grid, after "Recall Date"
- Format with `toLocaleDateString()`

### 3. Listings Data Integrity

**Diagnostic query (SQL script):**
- Joins `listing` to `recall` on `recall_id`
- Outputs: `listing_id`, `listing_title`, `recall_id`, `recall.recall_number`, `recall.product_name`
- Flags listings with `NULL recall_id` (orphans)
- User reviews output and decides cleanup actions (delete, reassign, or leave)

**Schema guardrail (migration, applied after cleanup):**
- `ALTER TABLE listing ALTER COLUMN recall_id SET NOT NULL`
- Prevents future listings from being created without a recall association

**Server-side validation (`server/src/routes/listings.js`):**
- Add explicit check that referenced `recall_id` exists in `recall` table before inserting
- Returns clear error message: "Recall not found" instead of relying on FK constraint error

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_recall_added_at.sql` | New migration: `added_at` column + backfill |
| `supabase/migrations/YYYYMMDD_listing_recall_not_null.sql` | New migration: `NOT NULL` on `listing.recall_id` |
| `server/src/lib/supabaseRecallData.js` | Add `recall_date` and `added_at` to mappers and select lists |
| `server/src/routes/listings.js` | Add recall existence check before insert |
| `client/src/pages/RecallDetailPage.jsx` | Add "Added to System" field in Details tab |
| `scripts/audit-listing-recalls.sql` | Diagnostic query for mismatched listings |

## Out of Scope

- Cascade delete behavior (deliberately excluded — too risky)
- Listing annotation columns (`is_true_match`, etc.) — stub exists, separate effort
- RecallsPage UI changes beyond the date fix
