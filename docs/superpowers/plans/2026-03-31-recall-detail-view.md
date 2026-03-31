# Recall Detail View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When opening a recall, fetch and display all recall-table informational fields in the detail dialog (show recall number; hide internal keys).

**Architecture:** Keep `GET /api/recalls` as a lightweight list endpoint. Upgrade `GET /api/recalls/:id` (where `:id` is `recall_number`) to return a full detail payload, and have the client fetch it on modal open and render grouped read-only sections.

**Tech Stack:** Express, Supabase JS, Vitest + Supertest, React + MUI.

---

## File map (what changes where)

**Backend**
- Modify: `server/src/lib/supabaseRecallData.js`
  - Add a dedicated DB query helper to fetch one recall by `recall_number` with all informational columns + `recall_image(image_url)`
  - Add a mapper that extends the existing SPA shape (`id`, `recall_id`, `title`, `product`, `hazard`, `image_url`) with extra informational fields
- Modify: `server/src/routes/recalls.js`
  - Change `GET /api/recalls/:id` to call the new helper (instead of re-fetching the list)
- Modify: `server/src/data/mockData.js`
  - Extend mock recall objects with a minimal set of extra fields (at least a couple populated) so UI and tests can validate behavior in API mock mode
- Create: `server/src/recalls.detail.test.js`
  - Add API_MOCK_MODE tests for the detail endpoint (200 shape + 404)

**Frontend**
- Modify: `client/src/pages/RecallsPage.jsx`
  - On modal open, fetch `GET /api/recalls/:recall_number` and merge/replace `detailRecall`
  - Render a read-only “Recall details” section showing all non-empty informational fields (grouped)

---

### Task 1: Add server detail endpoint contract + tests (TDD)

**Files:**
- Create: `server/src/recalls.detail.test.js`

- [ ] **Step 1: Write failing tests for `GET /api/recalls/:recall_number`**

Add tests that assert:
- `GET /api/recalls/24-001` returns 200
- Response includes existing summary keys: `id`, `recall_id`, `title`, `product`, `hazard`, `image_url`
- Response includes *all* additional informational keys from the spec (keys must exist even if values are `null`/empty):
  - `recall_url`
  - `consumer_contact`
  - `recall_description`
  - `injury`
  - `remedy`
  - `remedy_option`
  - `manufacturer`
  - `manufacturer_country`
  - `importer`
  - `distributor`
  - `retailer`
  - `product_name`
  - `product_type`
  - `number_of_units`
  - `upc`
  - `recall_date`
  - `last_publish_date`
- Contract checks:
  - `id` is a string
  - `recall_id` equals the requested recall number (this is the identifier used by PATCH/DELETE)
- `GET /api/recalls/99-999` returns 404 with `{ error: 'Recall not found' }`

