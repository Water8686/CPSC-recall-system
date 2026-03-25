import { Router } from 'express';
import {
  getAllRecalls,
  getRecallById,
  getRecallByRecallId,
} from '../data/mockData.js';
import { applyApiMockUser, requireRealAuth } from '../middleware/requireCpscManager.js';
import { dbFetchRecalls } from '../lib/supabaseRecallData.js';

const router = Router();

router.use(applyApiMockUser);

router.get('/', requireRealAuth, async (req, res) => {
  if (req.isApiMockMode) {
    return res.json(getAllRecalls());
  }
  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }
  try {
    const rows = await dbFetchRecalls(req.supabase);
    return res.json(rows);
  } catch (err) {
    console.error('dbFetchRecalls:', err);
    return res.status(500).json({ error: err.message || 'Failed to load recalls' });
  }
});

router.get('/:id', requireRealAuth, async (req, res) => {
  const { id } = req.params;
  if (req.isApiMockMode) {
    const recall = getRecallById(id) ?? getRecallByRecallId(id);
    if (!recall) {
      return res.status(404).json({ error: 'Recall not found' });
    }
    return res.json(recall);
  }
  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }
  try {
    const list = await dbFetchRecalls(req.supabase);
    const byPk = list.find((r) => r.id === id);
    const byNum = list.find((r) => r.recall_id === id);
    const hit = byPk ?? byNum;
    if (!hit) {
      return res.status(404).json({ error: 'Recall not found' });
    }
    return res.json(hit);
  } catch (err) {
    console.error('recall by id:', err);
    return res.status(500).json({ error: err.message || 'Failed to load recall' });
  }
});

export default router;
