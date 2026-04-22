import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { normalizeAppRole } from '../lib/roles.js';
import { dbUserTypeFromCanonical, mapAppUserRowToApi } from '../lib/appUsers.js';

const router = Router();

/** GET /api/admin/users */
router.get('/users', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('*')
    .order('email', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const rows = (data ?? []).map((row) => {
    const api = mapAppUserRowToApi(row);
    return {
      ...api,
      role: normalizeAppRole({ user_type: row.user_type }, null),
    };
  });

  return res.json(rows);
});

/** PATCH /api/admin/users/:id */
router.patch('/users/:id', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const userId = req.params.id;
  if (!userId) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  const patch = { updated_at: new Date().toISOString() };

  if (req.body?.user_type !== undefined) {
    patch.user_type = dbUserTypeFromCanonical(req.body.user_type);
  }
  if (req.body?.approved !== undefined) {
    patch.approved = Boolean(req.body.approved);
  }
  if (req.body?.full_name !== undefined) {
    patch.full_name = String(req.body.full_name).trim() || null;
  }
  if (req.body?.seller_id !== undefined) {
    const sid = req.body.seller_id;
    patch.seller_id = sid == null || sid === '' ? null : Number(sid) || null;
  }

  if (Object.keys(patch).length <= 1) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const api = mapAppUserRowToApi(data);
  return res.json({
    ...api,
    role: normalizeAppRole({ user_type: data.user_type }, null),
  });
});

export default router;
