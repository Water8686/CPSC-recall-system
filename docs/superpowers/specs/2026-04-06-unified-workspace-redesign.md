# Unified Workspace Redesign — Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Goal:** Consolidate the scattered multi-page UI into a single workspace with horizontal tab navigation, removing the sidebar entirely. Create a streamlined investigator workflow: find a recall → discover listings → file a violation → track seller response — all from one place.

---

## 1. Layout & Navigation

### Top Bar (sticky)
- **Left:** App title "CPSC Recall System"
- **Right:** User name + role badge, gear icon button → navigates to `/settings`

### Tab Bar (below top bar)
- Four fixed tabs for all roles: **Dashboard** | **Recalls** | **Violations** | **Responses**
- Active tab indicated by bottom border in primary blue (#0D47A1)
- Routes: `/dashboard`, `/recalls`, `/violations`, `/responses`
- No tabs are hidden based on role — actions within each tab are role-gated

### What Gets Removed
- The entire 256px sidebar (`Layout.jsx` sidebar + mobile drawer)
- Sidebar nav items for Adjudications, Investigators (not ready)
- Analytics page remains accessible as a link from Dashboard, not its own tab

---

## 2. Recalls Tab — List View

### RecallsPage Overhaul

**Toolbar:**
- Left: "Active Recalls" title with count badge, e.g., "(142)"
- Right: Search input (product name, recall ID, manufacturer) + Priority dropdown filter (All / High / Medium / Low)

**Data Table:**
| Column | Content | Notes |
|--------|---------|-------|
| Product | Name + recall ID + manufacturer as subtitle | Primary scan column |
| Hazard | Hazard description | Red text (#C62828) |
| Date | Recall date | Formatted date |
| Priority | Pill chip (High=red, Medium=orange, Low=green) | Color-coded |
| Assigned To | Investigator name (manager view only) | Manager-only column |

**Behavior:**
- Rows are clickable → navigate to `/recalls/:id` (RecallDetailPage)
- Sortable columns via header click
- Managers see: bulk-select checkboxes, "Edit Priority" action
- No more modal detail view — all `detailOpen`/`detailDraft`/`detailSaving` state is removed

### RecallDetailPage

Keeps existing structure:
- Header card with recall metadata (product, manufacturer, units, date)
- Three tabs: **Details** | **Listings** | **Violations**
- Back button → `/recalls`

**Listings tab:**
- Search eBay, Search Marketplaces, Add Manually buttons (existing functionality)
- Each listing card has a **"Create Violation"** button → opens modal dialog (see below)

**Violations tab:**
- Lists violations for this recall with type, date, investigator, status chip

### Create Violation Modal

Triggered from listing card "Create Violation" button on RecallDetailPage.

**Modal contents:**
- **Read-only context:** Listing title, marketplace, seller name, investigator name (auto-populated)
- **Violation Type:** Dropdown with 6 enum values
- **Date of Violation:** Date picker, rejects future dates
- **Notes:** Optional multiline textarea
- **Actions:** Cancel, Submit

**On submit:**
- POST to `/api/violations` (upsert by listing_id)
- Close modal, show success snackbar
- Refresh violation count on the Violations tab

---

## 3. Violations Tab

### ViolationsPage Redesign

**Toolbar:**
- Left: "Violations" title with count
- Right: Search input + status filter dropdown

**Status filter pills:** All | Open | Notice Sent | Response Received | Closed

**Data Table:**
| Column | Content |
|--------|---------|
| Listing | Title + marketplace badge as subtitle |
| Violation Type | From 6 enum values |
| Date | Date of violation |
| Investigator | Name |
| Status | Colored chip (Open=blue, Notice Sent=orange, Response Received=green, Closed=gray) |

**Row click → expandable inline detail panel:**
- Listing URL (clickable)
- Seller info
- Investigator notes
- Action buttons: **Mark Notice Sent** (updates status), **View Recall** (navigates to parent recall)

**Role gating:**
- Investigators: can update status (Mark Notice Sent, Mark Response Received, Close)
- Managers: read-only view, can filter and review
- Admins: full access

---

## 4. Responses Tab

### Purpose
Track seller notification lifecycle — status only, not delivery.

**Toolbar:**
- Left: "Responses" title with count
- Right: Search input + status filter

**Status filters:** All | Awaiting Response | Response Received | Closed

**Data Table:**
| Column | Content |
|--------|---------|
| Listing | Title + marketplace badge |
| Seller | Name/email if available |
| Notice Sent | Date when status changed to "Notice Sent" |
| Response Date | Date when response recorded, or "—" |
| Status | Chip |
| Days Elapsed | Calculated days since notice sent |

**Row click → expandable inline detail:**
- Violation summary (type, date)
- Recall reference (link to recall detail)
- Notes field — investigator logs seller response content
- Action buttons: **Mark Response Received** (date picker + notes), **Close**

**Data source:**
- No new database table — reads from `violation` table filtered to status ≥ "Notice Sent"
- Status updates here update the same violation record shown in Violations tab

---

## 5. Dashboard Tab

### Keeps Existing Functionality

**KPI Cards (2×2 grid desktop, stacked mobile):**
- Open Violations (count)
- Active Listings (count)
- Prioritized Recalls (count)
- Pending Responses (count — violations with "Notice Sent" status without response)

**Charts:**
- Violations by Type (horizontal bar, recharts)
- Listings by Marketplace (vertical bar, recharts)

**Analytics link:**
- "View Full Analytics" button below charts → navigates to `/analytics` (Looker Studio embed)
- Analytics is a secondary page, not a tab

**No structural changes** — main change is living under tab bar instead of sidebar.

---

## 6. Settings Page

### Route: `/settings` (via gear icon)

**Layout:** Back arrow + "Settings" title, horizontal tabs below.

**Tab 1 — Profile (all users):**
- Edit full name, email, upload/change avatar
- Same functionality as current ProfilePage

**Tab 2 — Users & Roles (admin-only):**
- User table: name, email, role, status
- Actions: create user, edit role, deactivate
- Hidden from non-admin users

**Tab 3 — Batch Import (admin-only):**
- CSV upload for recalls, preview, bulk insert
- Hidden from non-admin users

---

## 7. Pages Removed / Consolidated

| Current Page | Destination |
|-------------|-------------|
| Sidebar (`Layout.jsx`) | Removed — replaced by top bar + tab bar |
| ProfilePage (`/profile`) | Settings Tab 1 |
| AdminUsersPage (`/admin/users`) | Settings Tab 2 |
| AdminImportPage (`/admin/import`) | Settings Tab 3 |
| CreateViolationPage (`/violations/new`) | Modal dialog on RecallDetailPage |
| InvestigatorsPage (`/investigators`) | Removed — team info in Users & Roles |
| AdjudicationsPage (`/adjudications`) | Removed — placeholder, not built |
| ResponsesPage (`/responses`) | Rebuilt as Responses tab (violation status tracker) |

---

## 8. Technical Notes

### UI Framework
- Continue using MUI for content pages (tables, forms, modals)
- Tab bar component: MUI Tabs or custom Tailwind — match existing top bar styling
- No new dependencies required

### Routing Changes
| Old Route | New Route | Notes |
|-----------|-----------|-------|
| `/` | `/dashboard` | Redirect |
| `/dashboard` | `/dashboard` | No change |
| `/recalls` | `/recalls` | Overhaul to data table |
| `/recalls/:id` | `/recalls/:id` | Keep, add violation modal |
| `/violations` | `/violations` | Redesign to data table + expandable rows |
| `/violations/new` | _(removed)_ | Replaced by modal |
| `/responses` | `/responses` | Rebuilt |
| `/profile` | `/settings` | Consolidated |
| `/admin/users` | `/settings` | Consolidated |
| `/admin/import` | `/settings` | Consolidated |
| `/investigators` | _(removed)_ | |
| `/adjudications` | _(removed)_ | |
| `/analytics` | `/analytics` | Keep, linked from Dashboard |

### Database
- One minor schema addition: `notice_sent_at TIMESTAMPTZ` column on the `violation` table — set when status changes to "Notice Sent". Required for the Responses tab's "Notice Sent" date column and "Days Elapsed" calculation.
- Responses tab reads from `violation` table filtered to status ≥ "Notice Sent"
- "Days Elapsed" is computed client-side: `today - notice_sent_at`

### Role Gating
- Same tabs for all roles, action-level gating within each tab
- Managers: priority setting, assignment, read-only violations
- Investigators: violation filing, status updates
- Admins: everything + Settings tabs 2 & 3
