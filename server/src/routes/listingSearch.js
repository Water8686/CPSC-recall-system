import { Router } from 'express';
import {
  applyApiMockUser,
  requireInvestigatorOrAdmin,
} from '../middleware/requireCpscManager.js';
import { searchEbay } from '../lib/ebayApi.js';
import { searchSerpApi } from '../lib/serpApi.js';

const router = Router();
router.use(applyApiMockUser);

/** POST /api/listings/search/ebay */
router.post('/search/ebay', requireInvestigatorOrAdmin, async (req, res) => {
  const { query, recall_id } = req.body ?? {};
  if (!query || !String(query).trim()) {
    return res.status(400).json({ error: 'query is required' });
  }
  try {
    const results = await searchEbay(String(query).trim());
    return res.json({ recall_id, results });
  } catch (err) {
    console.error('POST /listings/search/ebay:', err);
    if (err.message.includes('EBAY_CLIENT_ID')) {
      return res.json({
        recall_id,
        results: [],
        warning: 'eBay API credentials not configured. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in .env',
      });
    }
    return res.status(502).json({ error: err.message || 'eBay search failed' });
  }
});

/** POST /api/listings/search/serpapi — Google Shopping results across marketplaces */
router.post('/search/serpapi', requireInvestigatorOrAdmin, async (req, res) => {
  const { query, recall_id } = req.body ?? {};
  if (!query || !String(query).trim()) {
    return res.status(400).json({ error: 'query is required' });
  }
  try {
    const results = await searchSerpApi(String(query).trim());
    return res.json({ recall_id, results });
  } catch (err) {
    console.error('POST /listings/search/serpapi:', err);
    if (err.message.includes('SERPAPI_KEY')) {
      return res.json({
        recall_id,
        results: [],
        warning: 'SerpAPI key not configured. Set SERPAPI_KEY in Railway environment variables.',
      });
    }
    return res.status(502).json({ error: err.message || 'SerpAPI search failed' });
  }
});

export default router;
