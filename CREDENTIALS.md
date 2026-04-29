# Access credentials

**Disclaimer:** This is a student prototype project. It is not endorsed by or affiliated with the U.S. Consumer Product Safety Commission (CPSC).

---

## Production URL

Replace the placeholder below with your deployed app URL when you have one (for example Railway → **Settings → Networking**). Setup: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

```
https://YOUR-APP.up.railway.app
```

---

## Example demo accounts

These emails/passwords are **for local or class demos only**, after corresponding users exist **in your own Supabase-backed database** (create them via **Register** or insert rows into `public.app_users` per your schema—not shared team credentials).

| Role | Email | Password |
|------|-------|----------|
| CPSC Manager | manager@cpsc.demo | demo1234 |
| Investigator | investigator@cpsc.demo | demo1234 |
| Seller | seller@cpsc.demo | demo1234 |
| Admin | admin@cpsc.demo | demo1234 |

---

## Notes

- Sign-in uses **app auth** (`/api/auth/login`) with `public.app_users` — not Supabase Auth email/password in the dashboard.
- Point `.env` at **your** Supabase **Project URL** and keys from **Project Settings → API**; set `SUPABASE_SERVICE_ROLE_KEY` and `APP_JWT_SECRET` on the server.
- The Manager account can access the Recalls page and submit priority assignments.
- The Investigator account can view recalls and prioritizations (read-only where enforced by UI/API).
- The Seller account sees the Dashboard (Recalls hidden in nav per role).
- **Users & roles** typically requires an **admin** account (`admin@cpsc.demo` if you created one).
