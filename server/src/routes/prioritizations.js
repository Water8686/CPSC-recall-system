import { Router } from 'express';
import {
  getAllPrioritizations,
  createOrUpdatePrioritization,
} from '../data/mockData.js';
import {
  applyApiMockUser,
  requireRealAuth,
  requireCpscManager,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchPrioritizations,
  dbUpsertPrioritization,
  dbResolveAppUserId,
} from '../lib/supabaseRecallData.js';

const router = Router();

const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

router.use(applyApiMockUser);

router.get('/', requireRealAuth, async (req, res) => {
  if (req.isApiMockMode) {
    return res.json(getAllPrioritizations());
  }
  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }
  try {
    const rows = await dbFetchPrioritizations(req.supabase);
    return res.json(rows);
  } catch (err) {
    console.error('dbFetchPrioritizations:', err);
    return res.status(500).json({ error: err.message || 'Failed to load prioritizations' });
  }
});

router.post('/', requireCpscManager, async (req, res) => {
  const { recall_id, priority } = req.body;
  const userId = req.user?.id ?? 'mock-user-id';

  if (!recall_id || typeof recall_id !== 'string') {
    return res.status(400).json({ error: 'recall_id is required' });
  }
  if (!priority || !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({
      error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
    });
  }

  if (req.isApiMockMode) {
    const result = createOrUpdatePrioritization(recall_id.trim(), priority, userId);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    return res.status(201).json(result.data);
  }

  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }

  const email = req.user?.email ?? '';
  const appUserId = await dbResolveAppUserId(req.supabase, email);

  const result = await dbUpsertPrioritization(
    req.supabase,
    recall_id.trim(),
    priority,
    appUserId,
  );

  if (!result.success) {
    const status = result.error === 'Recall ID does not exist' ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  return res.status(201).json(result.data);
});

export default router;
