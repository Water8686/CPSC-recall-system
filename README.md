# CPSC Recall Violation Monitoring System

Team 6 — Class project for recall enforcement, violation monitoring, and adjudication workflows against CPSC-style recall data.

## Tech stack

- **Frontend:** React 19 + Vite + Material UI 6 (+ Tailwind where used)
- **Backend:** Node.js + Express (API under `/api/*`)
- **Database:** PostgreSQL via **Supabase** (project URL + anon + service role keys)
- **Auth:** App-issued JWT + `public.app_users` (not Supabase Auth for login UI)

## Project layout

```
cpsc-recall-system/
├── client/          # React frontend (Vite)
├── server/          # Express API
├── shared/          # Shared constants
├── supabase/        # Optional SQL patches + DB notes (see supabase/README.md)
├── docs/DEPLOYMENT.md   # Railway / production env checklist
└── .env.example     # Environment template
```

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Your own Supabase backend** — this repo does **not** ship credentials to any team database. You must create a Supabase project (or run a [local Supabase stack](https://supabase.com/docs/guides/cli/local-development)) and configure `.env` yourself.

## Clone and install

```bash
git clone <repository-url>
cd cpsc-recall-system
npm install
```

## Database (bring your own)

1. Create a **free Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard) **or** use Supabase CLI local dev (`supabase start`).
2. Open **Project Settings → API** and copy the **Project URL**, **anon/public** key, and **service_role** key (server-only).
3. Point `.env` at a database that **already has the app schema** (for example your team’s Supabase project for grading, or setup from your instructor). This repo does **not** ship full DDL—see **[supabase/README.md](supabase/README.md)** for connection details and optional small SQL patches only.

## Environment variables

```bash
cp .env.example .env
```

Fill in **your** Supabase URL and keys plus a long random `APP_JWT_SECRET`. Comments in `.env.example` describe each variable.

## Run locally

```bash
# Frontend (5173) + API (3001) together
npm run dev

# Or separately
npm run dev:client    # http://localhost:5173 — proxies /api to the server
npm run dev:server    # http://localhost:3001
```

The Vite dev server proxies `/api/*` to Express ([`client/vite.config.js`](client/vite.config.js)).

- Health check: `GET http://localhost:3001/api/health`

## Demo roles

Example emails/passwords for **local/class demos** (after those users exist **in your database**) are listed in **[CREDENTIALS.md](CREDENTIALS.md)**.

## Production deploy (Railway)

Single Railway service: build client + run Express (see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**). Set `VITE_*` and `SUPABASE_*` plus `APP_JWT_SECRET` so the built SPA and API use the same Supabase project.

## API overview

Sample routes (server runs on port **3001** in dev):

- `GET /api/health`
- Auth: `/api/auth/login`, `/api/auth/register`, …
- Admin recall import (JWT + admin): batch CSV/CPSC import under `/api/admin/recalls/*` — see **Settings → Batch import** in the UI.

## Team

| Name | Role |
|------|------|
| Michelle Bae | Project Manager |
| Edward Severichs-Cespedes | Requirements Analyst |
| Gabriella Ashiblie| Data Manager |
| Reed Greenfield | Process Designer |
| Parker Smith | Business Intelligence Analyst |
| Ben Mickool | Web Developer |
| Soumya Bandaru | UX Lead |
