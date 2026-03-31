## Goal

When a user opens a recall detail dialog from the recalls list, show **all informational fields** available on the `public.recall` table for that recall (plus its image URL), without showing internal database keys. The **recall number must be shown**.

This should work in both:
- Supabase-backed mode (real DB)
- API mock mode (in-memory mock data)

## Non-goals

- Do not change the recalls list payload to include all fields.
- Do not add new editing capabilities beyond what already exists in the modal today.
- Do not expose internal IDs/keys in the UI (e.g. `recall_id` bigint primary key).

## Current state (as-is)

- The client renders the recall detail dialog in `client/src/pages/RecallsPage.jsx`.
- The detail dialog fetches `GET /api/recalls/:id`.
- `GET /api/recalls/:id` currently returns the **same summary shape** as `GET /api/recalls` (it re-fetches the full list then `find()`s the hit).

Result: the UI cannot show additional recall-table fields because they are never returned.

## Proposed approach (approved)

### Backend

Keep `GET /api/recalls` returning a **summary list** for the table view.

Update `GET /api/recalls/:id` to return a **full recall detail** payload, including:
- All recall informational columns from `public.recall`
- Image URL, preferring `public.recall_image.image_url` (first image) when present
- A stable identifier for the client to PATCH/DELETE (existing route uses `:id` as either recall_number or internal id)

#### DB query

Add a dedicated Supabase query helper, e.g. `dbFetchRecallDetail(supabase, idOrNumber)`:
- `from('recall')`
- `select('* , recall_image ( image_url )')`
- filter by either:
  - `recall_id` when `idOrNumber` looks numeric, OR
  - `recall_number` when not numeric
- return a single row

Map response to a JSON shape that includes all informational fields, and includes the image URL in a predictable place (e.g. top-level `image_url`).

#### API mock mode

Update the mock recall detail lookup (`getRecallById` / `getRecallByRecallId`) to return the same “full detail” shape so the UI behaves consistently in mock mode.

### Frontend (detail dialog)

Keep the existing UI controls and edit behavior:
- Assignee selector + “Save assignee”
- Priority selector + “Save priority”
- Existing editable inputs: Title, Product, Hazard, Image URL

Add a **read-only “Recall details”** section below the editable fields that shows all other recall informational fields returned by the API, grouped for readability.

#### Grouping and display rules

- **Header**: show `Recall <recall_number>` prominently.
- **Hide internal keys**: do not display `id`, `recall_id` (bigint PK), or other foreign keys.
- **Field labels**: human-friendly labels (Title-case).
- **Empty handling**:
  - Default: hide fields that are null/empty/whitespace.
  - (Optional later) add a “Show empty fields” toggle; not required now.

Suggested groups:

- **Dates**
  - Recall date (`recall_date`)
  - Last publish date (`last_publish_date`)

- **Links & contact**
  - Recall URL (`recall_url`) (render as link)
  - Consumer contact (`consumer_contact`)

- **Description**
  - Recall description (`recall_description`) (multi-line; allow scrolling)

- **Hazard & injury**
  - Hazard (`hazard`) (already editable, but also include in details if present)
  - Injury (`injury`)

- **Remedy**
  - Remedy (`remedy`)
  - Remedy option (`remedy_option`)

- **Company chain**
  - Manufacturer (`manufacturer`)
  - Manufacturer country (`manufacturer_country`)
  - Importer (`importer`)
  - Distributor (`distributor`)
  - Retailer (`retailer`)

- **Product metadata**
  - Product name (`product_name`) (already editable as “Product”, but include if present)
  - Product type (`product_type`)
  - UPC (`upc`)
  - Number of units (`number_of_units`)

## Data contract (detail payload)

The detail endpoint should return (at minimum) these fields when present:
- `recall_number`
- `recall_title`
- `product_name`
- `product_type`
- `hazard`
- `injury`
- `remedy`
- `remedy_option`
- `manufacturer`
- `manufacturer_country`
- `importer`
- `distributor`
- `retailer`
- `upc`
- `number_of_units`
- `recall_date`
- `last_publish_date`
- `recall_url`
- `consumer_contact`
- `recall_description`
- `image_url` (derived from `recall_image` when available)

The payload may include internal identifiers needed by the client for subsequent actions, but the UI must not display them.

## Error handling

- If `GET /api/recalls/:id` returns 404: show “Recall not found”.
- If the request fails: show a non-blocking error state in the modal (existing patterns in `RecallsPage.jsx`).

## Test plan

- Open a recall with many populated fields (CPSC-imported record):
  - Confirm all populated fields render in the “Recall details” section.
  - Confirm internal keys are not visible.
  - Confirm recall number shows in header.
- Open a recall with sparse fields:
  - Confirm empty fields are hidden.
- Verify edits still work:
  - Save priority
  - Save assignee
  - Edit title/product/hazard/image URL and save changes
- Verify behavior in API mock mode.

