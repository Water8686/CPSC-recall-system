# Sprint 1 — Prioritize Recall

## Sprint Objective (MVP)

Implement functionality to allow CPSC Managers to log in, view recall records, prioritize them by risk level, and assign them to investigators for review. This sprint delivers a complete, standalone mini-project: a working input form connected to a live database, visual reports populated with realistic data, and a process automation trigger.

## User Story

> As a CPSC Manager, I need to prioritize recalls and assign them so that high-risk recalls are investigated first.

---

## OKRs

| ID | Metric | Baseline | Target | Unit | Type |
|----|--------|----------|--------|------|------|
| 1.1 | Record recall records | 0 | ≥100 | Recall records per sprint | Quantity of data input |
| 1.2 | Classify recalls by priority | 0% | ≥85% | % of records classified | Content of data input |

Per the roadmap checklist, every sprint must have at least two OKRs: one measuring the **quantity** of data input and one measuring the **content/quality** of data input. OKR 1.1 covers quantity, OKR 1.2 covers content.

---

## Real-World Context: What CPSC Actually Does

The U.S. Consumer Product Safety Commission (CPSC) is an independent federal regulatory agency responsible for the safety of consumer products. Their Office of Compliance & Field Operations employs Internet Investigative Analysts (investigators) who:

1. Monitor online marketplaces (eBay, Craigslist, Mercado, etc.) for recalled products being sold illegally
2. Send formal violation letters to sellers informing them of the recall and federal law
3. Track whether sellers comply (remove listing, contest, ignore)

Under federal law, it is illegal to sell or re-sell a recalled consumer product. The system we're building digitizes this enforcement pipeline. Sprint 1 focuses on step zero: deciding which recalls to investigate first.

The CPSC Recall API provides the source data: `http://www.saferproducts.gov/RestWebServices/Recall?format=xml` (thousands of recall records going back to the 1970s). The Data Manager should use this or the abbreviated dataset at `http://www.saferproducts.gov/SPDB.zip` to populate the Recall table.

**Sequence of events across the full system (from syllabus):**
Recall → Prioritization → Listing → Violation → Response → Adjudication

Each event has its own actor (subject) and its own datetime stamp. Sprint 1 covers Recall and Prioritization.

---

## Input Process: Prioritize Recall

**Purpose:** Allows a CPSC Manager to assign a priority level to recalls.

**Requirements (from Requirements Analyst spec):**

- Must capture Recall ID
- Must capture priority level (High / Medium / Low)
- Must store date/time of prioritization
- Must validate that Recall ID exists in the Recall table
- Only users with `manager` role can access this process
- Must create or update a record in the Prioritization table (D2)

**What this means for the developer:**

- Build a form or inline table control that lets the manager select a recall and assign a priority
- The form must write to both the Prioritization table (new record) and potentially update the Recall table's status
- Validate on submit: if the Recall ID doesn't exist, show an error
- The prioritization datetime should be captured automatically (server-side timestamp, not user-entered)
- Role-based access: check `user_type === 'manager'` before allowing access to the page

---

## Data Flow (Sprint 1 DFD)

### Input Side (left)

CPSC Manager → **Prioritize Recall** process → writes to **D1 Recall** and **D2 Prioritization**

### Output Side (right)

- **View prioritized recall list** — CPSC Manager reads from D2 Prioritization
- **View bar chart: recalls by priority** — reads from D1 Recall + D2 Prioritization → answers OKR 1.1
- **View pie chart: % of recalls by priority** — reads from D2 Prioritization → answers OKR 1.2
- **Automation: Receive email to investigate high priority recalls** — Investigator receives notification triggered from D2 Prioritization via Zapier

Per the DFD annotation standards: stakeholders appear as stick figures on both sides (input left, output right). The CPSC Manager inputs data on the left and views reports on the right. The Investigator only appears on the right side for Sprint 1 (receiving the automation email).

---

## Data Tables (Sprint 1)

