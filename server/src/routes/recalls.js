import { Router } from 'express';
import {
  getAllRecalls,
  getRecallById,
  getRecallByRecallId,
} from '../data/mockData.js';
import {
  applyApiMockUser,
  requireCpscManager,
} from '../middleware/requireCpscManager.js';

const router = Router();

router.use(applyApiMockUser);
router.use(requireCpscManager);

router.get('/', (_req, res) => {
  const recalls = getAllRecalls();
  res.json(recalls);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const recall = getRecallById(id) ?? getRecallByRecallId(id);
  if (!recall) {
    return res.status(404).json({ error: 'Recall not found' });
  }
  res.json(recall);
});

export default router;
