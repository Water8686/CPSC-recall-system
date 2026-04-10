# BIT 4454 — grading, demos, and Canvas checklist

Student team notes aligned with [BIT 4454 Abrahams.md](../BIT%204454%20Abrahams.md) and the CPSC Option 2 narrative.

## Production smoke test (full CPSC chain)

Run on the **deployed** URL (not localhost) with accounts from [CREDENTIALS.md](../CREDENTIALS.md).

1. **Admin / Manager:** Import or verify recalls; open a recall; set **priority** and **assign investigator**.
2. **Investigator:** Open same recall → **Listings** → add listing manually, or run **discovery**, or **Search eBay (API)** and add a result; optionally **Annotate** a saved listing (requires [`supabase/20260410130000_listing_annotation.sql`](../supabase/20260410130000_listing_annotation.sql) applied).
3. **Investigator:** **Create Violation** from a listing (managers cannot POST violations).
4. **Investigator:** Open violation detail → log **contact** (if applicable) → add **response** → **adjudicate** when workflow allows.
5. **Dashboard / Analytics:** Confirm charts load (Google Charts for recall priority; Recharts for violation/listing breakdowns on the dashboard).

## Zapier / process automation (Process Designer)

Sprint 1 design calls for automation when a recall is set to **High** priority (e.g. email to investigator). **Implementation is owned by the Process Designer** (Zapier, Supabase webhook, or equivalent).

- **Developer action:** Expose stable, documented events (e.g. row insert/update on `prioritization` with `priority = High`) so Zapier can trigger.
- **Evidence for retro / video:** Screenshot or short clip of the Zap (or alternative) firing; include in sprint slides.

## Business intelligence / charts

- **Google Charts:** Recall priority bar + donut on [DashboardPage.jsx](../client/src/pages/DashboardPage.jsx) (`react-google-charts`).
- **Recharts:** Violations-by-type and listings-by-marketplace on the same dashboard.
- **Course wording:** The syllabus allows custom visualization; align slide wording with the **BI Analyst** role rubric on Canvas (if it requires naming Google Charts explicitly, cite both tools).

## Canvas deliverables (not in git)

Submit per the syllabus:

- Bi-weekly **standup** workbooks  
- **Sprint retros** (design + implementation) with **role rubrics** through the current sprint  
- **Sprint video demos** + updated **product backlog** + **PowerPoint** (client org, team photos/roles, MVP slide, yellow-highlighted ERD/DFD/CRUD for current sprint, deliverables, next MVP)  
- **Tech Tut** recording, deck, Word doc; **Tech Tut peer evaluations**  
- **Teammate peer review** workbook at project end  
- **Requirements / QA:** requirements doc, test cases, traceability; **automated monitoring** (e.g. Pingdom) if required by the RA rubric  

## Grader access

Before each submission: set the real **Railway public URL** in [CREDENTIALS.md](../CREDENTIALS.md) and confirm **manager, investigator, seller, and admin** logins work against production.
