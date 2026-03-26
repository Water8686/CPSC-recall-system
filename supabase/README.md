# Supabase

## Applying migrations

1. Link CLI: `supabase link --project-ref <your-ref>`
2. Run SQL in Dashboard **SQL Editor** (paste `migrations/*.sql`), or use `supabase db push` when migration history matches.

## RLS snapshot (run in SQL Editor)

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

New tables `violation` and `violation_response` use RLS with no policies for JWT users so **reads/writes go through the Express API** using `SUPABASE_SERVICE_ROLE_KEY`.
