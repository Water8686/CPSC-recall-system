# CPSC Recall System — 14 Comprehensiveness Items (Developer Role)

> **For: Any AI agent (Cursor, Claude Code, Cowork) picking up development work.**
> **Repo:** https://github.com/Water8686/CPSC-recall-system (private)
> **Live URL:** https://cpsc-recall-system-production.up.railway.app
> **Database:** Supabase (project: `chxhpblbckrzwmmoiuwr`)
> **Stack:** React frontend, Node.js + Express backend, Supabase (Postgres), Railway hosting
>
> **What this is:** The Tech Tut rubric (Enhanced Rubric, Developer role) requires 14 specific
> features to be demonstrated. Each one becomes a section in the tutorial Word doc. The app
> must actually work — this isn't mockups, it's a live system.
>
> **How to use this file:** Pick up items in order of dependency. Each item includes what
> needs to be built, which database tables are involved, and acceptance criteria. Mark items
> done as you go. Screenshot every Cursor interaction while building — those screenshots
> become tutorial content.

---

## Infrastructure Summary

| Layer | Tool | Details |
|-------|------|---------|
| IDE | Cursor IDE | The vendor being tutorialized |
| Frontend | React | SPA with React Router |
| Backend | Node.js + Express | REST API |
| Database | Supabase (Postgres) | Project ID: `chxhpblbckrzwmmoiuwr` |
| Auth | Supabase Auth or JWT | TBD based on current implementation |
| Hosting | Railway | https://cpsc-recall-system-production.up.railway.app |
| Domain | TBD | Needs custom domain configured on Railway |

## Database Tables (minimum required)

The rubric requires read + write to at least 4 tables. These are the core tables:

| Table | Purpose | Key Columns (suggested) |
|-------|---------|------------------------|
| `users` | Auth, roles, profiles | id, email, password_hash, role (manager/investigator/seller), name, avatar_url, approved, created_at |
| `recalls` | Recalled product records | id, product_name, description, hazard, remedy, recall_date, status, priority, image_url, created_by |
| `violations` | Violation cases | id, recall_id, seller_id, investigator_id, platform, listing_url, status, severity, created_at |
| `responses` | Seller responses to violations | id, violation_id, seller_id, response_text, evidence_url, status, created_at |

Additional tables if needed: `adjudications`, `listings`, `import_logs`

---

## The 14 Items

### Item 1: Working Input Forms (4+ forms updating live database)

**Rubric text:** "Create working input forms that update live back-end database"

**What to build:**
- **Recall Form** — CPSC Manager creates/edits recalled product records → writes to `recalls`
- **Violation Form** — Investigator creates a violation case → writes to `violations`
- **Response Form** — Seller submits a response to a violation → writes to `responses`
- **User Profile Form** — Any user edits their profile info → writes to `users`

**Acceptance criteria:**
- [ ] At least 4 distinct forms exist on separate pages
- [ ] Each form submits data to the Express API via POST/PUT
- [ ] API writes to the corresponding Supabase table
- [ ] Form shows success/error feedback after submission
- [ ] Data persists in Supabase (verify via Supabase dashboard or SQL query)

**Tables touched (write):** `recalls`, `violations`, `responses`, `users`

---

### Item 2: Tabular Search Results with Sorting & Filtering (4+ pages)

**Rubric text:** "Create working tabular search results pages that connect to live back-end database, including sorting and filtering"

**What to build:**
- **Recalls List** — Table of all recalled products, sortable by date/priority/status, filterable by status
- **Violations List** — Table of all violations, sortable by severity/date, filterable by status/investigator
- **Responses List** — Table of seller responses, sortable by date, filterable by status
- **Users List** (admin) — Table of all users, sortable by name/role, filterable by role/approval status

**Acceptance criteria:**
- [ ] At least 4 pages display data in HTML tables or data grids
- [ ] Each table fetches from the Express API → Supabase (GET)
- [ ] Column header click sorts ascending/descending
- [ ] At least one filter control (dropdown, search box, or toggle) per table
- [ ] Tables update live when filters/sorts change (no full page reload)

**Tables touched (read):** `recalls`, `violations`, `responses`, `users`

---

### Item 3: Textbox Inputs on Form Pages

**Rubric text:** "Implement working textbox inputs on input form page"

**What to build:**
- Standard text inputs on every form from Item 1
- Examples: product name, description, hazard details, listing URL, response text, user name

**Acceptance criteria:**
- [ ] Each form has at least 2 textbox inputs (single-line `<input type="text">` or multi-line `<textarea>`)
- [ ] Inputs have labels, placeholder text, and validation
- [ ] Required fields show validation errors if empty on submit

---

### Item 4: Drop-down Lists / Listboxes on Form Pages

**Rubric text:** "Implement working drop-down list box or regular listbox on input form page"

