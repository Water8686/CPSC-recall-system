import { requireAuth } from './auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  USER_ROLES,
  canAccessManagerFeatures,
  normalizeAppRole,
} from '../lib/roles.js';
import { jwtSubToUserId } from '../lib/appUsers.js';

const MOCK_USER = {
  id: 'mock-user-id',
  email: 'manager@cpsc.demo',
  user_metadata: { role: USER_ROLES.MANAGER },
};

/**
 * When API_MOCK_MODE=true, attaches a synthetic manager user for all API routes that use this.
 */
export function applyApiMockUser(req, res, next) {
  if (process.env.API_MOCK_MODE === 'true') {
    req.isApiMockMode = true;
    req.user = { ...MOCK_USER };
  }
  next();
}

/**
 * Authenticated user (any role), or passes through in API mock mode.
 */
export function requireRealAuth(req, res, next) {
  if (req.isApiMockMode) return next();
  requireAuth(req, res, next);
}

/**
 * CPSC Manager only, or passes through in API mock mode (treated as manager).
 */
export function requireCpscManager(req, res, next) {
  if (req.isApiMockMode) return next();
  requireAuth(req, res, () => verifyManagerRole(req, res, next));
}

function jwtFallbackRole(user) {
  return user?.user_metadata?.role ?? user?.app_metadata?.role;
}

/**
 * Investigator or Admin only — for violation/listing creation.
 */
export function requireInvestigatorOrAdmin(req, res, next) {
  if (req.isApiMockMode) return next();
  requireAuth(req, res, () => verifyInvestigatorRole(req, res, next));
}

/**
 * CPSC Investigator only — POST /api/violations (Sprint 2 RA test cases; managers use triage only).
 */
export function requireInvestigatorOnly(req, res, next) {
  if (req.isApiMockMode) return next();
  requireAuth(req, res, () => verifyInvestigatorOnly(req, res, next));
}

/**
 * Operational staff only (admin, manager, investigator) — blocks sellers from write operations
 * such as PATCH /api/violations, POST /api/contacts, POST /api/adjudications.
 */
export function requireOperationalStaff(req, res, next) {
  if (req.isApiMockMode) return next();
  requireAuth(req, res, () => verifyOperationalStaff(req, res, next));
}

function verifyOperationalStaff(req, res, next) {
  const ALLOWED = ['admin', 'manager', 'investigator'];
  const metaRole = jwtFallbackRole(req.user);
  const client = supabaseAdmin || req.supabase;

  if (!client) {
    return ALLOWED.includes(metaRole)
      ? next()
      : res.status(403).json({ error: 'Unauthorized. CPSC staff role required.' });
  }

  const uid = jwtSubToUserId(req.user.id);
  if (uid == null) {
    return res.status(403).json({ error: 'Unauthorized. CPSC staff role required.' });
  }
  client
    .from('app_users')
    .select('user_type')
    .eq('user_id', uid)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) console.warn('app_users select error:', error.message);
      const role = normalizeAppRole(data, metaRole);
      if (!ALLOWED.includes(role)) {
        return res.status(403).json({ error: 'Unauthorized. CPSC staff role required.' });
      }
      next();
    })
    .catch((err) => {
      console.error(err);
      res.status(403).json({ error: 'Unauthorized. CPSC staff role required.' });
    });
}

function verifyManagerRole(req, res, next) {
  const metaRole = jwtFallbackRole(req.user);
  const client = supabaseAdmin || req.supabase;

  if (!client) {
    return canAccessManagerFeatures(metaRole)
      ? next()
      : res.status(403).json({
          error: 'Unauthorized user. CPSC Manager or Admin role required.',
        });
  }

  const uid = jwtSubToUserId(req.user.id);
  if (uid == null) {
    return res.status(403).json({
      error: 'Unauthorized user. CPSC Manager or Admin role required.',
    });
  }
  client
    .from('app_users')
    .select('user_type')
    .eq('user_id', uid)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.warn('app_users select error:', error.message);
      }
      const role = normalizeAppRole(data, metaRole);
      if (!canAccessManagerFeatures(role)) {
        return res.status(403).json({
          error: 'Unauthorized user. CPSC Manager or Admin role required.',
        });
      }
      next();
    })
    .catch((err) => {
      console.error(err);
      res.status(403).json({
        error: 'Unauthorized user. CPSC Manager or Admin role required.',
      });
    });
}

function verifyInvestigatorRole(req, res, next) {
  const ALLOWED = ['admin', 'investigator'];
  const metaRole = jwtFallbackRole(req.user);
  const client = supabaseAdmin || req.supabase;

  if (!client) {
    return ALLOWED.includes(metaRole)
      ? next()
      : res.status(403).json({
          error: 'Unauthorized. CPSC Investigator or Admin role required.',
        });
  }

  const uid = jwtSubToUserId(req.user.id);
  if (uid == null) {
    return res.status(403).json({
      error: 'Unauthorized. CPSC Investigator or Admin role required.',
    });
  }
  client
    .from('app_users')
    .select('user_type')
    .eq('user_id', uid)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) console.warn('app_users select error:', error.message);
      const role = normalizeAppRole(data, metaRole);
      if (!ALLOWED.includes(role)) {
        return res.status(403).json({
          error: 'Unauthorized. CPSC Investigator or Admin role required.',
        });
      }
      next();
    })
    .catch((err) => {
      console.error(err);
      res.status(403).json({
        error: 'Unauthorized. CPSC Investigator or Admin role required.',
      });
    });
}

function verifyInvestigatorOnly(req, res, next) {
  const metaRole = jwtFallbackRole(req.user);
  const client = supabaseAdmin || req.supabase;

  if (!client) {
    return metaRole === USER_ROLES.INVESTIGATOR
      ? next()
      : res.status(403).json({
          error: 'Unauthorized. CPSC Investigator role required to create violations.',
        });
  }

  const uid = jwtSubToUserId(req.user.id);
  if (uid == null) {
    return res.status(403).json({
      error: 'Unauthorized. CPSC Investigator role required to create violations.',
    });
  }
  client
    .from('app_users')
    .select('user_type')
    .eq('user_id', uid)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) console.warn('app_users select error:', error.message);
      const role = normalizeAppRole(data, metaRole);
      if (role !== USER_ROLES.INVESTIGATOR) {
        return res.status(403).json({
          error: 'Unauthorized. CPSC Investigator role required to create violations.',
        });
      }
      next();
    })
    .catch((err) => {
      console.error(err);
      res.status(403).json({
        error: 'Unauthorized. CPSC Investigator role required to create violations.',
      });
    });
}
