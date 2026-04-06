import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchViolations,
  dbCreateViolation,
  dbUpdateViolationStatus,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';

const router = Router();
router.use(applyApiMockUser);

const VALID_STATUSES = ['Open', 'Notice Sent', 'Response Received', 'Closed'];

/** GET /api/violations?status=Open&investigator_id=uuid */
router.get('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const rows = await dbFetchViolations(req.supabase, { status });
    return res.json(rows);
  } catch (err) {
    console.error('GET /violations:', err);
    return res.status(500).json({ error: err.message || 'Failed to load violations' });
  }
});

/** POST /api/violations — create or update (upsert by listing_id) */
router.post('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const { listing_id, violation_type, date_of_violation, recall_id, notes } = req.body ?? {};

  // Basic required-field check (detailed validation in data layer)
  if (!listing_id) return res.status(400).json({ error: 'Please select a listing' });
  if (!violation_type) return res.status(400).json({ error: 'Please select a violation type' });
  if (!date_of_violation) return res.status(400).json({ error: 'Date of Violation is required' });

  try {
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const row = await dbCreateViolation(req.supabase, {
      listing_id: Number(listing_id),
      violation_type,
      date_of_violation,
      recall_id: recall_id != null ? Number(recall_id) : null,
      investigator_id: userId,
      notes: notes ? String(notes).trim() : null,
    });
    const statusCode = row._updated ? 200 : 201;
    return res.status(statusCode).json(row);
  } catch (err) {
    console.error('POST /violations:', err);
    const status = err.message?.includes('future') || err.message?.includes('required') || err.message?.includes('must be') || err.message?.includes('does not exist') ? 400 : 500;
    return res.status(status).json({ error: err.message || 'Failed to create violation' });
  }
});

/** PATCH /api/violations/:id — update status, notice_sent_at, notice_contact, notes */
router.patch('/:id', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const violationId = Number(req.params.id);
  if (!Number.isFinite(violationId)) return res.status(400).json({ error: 'Invalid violation id' });

  const { violation_status, notice_sent_at, notice_contact, notes } = req.body ?? {};

  if (violation_status && !VALID_STATUSES.includes(violation_status)) {
    return res.status(400).json({
      error: `violation_status must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  try {
    const row = await dbUpdateViolationStatus(req.supabase, violationId, {
      violation_status,
      notice_sent_at: notice_sent_at ?? undefined,
      notice_contact: notice_contact ?? undefined,
      notes: notes ?? undefined,
    });
    return res.json(row);
  } catch (err) {
    console.error('PATCH /violations/:id:', err);
    return res.status(500).json({ error: err.message || 'Failed to update violation' });
  }
});

export default router;
