import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from './serverEnv.js';

let cached = null;

/**
 * Supabase client with service role (bypasses RLS). Used after JWT verification for API-enforced access.
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is unset.
 */
export function getAdminClient() {
  const key = getSupabaseServiceRoleKey();
  if (!key) return null;
  if (!cached) {
    cached = createClient(getSupabaseUrl(), key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
