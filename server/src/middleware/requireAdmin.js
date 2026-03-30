import { requireAuth } from './auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { USER_ROLES, normalizeAppRole } from '../lib/roles.js';
import { jwtSubToUserId } from '../lib/appUsers.js';

function jwtFallbackRole(user) {
  return user?.user_metadata?.role ?? user?.app_metadata?.role;
}

/**
 * Requires authenticated user with admin role (app_users.user_type).
 */
export function requireAdmin(req, res, next) {
  if (req.isApiMockMode) return next();
  requireAuth(req, res, () => {
    const client = supabaseAdmin;
    if (!client) {
      return res.status(503).json({ error: 'Database not configured' });
    }
    const uid = jwtSubToUserId(req.user.id);
    if (uid == null) {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    client
      .from('app_users')
      .select('user_type')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.warn('requireAdmin:', error.message);
        }
        const role = normalizeAppRole(data, jwtFallbackRole(req.user));
        if (role !== USER_ROLES.ADMIN) {
          return res.status(403).json({ error: 'Administrator access required' });
        }
        next();
      })
      .catch((err) => {
        console.error(err);
        res.status(403).json({ error: 'Administrator access required' });
      });
  });
}
