import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
  requireInvestigatorOnly,
  requireOperationalStaff,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchViolations,
  dbFetchViolationsForSeller,
  dbCreateViolation,
  dbUpdateViolationStatus,
  dbFetchViolationDetail,
  dbFetchViolationAuthMeta,
  resolveSellerIdForAppUser,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';
import { assertViolationAccess, isDemoSellerFullAccess } from '../lib/violationAccess.js';
import { USER_ROLES, normalizeAppRole } from '../lib/roles.js';

const router = Router();
router.use(applyApiMockUser);

const VALID_STATUSES = ['Open', 'Notice Sent', 'Response Received', 'Closed'];

/** GET /api/violations?status=Open — returns violations scoped by role */
router.get('/', requireRealAuth, async (req, res) => {
  if (req.isApiMockMode) return res.json([]);
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });
  try {
    const role = req.user?.user_metadata?.role;
    if (role === USER_ROLES.SELLER) {
      const appUserId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
      if (appUserId == null) return res.json([]);
      if (isDemoSellerFullAccess(req)) {
        const status = req.query.status ? String(req.query.status) : undefined;
        const rows = await dbFetchViolations(req.supabase, { status });
        return res.json(rows);
      }
      const sellerId = await resolveSellerIdForAppUser(req.supabase, appUserId);
      if (sellerId == null) return res.json([]);
      const rows = await dbFetchViolationsForSeller(req.supabase, sellerId);
      return res.json(rows);
    }
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
    const status =
      err.message?.includes('future') ||
      err.message?.includes('required') ||
      err.message?.includes('must be') ||
      err.message?.includes('does not exist')
        ? 400
        : 500;
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
    const allowed = await assertViolationAccess(
      req,
      res,
      req.supabase,
      meta.user_id,
      meta.seller_id,
    );
    if (!allowed) return;

    const detail = await dbFetchViolationDetail(req.supabase, violationId);
    if (!detail) {
      return res.status(404).json({ error: 'Violation not found' });
    }

    // Strip internal investigator notes from seller responses.
    const role = req.user?.user_metadata?.role;
    if (role === USER_ROLES.SELLER) {
      detail.notes = null;
    }

    return res.json(detail);
  } catch (err) {
    console.error('GET /violations/:id:', err);
    return res.status(500).json({ error: err.message || 'Failed to load violation' });
  }
});

/** PATCH /api/violations/:id — update status, notice_sent_at, notes; staff only */
router.patch('/:id', requireRealAuth, requireOperationalStaff, async (req, res) => {
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
      const allowed = await assertViolationAccess(
        req,
        res,
        req.supabase,
        meta.user_id,
        meta.seller_id,
      );
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
