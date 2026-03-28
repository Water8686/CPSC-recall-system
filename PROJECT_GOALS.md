# Project goals — CPSC Recall Violation Monitoring System

This document summarizes the **overarching purpose** and **intended end-to-end workflow** for this course project (BIT 4454). Use it as the north star when prioritizing features, UX, and data modeling. Detailed rubric-style metrics live in [`REQUIREMENTS_METRICS.md`](REQUIREMENTS_METRICS.md).

---

## Overarching goal

Help the **U.S. Consumer Product Safety Commission (CPSC)** keep American consumers safe by building a **web- or mobile-app-based system** that supports finding and addressing **recalled products that are illegally sold online** (e.g. on marketplaces such as eBay or Craigslist).

The system should align with how the class frames **incident management**: from identifying which recalls matter most, through discovering suspect listings, documenting violations, communicating with sellers/marketplaces, capturing responses, and closing the loop with clear status and reasons.

---

## Core functional areas (phases)

The solution should demonstrate progress across these phases (not all need to be fully built in every sprint, but the **architecture and data model** should eventually support them):

1. **Recall prioritization** — Allow a CPSC Manager to identify and shortlist **high-priority** recalls (e.g. a small set such as 3–5) for enforcement attention.
2. **Listing discovery** — Surface **third-party marketplace listings** that may match prioritized recalls. Acceptable approaches called out in the assignment include **automated APIs** (e.g. marketplace APIs), **web scraping**, or **manual search/input** (e.g. find listings via search, then enter or link them). Matching can start with **simple text matching** (e.g. manufacturer name, model number).
3. **Annotation** — Mark listings as **true matches** vs **false positives**, with **commentary** explaining why something is a violation or a false positive.
4. **Communication** — Support contacting the **seller** and/or **marketplace** regarding an illegal listing (workflow may be tracked in-system even if sending email is simulated).
5. **Seller / marketplace response** — Capture responses to violation notices.
6. **Incident coding / adjudication** — Record **status** (e.g. resolved vs unresolved) and **reason** (e.g. listing removed, listing edited, confirmed different model/batch).

---

## Event sequence & data model (ERD)

The course describes a **sequence of events** that should be reflected in the **entity–relationship design**:

**Recall** (CPSC announcement) → **Prioritization** (CPSC Manager) → **Listing** (seller/marketplace listing) → **Violation** (Investigator) → **Response** (Seller) → **Adjudication** (Investigator).

**Modeling rule:** Each event (verb) should carry its own **actor** (e.g. manager, investigator, seller identifiers as appropriate) and a **date–time stamp**, so the history of the pipeline is auditable.

---

## Official sources for CPSC recall data

The assignment points to these options for loading **recall** data (distinct from marketplace listing discovery):

| Source | Role |
|--------|------|
| **CPSC Recalls API information** | Official documentation and usage context: [CPSC Recalls API information](http://www.cpsc.gov/en/Recalls/CPSC-Recalls-Application-Program-Interface-API-Information/) |
| **Full recall feed (XML)** | Single large XML result set: `http://www.saferproducts.gov/RestWebServices/Recall?format=xml` — can be very large and slow to load; spans many years of recalls. |
| **Abbreviated dataset (ZIP)** | Smaller packaged dataset (~6k+ recalls): `http://www.saferproducts.gov/SPDB.zip` — useful for development and demos without pulling the full XML in one request. |

Prefer **HTTPS** and current CPSC/SaferProducts URLs where the official site redirects (verify links in the live documentation before production use).

---

## How this repo fits (today)

- **Sprint 1** focuses on **Recall** + **Prioritization** (manager workflow and live database).
- Later sprints extend toward **Violations**, **Responses**, and **Adjudications** per the roadmap in [`README.md`](README.md).

Keep this file updated only when the **course narrative** or **stakeholder scope** changes — not for every small UI tweak.
