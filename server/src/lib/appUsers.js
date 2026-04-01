/**
 * Main Supabase schema: public.app_users uses bigint `user_id` as the primary key.
 */

/** @param {string | undefined} sub JWT subject — the app_users.user_id (bigint as string) */
export function jwtSubToUserId(sub) {
  if (sub == null || sub === '') return null;
  const n = Number(sub);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
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
 * @param {number} userId  app_users.user_id (bigint)
 */
export async function fetchAppUserByUserId(supabase, userId) {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('user_id', userId)
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
    id: row.user_id != null ? String(row.user_id) : null,
  };
}
