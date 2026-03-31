import { Router } from 'express';
import {
  getAllRecalls,
  getRecallByRecallId,
  normalizeRecallDetailShape,
  updateRecallByRecallId,
  deleteRecallByRecallId,
} from '../data/mockData.js';
import { applyApiMockUser, requireRealAuth } from '../middleware/requireCpscManager.js';
import { requireCpscManager } from '../middleware/requireCpscManager.js';
import {
  dbDeleteRecall,
  dbFetchRecalls,
  dbFetchRecallDetailByRecallNumber,
  dbUpdateRecall,
} from '../lib/supabaseRecallData.js';

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
    const recall = getRecallByRecallId(id);
    if (!recall) {
      return res.status(404).json({ error: 'Recall not found' });
    }
    return res.json(normalizeRecallDetailShape(recall));
  }
  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }
  try {
    const hit = await dbFetchRecallDetailByRecallNumber(req.supabase, id);
    if (!hit) {
      return res.status(404).json({ error: 'Recall not found' });
    }
    return res.json(hit);
  } catch (err) {
    console.error('recall by id:', err);
    return res.status(500).json({ error: err.message || 'Failed to load recall' });
  }
});

router.patch('/:id', requireCpscManager, async (req, res) => {
  const { id } = req.params;

  const patch = {
    title: req.body?.title,
    product: req.body?.product,
    hazard: req.body?.hazard,
    image_url: req.body?.image_url,
  };

  if (req.isApiMockMode) {
    const recall = getRecallByRecallId(id);
    if (!recall) {
      return res.status(404).json({ error: 'Recall not found' });
    }
    const result = updateRecallByRecallId(recall.recall_id, {
      title: patch.title !== undefined ? String(patch.title) : recall.title,
      product: patch.product !== undefined ? String(patch.product) : recall.product,
      hazard: patch.hazard !== undefined ? String(patch.hazard) : recall.hazard,
      image_url: patch.image_url !== undefined ? String(patch.image_url) : recall.image_url,
    });
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json(result.data);
  }

  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }

  try {
    const result = await dbUpdateRecall(req.supabase, id, patch);
    if (!result.success) {
      const status = result.error === 'Recall not found' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    return res.json(result.data);
  } catch (err) {
    console.error('dbUpdateRecall:', err);
    return res.status(500).json({ error: err.message || 'Failed to update recall' });
  }
});

router.delete('/:id', requireCpscManager, async (req, res) => {
  const { id } = req.params;

  if (req.isApiMockMode) {
    const recall = getRecallByRecallId(id);
    if (!recall) {
      return res.status(404).json({ error: 'Recall not found' });
    }
    const result = deleteRecallByRecallId(recall.recall_id);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ success: true });
  }

  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }

  try {
    const result = await dbDeleteRecall(req.supabase, id);
    if (!result.success) {
      const status = result.error === 'Recall not found' ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('dbDeleteRecall:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete recall' });
  }
});

export default router;
