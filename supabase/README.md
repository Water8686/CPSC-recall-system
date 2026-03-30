# Supabase (BENSCPSC / fresh project)

For the **shared / main** Supabase database (bigint `app_users`, `recall_image`, no `public.user`), apply [`migrations/20260330130000_main_db_schema_alignment.sql`](migrations/20260330130000_main_db_schema_alignment.sql) once if you need `ADMIN` in `user_type` and `password_reset_tokens` with `bigint` `user_id`.

This repo also ships **`init_benscpsc.sql`** for a clean class-project database instead of a full migration chain.

## Apply schema + mock data

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) for project **BENSCPSC**.
2. Go to **SQL Editor** → **New query**.
3. Paste the full contents of [`init_benscpsc.sql`](init_benscpsc.sql) and click **Run**.

That script **drops** `recall`, `prioritization`, `user`, `app_users`, `password_reset_tokens`, and optional legacy tables if they exist, then recreates them and loads:

- **25** recall rows (same as `server/src/data/mockData.js`)
- **10** prioritization rows (manager user)
- **4** demo `app_users` + matching `public.user` rows (see [`../CREDENTIALS.md`](../CREDENTIALS.md))
- **`password_reset_tokens`** for forgot-password / reset-password

### OKR 1.1 — ≥100 recall records

After `init_benscpsc.sql`, run [`seed_recalls_to_100.sql`](seed_recalls_to_100.sql) in the SQL editor. It adds recalls `24-026`–`24-100` (75 rows) with `ON CONFLICT DO NOTHING` so it is safe to re-run.

### Already applied `init_benscpsc.sql` before password reset existed?

Run [`add_password_reset_tokens.sql`](add_password_reset_tokens.sql) once (or re-run the full `init_benscpsc.sql` on a blank DB).

## Re-generate recall/priority INSERTs from code

If you change `server/src/data/mockData.js`:

```bash
node scripts/generate-benscpsc-seed.mjs
```

Copy the printed SQL into `init_benscpsc.sql` (or merge manually).

## Optional: `psql` instead of the dashboard

From **Project Settings → Database**, copy the **URI** (add `?sslmode=require` if needed):

```bash
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require" -f supabase/init_benscpsc.sql
```

## `profiles` table

The init script drops `public.profiles` if present. This app does **not** rely on `profiles` for auth anymore (`app_users` is the source of truth). If you add a `profiles` table again for another feature, avoid conflicting names or skip that `DROP` line in a forked copy of the script.
