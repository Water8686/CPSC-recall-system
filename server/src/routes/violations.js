import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
  requireInvestigatorOnly,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchViolations,
  dbCreateViolation,
  dbUpdateViolationStatus,
  dbFetchViolationDetail,
  dbFetchViolationAuthMeta,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';
import { assertViolationAccess } from '../lib/violationAccess.js';

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

/** POST /api/violations — create or update (upsert by listing_id); investigator only */
router.post('/', requireRealAuth, requireInvestigatorOnly, async (req, res) => {
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

/** GET /api/violations/:id — full record with contacts, responses, adjudications */
router.get('/:id', requireRealAuth, async (req, res) => {
  const violationId = Number(req.params.id);
  if (!Number.isFinite(violationId)) {
    return res.status(400).json({ error: 'Invalid violation id' });
  }

  if (req.isApiMockMode) {
    if (violationId === 99999) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    return res.json({
      violation_id: violationId,
      listing_id: 1,
      recall_id: 1,
      recall_number: '24-001',
      recall_title: 'Mock recall',
      investigator_id: 1,
      investigator_name: 'Mock Manager',
      violation_noticed_at: new Date().toISOString(),
      violation_status: 'Open',
      violation_type: 'Recalled Product Listed for Sale',
      date_of_violation: '2024-01-01',
      notes: null,
      notice_sent_at: null,
      notice_contact: null,
      listing_url: 'https://example.com/listing',
      listing_marketplace: 'eBay',
      listing_title: 'Mock listing',
      seller_name: 'Mock Seller',
      seller_email: null,
      response_count: 0,
      latest_response: null,
      adjudication: null,
      contacts: [],
    });
  }

  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  try {
    const meta = await dbFetchViolationAuthMeta(req.supabase, violationId);
    if (!meta) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    const allowed = await assertViolationAccess(req, res, req.supabase, meta.user_id);
    if (!allowed) return;

    const detail = await dbFetchViolationDetail(req.supabase, violationId);
    if (!detail) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    return res.json(detail);
  } catch (err) {
    console.error('GET /violations/:id:', err);
    return res.status(500).json({ error: err.message || 'Failed to load violation' });
  }
});

/** PATCH /api/violations/:id — update status, notice_sent_at, notes */
router.patch('/:id', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const violationId = Number(req.params.id);
  if (!Number.isFinite(violationId)) return res.status(400).json({ error: 'Invalid violation id' });

  const { violation_status, notice_sent_at, notes } = req.body ?? {};

  if (violation_status && !VALID_STATUSES.includes(violation_status)) {
    return res.status(400).json({
      error: `violation_status must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  try {
    if (!req.isApiMockMode) {
      const meta = await dbFetchViolationAuthMeta(req.supabase, violationId);
      if (!meta) {
        return res.status(404).json({ error: 'Violation not found' });
      }
      const allowed = await assertViolationAccess(req, res, req.supabase, meta.user_id);
      if (!allowed) return;
    }

    const row = await dbUpdateViolationStatus(req.supabase, violationId, {
      violation_status,
      notice_sent_at: notice_sent_at ?? undefined,
      notes: notes ?? undefined,
    });
    return res.json(row);
  } catch (err) {
    console.error('PATCH /violations/:id:', err);
    return res.status(500).json({ error: err.message || 'Failed to update violation' });
  }
});

export default router;
