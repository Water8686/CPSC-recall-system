import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import {
  attachProfileAndRole,
  requireApprovedProfile,
  requireRoles,
} from '../middleware/rbac.js';
import { getAdminClient } from '../lib/supabaseAdmin.js';
import { USER_APPROVAL_ROLES, USER_ROLES, VIOLATION_STAFF_ROLES } from 'shared';

const router = Router();

router.use(applyApiMockUser);
router.use(requireRealAuth);
router.use(attachProfileAndRole);
router.use(requireApprovedProfile);

/** Investigators can list profiles for assignment dropdowns; only admin/manager can PATCH. */
router.get('/', requireRoles(VIOLATION_STAFF_ROLES), async (req, res) => {
  if (req.isApiMockMode) {
    return res.json([]);
  }
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });
  const { data, error } = await admin
    .from('profiles')
    .select(
      'id, user_type, full_name, username, email, updated_at, approved, avatar_url, requested_role',
    )
    .order('email', { ascending: true, nullsFirst: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

router.patch('/:id', requireRoles(USER_APPROVAL_ROLES), async (req, res) => {
  const { id } = req.params;
  const { user_type, full_name, approved, requested_role } = req.body ?? {};

  if (req.isApiMockMode) {
    return res.json({ success: true });
  }
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });

  if (req.appRole !== USER_ROLES.ADMIN && user_type !== undefined) {
    return res.status(403).json({ error: 'Only admin can change user_type' });
  }

  const updates = { updated_at: new Date().toISOString() };
  if (user_type !== undefined) updates.user_type = user_type;
  if (full_name !== undefined) updates.full_name = full_name === '' ? null : full_name;
  if (approved !== undefined) updates.approved = Boolean(approved);
  if (requested_role !== undefined) {
    updates.requested_role = requested_role === '' ? null : requested_role;
  }

  const { data, error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select(
      'id, user_type, full_name, username, email, updated_at, approved, avatar_url, requested_role',
    )
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Profile not found' });
  return res.json(data);
});

export default router;
