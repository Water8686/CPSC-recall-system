import { Router } from 'express';
import { applyApiMockUser, requireRealAuth } from '../middleware/requireCpscManager.js';
import {
  attachProfileAndRole,
  requireApprovedProfile,
  requireRoles,
} from '../middleware/rbac.js';
import { getAdminClient } from '../lib/supabaseAdmin.js';
import { resolveRecallPk } from '../lib/recallHelpers.js';
import {
  USER_ROLES,
  VIOLATION_STAFF_ROLES,
  MANAGER_ACCESS_ROLES,
} from 'shared';

const router = Router();

router.use(applyApiMockUser);
router.use(requireRealAuth);
router.use(attachProfileAndRole);
router.use(requireApprovedProfile);

function mapViolation(row, recallNumberById) {
  return {
    violation_id: String(row.violation_id),
    recall_id_pk: String(row.recall_id),
    recall_number: recallNumberById.get(row.recall_id) ?? '',
    seller_id: row.seller_id,
    investigator_id: row.investigator_id,
    platform: row.platform,
    listing_url: row.listing_url,
    status: row.status,
    severity: row.severity,
    adjudication_status: row.adjudication_status,
    adjudication_notes: row.adjudication_notes,
    created_at: row.created_at,
  };
}

async function recallNumberMap(admin) {
  const { data } = await admin.from('recall').select('recall_id, recall_number');
  return new Map((data ?? []).map((r) => [r.recall_id, r.recall_number]));
}

router.get('/', async (req, res) => {
  if (req.isApiMockMode) {
    return res.json([]);
  }
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });

  const role = req.appRole;
  let query = admin.from('violation').select('*').order('created_at', { ascending: false });

  if (role === USER_ROLES.SELLER) {
    query = query.eq('seller_id', req.user.id);
  } else if (role === USER_ROLES.INVESTIGATOR) {
    query = query.eq('investigator_id', req.user.id);
  }
  // admin, manager: all rows

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const recallNumberById = await recallNumberMap(admin);
  return res.json((data ?? []).map((row) => mapViolation(row, recallNumberById)));
});

router.get('/:id', async (req, res) => {
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });
  const vid = Number(req.params.id);
  if (Number.isNaN(vid)) return res.status(400).json({ error: 'Invalid id' });

  const { data: row, error } = await admin
    .from('violation')
    .select('*')
    .eq('violation_id', vid)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: 'Not found' });

  const role = req.appRole;
  if (role === USER_ROLES.SELLER && row.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (role === USER_ROLES.INVESTIGATOR && row.investigator_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const recallNumberById = await recallNumberMap(admin);
  return res.json(mapViolation(row, recallNumberById));
});

router.post('/', requireRoles(VIOLATION_STAFF_ROLES), async (req, res) => {
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });

  const {
    recall_ref,
    seller_id,
    platform,
    listing_url,
    status,
    severity,
    investigator_id,
  } = req.body ?? {};

  const recallPk = await resolveRecallPk(admin, recall_ref ?? req.body.recall_id);
  if (recallPk == null) {
    return res.status(400).json({ error: 'recall_ref or recall_id must resolve to a recall' });
  }
  if (!seller_id || !platform || !listing_url) {
    return res.status(400).json({ error: 'seller_id, platform, and listing_url are required' });
  }

  const row = {
    recall_id: recallPk,
    seller_id,
    platform: String(platform).trim(),
    listing_url: String(listing_url).trim(),
    status: status ?? 'Open',
    severity: severity ?? 'Medium',
    investigator_id: investigator_id ?? req.user.id,
  };

  const { data, error } = await admin.from('violation').insert(row).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  const recallNumberById = await recallNumberMap(admin);
  return res.status(201).json(mapViolation(data, recallNumberById));
});

router.patch('/:id', async (req, res) => {
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });
  const vid = Number(req.params.id);
  if (Number.isNaN(vid)) return res.status(400).json({ error: 'Invalid id' });

  const { data: existing, error: e0 } = await admin
    .from('violation')
    .select('*')
    .eq('violation_id', vid)
    .maybeSingle();
  if (e0) return res.status(500).json({ error: e0.message });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const role = req.appRole;
  const staff = VIOLATION_STAFF_ROLES.includes(role);
  if (!staff) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updates = {};
  const {
    platform,
    listing_url,
    status,
    severity,
    investigator_id,
    adjudication_status,
    adjudication_notes,
  } = req.body ?? {};
  if (platform !== undefined) updates.platform = platform;
  if (listing_url !== undefined) updates.listing_url = listing_url;
  if (status !== undefined) updates.status = status;
  if (severity !== undefined) updates.severity = severity;
  if (investigator_id !== undefined) updates.investigator_id = investigator_id;
  if (adjudication_status !== undefined) updates.adjudication_status = adjudication_status;
  if (adjudication_notes !== undefined) updates.adjudication_notes = adjudication_notes;

  const { data, error } = await admin
    .from('violation')
    .update(updates)
    .eq('violation_id', vid)
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  const recallNumberById = await recallNumberMap(admin);
  return res.json(mapViolation(data, recallNumberById));
});

router.delete('/:id', requireRoles(MANAGER_ACCESS_ROLES), async (req, res) => {
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });
  const vid = Number(req.params.id);
  if (Number.isNaN(vid)) return res.status(400).json({ error: 'Invalid id' });

  const { error } = await admin.from('violation').delete().eq('violation_id', vid);
  if (error) return res.status(400).json({ error: error.message });
  return res.status(204).send();
});

export default router;
