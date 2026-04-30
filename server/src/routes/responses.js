import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchResponses,
  dbCreateSellerResponseAtomic,
  dbCreateResponse,
  dbFetchViolationWorkflowMeta,
  dbFetchViolationAuthMeta,
  dbHasAdjudicationForViolation,
  dbSellerResponderExistsForViolation,
  dbMarkViolationReadyForAdjudication,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';
import {
  normalizeAppRole,
  USER_ROLES,
  canViewOperationalSprintPages,
  SPRINT3_VIOLATION_STATUS,
} from 'shared';
import { assertViolationAccess, isDemoSellerFullAccess } from '../lib/violationAccess.js';

const router = Router();
router.use(applyApiMockUser);

const VALID_ACTIONS = ['listing_removed', 'listing_edited', 'disputed', 'no_action'];

const TERMINAL_VIOLATION_STATUSES = new Set([
  SPRINT3_VIOLATION_STATUS.APPROVED,
  SPRINT3_VIOLATION_STATUS.REJECTED,
  SPRINT3_VIOLATION_STATUS.ESCALATED,
  SPRINT3_VIOLATION_STATUS.ARCHIVED,
]);

function isViolationTerminal(status) {
  return TERMINAL_VIOLATION_STATUSES.has(status);
}

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
    let filterUserId = null;
    if (role === USER_ROLES.SELLER) {
      if (isDemoSellerFullAccess(req) && Number.isFinite(violationId)) {
        filterUserId = null;
      } else {
        filterUserId = userId;
      }
    }
    const rows = await dbFetchResponses(req.supabase, {
      violationId: Number.isFinite(violationId) ? violationId : null,
      userId: filterUserId,
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

  const body = req.body ?? {};
  const { violation_id, response_text, action_taken, responder_type, record_no_seller_reply } = body;

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

    const meta = await dbFetchViolationWorkflowMeta(req.supabase, vid);
    if (!meta) return res.status(404).json({ error: 'Violation ID not found' });

    if (role === USER_ROLES.SELLER) {
      if (!isDemoSellerFullAccess(req)) {
        const sellerEmail = meta.listing?.seller?.seller_email
          ? String(meta.listing.seller.seller_email).trim().toLowerCase()
          : null;
        const loggedInEmail = req.user?.email ? String(req.user.email).trim().toLowerCase() : null;
        if (!sellerEmail || !loggedInEmail || sellerEmail !== loggedInEmail) {
          return res
            .status(403)
            .json({ error: 'You are not authorized to respond to this violation' });
        }
      }

      if (await dbHasAdjudicationForViolation(req.supabase, vid)) {
        return res.status(409).json({
          error: 'This violation already has a final decision and cannot accept new seller responses',
        });
      }
      if (isViolationTerminal(meta.violation_status)) {
        return res.status(409).json({
          error: 'This violation is closed and cannot accept new responses',
        });
      }

      const trimmed = String(response_text).trim();
      const sellerPayload = {
        violation_id: vid,
        user_id: userId,
        seller_id: meta.listing?.seller_id ?? null,
        response_text: trimmed,
        action_taken: action_taken ?? null,
      };

      const row = (await dbSellerResponderExistsForViolation(req.supabase, vid))
        ? await dbCreateResponse(req.supabase, { ...sellerPayload, responder_type: 'seller' })
        : await dbCreateSellerResponseAtomic(req.supabase, sellerPayload);

      return res.status(201).json(row);
    }

    if (!canViewOperationalSprintPages(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const authMeta = await dbFetchViolationAuthMeta(req.supabase, vid);
    if (!authMeta) return res.status(404).json({ error: 'Violation ID not found' });

    const allowed = await assertViolationAccess(
      req,
      res,
      req.supabase,
      authMeta.user_id,
      authMeta.seller_id,
    );
    if (!allowed) return;

    if (await dbHasAdjudicationForViolation(req.supabase, vid)) {
      return res.status(409).json({
        error: 'An adjudication already exists for this violation',
      });
    }
    if (isViolationTerminal(meta.violation_status)) {
      return res.status(409).json({
        error: 'This violation is closed and cannot accept new responses',
      });
    }

    const rtRaw = responder_type != null ? String(responder_type).trim().toLowerCase() : 'seller';
    const rt = rtRaw === 'investigator' ? 'investigator' : rtRaw === 'seller' ? 'seller' : null;
    if (!rt) {
      return res.status(400).json({ error: 'responder_type must be seller or investigator' });
    }

    const wantsNoReply = Boolean(record_no_seller_reply);
    if (wantsNoReply && rt !== 'investigator') {
      return res.status(400).json({
        error: 'record_no_seller_reply requires responder_type investigator',
      });
    }

    const trimmed = String(response_text).trim();
    const row = await dbCreateResponse(req.supabase, {
      violation_id: vid,
      user_id: userId,
      seller_id: rt === 'seller' ? meta.listing?.seller_id ?? null : null,
      response_text: trimmed,
      action_taken: action_taken ?? null,
      responder_type: rt,
    });

    if (wantsNoReply) {
      await dbMarkViolationReadyForAdjudication(req.supabase, vid);
    }

    return res.status(201).json(row);
  } catch (err) {
    console.error('POST /responses:', err);
    return res.status(500).json({ error: err.message || 'Failed to create response' });
  }
});

export default router;
