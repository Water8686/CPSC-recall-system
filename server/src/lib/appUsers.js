/**
 * Main Supabase schema: public.app_users uses uuid `id` as the primary key.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @param {string | undefined} sub JWT subject — the app_users.id UUID */
export function jwtSubToUserId(sub) {
  if (sub == null || sub === '') return null;
  if (UUID_RE.test(String(sub))) return String(sub);
  return null;
}

/**
 * Map API / shared canonical role to DB user_type.
 * @param {string} canonical
 */
export function dbUserTypeFromCanonical(canonical) {
  const c = String(canonical ?? '')
    .trim()
    .toLowerCase();
  if (c === 'admin') return 'admin';
  if (c === 'manager') return 'manager';
  if (c === 'investigator') return 'investigator';
  if (c === 'seller') return 'seller';
  return 'investigator';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId  app_users.id (UUID)
 */
export async function fetchAppUserByUserId(supabase, userId) {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Public API shape: expose stable string id for clients (JWT sub matches).
 * @param {Record<string, unknown>} row
 */
export function mapAppUserRowToApi(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id != null ? String(row.id) : null,
  };
}
