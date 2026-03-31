import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import { normalizeAppRole, USER_ROLES } from '../lib/roles.js';
import {
  dbFetchAssignmentQueueRows,
  dbFetchLatestViolationStatusByRecallIds,
  dbFetchLatestPrioritiesByRecallIds,
  dbResolveAppUserId,
} from '../lib/supabaseRecallData.js';
import {
  getAllAssignments,
  getAllRecalls,
  getLatestViolationStatusByRecallId,
  getPrioritizationByRecallId,
} from '../data/mockData.js';

const router = Router();

router.use(applyApiMockUser);

/** GET /api/investigators/queue */
router.get('/queue', requireRealAuth, async (req, res) => {
  if (req.isApiMockMode) {
    const assignments = getAllAssignments();
    const recalls = getAllRecalls();
    const recallsById = new Map(recalls.map((r) => [r.recall_id, r]));

    const queue = assignments
      .map((a) => {
        const recall = recallsById.get(a.recall_id);
        if (!recall) return null;
        const prioritization = getPrioritizationByRecallId(a.recall_id);
        return {
          recall_id: a.recall_id,
          title: recall.title,
          product: recall.product,
          hazard: recall.hazard,
          image_url: recall.image_url ?? null,
          investigator_user_id: a.investigator_user_id,
          assigned_at: a.assigned_at,
          priority: prioritization?.priority ?? null,
          violation_status: getLatestViolationStatusByRecallId(a.recall_id),
        };
      })
      .filter(Boolean);

    return res.json(queue);
  }

  if (!req.supabase) {
    return res.status(503).json({ error: 'Database client not available' });
  }

  try {
    const email = req.user?.email ?? '';
    const jwtSub = req.user?.id;
    const metaRole = req.user?.user_metadata?.role ?? req.user?.app_metadata?.role;

    const appUserId = await dbResolveAppUserId(req.supabase, email, jwtSub);

    let dbRole = normalizeAppRole(null, metaRole);
    if (appUserId != null) {
      const { data: userRow } = await req.supabase
        .from('app_users')
        .select('user_type')
        .eq('user_id', appUserId)
        .maybeSingle();
      dbRole = normalizeAppRole(userRow, metaRole);
    }

    const rows = await dbFetchAssignmentQueueRows(req.supabase);
    const recallPkIds = rows.map((r) => r._pk).filter(Boolean);

    const [violationMap, priorityMap] = await Promise.all([
      dbFetchLatestViolationStatusByRecallIds(req.supabase, recallPkIds),
      dbFetchLatestPrioritiesByRecallIds(req.supabase, recallPkIds),
    ]);

    let queue = rows.map((r) => ({
      recall_id: r.recall_id,
      title: r.title,
      product: r.product,
      hazard: r.hazard,
      image_url: r.image_url ?? null,
      investigator_user_id: r.investigator_user_id,
      assigned_at: r.assigned_at,
      priority: priorityMap[r._pk] ?? null,
      violation_status: violationMap[r._pk] ?? null,
    }));

    if (dbRole === USER_ROLES.INVESTIGATOR) {
      queue = queue.filter((r) => r.investigator_user_id === appUserId);
    }

    return res.json(queue);
  } catch (err) {
    console.error('investigators/queue:', err);
    return res.status(500).json({ error: err.message || 'Failed to load investigator queue' });
  }
});

export default router;
