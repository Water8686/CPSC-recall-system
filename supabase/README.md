# Database setup (Supabase)

The app talks to PostgreSQL through **Supabase** (`@supabase/supabase-js`), using your **project URL** plus **anon** (client) and **service_role** (server only). Plain Postgres without Supabase-style URLs and keys is **not** supported.

## Bring your own database

This repo **does not** include credentials for anyone else’s Supabase project. Each person cloning the repo should:

1. **Hosted (recommended):** Create a [free Supabase project](https://supabase.com/dashboard) → **Project Settings → API** → copy **Project URL**, **anon/public** key, and **service_role** key.
2. **Local:** Use the [Supabase CLI local stack](https://supabase.com/docs/guides/cli/local-development) (`supabase start`) so URL and keys match what the app expects.

Then copy [`.env.example`](../.env.example) to `.env` at the repo root and fill it in.

## Schema

**There is no full DDL or migration chain in this repository.** The codebase assumes tables such as `recall`, `app_users`, `listing`, `violation`, etc., already exist in the database you connect to—typically the **team’s Supabase project** you’re granted access to for grading, or schema/scripts provided **outside** this repo by your instructor.

For local runs, point `.env` at a Supabase database that already matches the app (same project the team develops against, or instructor-supplied setup). Use **Register** (`/api/auth/register`) for first-user bootstrap where applicable—see [deployment notes](../docs/DEPLOYMENT.md).

## Optional SQL patches (`supabase/*.sql`)

These are **small, targeted** scripts (usually `ALTER` / `CREATE` for one concern). Run them in **SQL Editor** only if a feature fails because a column or table is missing—they **do not** define the whole schema.

| File | Purpose |
|------|---------|
| [`20260408140000_recall_model_number.sql`](20260408140000_recall_model_number.sql) | Adds `recall.model_number` for listing matching. |
| [`20260410130000_listing_annotation.sql`](20260410130000_listing_annotation.sql) | Listing annotation columns (`is_true_match`, notes, etc.). |
| [`20260410210000_app_users_seller_id.sql`](20260410210000_app_users_seller_id.sql) | Links `app_users` to `seller` for scoped seller logins. |
| [`add_password_reset_tokens.sql`](add_password_reset_tokens.sql) | Creates `password_reset_tokens` for forgot/reset password APIs. |

## Developer helper: INSERT fragments from mock data

If you change [`server/src/data/mockData.js`](../server/src/data/mockData.js):

```bash
node scripts/generate-demo-seed.mjs
```

Paste output into ad-hoc SQL in the editor if needed.
