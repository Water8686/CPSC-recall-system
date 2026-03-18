import { createClient } from '@supabase/supabase-js';

/**
 * Express middleware that verifies the Supabase JWT from the Authorization header.
 * Attaches the authenticated user to req.user.
 *
 * Usage in routes:
 *   router.get('/some-endpoint', requireAuth, (req, res) => { ... });
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Create a per-request client authenticated with the user's token
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  supabase.auth.getUser(token).then(({ data, error }) => {
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = data.user;
    req.supabase = supabase; // Authenticated client for this request
    next();
  });
}
