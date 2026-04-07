# Recall Date Fix, "Added to System" Column & Listings Data Integrity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken recall date display, add "added to system" tracking, and improve listings data integrity with an audit query + NOT NULL constraint.

**Architecture:** Three targeted changes — a mapper bug fix, a new DB column with API/frontend plumbing, and a schema tightening with a diagnostic script. All changes flow through the existing Supabase + Express + React stack.

**Tech Stack:** PostgreSQL (Supabase), Express API, React (MUI), Vitest

---

### Task 1: Fix recall_date mapping bug

**Files:**
- Modify: `server/src/lib/supabaseRecallData.js:43-55`
- Modify: `server/src/recalls.detail.test.js:30-37`

- [ ] **Step 1: Update the existing test to assert `recall_date` on the list endpoint shape**

The existing test at `server/src/recalls.detail.test.js` checks the detail endpoint. Add a new test for the list endpoint that verifies `recall_date` is present.

Add this test case after the existing tests in the same `describe` block:

```js
it('list endpoint includes recall_date on each item', async () => {
  const res = await request(app).get('/api/recalls');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
  // Every recall object must have recall_date
  res.body.forEach((r) => {
    expect(r).toHaveProperty('recall_date');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd server && npx vitest run src/recalls.detail.test.js`

Expected: FAIL — `recall_date` is not a property of list items (it's mapped to `created_at`).

- [ ] **Step 3: Add `recall_date` to `mapRecallRow` return object**

In `server/src/lib/supabaseRecallData.js`, modify `mapRecallRow`:

```js
export function mapRecallRow(row) {
  if (!row) return null;
  const recallNumber = row.recall_number ?? '';
  return {
    id: String(row.recall_id),
    recall_id: recallNumber,
    title: row.recall_title ?? row.product_name ?? 'Recall',
    product: row.product_name ?? row.product_type ?? '',
    hazard: row.hazard ?? '',
    created_at: row.recall_date ?? row.last_publish_date ?? null,
    recall_date: row.recall_date ?? null,
    image_url: firstImageUrlFromRow(row),
  };
}
```

The only change is adding the line `recall_date: row.recall_date ?? null,`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && npx vitest run src/recalls.detail.test.js`

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/supabaseRecallData.js server/src/recalls.detail.test.js
git commit -m "fix: include recall_date in list API so RecallsPage date column renders"
```

---

### Task 2: Add `added_at` column to recall table

**Files:**
- Create: `supabase/migrations/20260407120000_recall_added_at.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Add "added to system" timestamp to recall table
ALTER TABLE recall ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill existing rows with recall_date as a reasonable proxy
UPDATE recall SET added_at = COALESCE(recall_date, now()) WHERE added_at = now();
```

Note: The `DEFAULT now()` sets all existing rows to "now" first, then the UPDATE backfills with `recall_date`. New inserts going forward get `now()` automatically.

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase migration up --local` or apply via Supabase dashboard if using remote.

Verify: `npx supabase db reset` if working locally, or check the table in Supabase Studio.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407120000_recall_added_at.sql
git commit -m "feat: add added_at column to recall table for tracking import date"
```

---

### Task 3: Expose `added_at` through the API layer

**Files:**
- Modify: `server/src/lib/supabaseRecallData.js` (select lists + mappers)
- Modify: `server/src/recalls.detail.test.js`

- [ ] **Step 1: Add test asserting `added_at` on detail endpoint**

Add to the existing detail test in `server/src/recalls.detail.test.js`, inside the `'returns full detail payload by recall_number'` test. Add `'added_at'` to the detail keys array:

```js
// Detail keys must exist (values may be null/empty)
[
  'recall_url',
  'consumer_contact',
  'recall_description',
  'injury',
  'remedy',
  'remedy_option',
  'manufacturer',
  'manufacturer_country',
  'importer',
  'distributor',
  'retailer',
  'product_name',
  'product_type',
  'number_of_units',
  'upc',
  'recall_date',
  'last_publish_date',
  'added_at',
].forEach((k) => expect(res.body).toHaveProperty(k));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/recalls.detail.test.js`

Expected: FAIL — `added_at` is not in the response (mock mode won't have it, but will fail the property check).

- [ ] **Step 3: Add `added_at` to select lists and mappers**

In `server/src/lib/supabaseRecallData.js`:

**a) `dbFetchRecalls` select list** — add `added_at` after `last_publish_date`:

```js
export async function dbFetchRecalls(supabase) {
  const { data, error } = await supabase
    .from('recall')
    .select(
      `
      recall_id,
      recall_number,
      recall_title,
      product_name,
      product_type,
      hazard,
      recall_date,
      last_publish_date,
      added_at,
      recall_image ( image_url )
    `,
    )
    .order('recall_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRecallRow);
}
```

**b) `dbFetchRecallDetailByRecallNumber` select list** — add `added_at` after `last_publish_date`:

