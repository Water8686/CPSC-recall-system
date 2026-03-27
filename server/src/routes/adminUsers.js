import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { normalizeAppRole } from '../lib/roles.js';

const router = Router();

/** GET /api/admin/users */
router.get('/users', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('id, email, user_type, full_name, approved, avatar_url, updated_at, created_at')
    .order('email', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    role: normalizeAppRole({ user_type: row.user_type }, null),
  }));

  return res.json(rows);
});

/** PATCH /api/admin/users/:id */
router.patch('/users/:id', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const { id } = req.params;
  const patch = { updated_at: new Date().toISOString() };

  if (req.body?.user_type !== undefined) {
    patch.user_type = String(req.body.user_type).trim().toLowerCase();
  }
  if (req.body?.approved !== undefined) {
    patch.approved = Boolean(req.body.approved);
  }
  if (req.body?.full_name !== undefined) {
    patch.full_name = String(req.body.full_name).trim() || null;
  }

  if (Object.keys(patch).length <= 1) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({
    ...data,
    role: normalizeAppRole({ user_type: data.user_type }, null),
  });
});

export default router;
