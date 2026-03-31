import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireCpscManager } from '../middleware/requireCpscManager.js';
import { normalizeAppRole } from '../lib/roles.js';
import { mapAppUserRowToApi } from '../lib/appUsers.js';

const router = Router();

/** GET /api/users?role=investigator */
router.get('/', requireCpscManager, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const role = String(req.query?.role ?? '').trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, email, user_type, full_name, approved, avatar_url, updated_at, created_at')
    .order('email', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const rows = (data ?? [])
    .map((row) => {
      const api = mapAppUserRowToApi(row);
      const canonical = normalizeAppRole({ user_type: row.user_type }, null);
      return {
        ...api,
        role: canonical,
      };
    })
    .filter((row) => {
      if (!role) return true;
      return row.role === role;
    });

  return res.json(rows);
});

export default router;

