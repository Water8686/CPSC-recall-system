# Database setup (Supabase)

The app talks to PostgreSQL through **Supabase** (`@supabase/supabase-js`), using your **project URL** plus **anon** (client) and **service_role** (server only) keys. A bare Postgres instance **without** Supabase-style URLs and keys is **not** supported.

## Bring your own database

This repo **does not** include credentials for anyone else’s Supabase project. Anyone cloning the repo must:

1. **Hosted (recommended):** Create a [free Supabase project](https://supabase.com/dashboard) → **Project Settings → API** → copy **Project URL**, **anon/public key**, and **service_role** key.
2. **Local:** Use the [Supabase CLI local stack](https://supabase.com/docs/guides/cli/local-development) (`supabase start`) so you get the same URL/key shape as production.

Then copy [`.env.example`](../.env.example) to `.env` at the repo root and fill it in.

Incremental SQL in this folder **adds or alters** tables/columns and assumes **core tables already exist** (`recall`, `app_users`, `listing`, `violation`, etc.). If you start from an empty database, apply migrations **in timestamp order** once your baseline schema matches what the app expects, or import schema from course/instructor materials—then use registration (`/api/auth/register`) so the first user can become admin per [deployment notes](../docs/DEPLOYMENT.md).

## `supabase/migrations/` (run in filename order)

Apply each file in **SQL Editor** against **your** project when bringing an older DB forward.

| File | Purpose |
|------|---------|
| `20260406120000_sprint2_violation_listing.sql` | Violation/listing enums and columns (`violation_type`, listing `source`, `recall_id` on listing, etc.). |
| `20260407120000_recall_added_at.sql` | Adds `recall.added_at`. |
| `20260407130000_listing_recall_not_null.sql` | Makes `listing.recall_id` NOT NULL (resolve NULL `recall_id` rows first—see [`scripts/audit-listing-recalls.sql`](../scripts/audit-listing-recalls.sql)). |
| `20260407160000_discovery_result.sql` | Creates `discovery_result` for Smart Listing Discovery. |
| `20260409100000_discovery_improvements.sql` | Extends discovery listing source enum and uniqueness constraint. |

## Root-level SQL patches (`supabase/*.sql`)

| File | Purpose |
|------|---------|
| [`20260408140000_recall_model_number.sql`](20260408140000_recall_model_number.sql) | Adds `recall.model_number` for listing matching. |
| [`20260410130000_listing_annotation.sql`](20260410130000_listing_annotation.sql) | Listing annotation columns (`is_true_match`, notes, etc.). |
| [`20260410210000_app_users_seller_id.sql`](20260410210000_app_users_seller_id.sql) | Links `app_users` to `seller` for scoped seller logins. |
| [`add_password_reset_tokens.sql`](add_password_reset_tokens.sql) | Creates `password_reset_tokens` for forgot/reset password APIs. |

Run these in SQL Editor only when your schema is missing the described objects.

## Optional: `psql`

From **Project Settings → Database**, copy the connection URI (often `?sslmode=require`):

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260406120000_sprint2_violation_listing.sql
```

## Developer helper: INSERT fragments from mock data

If you change [`server/src/data/mockData.js`](../server/src/data/mockData.js), you can print SQL fragments:

```bash
node scripts/generate-demo-seed.mjs
```

Paste output into ad-hoc seed scripts or SQL Editor as needed.