```js
export async function dbFetchRecallDetailByRecallNumber(supabase, recallNumber) {
  const { data, error } = await supabase
    .from('recall')
    .select(
      `
      recall_id,
      recall_number,
      recall_title,
      product_name,
      product_type,
      hazard,
      injury,
      remedy,
      remedy_option,
      manufacturer,
      manufacturer_country,
      importer,
      distributor,
      retailer,
      upc,
      number_of_units,
      recall_date,
      last_publish_date,
      added_at,
      recall_url,
      consumer_contact,
      recall_description,
      recall_image ( image_url )
    `,
    )
    .eq('recall_number', String(recallNumber ?? '').trim())
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRecallDetailRow(data);
}
```

**c) `mapRecallRow`** — add `added_at`:

```js
export function mapRecallRow(row) {
  if (!row) return null;
  const recallNumber = row.recall_number ?? '';
  return {
    id: String(row.recall_id),
    recall_id: recallNumber,
    title: row.recall_title ?? row.product_name ?? 'Recall',
    product: row.product_name ?? row.product_type ?? '',
    hazard: row.hazard ?? '',
    created_at: row.recall_date ?? row.last_publish_date ?? null,
    recall_date: row.recall_date ?? null,
    added_at: row.added_at ?? null,
    image_url: firstImageUrlFromRow(row),
  };
}
```

**d) `mapRecallDetailRow`** — add `added_at`:

```js
export function mapRecallDetailRow(row) {
  if (!row) return null;
  const base = mapRecallRow(row);
  return {
    ...base,
    recall_url: row.recall_url ?? null,
    consumer_contact: row.consumer_contact ?? null,
    recall_description: row.recall_description ?? null,
    injury: row.injury ?? null,
    remedy: row.remedy ?? null,
    remedy_option: row.remedy_option ?? null,
    manufacturer: row.manufacturer ?? null,
    manufacturer_country: row.manufacturer_country ?? null,
    importer: row.importer ?? null,
    distributor: row.distributor ?? null,
    retailer: row.retailer ?? null,
    product_name: row.product_name ?? null,
    product_type: row.product_type ?? null,
    number_of_units: row.number_of_units ?? null,
    upc: row.upc ?? null,
    recall_date: row.recall_date ?? null,
    last_publish_date: row.last_publish_date ?? null,
    added_at: row.added_at ?? null,
  };
}
```

- [ ] **Step 4: Update mock data to include `added_at` so tests pass**

In `server/src/data/mockData.js`, find the `RECALL_DETAIL_DEFAULTS` object (around line 137) and add `added_at: null` after `last_publish_date: null`:

```js
const RECALL_DETAIL_DEFAULTS = {
  recall_url: null,
  consumer_contact: null,
  recall_description: null,
  injury: null,
  remedy: null,
  remedy_option: null,
  manufacturer: null,
  manufacturer_country: null,
  importer: null,
  distributor: null,
  retailer: null,
  product_name: null,
  product_type: null,
  number_of_units: null,
  upc: null,
  recall_date: null,
  last_publish_date: null,
  added_at: null,
};
```

