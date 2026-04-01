import { Router } from 'express';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';
import { signAppToken } from '../lib/appJwt.js';
import { requireAuth } from '../middleware/auth.js';
import { normalizeAppRole } from '../lib/roles.js';
import { jwtSubToUserId, mapAppUserRowToApi } from '../lib/appUsers.js';

const router = Router();

function parseAdminEmails() {
  const raw = process.env.ADMIN_BOOTSTRAP_EMAILS || '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isBootstrapAdminEmail(email) {
  return parseAdminEmails().includes(String(email).trim().toLowerCase());
}

async function countAppUsers() {
  const { count, error } = await supabaseAdmin
    .from('app_users')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function mapRowToProfile(row) {
  if (!row) return null;
  const api = mapAppUserRowToApi(row);
  const role = normalizeAppRole({ user_type: row.user_type }, null);
  return {
    id: api.id,
    email: row.email,
    user_type: row.user_type,
    full_name: row.full_name ?? null,
    avatar_url: row.avatar_url ?? null,
    approved: row.approved,
    requested_role: row.requested_role ?? null,
    role,
    display_name: row.full_name ?? null,
  };
}

/** POST /api/auth/register */
router.post('/register', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password ?? '');
  const full_name = req.body?.full_name ? String(req.body.full_name).trim() : null;
  const requested_role = req.body?.requested_role
    ? String(req.body.requested_role).trim().toLowerCase()
    : null;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  let firstUser = false;
  try {
    firstUser = (await countAppUsers()) === 0;
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Could not verify users table' });
  }

  const bootstrapAdmin = firstUser || isBootstrapAdminEmail(email);
  const user_type = bootstrapAdmin ? 'ADMIN' : 'RETAILER';
  const approved = bootstrapAdmin;

  const now = new Date().toISOString();

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('app_users')
    .insert({
      username: email,
      email,
      password,
      user_type,
      approved,
      full_name,
      requested_role: requested_role || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (insErr) {
    if (insErr.code === '23505' || insErr.message?.includes('duplicate')) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('register:', insErr);
    return res.status(400).json({ error: insErr.message || 'Registration failed' });
  }

  if (!inserted.approved) {
    return res.status(201).json({
      pending: true,
      message:
        'Account created. An administrator must approve your account before you can sign in.',
    });
  }

  const role = normalizeAppRole({ user_type: inserted.user_type }, null);
  const uidStr = String(inserted.user_id);
  let access_token;
  try {
    access_token = await signAppToken(uidStr, inserted.email, role);
  } catch (e) {
    console.error('register JWT sign:', e);
    return res.status(503).json({
      error:
        'Server misconfiguration: set APP_JWT_SECRET (min 8 characters) in Railway variables.',
    });
  }

  return res.status(201).json({
    access_token,
    user: {
      id: uidStr,
      email: inserted.email,
      user_metadata: { role },
    },
    profile: mapRowToProfile(inserted),
  });
});

/** POST /api/auth/login */
router.post('/login', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data: row, error } = await supabaseAdmin
    .from('app_users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('login:', error);
    return res.status(500).json({ error: 'Login failed' });
  }

  if (!row) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const stored = row.password;
  if (stored !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!row.approved) {
    return res.status(403).json({
      error:
        'Your account is pending administrator approval. Ask an admin to approve you in Users & roles.',
    });
  }

  const role = normalizeAppRole({ user_type: row.user_type }, null);
  const uidStr = String(row.user_id);
  let access_token;
  try {
    access_token = await signAppToken(uidStr, row.email, role);
  } catch (e) {
    console.error('login JWT sign:', e);
    return res.status(503).json({
      error:
        'Server misconfiguration: set APP_JWT_SECRET (min 8 characters) in Railway variables.',
    });
  }

  return res.json({
    access_token,
    user: {
      id: uidStr,
      email: row.email,
      user_metadata: { role },
    },
    profile: mapRowToProfile(row),
  });
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ error: 'Invalid session user id' });
  }

  const { data: row, error } = await supabaseAdmin
    .from('app_users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!row) {
    // Fallback: look up by email (handles tokens issued before schema fix)
    const { data: rowByEmail } = await supabaseAdmin
      .from('app_users')
      .select('*')
      .eq('email', req.user.email)
      .maybeSingle();
    if (!rowByEmail) return res.status(404).json({ error: 'User not found' });
    return res.json({ profile: mapRowToProfile(rowByEmail) });
  }

  return res.json({ profile: mapRowToProfile(row) });
});