**Note:** The Data Manager (Reed) owns the schema. These specs are what the developer needs to know to build against.

### D1 — Recall

Core recall records. Source of truth for what recalls exist. Expected to be populated with ≥100 records from the CPSC Recall API or the SPDB dataset.

Key fields (from ERD): recall_id (PK), product_name, manufacturer, recall_date, hazard_description, remedy, url, etc.

### D2 — Prioritization

Stores the priority assignment for each recall.

Key fields (from ERD):
- prioritization_id (PK)
- recall_id (FK → Recall)
- user_id (FK → User, must be a manager)
- priority_level (enum: High / Medium / Low)
- effective_start_date
- effective_end_date
- created_at (datetime of prioritization)

**ERD design note:** The team combined CPSC Manager and Investigator into a single **User** table with a `user_type` field. The Prioritization table references User via user_id. The effective start/end dates allow priority to change over time (a recall can be re-prioritized).

### User Table

- user_id (PK)
- email
- user_type (enum: manager / investigator / seller)
- first_name, last_name
- Linked to Supabase Auth via auth.users

---

## Data Visualizations (Sprint 1)

**Tool:** Google Charts (per roadmap). These must be accessible from the app's menu after login — no separate login required (this is a rubric requirement).

### Chart 1: Recalls by Priority (Bar Chart)

- **Answers OKR 1.1** — Record recall records
- **Data:** Count of recalls grouped by priority level (High / Medium / Low)
- **Management actions the grader expects to see documented:**
  - Allocate resources proportionally based on violation volume by priority level
  - Set reduction targets for highest-volume categories
  - Review internal processes to prevent recurring violations

### Chart 2: Percentage of Recalls by Priority (Pie Chart)

- **Answers OKR 1.2** — Classify recalls by priority
- **Data:** Percentage breakdown of recalls by priority level
- **Management actions:**
  - Identify which priority levels make up the largest share to focus regulatory attention
  - Allocate resources toward higher-percentage categories
  - Evaluate whether priority classifications align with actual risk distribution

**Important:** Reports must be populated with significant volumes of realistic data and must be accurate. When new data is input through the prioritization form, the reports must reflect the updated data.

---

## Automation (Sprint 1)

**Tool:** Zapier (or alternative — see Process Designer's alternatives doc)

**Trigger:** When a recall is prioritized as **High** in the Prioritization table
**Action:** Send an email notification to the assigned Investigator prompting them to begin review

This is the Process Designer's (Michelle's) responsibility to implement, but the developer needs to ensure the database writes are structured in a way that Zapier can detect them (e.g., via Supabase webhook, or polling a view/table).

---

## Web Developer Rubric (Grading Criteria)

This is exactly how the grader will evaluate your work. Total: **10 points**.

### 1. Provide Access Credentials

**Meets Expectation:** Provide (in a text document) the public URL for the system AND sample usernames and passwords for ALL user role types, so the grader can test the system.

**Needs Work:** Did not supply URL and/or did not provide credentials for all user role types.

**What to do:** Create a `CREDENTIALS.md` or text file with:
- Production URL (must be publicly accessible, NOT localhost)
- Manager login (email + password)
- Investigator login (email + password)
- Seller login (email + password)
- Include a disclaimer: "This is a student prototype project, not endorsed by CPSC"

### 2. Implement All Mockup Pages

**Meets Expectation:** Implemented most or all important web pages (particularly input interfaces) defined in the UX mockups. Acceptable tools include raw code (PHP, Python, Java), frameworks, no-code platforms, or AI-supported vibe coding (Cursor, Windsurf, Lovable, Bolt, Replit).

**Needs Work:** Some or all mockups from the web interface prototypes were not implemented.

**What to do:** The UX Lead (Soumya) will provide storyboard mockups. Build the pages to match those designs as closely as possible. For Sprint 1, this means at minimum: login page, recall list/table page, and prioritization form.

### 3. Integrate BI Reports Seamlessly

