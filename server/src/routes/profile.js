import { Router } from 'express';
import { applyApiMockUser, requireRealAuth } from '../middleware/requireCpscManager.js';
import { attachProfileAndRole, requireApprovedProfile } from '../middleware/rbac.js';
import { getAdminClient } from '../lib/supabaseAdmin.js';

const router = Router();

router.use(applyApiMockUser);
router.use(requireRealAuth);
router.use(attachProfileAndRole);

/** Profile for current user (works when pending approval — exposes approved flag). */
router.get('/me', (req, res) => {
  return res.json({
    profile: req.profileRow,
    role: req.appRole,
  });
});

router.patch('/me', requireApprovedProfile, async (req, res) => {
  const { full_name, avatar_url } = req.body ?? {};
  if (req.isApiMockMode) {
    return res.json({ success: true, profile: req.profileRow });
  }
  const db = getAdminClient() ?? req.supabase;
  if (!db) return res.status(503).json({ error: 'Server configuration error' });

  const updates = { updated_at: new Date().toISOString() };
  if (full_name !== undefined) updates.full_name = full_name === '' ? null : full_name;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url === '' ? null : avatar_url;

  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select(
      'id, user_type, full_name, username, email, updated_at, approved, avatar_url, requested_role',
    )
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ profile: data });
});

export default router;
