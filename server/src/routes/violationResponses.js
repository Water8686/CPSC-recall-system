import { Router } from 'express';
import { applyApiMockUser, requireRealAuth } from '../middleware/requireCpscManager.js';
import { attachProfileAndRole, requireApprovedProfile } from '../middleware/rbac.js';
import { getAdminClient } from '../lib/supabaseAdmin.js';
import { USER_ROLES } from 'shared';

const router = Router();

router.use(applyApiMockUser);
router.use(requireRealAuth);
router.use(attachProfileAndRole);
router.use(requireApprovedProfile);

function mapResponse(row) {
  return {
    response_id: String(row.response_id),
    violation_id: String(row.violation_id),
    seller_id: row.seller_id,
    response_text: row.response_text,
    evidence_url: row.evidence_url,
    response_type: row.response_type,
    status: row.status,
    created_at: row.created_at,
  };
}

router.get('/', async (req, res) => {
  if (req.isApiMockMode) return res.json([]);
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });

  const role = req.appRole;
  let query = admin.from('violation_response').select('*').order('created_at', { ascending: false });

  if (role === USER_ROLES.SELLER) {
    query = query.eq('seller_id', req.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json((data ?? []).map(mapResponse));
});

router.post('/', async (req, res) => {
  if (req.isApiMockMode) {
    return res.status(201).json({ response_id: 'mock', violation_id: '1' });
  }
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });

  const { violation_id, response_text, evidence_url, response_type, status } = req.body ?? {};
  const vid = Number(violation_id);
  if (!violation_id || Number.isNaN(vid)) {
    return res.status(400).json({ error: 'violation_id is required' });
  }
  if (!response_text || !response_type) {
    return res.status(400).json({ error: 'response_text and response_type are required' });
  }

  const { data: v, error: ve } = await admin
    .from('violation')
    .select('violation_id, seller_id')
    .eq('violation_id', vid)
    .maybeSingle();
  if (ve) return res.status(500).json({ error: ve.message });
  if (!v) return res.status(404).json({ error: 'Violation not found' });

  if (req.appRole !== USER_ROLES.SELLER) {
    return res.status(403).json({ error: 'Only sellers submit violation responses' });
  }
  if (v.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only respond to your own violations' });
  }

  const row = {
    violation_id: vid,
    seller_id: v.seller_id,
    response_text: String(response_text).trim(),
    evidence_url: evidence_url ? String(evidence_url).trim() : null,
    response_type: String(response_type).trim(),
    status: status ?? 'Submitted',
  };

  const { data, error } = await admin.from('violation_response').insert(row).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json(mapResponse(data));
});

export default router;
