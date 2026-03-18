# Sprint 1 — Prioritize Recall

## Objective

Implement functionality to allow CPSC Managers to log in, prioritize recalls, and assign them to investigators for review and action.

---

## User Story

> As a CPSC Manager, I need to prioritize recalls and assign them so that high-risk recalls are investigated first.

---

## OKRs

| ID | Metric | Baseline | Target | Unit |
|----|--------|----------|--------|------|
| 1.1 | Record recall records | 0 | ≥100 | Recall records per sprint |
| 1.2 | Classify recalls by priority | 0% | ≥85% | % of records classified |

---

## Input Process: Prioritize Recall

**Purpose:** Allows a CPSC Manager to assign a priority level to recalls.

**Requirements:**

- Must capture Recall ID
- Must capture priority level (High / Medium / Low)
- Must store date/time of prioritization
- Must validate that Recall ID exists
- Only CPSC Manager role can access this process
- Must create or update a record in the Prioritization table (D2)

---

## Data Flow (Sprint 1 DFD)

**Stakeholders:** CPSC Manager, Investigator

**Input side (left):**

- CPSC Manager → **Prioritize Recall** (input process)
  - Writes to **D1 Recall** and **D2 Prioritization**

**Output side (right):**

- CPSC Manager → **View prioritized recall list**
  - Reads from D2 Prioritization
- CPSC Manager → **View bar chart: recalls by priority**
  - Reads from D1 Recall + D2 Prioritization
- CPSC Manager → **View pie chart: % of recalls by priority**
  - Reads from D2 Prioritization
- Investigator → **Automation: Receive email to investigate high priority recalls**
  - Triggered from D2 Prioritization (via Zapier)

---

## Data Tables (Sprint 1)

### D1 — Recall

The recall table stores the core recall records imported from CPSC data. This table is the source of truth for what recalls exist.

### D2 — Prioritization

Stores the priority assignment for each recall. Includes:

- Link to Recall ID
- Priority level (High / Medium / Low)
- Date/time of prioritization
- Link to the User (Manager) who set the priority
- Effective start and end dates (allows priority to change over time)

**Note from ERD:** CPSC Manager and Investigator are combined into a single **User** table with a `user_type` field. User type is referenced in Prioritization, Violation, Contact, Response, and Adjudication tables.

---

## Data Visualizations (Sprint 1)

These are the reports/charts the CPSC Manager needs to see. The roadmap specifies **Google Charts** as the visualization tool.

### 1. Recalls by Priority (Bar Chart)

- **OKR:** 1.1 — Record recall records
- **Chart type:** Bar chart
- **Data:** Count of recalls grouped by priority level
- **Management actions:**
  - Allocate resources proportionally based on violation volume by priority level
  - Set reduction targets for highest-volume categories
  - Review internal processes to prevent recurring violations

### 2. Percentage of Recalls by Priority (Pie Chart)

- **OKR:** 1.2 — Classify recalls by priority
- **Chart type:** Pie chart
- **Data:** Percentage breakdown of recalls by priority level
- **Management actions:**
  - Identify which priority levels make up the largest share to focus regulatory attention
  - Allocate resources toward higher-percentage categories
  - Evaluate whether priority classifications align with actual risk distribution

---

## Automation (Sprint 1)

**Tool:** Zapier

- When a recall is prioritized as **High**, automatically send an email notification to the assigned Investigator prompting them to begin review.

---

## Storyboard Reference

The CPSC Manager storyboard (Slide 15 in the roadmap) shows:

- A login screen for the system
- A dashboard view with the recall list and priority controls
- The system title: **CPSC Recall Violation Monitoring System**

---

## Tech Stack (Developer Spec)

| Layer | Technology |
|-------|-----------|
| Frontend | React + Material UI |
| Backend / API | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Hosting | Cloud deployment (AWS, Heroku, or DigitalOcean) |

---

## Implementation Checklist

### Implemented (Mock Mode)

- [x] Mock mode — app runs without Supabase (`VITE_MOCK_MODE=true`)
- [x] Login page — mock auth when Supabase unavailable
- [x] Role-based access: only `manager` user_type can access Prioritize Recall
- [x] Recalls list page — fetch and display recall records (mock D1)
- [x] Prioritization form — assign High/Medium/Low to a recall, write to mock D2
- [x] Validation: reject prioritization if Recall ID doesn't exist
- [x] Store date/time of each prioritization action
- [x] Dashboard: bar chart — recalls by priority (Google Charts)
- [x] Dashboard: pie chart — % of recalls by priority (Google Charts)

### Deferred (Requires Supabase / Data Manager / UX)

- [ ] Supabase project created and `.env` configured
- [ ] Database schema set up by Data Manager (User, Recall, Prioritization tables)
- [ ] Login page wired to real Supabase Auth (replace mock)
- [ ] API routes connected to Supabase (replace mock data)
- [ ] Zapier automation: email investigator on High priority assignment
- [ ] ≥100 recall records loaded (sample data from Data Manager)
- [ ] ≥85% of records classified by priority
- [ ] Wireframe-driven layout tweaks (when UX lead provides designs)