The `normalizeRecallDetailShape` function spreads `RECALL_DETAIL_DEFAULTS` then the recall object over it, so each mock recall's `created_at` field won't override `added_at` automatically. Since the mock recalls don't have an `added_at` property, the default `null` will be used, which is fine — the test only checks `toHaveProperty`, not a truthy value.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx vitest run src/recalls.detail.test.js`

Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add server/src/lib/supabaseRecallData.js server/src/recalls.detail.test.js server/src/data/mockData.js
git commit -m "feat: expose added_at field through recalls API"
```

---

### Task 4: Display "Added to System" in RecallDetailPage

**Files:**
- Modify: `client/src/pages/RecallDetailPage.jsx:254-263`

- [ ] **Step 1: Add "Added to System" to the Details tab grid**

In `client/src/pages/RecallDetailPage.jsx`, find the details grid array (around line 254). Add the new entry after `'Recall Date'`:

Replace the existing array:

```jsx
{[
  ['Product', recall.product_name],
  ['Manufacturer', recall.manufacturer],
  ['Hazard', recall.hazard],
  ['Remedy', recall.remedy],
  ['Units', recall.number_of_units],
  ['UPC', recall.upc],
  ['Recall Date', recall.recall_date ? new Date(recall.recall_date).toLocaleDateString() : null],
  ['Description', recall.recall_description],
]
```

With:

```jsx
{[
  ['Product', recall.product_name],
  ['Manufacturer', recall.manufacturer],
  ['Hazard', recall.hazard],
  ['Remedy', recall.remedy],
  ['Units', recall.number_of_units],
  ['UPC', recall.upc],
  ['Recall Date', recall.recall_date ? new Date(recall.recall_date).toLocaleDateString() : null],
  ['Added to System', recall.added_at ? new Date(recall.added_at).toLocaleDateString() : null],
  ['Description', recall.recall_description],
]
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev:client` and navigate to a recall detail page (e.g., `/recalls/07100`).

Verify: The Details tab shows "ADDED TO SYSTEM" with a date value after "RECALL DATE".

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/RecallDetailPage.jsx
git commit -m "feat: display 'Added to System' date in recall detail view"
```

---

### Task 5: Create listings audit query

**Files:**
- Create: `scripts/audit-listing-recalls.sql`

- [ ] **Step 1: Write the diagnostic SQL script**

```sql
-- Audit: listing-to-recall alignment
-- Run this against your Supabase database to review listing/recall associations.
-- Look for listings whose title doesn't match the recall they're linked to.

-- 1. All listings with their linked recall info
SELECT
  l.listing_id,
  l.listing_title   AS listing_title,
  l.listing_url,
  l.recall_id        AS listing_recall_id,
  r.recall_number,
  r.product_name     AS recall_product,
  m.marketplace_name AS marketplace,
  l.source
FROM listing l
LEFT JOIN recall r ON r.recall_id = l.recall_id
LEFT JOIN marketplace m ON m.marketplace_id = l.marketplace_id
ORDER BY l.recall_id, l.listing_id;

-- 2. Orphaned listings (no recall linked)
SELECT
  l.listing_id,
  l.listing_title,
  l.listing_url,
  m.marketplace_name AS marketplace
FROM listing l
LEFT JOIN marketplace m ON m.marketplace_id = l.marketplace_id
WHERE l.recall_id IS NULL
ORDER BY l.listing_id;

-- 3. Summary: listing count per recall
SELECT
  r.recall_number,
  r.product_name,
  COUNT(l.listing_id) AS listing_count
FROM recall r
LEFT JOIN listing l ON l.recall_id = r.recall_id
GROUP BY r.recall_id, r.recall_number, r.product_name
HAVING COUNT(l.listing_id) > 0
ORDER BY listing_count DESC;
```

- [ ] **Step 2: Commit**

```bash
git add scripts/audit-listing-recalls.sql
git commit -m "chore: add SQL audit script for listing-recall alignment review"
```

- [ ] **Step 3: Run the audit and share results with the user**

Run queries 1 and 2 against the Supabase database (via Studio SQL editor or `psql`). Share the results so the user can decide which listings to delete, reassign, or leave.

---

### Task 6: Add recall existence validation to POST /api/listings

**Files:**
- Modify: `server/src/routes/listings.js:30-56`

- [ ] **Step 1: Add validation that recall exists before creating listing**

In `server/src/routes/listings.js`, in the POST handler, after the `recall_id` check (line 35), add a recall existence check:

```js
/** POST /api/listings */
router.post('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const { recall_id, url, marketplace, title, price, description, source, seller_name, seller_email, listed_at } = req.body ?? {};

  if (!recall_id) return res.status(400).json({ error: 'recall_id is required' });
  if (!url || !String(url).trim()) return res.status(400).json({ error: 'url is required' });

  // Verify the recall exists
  const { data: recallRow, error: recallErr } = await req.supabase
    .from('recall')
    .select('recall_id')
    .eq('recall_id', Number(recall_id))
    .maybeSingle();
  if (recallErr) return res.status(500).json({ error: recallErr.message });
  if (!recallRow) return res.status(400).json({ error: 'Recall not found' });

  try {
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const row = await dbCreateListing(req.supabase, {
      recall_id: recall_id != null ? Number(recall_id) : null,
      url: String(url).trim(),
      marketplace: marketplace ? String(marketplace).trim() : 'Unknown',
      title: title ? String(title).trim() : null,
      price: price != null ? Number(price) : null,
      description: description ? String(description).trim() : null,
      source: source || 'Manual',
      listed_at: listed_at || null,
      added_by: userId,
    });
    return res.status(201).json(row);
  } catch (err) {
    console.error('POST /listings:', err);
    return res.status(500).json({ error: err.message || 'Failed to create listing' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/listings.js
git commit -m "fix: validate recall exists before creating listing"
```

---

### Task 7: Add NOT NULL constraint on listing.recall_id (after user cleanup)

**Files:**
- Create: `supabase/migrations/20260407130000_listing_recall_not_null.sql`

**Important:** This task should only be applied AFTER the user has reviewed the audit results (Task 5) and cleaned up any orphaned or mismatched listings. Do not apply this migration until cleanup is complete.

- [ ] **Step 1: Create the migration file**

```sql
-- Enforce that every listing must be linked to a recall.
-- PREREQUISITE: Run scripts/audit-listing-recalls.sql and resolve any
-- listings with NULL recall_id before applying this migration.

ALTER TABLE listing ALTER COLUMN recall_id SET NOT NULL;
```

- [ ] **Step 2: Commit (but do NOT apply yet)**

```bash
git add supabase/migrations/20260407130000_listing_recall_not_null.sql
git commit -m "chore: add NOT NULL constraint on listing.recall_id (apply after data cleanup)"
```

- [ ] **Step 3: Apply after cleanup**

Once the user has resolved orphaned listings from the audit, apply the migration:

Run: `npx supabase migration up --local` or apply via Supabase dashboard.

Verify: `INSERT INTO listing (..., recall_id) VALUES (..., NULL)` should fail with a NOT NULL violation.

---

### Task 8: Also update `dbUpdateRecall` and `dbDeleteRecall` select lists

**Files:**
- Modify: `server/src/lib/supabaseRecallData.js` (two functions that re-select after write)

These functions re-select the recall row after update/delete and pass through `mapRecallRow`. They need `added_at` in their select lists to avoid returning `null` for the field.

- [ ] **Step 1: Add `added_at` to `dbUpdateRecall` select list**

In `server/src/lib/supabaseRecallData.js`, find the final `.select()` call in `dbUpdateRecall` (around line 530-543). Add `added_at`:

```js
const { data: updated, error } = await supabase
  .from('recall')
  .select(
    `
    recall_id,
    recall_number,
    recall_title,
    product_name,
    product_type,
    hazard,
    recall_date,
    last_publish_date,
    added_at,
    recall_image ( image_url )
  `,
  )
  .eq('recall_id', pkRow.recall_id)
  .maybeSingle();
```

- [ ] **Step 2: Add `added_at` to `dbDeleteRecall` select list**

Find the `.select()` in `dbDeleteRecall` (around line 555-570). Add `added_at`:

```js
const { data: deleted, error } = await supabase
  .from('recall')
  .delete()
  .eq('recall_number', recallNumber.trim())
  .select(
    `
    recall_id,
    recall_number,
    recall_title,
    product_name,
    product_type,
    hazard,
    recall_date,
    last_publish_date,
    added_at,
    recall_image ( image_url )
  `,
  )
  .maybeSingle();
```

- [ ] **Step 3: Add `added_at` to `dbFetchAssignmentQueueRows` select list**

Find the nested recall select in `dbFetchAssignmentQueueRows` (around line 228-239). Add `added_at`:

```js
recall (
  recall_id,
  recall_number,
  recall_title,
  product_name,
  product_type,
  hazard,
  recall_date,
  last_publish_date,
  added_at,
  recall_image ( image_url )
)
```

- [ ] **Step 4: Run full test suite**

Run: `cd server && npx vitest run`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/supabaseRecallData.js
git commit -m "fix: include added_at in all recall select queries for consistency"
```