**What to build:**
- **Recall Form:** Status dropdown (Active, Resolved, Monitoring), Priority dropdown (High, Medium, Low)
- **Violation Form:** Severity dropdown, Platform dropdown (Amazon, eBay, Facebook Marketplace, etc.)
- **Response Form:** Response type dropdown (Compliance, Dispute, Partial Compliance)
- **User Mgmt:** Role dropdown (Manager, Investigator, Seller)

**Acceptance criteria:**
- [ ] At least 4 forms include `<select>` dropdowns or listbox components
- [ ] Dropdown values are either hardcoded enums or fetched from the database
- [ ] Selected value is included in the form submission payload

---

### Item 5: Buttons on Form Pages

**Rubric text:** "Implement working buttons on input form page"

**What to build:**
- Submit, Cancel, Reset buttons on all forms
- Action buttons on list pages: Edit, Delete, View Details
- Dashboard buttons: Quick actions (e.g., "New Recall", "New Violation")

**Acceptance criteria:**
- [ ] Every form has a Submit button that triggers form submission
- [ ] Cancel/Back buttons navigate away without saving
- [ ] Action buttons on tables trigger the correct operation (edit opens form, delete confirms then removes)
- [ ] Buttons have clear labels and appropriate styling (primary, secondary, danger)

---

### Item 6: Page Titles and Field Labels

**Rubric text:** "Implement appropriate page titles and input field labels on all pages"

**What to build:**
- `<title>` tag or `<h1>` heading on every page
- `<label>` elements for every form input, linked via `htmlFor`/`for`
- Breadcrumbs or page context indicators

**Acceptance criteria:**
- [ ] Every page has a visible title/heading
- [ ] Every form field has an associated `<label>`
- [ ] Browser tab title updates per page (React Helmet or document.title)
- [ ] Labels are descriptive (not just "Field 1")

---

### Item 7: Live Images on Pages

**Rubric text:** "Implement appropriate live images on all pages (product pictures, profile pictures, etc.)"

**What to build:**
- **Product images** on recall records (stored as URL in `recalls.image_url`)
- **Profile pictures / avatars** on user profiles and in the nav bar
- **CPSC logo** in the header/sidebar
- **Placeholder images** when no image is available

**Acceptance criteria:**
- [ ] Recall list and detail pages display product images
- [ ] User profiles show avatar images
- [ ] App header/sidebar includes the CPSC logo
- [ ] Images load from URLs (Supabase Storage or external links)
- [ ] Fallback/placeholder shown when image URL is null or broken

---

### Item 8: User Sign-Up and Role Approval

**Rubric text:** "Implement basic end-user sign-up (create account) and end-user role approval"

**What to build:**
- **Sign-up page** — New users register with email, password, name, and requested role
- **Approval workflow** — New accounts default to `approved = false`; a Manager can approve/deny from an admin panel
- **Pending state** — Unapproved users see a "waiting for approval" message after login

**Acceptance criteria:**
- [ ] `/signup` route exists with registration form
- [ ] New user record created in `users` table with `approved = false`
- [ ] Manager role can view pending users and approve/deny them
- [ ] Unapproved users cannot access main app pages
- [ ] Approved users can log in normally

---

### Item 9: Login, Forgot Password, Logout

**Rubric text:** "Implement basic system access controls: log-in, forgot-password, log-out"

**What to build:**
- **Login page** — Email + password authentication (already exists)
- **Forgot password** — Email-based password reset flow (Supabase Auth has this built in)
- **Logout** — Clears session/token and redirects to login

**Acceptance criteria:**
- [ ] Login page authenticates against Supabase Auth or custom JWT
- [ ] Invalid credentials show an error message
- [ ] "Forgot password" link sends a reset email
- [ ] Logout button in nav clears auth state and redirects to `/login`
- [ ] Protected routes redirect to login when not authenticated (already working based on scrape)

---

### Item 10: CSS Styling Consistent with Client Brand

**Rubric text:** "Use styles (raw CSS or point-and-click style selection) to make colors and format consistent with the client's brand"

