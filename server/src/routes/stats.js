import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';

const router = Router();
router.use(applyApiMockUser);

/** GET /api/stats/dashboard */
router.get('/dashboard', requireRealAuth, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  try {
    const [
      openViolationsRes,
      noticeSentRes,
      listingsRes,
      prioritizationsRes,
      violationsByTypeRes,
      listingsByMarketplaceRes,
    ] = await Promise.all([
      req.supabase
        .from('violation')
        .select('violation_id', { count: 'exact', head: true })
        .eq('violation_status', 'Open'),
      req.supabase
        .from('violation')
        .select('violation_id', { count: 'exact', head: true })
        .eq('violation_status', 'Notice Sent'),
      req.supabase
        .from('listing')
        .select('listing_id', { count: 'exact', head: true }),
      req.supabase
        .from('prioritization')
        .select('prioritization_id', { count: 'exact', head: true }),
      req.supabase
        .from('violation')
        .select('violation_type'),
      req.supabase
        .from('listing')
        .select('marketplace_id, marketplace(marketplace_name)'),
    ]);

    const typeCounts = {};
    (violationsByTypeRes.data || []).forEach((row) => {
      const t = row.violation_type || 'Unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const violations_by_type = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));

    const mktCounts = {};
    (listingsByMarketplaceRes.data || []).forEach((row) => {
      const m = row.marketplace?.marketplace_name || 'Unknown';
      mktCounts[m] = (mktCounts[m] || 0) + 1;
    });
    const listings_by_marketplace = Object.entries(mktCounts).map(
      ([marketplace, count]) => ({ marketplace, count }),
    );

    return res.json({
      open_violations: openViolationsRes.count ?? 0,
      pending_responses: noticeSentRes.count ?? 0,
      active_listings: listingsRes.count ?? 0,
      prioritized_recalls: prioritizationsRes.count ?? 0,
      violations_by_type,
      listings_by_marketplace,
    });
  } catch (err) {
    console.error('GET /stats/dashboard:', err);
    return res.status(500).json({ error: err.message || 'Failed to load dashboard stats' });
  }
});

export default router;
