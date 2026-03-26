import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { Router } from 'express';
import {
  getAllRecalls,
  getRecallById,
  getRecallByRecallId,
} from '../data/mockData.js';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import {
  attachProfileAndRole,
  requireApprovedProfile,
  requireRoles,
} from '../middleware/rbac.js';
import {
  dbFetchRecalls,
  dbInsertRecall,
  dbUpdateRecall,
} from '../lib/supabaseRecallData.js';
import { getAdminClient } from '../lib/supabaseAdmin.js';
import { resolveRecallPk } from '../lib/recallHelpers.js';
import { USER_ROLES } from 'shared';

const RECALL_WRITE_ROLES = [USER_ROLES.ADMIN, USER_ROLES.MANAGER];

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(applyApiMockUser);
router.use(requireRealAuth);
router.use(attachProfileAndRole);
router.use(requireApprovedProfile);

router.get('/', async (req, res) => {
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

router.post(
  '/import',
  requireRoles(RECALL_WRITE_ROLES),
  upload.single('file'),
  async (req, res) => {
    if (req.isApiMockMode) {
      return res.json({ imported: 0, skipped: 0, errors: [] });
    }
    const admin = getAdminClient();
    if (!admin) return res.status(503).json({ error: 'Server configuration error' });
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'file field required (CSV)' });
    }

    let records;
    try {
      const text = req.file.buffer.toString('utf8');
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (e) {
      return res.status(400).json({ error: `Invalid CSV: ${e.message}` });
    }

    const imported = [];
    const errors = [];
    let skipped = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const recall_number = row.recall_number ?? row.recall_id ?? row.RecallNumber;
      const recall_title = row.recall_title ?? row.title ?? row.product_name ?? 'Imported recall';
      const product_name = row.product_name ?? row.product ?? '';
      const hazard = row.hazard ?? '';
      if (!recall_number) {
        errors.push({ row: i + 2, message: 'missing recall_number' });
        skipped += 1;
        continue;
      }
      const { data: exists } = await admin
        .from('recall')
        .select('recall_id')
        .eq('recall_number', String(recall_number).trim())
        .maybeSingle();
      if (exists) {
        skipped += 1;
        continue;
      }
      const result = await dbInsertRecall(admin, {
        recall_number: String(recall_number).trim(),
        recall_title,
        product_name,
        hazard,
        recall_date: row.recall_date ?? null,
        description: row.description ?? null,
        remedy: row.remedy ?? null,
        status: row.status ?? 'Active',
        image_url: row.image_url ?? null,
      });
      if (!result.success) {
        errors.push({ row: i + 2, message: result.error });
        skipped += 1;
      } else {
        imported.push(result.data);
      }
    }

    return res.json({
      imported: imported.length,
      skipped,
      errors,
    });
  },
);

router.post('/', requireRoles(RECALL_WRITE_ROLES), async (req, res) => {
  if (req.isApiMockMode) {
    return res.status(201).json({
      id: 'new',
      recall_id: req.body.recall_number ?? 'NEW',
      title: req.body.recall_title ?? '',
      product: '',
      hazard: '',
      created_at: new Date().toISOString(),
    });
  }
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });
  const result = await dbInsertRecall(admin, req.body ?? {});
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json(result.data);
});

router.patch('/:id', requireRoles(RECALL_WRITE_ROLES), async (req, res) => {
  if (req.isApiMockMode) {
    return res.json({ ok: true });
  }
  const admin = getAdminClient();
  if (!admin) return res.status(503).json({ error: 'Server configuration error' });
  const pk = await resolveRecallPk(admin, req.params.id);
  if (pk == null) return res.status(404).json({ error: 'Recall not found' });
  const result = await dbUpdateRecall(admin, pk, req.body ?? {});
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.json(result.data);
});

router.get('/:id', async (req, res) => {
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