**Meets Expectation:** Integrated with the BI Analyst's visual reporting system so users can easily click a menu option to seamlessly view visual reports, preferably with no need to log in separately.

**Needs Work:** Reports not accessible from menu after login, or additional login required.

**What to do:** The BI Analyst (Parker) will build Google Charts reports. You need to embed them or link to them from the app's sidebar/dashboard so a logged-in user can navigate to reports without re-authenticating. This is a common failure point — make sure the link is in the nav, not buried.

### 4. Connect to Live Database

**Meets Expectation:** Web pages connect to a back-end SQL or NoSQL database. When new data is input, outputs reflect the new data.

**Needs Work:** Pages do not connect to a back-end database.

**What to do:** All forms must read from and write to the Supabase PostgreSQL database. The recall list page must pull live data. When a manager prioritizes a recall, the charts should update to reflect the change.

### 5. All Features Work

**Meets Expectation:** Features (buttons, clicks, navigation) generally work as expected.

**Needs Work:** Some or all features do not work correctly.

**What to do:** Test every button, link, form submit, and navigation path. Handle edge cases (empty fields, duplicate submissions, unauthorized access).

### 6. Professional Appearance

**Meets Expectation:** Web pages are professional and attractive.

**Needs Work:** Pages are sloppy or unattractive.

**What to do:** Use Material UI consistently. Follow the UX Lead's design language. Consistent spacing, readable fonts, proper alignment. Include the system title "CPSC Recall Violation Monitoring System" on every page.

### 7. Match Requirements and Process Models

**Meets Expectation:** Web pages directly implement the specified requirements and processes (from the Requirements Analyst's spec and the Process Designer's DFD/CRUD).

**Needs Work:** Pages do not correspond with the requirements spec or process models.

**What to do:** Cross-reference your pages against the requirements doc and the CRUD matrix. Every input process in the DFD that's highlighted for Sprint 1 should have a corresponding working page.

### 8. Record Video Demo (-4 deduction if missing)

**Meets Expectation:** Recorded an MP4 video demo showing all web pages in action.

**Needs Work:** Did not record a comprehensive video demo. **This is a -4 deduction.**

**What to do:** Use a screen recorder (OBS, Screencast-O-Matic, macOS screen recording). Walk through a complete scenario: log in as manager → view recall list → prioritize a recall → show the charts updating → show the Zapier email firing. Demo must run on the deployed (not localhost) version.

---

## Sprint Presentation Checklist (Developer Items)

From the Sprint Checklist, these are the developer's required items for the sprint presentation:

- [ ] **Live demo / video recording** of all functionality implemented — the full MVP showing the working User Story
- [ ] **Public URL + credentials** for all relevant user roles provided to grader
- [ ] Functionality consistent with UX mockups, requirements spec, and process models

Other team members' checklist items that affect the developer:

- PM presents OKRs and product backlog
- Data Manager presents ERD with Sprint 1 tables highlighted in yellow, plus sample data
- Process Designer presents CRUD matrix and DFD with Sprint 1 highlighted in yellow, plus Zapier demo
- UX Lead presents low- and high-fidelity mockups for Sprint 1 interfaces
- BI Analyst presents the two charts with management action examples
- Requirements Analyst presents test cases (pass/fail for expected and unexpected scenarios) and bug list

---

## Hosting and Deployment Requirements

From the syllabus:

- Must be deployed at a **publicly accessible URL** (not localhost)
- Must have **login features** so the system is not publicly accessible to everyone
- Must include a **disclaimer** that this is a student prototype, not endorsed by CPSC (hosting providers may flag your site as phishing without this)
- Hosting should remain active until at least **3 weeks after the last class** of the semester
- Typical cost: $4-$6/month, split between team members
- Spend limit: no more than $50 per student over the semester

**Options for your stack (React + Node + Supabase):**
- Vercel (free tier) for the React frontend
- Railway or Render (free/cheap tier) for the Express backend
- Supabase (free tier) for database + auth
- Total cost: potentially $0 if everything fits in free tiers

---

