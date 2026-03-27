import { supabaseAdmin } from '../lib/supabase.js';
import { verifyAppToken } from '../lib/appJwt.js';

/**
 * Verifies app-issued JWT (Authorization: Bearer).
 * Attaches req.user and req.supabase (service role — required for API DB access).
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  verifyAppToken(token)
    .then((claims) => {
      req.user = {
        id: claims.sub,
        email: claims.email,
        user_metadata: { role: claims.role },
        app_metadata: {},
      };
      req.supabase = supabaseAdmin ?? null;
      next();
    })
    .catch(() => {
      res.status(401).json({ error: 'Invalid or expired token' });
    });
}
