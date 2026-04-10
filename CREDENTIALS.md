# Access Credentials

**Disclaimer:** This is a student prototype project. It is not endorsed by or affiliated with the U.S. Consumer Product Safety Commission (CPSC).

---

## Production URL

**Before grading submission:** Replace the placeholder below with your team’s **public Railway URL** (Railway project → your service → **Settings** → **Networking** → generate or copy the domain). Deploy steps: [DEPLOYMENT.md](DEPLOYMENT.md).

```
https://YOUR-APP.up.railway.app
```

---

## Test Accounts (after `supabase/init_benscpsc.sql`)

| Role | Email | Password |
|------|-------|----------|
| CPSC Manager | manager@cpsc.demo | demo1234 |
| Investigator | investigator@cpsc.demo | demo1234 |
| Seller | seller@cpsc.demo | demo1234 |
| Admin | admin@cpsc.demo | demo1234 |

---

## Notes

- Sign-in uses **app auth** (`/api/auth/login`) with `public.app_users` — not Supabase Auth.
- Apply the BENSCPSC seed: Supabase Dashboard → **SQL Editor** → paste and run [`supabase/init_benscpsc.sql`](supabase/init_benscpsc.sql).
- Point `.env` at the **BENSCPSC** project URL and keys; set `SUPABASE_SERVICE_ROLE_KEY` and `APP_JWT_SECRET` for the API.
- The Manager account can access the Recalls page and submit priority assignments.
- The Investigator account can view recalls and prioritizations (read-only).
- The Seller account logs in and sees the Dashboard (Recalls hidden in nav).
- **Users & roles** requires the **admin** account (`admin@cpsc.demo`).
