# Project requirements metrics — tracking

Use this file to track completion of the 14 technical requirements. Update the **Status** column as you go (e.g. Not started, In progress, Done). Add **Notes** for evidence, links, or blockers.

**Baseline audit:** 2026-03-28 — filled from a full-repo review of `client/`, `server/`, and `supabase/` (see Notes column).

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Create working input forms that update live back-end database | **Done** | Recalls prioritization form → `POST /api/prioritizations` (writes `prioritization`). Profile → `PATCH /api/auth/me`. Admin users → `PATCH /api/admin/users/:id`. Register → `POST /api/auth/register` → `app_users`. |
| 2 | Create working tabular search results pages that connect to live back-end database, including sorting and filtering | **Done** | `RecallsPage.jsx`: MUI `Table` fed by `GET /api/recalls` + `GET /api/prioritizations`; client-side search/filter (`recallIdFilter`, “prioritized only”), `TableSortLabel` + `handleSort` on columns. |
| 3 | Implement working textbox inputs on input form page | **Done** | Search/filter `TextField`, login/register/forgot/reset/profile/admin forms use `TextField` inputs. |
| 4 | Implement working drop-down list box or regular listbox on input form page | **Done** | Priority `Select` + recall `Autocomplete` on Recalls; role `Select` / controls on Admin users. |
| 5 | Implement working buttons on input form page | **Done** | Submit/save/sign-out patterns across Recalls, auth pages, Profile, Admin users. |
| 6 | Implement appropriate page titles and input field labels on all pages | **Done** | **`react-helmet-async`**: `DocumentTitle.jsx` sets `document.title` per route (`{page} · CPSC Monitor`). In-app headings + MUI labels unchanged; Profile has helper text on fields. |
| 7 | Implement appropriate live images on all pages (e.g. product pictures, end-user profile pictures, …) | **Done** | **Profile/Layout**: `avatar_url` on `app_users`. **Recalls**: `public.recall.image_url` + `RecallThumb` in table (lazy load, fallback icon). Seed/demo: `init_benscpsc.sql` + mock data sample URLs. **Existing DBs:** run [`supabase/add_recall_image_url.sql`](supabase/add_recall_image_url.sql) if the column is missing. |
| 8 | Implement basic end-user sign-up (create account) and end-user role approval | **Done** | `RegisterPage` + `POST /api/auth/register`; first user or bootstrap email → admin/approved; others pending. `AdminUsersPage` toggles **Approved** and role (`app_users`). |
| 9 | Implement basic system access controls: log-in, forgot-password, log-out | **Done** | Routes: `/login`, `/forgot-password`, `/reset-password`; `Layout` Sign Out; server `auth.js` + `password_reset_tokens` flow. |
| 10 | Use styles (raw CSS or point-and-click style selection) so colors and format match the client’s brand | **Done** | **`client/src/theme.js`** + **Source Sans 3** (`index.html`): refined primary/secondary, paper borders, `MuiAppBar` gradient, button typography. Final **sign-off vs UX/wireframes** still recommended. |
| 11 | Implement user-type specific views: end-users see only menu options for their role and can only view/update records allowed by their privileges | **Done** | `Layout.jsx` + `ProtectedRoute` + `allowedRoles`; `requireCpscManager` for manager APIs; **`POST /api/violations` + listing annotate** restricted to **investigator** (`requireInvestigatorOnly`); admin-only `/admin/users`. Sellers excluded from operational tabs. |
| 12 | Application compatible across multiple devices (desktop, mobile, tablet) | **Done** | **Layout**: responsive top bar + tab nav. **Recalls**: horizontal scroll on wide table, full-width search on small screens, form `maxWidth` breakpoints. Spot-check on real devices still useful. |
| 13 | Publish the application live with a custom domain name | **Done** | Team confirmed live + custom domain (per project). Deploy reference: [`DEPLOYMENT.md`](DEPLOYMENT.md). |
| 14 | Implement batch import of data via CSV file or API | **Done** | **Admin → Batch import** (`/admin/import`): CSV upload/URL (`server/src/lib/csvRecallImport.js`) and **official CPSC JSON API** (`POST /api/admin/recalls/import-cpsc`, `server/src/lib/cpscApiImport.js`). Upserts `public.recall`. Template: `client/public/recalls-import-template.csv`. |

---

## Additional instructions (from requirements doc)

- Developers’ screens should be consistent with the Requirements document and with UX designs.
- Developers must update **at least 4** different back-end database tables, and read data from **at least 4** different back-end database tables (e.g. for search / filter).

| Criterion | Status | Notes |
|-----------|--------|-------|
| Screens match Requirements + UX designs | **Done** *(verify with UX lead)* | **Implemented flows:** `/login`–`/dashboard`; `/recalls`, `/recalls/:id` (triage, listings, discovery, manual add, eBay search, violations tab); `/violations`, `/violations/:id` (contacts, responses, adjudication); `/responses`; `/analytics`; `/settings` (profile, batch import). **Wireframes / Make:** [`Wireframes for Recall Management System (Community)/`](Wireframes%20for%20Recall%20Management%20System%20(Community)/). **Residual:** periodic UX diff review when wireframes change. |
| ≥4 tables written (updates) | **Met** | Examples: `app_users`, `prioritization`, `user` (upsert), `password_reset_tokens` (insert/delete as part of reset). |
| ≥4 tables read (e.g. search/filter) | **Met** | Examples: `recall`, `prioritization`, `user`, `app_users` (+ `password_reset_tokens` in reset flow). |

---

## Quick checklist (duplicate of metrics 1–14)

- [x] 1 — Input forms → live DB
- [x] 2 — Tabular search → live DB, sort & filter
- [x] 3 — Textboxes on input form
- [x] 4 — Dropdown or listbox on input form
- [x] 5 — Buttons on input form
- [x] 6 — Page titles & field labels
- [x] 7 — Live images on pages
- [x] 8 — Sign-up & role approval
- [x] 9 — Login, forgot-password, logout
- [x] 10 — Brand-consistent styling *(UX sign-off optional)*
- [x] 11 — Role-based menus & record access
- [x] 12 — Responsive (desktop / mobile / tablet)
- [x] 13 — Live deploy + custom domain
- [x] 14 — Batch import (CSV or API)
