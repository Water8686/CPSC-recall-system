import { requireAuth } from './auth.js';

const MANAGER_ROLE = 'manager';

const MOCK_USER = {
  id: 'mock-user-id',
  email: 'manager@cpsc.demo',
  user_metadata: { role: MANAGER_ROLE },
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

function verifyManagerRole(req, res, next) {
  const metaRole = jwtFallbackRole(req.user);

  if (!req.supabase) {
    return metaRole === MANAGER_ROLE
      ? next()
      : res.status(403).json({
          error: 'Unauthorized user. CPSC Manager role required.',
        });
  }

  req.supabase
    .from('profiles')
    .select('role')
    .eq('id', req.user.id)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.warn('profiles select error:', error.message);
      }
      const role = data?.role ?? metaRole;
      if (role !== MANAGER_ROLE) {
        return res.status(403).json({
          error: 'Unauthorized user. CPSC Manager role required.',
        });
      }
      next();
    })
    .catch((err) => {
      console.error(err);
      res.status(403).json({
        error: 'Unauthorized user. CPSC Manager role required.',
      });
    });
}
