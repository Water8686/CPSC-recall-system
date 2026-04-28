import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
} from '../middleware/requireCpscManager.js';
import { USER_ROLES } from '../lib/roles.js';

const router = Router();
router.use(applyApiMockUser);

const PRIORITY_BUCKETS = ['High', 'Medium', 'Low'];
const STATUS_BUCKETS = ['Open', 'Resolved', 'Other'];
const ADJUDICATION_BUCKETS = ['Approved', 'Closed', 'Pending Remediation'];

function monthKey(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabel(month) {
  const [y, m] = String(month).split('-');
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

function buildMonthlySeries(rows, dateField, valueField, limit = 6) {
  const monthTotals = new Map();
  for (const row of rows) {
    const key = monthKey(row?.[dateField]);
    if (!key) continue;
    const add = valueField ? Number(row?.[valueField] ?? 0) : 1;
    monthTotals.set(key, (monthTotals.get(key) || 0) + (Number.isFinite(add) ? add : 0));
  }

  const months = [...monthTotals.keys()].sort().slice(-limit);
  return months.map((month) => ({
    month,
    label: monthLabel(month),
    value: monthTotals.get(month) || 0,
  }));
}

function normalizePriority(raw) {
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    if (numeric === 1) return 'High';
    if (numeric === 2) return 'Medium';
    if (numeric === 3) return 'Low';
  }

  const value = String(raw || '').trim().toLowerCase();
  if (!value) return null;
  // Keep backward compatibility if older data contains "critical".
  if (value === 'critical') return 'High';
  if (value === 'high') return 'High';
  if (value === 'medium') return 'Medium';
  if (value === 'low') return 'Low';
  return null;
}

function statusBucket(statusRaw) {
  const status = String(statusRaw || '').trim().toLowerCase();
  if (!status) return 'Other';
  if (status === 'open' || status === 'notice sent' || status === 'response submitted') return 'Open';
  if (
    status === 'approved' ||
    status === 'rejected' ||
    status === 'escalated' ||
    status === 'archived' ||
    status === 'closed'
  ) {
    return 'Resolved';
  }
  return 'Other';
}

function adjudicationBucket(outcomeRaw) {
  const value = String(outcomeRaw || '').trim().toLowerCase();
  if (value === 'approved') return 'Approved';
  if (value === 'rejected' || value === 'archive') return 'Closed';
  if (value === 'escalated') return 'Pending Remediation';
  return null;
}

/** GET /api/stats/dashboard */
router.get('/dashboard', requireRealAuth, async (req, res) => {
  if (!req.isApiMockMode && req.user?.user_metadata?.role === USER_ROLES.SELLER) {
    return res.status(403).json({ error: 'Sellers do not have access to dashboard statistics.' });
  }
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  try {
    const [violationsRes, prioritizationsRes, responsesRes, adjudicationsRes] = await Promise.all([
      req.supabase
        .from('violation')
        .select('violation_id, listing_id, violation_status, violation_noticed_at'),
      req.supabase.from('prioritization').select('priority_rank, prioritized_at'),
      req.supabase.from('response').select('response_received_at'),
      req.supabase.from('adjudication').select('outcome, adjudicated_at'),
    ]);

    const violations = violationsRes.data || [];
    const prioritizations = prioritizationsRes.data || [];
    const responses = responsesRes.data || [];
    const adjudications = adjudicationsRes.data || [];

    const openViolations = violations.filter((row) => statusBucket(row.violation_status) === 'Open');
    const open_violations_total = openViolations.length;

    const open_violations_over_time = buildMonthlySeries(
      openViolations,
      'violation_noticed_at',
      null,
      8,
    );

    const listingStatusSets = {
      Open: new Set(),
      Resolved: new Set(),
      Other: new Set(),
    };
    for (const row of violations) {
      const bucket = statusBucket(row.violation_status);
      if (row.listing_id != null) {
        listingStatusSets[bucket].add(row.listing_id);
      }
    }
    const listings_by_violation_status = STATUS_BUCKETS.map((status) => ({
      status,
      count: listingStatusSets[status].size,
    }));

    const priorityCounts = { High: 0, Medium: 0, Low: 0 };
    for (const row of prioritizations) {
      const bucket = normalizePriority(row.priority_rank);
      if (bucket) priorityCounts[bucket] += 1;
    }
    const recalls_by_priority_counts = PRIORITY_BUCKETS.map((priority) => ({
      priority,
      count: priorityCounts[priority],
    }));
    const totalPriority = recalls_by_priority_counts.reduce((sum, row) => sum + row.count, 0);
    const recalls_by_priority_percent = recalls_by_priority_counts.map((row) => ({
      ...row,
      percent: totalPriority > 0 ? Math.round((row.count / totalPriority) * 100) : 0,
    }));
    const violations_by_priority = recalls_by_priority_counts;

    const adjudicationCounts = { Approved: 0, Closed: 0, 'Pending Remediation': 0 };
    for (const row of adjudications) {
      const bucket = adjudicationBucket(row.outcome);
      if (bucket) adjudicationCounts[bucket] += 1;
    }
    const adjudication_outcomes = ADJUDICATION_BUCKETS.map((outcome) => ({
      outcome,
      count: adjudicationCounts[outcome],
    }));

    const responses_by_month = buildMonthlySeries(responses, 'response_received_at', null, 8);

    return res.json({
      open_violations_total,
      open_violations_over_time,
      listings_by_violation_status,
      recalls_by_priority_percent,
      violations_by_priority,
      adjudication_outcomes,
      recalls_by_priority_counts,
      responses_by_month,
    });
  } catch (err) {
    console.error('GET /stats/dashboard:', err);
    return res.status(500).json({ error: err.message || 'Failed to load dashboard stats' });
  }
});

export default router;
