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

const router = Router();

const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

router.use(applyApiMockUser);

router.get('/', requireRealAuth, (_req, res) => {
  const prioritizations = getAllPrioritizations();
  res.json(prioritizations);
});

router.post('/', requireCpscManager, (req, res) => {
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

  const result = createOrUpdatePrioritization(recall_id.trim(), priority, userId);

  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }

  res.status(201).json(result.data);
});

export default router;
