# CPSC Class Project Recall Violation Monitoring System

Team 6 — CPSC project for recall enforcement, violation monitoring, and adjudication.

## Tech Stack

- **Frontend:** React 19 + Vite + Material UI 6
- **Backend:** Node.js + Express (thin API layer)
- **Database:** PostgreSQL via Supabase


## Project Structure

```
cpsc-recall-system/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── context/      # React context (auth, etc.)
│       ├── hooks/        # Custom hooks
│       ├── lib/          # Supabase client, utilities
│       └── pages/        # Route pages
├── server/          # Express backend
│   └── src/
│       ├── lib/          # Supabase admin client
│       ├── middleware/    # Auth middleware
│       └── routes/       # API route handlers
├── shared/          # Constants shared between client/server
└── .env.example     # Environment variable template
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works)

### Setup

1. **Clone the repo:**
   ```bash
   git clone <your-repo-url>
   cd cpsc-recall-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase URL and keys from [Supabase Dashboard](https://supabase.com/dashboard) > Settings > API.

4. **Run the development servers:**
   ```bash
   # Both client and server
   npm run dev

   # Or individually
   npm run dev:client    # React on http://localhost:5173
   npm run dev:server    # Express on http://localhost:3001
   ```

## Production (Railway)

Deploy as a **single Railway service** from the repo root: Nixpacks runs `npm ci`, `npm run build`, then `npm start`. Express serves the built SPA from `client/dist` and the API under `/api/*` on the same URL (no separate frontend URL required).

Configure **Supabase Auth** redirect URLs for your Railway domain and set `VITE_*` and `SUPABASE_*` variables so both the client bundle and the server can talk to Supabase. Full checklist: [DEPLOYMENT.md](DEPLOYMENT.md).

## Sprint Roadmap

| Sprint | Feature | Status |
|--------|---------|--------|
| 1 | Prioritize Recall (Manager login, recall list, priority assignment) | In Progress |
| 2 | Create Violation (Investigator logs violations from listings) | Not Started |
| 3 | Respond to Violation + Adjudicate (Seller responses, investigator decisions) | Not Started |

## API

The Express server runs on port 3001. During development, Vite proxies `/api/*` requests to it automatically.

- `GET /api/health` — Health check
- **Admin (JWT, `user_type` admin)** — batch recall import:
  - `POST /api/admin/recalls/import-csv` — multipart field `file` (CSV)
  - `POST /api/admin/recalls/import-csv-url` — JSON `{ "csvUrl" }`
  - `POST /api/admin/recalls/import-cpsc` — JSON `{ "recallNumber" }` and/or `{ "recallDateStart", "recallDateEnd" }` (official [CPSC Recall JSON API](https://www.saferproducts.gov/RestWebServices/Recall?format=json); see [CPSC API information](https://www.cpsc.gov/Recalls/CPSC-Recalls-Application-Program-Interface-API-Information))

UI: **Settings → Batch import** (`/admin/import`).

## Team

| Name | Role |
|------|------|
| Edward Severichs-Cespedes | Project Manager |
| Gabriella Ashiblie | Requirements Analyst |
| Reed Greenfield | Data Manager |
| Michelle Bae | Process Designer |
| Parker Smith | Business Intelligence Analyst |
| Ben Mickool | Web Developer |
| Soumya Bandaru | UX Lead |
