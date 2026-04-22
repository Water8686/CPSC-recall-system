import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
  requireInvestigatorOnly,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchAdjudications,
  dbCreateAdjudicationAtomic,
  dbFetchViolationWorkflowMeta,
  dbHasAdjudicationForViolation,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';
import { normalizeAppRole, USER_ROLES } from '../lib/roles.js';
import { ADJUDICATION_STATUS, SPRINT3_VIOLATION_STATUS } from 'shared';

const router = Router();
router.use(applyApiMockUser);

const VALID_STATUSES = Object.values(ADJUDICATION_STATUS);

/** GET /api/adjudications */
router.get('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });
  try {
    const violationId = req.query?.violation_id ? Number(req.query.violation_id) : null;
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const { data: appRow } = await req.supabase
      .from('app_users')
      .select('user_type')
      .eq('user_id', userId)
      .maybeSingle();
    const role = normalizeAppRole(appRow, req.user?.user_metadata?.role ?? req.user?.app_metadata?.role);
    const rows = await dbFetchAdjudications(req.supabase, {
      violationId: Number.isFinite(violationId) ? violationId : null,
      investigatorId: role === USER_ROLES.INVESTIGATOR ? userId : null,
    });
    return res.json(rows);
  } catch (err) {
    console.error('GET /adjudications:', err);
    return res.status(500).json({ error: err.message || 'Failed to load adjudications' });
  }
});

/** POST /api/adjudications — investigator only */
router.post('/', requireRealAuth, requireInvestigatorOnly, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const { violation_id, status, notes } = req.body ?? {};

  if (!violation_id) return res.status(400).json({ error: 'violation_id is required' });
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }
  if (!notes || !String(notes).trim()) {
    return res.status(400).json({ error: 'notes is required' });
  }

  try {
    const vid = Number(violation_id);
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);

    const meta = await dbFetchViolationWorkflowMeta(req.supabase, vid);
    if (!meta) return res.status(404).json({ error: 'Violation ID not found' });
    if (meta.violation_status !== SPRINT3_VIOLATION_STATUS.RESPONSE_SUBMITTED) {
      return res.status(409).json({ error: 'This violation is not ready for adjudication' });
    }
    if (await dbHasAdjudicationForViolation(req.supabase, vid)) {
      return res
        .status(409)
        .json({ error: 'An adjudication record already exists for this violation' });
    }

    const row = await dbCreateAdjudicationAtomic(req.supabase, {
      violation_id: vid,
      investigator_id: userId,
      status,
      reason: status === 'Escalated' ? 'other' : null,
      notes: String(notes).trim(),
    });
    return res.status(201).json(row);
  } catch (err) {
    console.error('POST /adjudications:', err);
    return res.status(500).json({ error: err.message || 'Failed to create adjudication' });
  }
});

export default router;
