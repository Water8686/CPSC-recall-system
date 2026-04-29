# Deploying to Railway

Single service: **Express** serves the **Vite** production build from `client/dist` and the `/api/*` routes. Sign-in uses **app-managed auth** (`/api/auth/*`) with users in `public.app_users` and JWTs signed by the server (`APP_JWT_SECRET`). Supabase is still used as the database (with the **service role** key on the server only).

## 1. Create the Railway service (one service only)

This app is designed as **one** web service: Express serves `client/dist` and `/api/*` on the same port.

1. New project → **Deploy from GitHub** (this repo).
2. Use **one** service connected to the repo root. [`railway.toml`](../railway.toml) sets **`buildCommand`** to **`npm run build`** (Nixpacks already runs **`npm ci`** in the install phase; repeating `npm ci` in the build step can fail with **`EBUSY` on `node_modules/.cache`**). **Start** is **`npm start`**.
3. If you previously added separate **client** and **server** services from the same repo, **remove or disable the client service** and keep a single service with the commands above. Clear any per-service **Custom Build Command** / **Custom Start Command** that still reference `pnpm`.
4. Generate a **public URL** (Settings → Networking → Generate domain).

### If the build failed with `pnpm: command not found`

That came from Nixpacks auto-detecting a pnpm workspace. This repository uses **npm** (`package-lock.json` + `workspaces` in root `package.json`). Do not reintroduce `pnpm-workspace.yaml` unless you also configure Railway to install pnpm.

### If the build succeeded but the health check failed

The container must run **`npm start`** (Express on `PORT`) so **`GET /api/health`** responds. Check deploy logs for crashes (e.g. wrong start command, missing env vars).

## 2. Required variables (Railway → Variables)

| Variable | Notes |
|----------|-------|
| `SUPABASE_URL` | Same as Supabase project URL (`https://xxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Project **anon** key (Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** — server uses this for DB access and auth tables. Never expose to browsers. |
| `APP_JWT_SECRET` | Long random string; signs login tokens. **Required** whenever `NODE_ENV=production` (including Railway). Without it, login can crash the process (**502**) or return 503. |
| `VITE_SUPABASE_URL` | **Same URL** (needed at **build** time for the client bundle) |
| `VITE_SUPABASE_ANON_KEY` | **Same anon key** (build time) |
| `VITE_MOCK_MODE` | `false` (or omit) in production |

Optional:

| Variable | Notes |
|----------|-------|
| `API_MOCK_MODE` | `false` or omit in production (requires real JWT for manager API routes) |
| `ADMIN_BOOTSTRAP_EMAILS` | Comma-separated emails that register as approved admins |
| `CLIENT_ORIGIN` | Comma-separated allowed origins for strict CORS (omit to allow any origin with Bearer auth) |

`PORT` is set automatically by Railway.

### Switching to a different Supabase project

Update **all** of these in Railway to the new project’s values from **Supabase → Project Settings → API**:

- `SUPABASE_URL` and `VITE_SUPABASE_URL` — same new project URL  
- `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY` — new **anon** / publishable key  
- `SUPABASE_SERVICE_ROLE_KEY` — new **service_role** key (server only)

Then **redeploy** (or trigger a new deploy). Vite bakes `VITE_*` in at **build** time, so if Railway runs a fresh build after you save variables, the client bundle will point at the new project. If the build step does not see updated `VITE_*` variables, clear the build cache or redeploy with “rebuild” so the client picks them up.

Ensure that project’s database already has the tables and data your deployment needs (schema is maintained in Supabase, not as a full SQL dump in this repo). Optional patch scripts are described in [`supabase/README.md`](../supabase/README.md).

## 3. Build-time vs runtime (important)

Vite inlines `VITE_*` at **build**. In Railway, mark **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (and `VITE_MOCK_MODE`) as available to the **build** phase if your platform separates build from deploy variables. If variables are shared across the service, the default is usually fine.

## 4. Supabase SQL (users and login)

Ensure your Supabase database’s schema matches what the app expects (`app_users` and related tables; login fields per [`server/src/routes/auth.js`](../server/src/routes/auth.js)). The first person to **Register** can become an approved **admin** depending on `ADMIN_BOOTSTRAP_EMAILS`; others may be **sellers** pending approval until an admin marks **Approved** on **Users & roles**.

You do **not** need Supabase **Authentication → Users** for this app’s login flow.

**Listing annotation:** if `PATCH /api/listings/:id/annotate` fails on missing columns, run [`supabase/20260410130000_listing_annotation.sql`](../supabase/20260410130000_listing_annotation.sql) in the SQL editor.

## 5. Health check

`railway.toml` uses `GET /api/health` for the deploy health check.

## 6. Local production smoke test

```bash
npm ci
npm run build
VITE_MOCK_MODE=false \
  SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
  APP_JWT_SECRET=your-local-secret \
  npm start
```

Open `http://localhost:3001` — the SPA and `/api/*` should be served from one port.
