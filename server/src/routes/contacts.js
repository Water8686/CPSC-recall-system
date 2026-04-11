import { Router } from 'express';
import {
  applyApiMockUser,
  requireRealAuth,
  requireOperationalStaff,
} from '../middleware/requireCpscManager.js';
import {
  dbCreateContact,
  dbFetchViolationAuthMeta,
} from '../lib/supabaseViolationData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';
import { assertViolationAccess } from '../lib/violationAccess.js';

const router = Router();
router.use(applyApiMockUser);

/** POST /api/contacts — log seller outreach; optional mark_notice_sent updates violation; staff only */
router.post('/', requireRealAuth, requireOperationalStaff, async (req, res) => {
  const {
    violation_id,
    message_summary,
    contact_channel,
    contact_sent_at,
    mark_notice_sent,
    notice_sent_at,
  } = req.body ?? {};

  const vid = Number(violation_id);
  if (!Number.isFinite(vid)) {
    return res.status(400).json({ error: 'violation_id is required' });
  }

  if (req.isApiMockMode) {
    return res.status(201).json({
      contact_id: 1,
      violation_id: vid,
      user_id: 1,
      contacted_party_type: 'seller',
      contact_channel: contact_channel ?? null,
      message_summary: String(message_summary ?? 'Notice logged').trim(),
      contact_sent_at: new Date().toISOString(),
      responses: [],
    });
  }

  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  try {
    const meta = await dbFetchViolationAuthMeta(req.supabase, vid);
    if (!meta) return res.status(404).json({ error: 'Violation not found' });
    const allowed = await assertViolationAccess(req, res, req.supabase, meta.user_id, meta.seller_id);
    if (!allowed) return;

    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);
    const row = await dbCreateContact(req.supabase, {
      violation_id: vid,
      user_id: userId,
      message_summary,
      contact_channel,
      contact_sent_at,
      mark_notice_sent: Boolean(mark_notice_sent),
      notice_sent_at,
    });
    return res.status(201).json(row);
  } catch (err) {
    console.error('POST /contacts:', err);
    const status =
      err.message?.includes('required') || err.message?.includes('not found') ? 400 : 500;
    return res.status(status).json({ error: err.message || 'Failed to create contact' });
  }
});

export default router;