**What to build:**
- CPSC brand colors: Navy blue (#003366 or similar), white, red for alerts/danger
- Consistent typography, spacing, and component styling across all pages
- CPSC logo in header
- Professional, government-agency aesthetic

**Acceptance criteria:**
- [ ] Consistent color palette across all pages (no default/unstyled pages)
- [ ] CSS variables or Tailwind config defines the brand palette
- [ ] Buttons, headers, nav, and tables all use brand colors
- [ ] App looks intentionally designed, not like a bootstrap/default template

---

### Item 11: Role-Based Views

**Rubric text:** "Implement user-type specific views: end-user can see only menu options applicable to their user role type and can only view and update records consistent with their user type privileges"

**What to build:**
- **CPSC Manager:** Sees all recalls, can prioritize, can approve users, full admin access
- **Investigator:** Sees assigned violations, can create violations, can adjudicate
- **Seller:** Sees only their own violations and can submit responses

**Acceptance criteria:**
- [ ] Navigation menu changes based on user role
- [ ] API endpoints check role before returning data (server-side enforcement)
- [ ] Manager sees admin panel; Investigator and Seller do not
- [ ] Seller cannot see other sellers' violations
- [ ] Attempting to access a restricted route shows "Access Denied" or redirects

---

### Item 12: Responsive Design (Desktop, Mobile, Tablet)

**Rubric text:** "Create an application that is compatible across multiple devices (desktop, mobile, tablet)"

**What to build:**
- Responsive layout using CSS media queries, flexbox/grid, or Tailwind responsive classes
- Mobile-friendly navigation (hamburger menu or collapsible sidebar)
- Tables that scroll horizontally or stack on small screens

**Acceptance criteria:**
- [ ] App is usable at 375px (mobile), 768px (tablet), and 1280px+ (desktop)
- [ ] Navigation collapses or adapts on mobile
- [ ] Forms are single-column on mobile, multi-column on desktop
- [ ] Tables are scrollable or responsive on small screens
- [ ] No horizontal overflow or broken layouts at any breakpoint

---

### Item 13: Publish Live with Custom Domain

**Rubric text:** "Publish the application live, with a custom domain name"

**What to build:**
- App is already deployed on Railway at `cpsc-recall-system-production.up.railway.app`
- Need to add a **custom domain** (e.g., `cpsc-recall.app` or similar)

**Acceptance criteria:**
- [ ] App is accessible at the Railway URL (already done ✅)
- [ ] Custom domain configured in Railway settings
- [ ] DNS records point to Railway
- [ ] App loads at the custom domain over HTTPS
- [ ] Custom domain documented in the tutorial with screenshots

**Options for custom domain:**
- Free: Use a subdomain from a free DNS service (e.g., Freenom alternatives, `is-a.dev`, etc.)
- Paid: Register a cheap `.app`, `.dev`, or `.xyz` domain (~$1-10/year)

---

### Item 14: Batch Import via CSV or API

**Rubric text:** "Implement batch import of data via CSV file or API"

**What to build:**
- **CSV upload page** — Upload a CSV of recalled products; parse and insert into `recalls` table
- OR **API import** — Endpoint that accepts JSON array and bulk-inserts records

**Acceptance criteria:**
- [ ] Upload form accepts a `.csv` file
- [ ] Backend parses CSV (using `papaparse`, `csv-parser`, or `fast-csv`)
- [ ] Parsed rows are validated and inserted into `recalls` (or another table)
- [ ] Success message shows count of imported records
- [ ] Error handling for malformed CSV, duplicate records, missing fields
- [ ] Provide a sample CSV file so tutorial readers can test

---

## Dependency Order (Suggested Build Sequence)

Build in this order to minimize rework:

1. **Item 9** — Login, Forgot Password, Logout (auth foundation — partially done)
2. **Item 8** — Sign-up + Role Approval (depends on auth)
3. **Item 11** — Role-Based Views (depends on users/roles)
4. **Item 1** — Input Forms (4+ forms, core CRUD)
5. **Item 3** — Textbox Inputs (built as part of forms)
6. **Item 4** — Dropdowns/Listboxes (built as part of forms)
7. **Item 5** — Buttons (built as part of forms)
8. **Item 6** — Page Titles and Labels (polish pass on all pages)
9. **Item 2** — Search Results Tables (4+ pages with sort/filter)
10. **Item 7** — Live Images (add images to existing pages)
11. **Item 10** — CSS Branding (styling pass across all pages)
12. **Item 12** — Responsive Design (responsive pass across all pages)
13. **Item 14** — CSV Batch Import (standalone feature)
14. **Item 13** — Custom Domain (final deployment step)

---

## Screenshot Reminders

Every time you build one of these items in Cursor, capture:
1. **The Cursor prompt** you typed (Agent, Inline Edit, or Tab completion)
2. **Cursor's response/diff** before accepting
3. **The resulting code** in the editor
4. **The running app** showing the feature working
5. **The Supabase dashboard** showing data was written (for form submissions)

Annotate screenshots with **red outlines** on click targets and **yellow highlights** on text to type.

---

## Notes for Agents

- The rubric is the source of truth — see `BIT_4454_Tech_Tut.doc` and `BIT_4454_Tech_Tut Enhanced Rubric.docx`
- This is a **tutorial about Cursor IDE**, not just a web app. Frame everything as "how to use Cursor to build X"
- The CPSC app is the **example case** — it demonstrates Cursor's capabilities
- Every item here must appear as a **subheading in the Word doc's Table of Contents**
- Don't over-engineer. Build clean, working features that are easy to screenshot and explain