/** PATCH /api/auth/me — full_name, avatar_url */
router.patch('/me', requireAuth, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ error: 'Invalid session user id' });
  }

  const full_name = req.body?.full_name !== undefined
    ? String(req.body.full_name).trim() || null
    : undefined;
  const avatar_url = req.body?.avatar_url !== undefined
    ? String(req.body.avatar_url).trim() || null
    : undefined;

  const patch = { updated_at: new Date().toISOString() };
  if (full_name !== undefined) patch.full_name = full_name;
  if (avatar_url !== undefined) patch.avatar_url = avatar_url;

  if (Object.keys(patch).length <= 1) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data: row, error } = await supabaseAdmin
    .from('app_users')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ profile: mapRowToProfile(row) });
});

/** POST /api/auth/change-password */
router.post('/change-password', requireAuth, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const userId = req.user.id;
  if (!userId) {
    return res.status(400).json({ error: 'Invalid session user id' });
  }

  const current = String(req.body?.current_password ?? '');
  const nextPwd = String(req.body?.new_password ?? '');

  if (!current || !nextPwd) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (nextPwd.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('app_users')
    .select('password')
    .eq('user_id', userId)
    .single();

  if (fetchErr || !row) {
    return res.status(500).json({ error: 'Could not load user' });
  }

  const stored = row.password;
  if (stored !== current) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const { error: upErr } = await supabaseAdmin
    .from('app_users')
    .update({
      password: nextPwd,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (upErr) {
    return res.status(400).json({ error: upErr.message });
  }

  return res.json({ ok: true });
});

/**
 * POST /api/auth/forgot-password — creates a reset token (class demo: link returned in JSON when
 * APP_EXPOSE_PASSWORD_RESET_LINK is not 'false').
 */
router.post('/forgot-password', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  const generic = {
    message:
      'If that email is registered, use the reset link to choose a new password. (No email is sent in this demo.)',
  };

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const { data: user, error: findErr } = await supabaseAdmin
    .from('app_users')
    .select('user_id')
    .eq('email', email)
    .maybeSingle();

  if (findErr) {
    console.error('forgot-password find:', findErr);
  }

  if (!user?.user_id) {
    return res.json(generic);
  }

  const token = randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from('password_reset_tokens').delete().eq('user_id', user.user_id);

  const { error: insErr } = await supabaseAdmin.from('password_reset_tokens').insert({
    user_id: user.user_id,
    token,
    expires_at,
  });

  if (insErr) {
    console.error('forgot-password insert:', insErr);
    return res.status(503).json({
      error:
        'Password reset table missing or mismatched. Run supabase/migrations SQL for password_reset_tokens (bigint user_id).',
    });
  }

  const expose = process.env.APP_EXPOSE_PASSWORD_RESET_LINK !== 'false';
  if (expose) {
    return res.json({
      ...generic,
      resetToken: token,
      resetPath: `/reset-password?token=${encodeURIComponent(token)}`,
    });
  }

  return res.json(generic);
});

/** POST /api/auth/reset-password — one-time token from forgot-password */
router.post('/reset-password', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const token = String(req.body?.token ?? '').trim();
  const new_password = String(req.body?.new_password ?? '');

  if (!token || !new_password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (new_password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const { data: row, error } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('user_id, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.error('reset-password:', error);
    return res.status(503).json({ error: 'Password reset is not configured' });
  }
  if (!row) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }
  if (new Date(row.expires_at) < new Date()) {
    await supabaseAdmin.from('password_reset_tokens').delete().eq('token', token);
    return res.status(400).json({ error: 'Reset link has expired. Request a new one.' });
  }

  const { error: upErr } = await supabaseAdmin
    .from('app_users')
    .update({
      password: new_password,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', row.user_id);

  if (upErr) {
    return res.status(400).json({ error: upErr.message });
  }

  await supabaseAdmin.from('password_reset_tokens').delete().eq('user_id', row.user_id);

  return res.json({ ok: true });
});

export default router;
