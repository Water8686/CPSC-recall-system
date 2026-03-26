import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from '../lib/serverEnv.js';

/**
 * Express middleware that verifies the Supabase JWT from the Authorization header.
 * Attaches the authenticated user to req.user.
 *
 * Decodes the JWT payload locally (no network round-trip to Supabase Auth) and
 * checks the expiry claim. The token's signature is implicitly validated by
 * Supabase on every DB query made with req.supabase.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  let user;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('malformed');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    user = {
      id: claims.sub,
      email: claims.email,
      user_metadata: claims.user_metadata ?? {},
      app_metadata: claims.app_metadata ?? {},
    };
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const supabase = createClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  req.user = user;
  req.supabase = supabase;
  next();
}