## Recall Data Sources

The CPSC provides recall data through:

1. **Recall REST API:** `http://www.cpsc.gov/en/Recalls/CPSC-Recalls-Application-Program-Interface-API-Information/`
2. **Full XML export:** `http://www.saferproducts.gov/RestWebServices/Recall?format=xml` (large file, 10+ minute load, includes recalls back to 1976)
3. **Abbreviated dataset:** `http://www.saferproducts.gov/SPDB.zip` (6,843 recalls back to 1972, fewer attributes per record)

**Known data quality issues** (from past project teams):
- JSON/XML structure is messy — most fields are typed as strings when they should be dates or integers
- Manufacturer names are inconsistent (e.g., "Bassettbaby" vs "Basset furniture company" vs "Bassett Furniture")
- Some products are misclassified (e.g., a ride-on toy classified as a crib)
- Many products are missing product type — non-manufacturer names appear in the manufacturer field
- Publish dates are much later than actual recall dates
- Some items have 10-20+ different manufacturer entries

These are the Data Manager's problem to clean, but the developer should be aware that the data won't be perfectly tidy.

---

## Cross-Role Dependencies

| Dependency | From | To (Developer) | Status |
|-----------|------|----------------|--------|
| Database schema (User, Recall, Prioritization tables) | Data Manager (Reed) | Need this before building forms | Waiting |
| ≥100 recall records loaded | Data Manager (Reed) | Need this for realistic demos and charts | Waiting |
| UX mockups for Sprint 1 screens | UX Lead (Soumya) | Need this to match page designs | Waiting |
| Google Charts reports | BI Analyst (Parker) | Need embed URL/component to integrate | Waiting |
| Zapier automation config | Process Designer (Michelle) | Need to coordinate DB trigger mechanism | Waiting |
| Requirements spec + test cases | Requirements Analyst (Gabriella) | Need this to validate feature completeness | Waiting |
| Sample user accounts for each role | Data Manager / Developer | Create in Supabase Auth | TODO |

---

## Implementation Checklist

### Setup
- [ ] Supabase project created, `.env` configured with URL + keys
- [ ] App deployed to public URL (Vercel + Railway/Render or similar)
- [ ] Disclaimer banner added: "Student prototype — not endorsed by CPSC"
- [ ] Sample user accounts created for all 3 roles (manager, investigator, seller)
- [ ] `CREDENTIALS.md` written with URL + all login credentials

### Core Features
- [ ] Login page wired to Supabase Auth — working email/password sign-in
- [ ] Role-based access control: only `manager` can access Prioritize Recall page
- [ ] Recall list page — fetches and displays recall records from D1 (Recall table)
- [ ] Prioritization form — select recall, assign High/Medium/Low, writes to D2
- [ ] Validation: reject if Recall ID doesn't exist, reject empty fields
- [ ] Datetime of prioritization captured automatically on submit
- [ ] Prioritization history visible (effective start/end dates)

### Reports Integration
- [ ] Dashboard page with bar chart: recalls by priority (Google Charts)
- [ ] Dashboard page with pie chart: % of recalls by priority (Google Charts)
- [ ] Charts accessible from sidebar nav — no separate login required
- [ ] Charts update when new prioritization data is entered

### Process Automation
- [ ] Database writes structured to support Zapier trigger (webhook or polling)
- [ ] Coordinate with Michelle on Zapier zap: High priority → email to investigator

### Data
- [ ] ≥100 recall records loaded in Recall table (coordinate with Reed)
- [ ] ≥85% of records classified by priority to meet OKR 1.2

### Quality & Delivery
- [ ] All buttons, links, and form submissions tested and working
- [ ] Pages match UX mockups from Soumya as closely as possible
- [ ] Pages implement all requirements from Gabriella's spec
- [ ] Professional, attractive appearance (consistent MUI styling)
- [ ] Video demo recorded: full walkthrough of login → prioritize → charts → automation
- [ ] Video demo uses the deployed URL, not localhost