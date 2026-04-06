import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import {
  dbFetchListings,
  dbCreateListing,
  dbAnnotateListing,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';

const router = Router();
router.use(applyApiMockUser);

/** GET /api/listings?recall_id=:id */
router.get('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });
  try {
    const recallId = req.query.recall_id ? Number(req.query.recall_id) : undefined;
    const rows = await dbFetchListings(req.supabase, { recallId });
    return res.json(rows);
  } catch (err) {
    console.error('GET /listings:', err);
    return res.status(500).json({ error: err.message || 'Failed to load listings' });
  }
});

/** POST /api/listings */
router.post('/', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const { recall_id, url, marketplace, title, price, description, source, seller_name, seller_email, listed_at } = req.body ?? {};

  if (!recall_id) return res.status(400).json({ error: 'recall_id is required' });
  if (!url || !String(url).trim()) return res.status(400).json({ error: 'url is required' });

  try {
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const row = await dbCreateListing(req.supabase, {
      recall_id: recall_id != null ? Number(recall_id) : null,
      url: String(url).trim(),
      marketplace: marketplace ? String(marketplace).trim() : 'Unknown',
      title: title ? String(title).trim() : null,
      price: price != null ? Number(price) : null,
      description: description ? String(description).trim() : null,
      source: source || 'Manual',
      listed_at: listed_at || null,
      added_by: userId,
    });
    return res.status(201).json(row);
  } catch (err) {
    console.error('POST /listings:', err);
    return res.status(500).json({ error: err.message || 'Failed to create listing' });
  }
});

/** PATCH /api/listings/:id/annotate */
router.patch('/:id/annotate', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const listingId = Number(req.params.id);
  if (!Number.isFinite(listingId)) return res.status(400).json({ error: 'Invalid listing id' });

  const { is_true_match, annotation_notes } = req.body ?? {};
  if (is_true_match === undefined) {
    return res.status(400).json({ error: 'is_true_match (boolean) is required' });
  }

  try {
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const row = await dbAnnotateListing(req.supabase, listingId, {
      is_true_match: Boolean(is_true_match),
      annotation_notes: annotation_notes ? String(annotation_notes).trim() : null,
      annotated_by: userId,
    });
    return res.json(row);
  } catch (err) {
    console.error('PATCH /listings/:id/annotate:', err);
    return res.status(500).json({ error: err.message || 'Failed to annotate listing' });
  }
});

export default router;
