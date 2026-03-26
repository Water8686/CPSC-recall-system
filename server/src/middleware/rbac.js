import {
  USER_ROLES,
  normalizeAppRole,
} from '../lib/roles.js';
import { getAdminClient } from '../lib/supabaseAdmin.js';

function jwtFallbackRole(user) {
  return user?.user_metadata?.role ?? user?.app_metadata?.role;
}

/**
 * After requireAuth: loads profiles row (approved, user_type) via service role and sets req.appRole, req.profileRow.
 */
export function attachProfileAndRole(req, res, next) {
  if (req.isApiMockMode) {
    req.appRole = USER_ROLES.MANAGER;
    req.profileRow = {
      id: req.user?.id ?? 'mock-user-id',
      user_type: USER_ROLES.MANAGER,
      approved: true,
      full_name: 'Mock Manager',
      email: 'manager@cpsc.demo',
      avatar_url: null,
    };
    return next();
  }

  const admin = getAdminClient();
  const db = admin ?? req.supabase;
  if (!db) {
    return res.status(503).json({ error: 'Database client not available' });
  }

  db
    .from('profiles')
    .select(
      'id, user_type, full_name, username, email, updated_at, approved, avatar_url, requested_role',
    )
    .eq('id', req.user.id)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.warn('attachProfileAndRole:', error.message);
      }
      req.profileRow = data ?? null;
      req.appRole = normalizeAppRole(data, jwtFallbackRole(req.user));
      next();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Failed to load profile' });
    });
}

export function requireApprovedProfile(req, res, next) {
  if (req.isApiMockMode) return next();
  const approved = req.profileRow?.approved;
  if (approved === false) {
    return res.status(403).json({
      error: 'Account pending approval',
      code: 'PENDING_APPROVAL',
    });
  }
  next();
}

export function requireRoles(allowed) {
  const set = new Set(allowed);
  return (req, res, next) => {
    if (req.isApiMockMode) return next();
    const role = req.appRole;
    if (!role || !set.has(role)) {
      return res.status(403).json({ error: 'Insufficient role for this action' });
    }
    next();
  };
}
