import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchResponses,
  dbCreateSellerResponseAtomic,
  dbFetchViolationWorkflowMeta,
  dbHasResponseForViolation,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';
import { normalizeAppRole, USER_ROLES } from '../lib/roles.js';

const router = Router();
router.use(applyApiMockUser);

const VALID_ACTIONS = ['listing_removed', 'listing_edited', 'disputed', 'no_action'];

/** GET /api/responses */
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
    const rows = await dbFetchResponses(req.supabase, {
      violationId: Number.isFinite(violationId) ? violationId : null,
      userId: role === USER_ROLES.SELLER ? userId : null,
    });
    return res.json(rows);
  } catch (err) {
    console.error('GET /responses:', err);
    return res.status(500).json({ error: err.message || 'Failed to load responses' });
  }
});

/** POST /api/responses */
router.post('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const { violation_id, response_text, action_taken } = req.body ?? {};

  if (!violation_id) return res.status(400).json({ error: 'violation_id is required' });
  if (!response_text || !String(response_text).trim()) {
    return res.status(400).json({ error: 'response_text is required' });
  }
  if (action_taken && !VALID_ACTIONS.includes(action_taken)) {
    return res.status(400).json({
      error: `action_taken must be one of: ${VALID_ACTIONS.join(', ')}`,
    });
  }
  try {
    const vid = Number(violation_id);
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const { data: appRow } = await req.supabase
      .from('app_users')
      .select('user_type')
      .eq('user_id', userId)
      .maybeSingle();
    const role = normalizeAppRole(appRow, req.user?.user_metadata?.role ?? req.user?.app_metadata?.role);
    if (role !== USER_ROLES.SELLER) {
      return res.status(403).json({ error: 'Access denied: seller role required' });
    }

    const meta = await dbFetchViolationWorkflowMeta(req.supabase, vid);
    if (!meta) return res.status(404).json({ error: 'Violation ID not found' });

    const sellerEmail = meta.listing?.seller?.seller_email
      ? String(meta.listing.seller.seller_email).trim().toLowerCase()
      : null;
    const loggedInEmail = req.user?.email ? String(req.user.email).trim().toLowerCase() : null;
    if (!sellerEmail || !loggedInEmail || sellerEmail !== loggedInEmail) {
      return res
        .status(403)
        .json({ error: 'You are not authorized to respond to this violation' });
    }

    if (await dbHasResponseForViolation(req.supabase, vid)) {
      return res
        .status(409)
        .json({ error: 'A response has already been submitted for this violation' });
    }

    const row = await dbCreateSellerResponseAtomic(req.supabase, {
      violation_id: vid,
      user_id: userId,
      seller_id: meta.listing?.seller_id ?? null,
      response_text: String(response_text).trim(),
      action_taken: action_taken ?? null,
    });
    return res.status(201).json(row);
  } catch (err) {
    console.error('POST /responses:', err);
    return res.status(500).json({ error: err.message || 'Failed to create response' });
  }
});

export default router;
