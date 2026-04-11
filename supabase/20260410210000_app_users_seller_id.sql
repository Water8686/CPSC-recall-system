-- Link app_users to marketplace seller rows so a seller login can be scoped to their listings.
-- The seller_id column is nullable; staff accounts (admin/manager/investigator) leave it NULL.
-- Access resolution: prefer explicit seller_id; fall back to matching app_users.email against
-- seller.seller_email so demo seeds work without manual FK edits when emails align.

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS seller_id BIGINT REFERENCES seller(seller_id) ON DELETE SET NULL;

-- Auto-link existing accounts whose email matches a seller row (best-effort for seeds/demos).
UPDATE app_users u
SET seller_id = s.seller_id
FROM seller s
WHERE lower(u.email) = lower(s.seller_email)
  AND u.seller_id IS NULL;
