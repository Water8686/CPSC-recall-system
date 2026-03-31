import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchAdjudications,
  dbCreateAdjudication,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';

const router = Router();
router.use(applyApiMockUser);

const VALID_STATUSES = ['Resolved', 'Unresolved'];
const VALID_REASONS = [
  'listing_removed',
  'listing_edited',
  'confirmed_different_model',
  'seller_unresponsive',
  'insufficient_evidence',
  'other',
];

/** GET /api/adjudications */
router.get('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });
  try {
    const rows = await dbFetchAdjudications(req.supabase);
    return res.json(rows);
  } catch (err) {
    console.error('GET /adjudications:', err);
    return res.status(500).json({ error: err.message || 'Failed to load adjudications' });
  }
});

/** POST /api/adjudications */
router.post('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const { violation_id, status, reason, notes } = req.body ?? {};

  if (!violation_id) return res.status(400).json({ error: 'violation_id is required' });
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }
  if (reason && !VALID_REASONS.includes(reason)) {
    return res.status(400).json({
      error: `reason must be one of: ${VALID_REASONS.join(', ')}`,
    });
  }

  try {
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const row = await dbCreateAdjudication(req.supabase, {
      violation_id:    Number(violation_id),
      investigator_id: userId,
      status,
      reason:          reason ?? null,
      notes:           notes ? String(notes).trim() : null,
    });
    return res.status(201).json(row);
  } catch (err) {
    console.error('POST /adjudications:', err);
    return res.status(500).json({ error: err.message || 'Failed to create adjudication' });
  }
});

export default router;
