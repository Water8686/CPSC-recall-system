import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchResponses,
  dbCreateResponse,
  dbFetchViolationAuthMeta,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';
import { assertViolationAccess } from '../lib/violationAccess.js';
import { USER_ROLES } from '../lib/roles.js';

const router = Router();
router.use(applyApiMockUser);

const VALID_ACTIONS = ['listing_removed', 'listing_edited', 'disputed', 'no_action'];
const VALID_RESPONDER_TYPES = ['seller', 'investigator'];

/** GET /api/responses — sellers are denied (they use the violation detail page thread) */
router.get('/', requireRealAuth, async (req, res) => {
  const role = req.user?.user_metadata?.role;
  if (!req.isApiMockMode && role === USER_ROLES.SELLER) {
    return res
      .status(403)
      .json({ error: 'Sellers view responses through the violation detail page.' });
  }
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });
  try {
    const rows = await dbFetchResponses(req.supabase);
    return res.json(rows);
  } catch (err) {
    console.error('GET /responses:', err);
    return res.status(500).json({ error: err.message || 'Failed to load responses' });
  }
});

/** POST /api/responses — sellers may reply; responder_type is forced to 'seller' for them */
router.post('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const { violation_id, response_text, action_taken, responder_type } = req.body ?? {};

  if (!violation_id) return res.status(400).json({ error: 'violation_id is required' });
  if (!response_text || !String(response_text).trim()) {
    return res.status(400).json({ error: 'response_text is required' });
  }
  if (action_taken && !VALID_ACTIONS.includes(action_taken)) {
    return res.status(400).json({
      error: `action_taken must be one of: ${VALID_ACTIONS.join(', ')}`,
    });
  }

  // Sellers always post as 'seller'; staff may specify responder_type.
  const role = req.user?.user_metadata?.role;
  let rt;
  if (!req.isApiMockMode && role === USER_ROLES.SELLER) {
    rt = 'seller';
  } else {
    rt = responder_type ? String(responder_type).trim() : null;
    if (rt && !VALID_RESPONDER_TYPES.includes(rt)) {
      return res.status(400).json({
        error: `responder_type must be one of: ${VALID_RESPONDER_TYPES.join(', ')}`,
      });
    }
  }

  try {
    const vid = Number(violation_id);
    if (!req.isApiMockMode) {
      const meta = await dbFetchViolationAuthMeta(req.supabase, vid);
      if (!meta) return res.status(404).json({ error: 'Violation not found' });
      const allowed = await assertViolationAccess(
        req,
        res,
        req.supabase,
        meta.user_id,
        meta.seller_id,
      );
      if (!allowed) return;
    }

    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const row = await dbCreateResponse(req.supabase, {
      violation_id: vid,
      user_id: userId,
      response_text: String(response_text).trim(),
      action_taken: action_taken ?? null,
      responder_type: rt ?? undefined,
    });
    return res.status(201).json(row);
  } catch (err) {
    console.error('POST /responses:', err);
    return res.status(500).json({ error: err.message || 'Failed to create response' });
  }
});

export default router;