Example skeleton:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('GET /api/recalls/:id (detail, API_MOCK_MODE)', () => {
  let app;
  beforeAll(() => { app = createApp(); });

  it('returns full detail payload by recall_number', async () => {
    const res = await request(app).get('/api/recalls/24-001');
    expect(res.status).toBe(200);
    expect(res.body.recall_id).toBe('24-001');
    expect(res.body).toHaveProperty('title');
    expect(typeof res.body.id).toBe('string');

    const required = [
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
    ];
    required.forEach((k) => expect(res.body).toHaveProperty(k));
  });

  it('returns 404 when recall_number does not exist', async () => {
    const res = await request(app).get('/api/recalls/99-999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recall not found');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd server && npm test
```

Expected: FAIL (detail endpoint currently returns summary-only payload without the additional fields).

---

### Task 2: Implement Supabase detail fetch + API route

**Files:**
- Modify: `server/src/lib/supabaseRecallData.js`
- Modify: `server/src/routes/recalls.js`

- [ ] **Step 1: Add Supabase detail query helper**

Implement something like:
- `dbFetchRecallDetailByRecallNumber(supabase, recallNumber)`
  - `from('recall')`
  - `select('recall_id, recall_number, recall_title, product_name, product_type, hazard, injury, remedy, remedy_option, manufacturer, manufacturer_country, importer, distributor, retailer, upc, number_of_units, recall_date, last_publish_date, recall_url, consumer_contact, recall_description, recall_image ( image_url )')`
  - `.eq('recall_number', recallNumber.trim())`
  - `.maybeSingle()`

Then map into a response that:
- preserves existing summary keys:
  - `id: String(recall_id)`
  - `recall_id: recall_number`
  - `title`, `product`, `hazard`, `image_url` (reusing `firstImageUrlFromRow`)
- adds extra informational keys as top-level fields for the UI:
  - `recall_url`, `consumer_contact`, `recall_description`, `injury`, `remedy`, `remedy_option`, `manufacturer`, `manufacturer_country`, `importer`, `distributor`, `retailer`, `product_name`, `product_type`, `number_of_units`, `upc`, `recall_date`, `last_publish_date`

- [ ] **Step 2: Update `GET /api/recalls/:id`**

In `server/src/routes/recalls.js`:
- Treat `:id` as `recall_number` (string)
- In Supabase mode, call `dbFetchRecallDetailByRecallNumber(req.supabase, id)`
- In mock mode, return mock detail object (see Task 3)

Error handling:
- If no row: 404 `{ error: 'Recall not found' }`
- If DB error: 500

- [ ] **Step 3: Run server tests**

Run:

```bash
cd server && npm test
```

Expected: the new detail tests PASS.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/recalls.js server/src/lib/supabaseRecallData.js server/src/recalls.detail.test.js
git commit -m "Add full recall detail endpoint"
```

---

### Task 3: Align API mock mode detail payload

**Files:**
- Modify: `server/src/data/mockData.js`

- [ ] **Step 1: Extend mock recall rows with extra informational fields**

Requirement: in API mock mode, `GET /api/recalls/:id` must return the *same* full detail key set for **every** recall (values may be `null`/empty), so the UI can render consistently.

Ensure the mock row still contains the existing summary keys used by the client (`id`, `recall_id`, `title`, `product`, `hazard`, `image_url`).

For visual validation, populate realistic values for a couple recalls (e.g. `24-001`, `24-002`) for:
- `recall_url`, `consumer_contact`, `recall_description`
- `manufacturer`, `manufacturer_country`, `product_type`, `upc`, `number_of_units`
- `recall_date`, `last_publish_date`

- [ ] **Step 2: Re-run server tests**

```bash
cd server && npm test
```

Expected: PASS (and now payload has some non-empty fields to visually validate in UI).

- [ ] **Step 3: Commit**

```bash
git add server/src/data/mockData.js
git commit -m "Add mock recall detail fields"
```

---

### Task 4: Fetch full details on modal open (client)

**Files:**
- Modify: `client/src/pages/RecallsPage.jsx`

- [ ] **Step 1: Add loading state for detail fetch**

Add `detailLoading` state and clear it on close.

- [ ] **Step 2: On open, fetch `GET /api/recalls/:recall_number`**

Add a `useEffect` keyed on `[detailOpen, detailRecall?.recall_id, session]`:
- If modal not open or no recall number: return
- Set `detailLoading = true`
- Fetch `apiFetch(/api/recalls/${encodeURIComponent(recallNumber)})`
- If ok: `setDetailRecall(detail)` and (optionally) sync `detailDraft` fields from returned values if they differ
- If not ok: set `detailError` but keep modal usable (edits still based on existing draft)
- Finally: set `detailLoading = false`

- [ ] **Step 3: Manual smoke check**

Run client+server as you normally do and:
- Open a recall detail modal
- Confirm it loads the new fields (after a brief loading indicator)
- Confirm edits still work (save changes, priority, assignee)

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/RecallsPage.jsx
git commit -m "Fetch recall details on modal open"
```

---

### Task 5: Render “Recall details” grouped read-only section

**Files:**
- Modify: `client/src/pages/RecallsPage.jsx`

- [ ] **Step 1: Add a small renderer for key/value rows**

Inside the component (or as a small helper function in the same file):
- Define groups (Dates, Links & contact, Description, Hazard & injury, Remedy, Company chain, Product metadata)
- For each field:
  - compute a display value (trim strings; format dates with `toLocaleDateString()` / `toLocaleString()` consistently)
  - skip if empty
  - never auto-render unknown keys; explicitly render a curated allowlist only (prevents leaking internal fields)

Also add an explicit denylist safeguard (defense-in-depth) so we never display:
- `id` (DB PK string used internally)
- any internal bigint PK column like `recall_id` (not present in SPA shape today, but avoid future leaks)

- [ ] **Step 2: Place the section under the editable inputs**

Below the existing input block and above the “Managers/Admins can edit…” footer:
- Add `Typography` heading “Recall details”
- Use `Divider`s between groups
- For description: use a `TextField` in read-only multiline mode or a `Paper` with `white-space: pre-wrap` and `maxHeight` + scroll.

- [ ] **Step 3: Manual smoke check**

Open a recall with many fields (CPSC-imported record):
- Ensure populated fields show
- Ensure empty fields do not
- Ensure internal keys (`id`) are not rendered anywhere

- [ ] **Step 4: Run linters**

```bash
cd client && npm run lint
cd ../server && npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/RecallsPage.jsx
git commit -m "Show full recall details in modal"
```

---

## Final verification

- [ ] Run server test suite:

```bash
cd server && npm test
```

- [ ] Start app and manually verify:
  - Open detail modal shows recall number + grouped details
  - Save changes still works
  - Priority/assignee still works

