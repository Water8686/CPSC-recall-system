import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchResponses,
  dbCreateResponse,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';

const router = Router();
router.use(applyApiMockUser);

const VALID_ACTIONS = ['listing_removed', 'listing_edited', 'disputed', 'no_action'];

/** GET /api/responses */
router.get('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });
  try {
    const rows = await dbFetchResponses(req.supabase);
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
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const row = await dbCreateResponse(req.supabase, {
      violation_id: Number(violation_id),
      seller_id: userId,
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
