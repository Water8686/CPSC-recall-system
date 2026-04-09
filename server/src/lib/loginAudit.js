import { createHmac, randomUUID } from 'crypto';
import { collectRequestAuditContext } from './requestAuditContext.js';
import { auditSupabase } from './auditSupabase.js';
import { normalizeAppRole } from './roles.js';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fingerprintHash(ctx) {
  const salt = process.env.LOGIN_AUDIT_SALT?.trim();
  if (!salt) return null;
  const payload = `${ctx.ip || ''}\n${ctx.user_agent || ''}`;
  return createHmac('sha256', salt).update(payload).digest('hex');
}

function baseLoginRow(req, { outcome, appUserId, emailNormalized, role }) {
  const ctx = collectRequestAuditContext(req);
  return {
    occurred_at: new Date().toISOString(),
    outcome,
    app_user_id: appUserId ?? null,
    email_normalized: emailNormalized ?? null,
    role: role ?? null,
    ip: ctx.ip,
    forwarded_for: ctx.forwarded_for,
    user_agent: ctx.user_agent,
    accept_language: ctx.accept_language,
    sec_ch_ua: ctx.sec_ch_ua,
    sec_ch_ua_platform: ctx.sec_ch_ua_platform,
    sec_ch_ua_mobile: ctx.sec_ch_ua_mobile,
    origin: ctx.origin,
    referer: ctx.referer,
    fingerprint_hash: fingerprintHash(ctx),
  };
}

/**
 * Fire-and-forget failed login / edge attempts (does not block response).
 * @param {import('express').Request} req
 * @param {{ outcome: string, emailNormalized: string, appUserId?: number | null, role?: string | null }} p
 */
export function logLoginAttemptAsync(req, { outcome, emailNormalized, appUserId = null, role = null }) {
  if (!auditSupabase) return;
  const row = baseLoginRow(req, { outcome, appUserId, emailNormalized, role });
  void auditSupabase
    .from('login_audit_events')
    .insert(row)
    .then(({ error }) => {
      if (error) console.error('loginAudit event:', error.message);
    });
}

/**
 * Successful login or register auto-login: insert event + session row; returns session id for client.
 * Awaits DB so session_id is reliable when audit is configured.
 * @param {import('express').Request} req
 * @param {{ user_id: number, email: string, user_type: string }} row
 * @param {string} outcome 'success' | 'register_auto_login'
 * @returns {Promise<string | null>}
 */
export async function recordSuccessfulLoginAndSession(req, row, outcome) {
  if (!auditSupabase) return null;

  const role = normalizeAppRole({ user_type: row.user_type }, null);
  const sessionId = randomUUID();
  const loginRow = baseLoginRow(req, {
    outcome,
    appUserId: row.user_id,
    emailNormalized: row.email,
    role,
  });

  try {
    const { data: ev, error: evErr } = await auditSupabase
      .from('login_audit_events')
      .insert(loginRow)
      .select('id')
      .single();

    if (evErr) {
      console.error('loginAudit success event:', evErr.message);
      return null;
    }

    const now = new Date().toISOString();
    const { error: sessErr } = await auditSupabase.from('login_audit_sessions').insert({
      session_id: sessionId,
      app_user_id: row.user_id,
      started_at: now,
      last_seen_at: now,
      ended_at: null,
      login_event_id: ev?.id ?? null,
    });

    if (sessErr) {
      console.error('loginAudit session:', sessErr.message);
      return null;
    }

    return sessionId;
  } catch (e) {
    console.error('loginAudit:', e);
    return null;
  }
}

export function isValidSessionUuid(s) {
  return typeof s === 'string' && UUID_V4.test(s.trim());
}

/**
 * @param {number} appUserId
 * @param {string} sessionId
 */
export async function touchAuditSession(appUserId, sessionId) {
  if (!auditSupabase) return { ok: true, skipped: true };
  const { error } = await auditSupabase
    .from('login_audit_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('session_id', sessionId.trim())
    .eq('app_user_id', appUserId)
    .is('ended_at', null);

  if (error) {
    console.error('loginAudit session-ping:', error.message);
    return { ok: false, error };
  }
  return { ok: true, skipped: false };
}

/**
 * @param {number} appUserId
 * @param {string} sessionId
 */
export async function endAuditSession(appUserId, sessionId) {
  if (!auditSupabase) return { ok: true, skipped: true };
  const now = new Date().toISOString();
  const { error } = await auditSupabase
    .from('login_audit_sessions')
    .update({ ended_at: now, last_seen_at: now })
    .eq('session_id', sessionId.trim())
    .eq('app_user_id', appUserId)
    .is('ended_at', null);

  if (error) {
    console.error('loginAudit session-end:', error.message);
    return { ok: false, error };
  }
  return { ok: true, skipped: false };
}
