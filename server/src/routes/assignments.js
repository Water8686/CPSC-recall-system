import { Router } from 'express';
import {
  getAllAssignments,
  createOrUpdateAssignment,
} from '../data/mockData.js';
import {
  applyApiMockUser,
  requireRealAuth,
  requireCpscManager,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchAssignments,
  dbUpsertAssignment,
  dbResolveAppUserId,
} from '../lib/supabaseRecallData.js';

const router = Router();

router.use(applyApiMockUser);

/** GET /api/assignments */
router.get('/', requireRealAuth, async (req, res) => {
  if (req.isApiMockMode) {
    return res.json(getAllAssignments());
  }
  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }
  try {
    const rows = await dbFetchAssignments(req.supabase);
    return res.json(rows);
  } catch (err) {
    console.error('dbFetchAssignments:', err);
    return res.status(500).json({ error: err.message || 'Failed to load assignments' });
  }
});

/** POST /api/assignments (manager/admin only) */
router.post('/', requireCpscManager, async (req, res) => {
  const rawRecallId = req.body?.recall_id;
  const rawInvestigatorUserId = req.body?.investigator_user_id;

  if (rawRecallId != null && typeof rawRecallId !== 'string') {
    return res.status(400).json({ error: 'Recall ID is required' });
  }
  const recall_id = typeof rawRecallId === 'string' ? rawRecallId.trim() : '';
  if (!recall_id) {
    return res.status(400).json({ error: 'Recall ID is required' });
  }

  const investigator_user_id = Number.parseInt(String(rawInvestigatorUserId ?? ''), 10);
  if (!Number.isFinite(investigator_user_id) || investigator_user_id < 1) {
    return res.status(400).json({ error: 'investigator_user_id must be a positive integer' });
  }

  if (req.isApiMockMode) {
    const userId = req.user?.id ?? 'mock-user-id';
    const result = createOrUpdateAssignment(recall_id, investigator_user_id, userId);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    return res.status(201).json(result.data);
  }

  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }

  const email = req.user?.email ?? '';
  const assignedByAppUserId = await dbResolveAppUserId(req.supabase, email, req.user?.id);

  const result = await dbUpsertAssignment(
    req.supabase,
    recall_id,
    investigator_user_id,
    assignedByAppUserId,
  );

  if (!result.success) {
    const status = result.error === 'Recall ID does not exist' ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  return res.status(201).json(result.data);
});

export default router;

