# Deploying to Railway

Single service: **Express** serves the **Vite** production build from `client/dist` and the `/api/*` routes. Users sign in with **Supabase Auth** (email/password); set real URLs and keys in Railway (not mock mode).

## 1. Create the Railway service

1. New project → **Deploy from GitHub** (this repo).
2. Railway detects `nixpacks.toml`: `npm ci` → `npm run build` → `npm start`.
3. Generate a **public URL** (Settings → Networking → Generate domain).

## 2. Required variables (Railway → Variables)

| Variable | Notes |
|----------|--------|
| `SUPABASE_URL` | Same as Supabase project URL (`https://xxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Project **anon** key (Settings → API) |
| `VITE_SUPABASE_URL` | **Same URL** (needed at **build** time for the client bundle) |
| `VITE_SUPABASE_ANON_KEY` | **Same anon key** (build time) |
| `VITE_MOCK_MODE` | `false` (or omit) in production |

Optional:

| Variable | Notes |
|----------|--------|
| `API_MOCK_MODE` | `false` or omit in production (requires real JWT for manager API routes) |
| `SUPABASE_SERVICE_ROLE_KEY` | Only if you use server-side admin Supabase features |
| `CLIENT_ORIGIN` | Comma-separated allowed origins for strict CORS (omit to allow any origin with Bearer auth) |

`PORT` is set automatically by Railway.

## 3. Build-time vs runtime (important)

Vite inlines `VITE_*` at **build**. In Railway, mark **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** (and `VITE_MOCK_MODE`) as available to the **build** phase if your platform separates build from deploy variables. If variables are shared across the service, the default is usually fine.

## 4. Supabase Auth (so login works in production)

In Supabase → **Authentication** → **URL configuration**:

- **Site URL**: your Railway URL, e.g. `https://your-app.up.railway.app`
- **Redirect URLs**: add the same URL and a wildcard if you use client-side routing, e.g. `https://your-app.up.railway.app/**`

Create users under **Authentication → Users**, or enable email sign-up. Set **App metadata** (or **User metadata**) `role` to `manager` for CPSC Manager access, or rely on your existing `profiles` / metadata setup.

## 5. Health check

`railway.toml` uses `GET /api/health` for the deploy health check.

## 6. Local production smoke test

```bash
npm ci
npm run build
VITE_MOCK_MODE=false SUPABASE_URL=... SUPABASE_ANON_KEY=... npm start
```

Open `http://localhost:3001` — the SPA and `/api/*` should be served from one port.
