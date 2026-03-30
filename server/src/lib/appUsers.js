/**
 * Main Supabase schema: public.app_users uses bigint user_id (not uuid id) and password column.
 */

/** @param {string | undefined} sub JWT subject */
export function jwtSubToUserId(sub) {
  if (sub == null || sub === '') return null;
  const n = Number(sub);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

/**
 * Map API / shared canonical role to DB user_type (MANAGER, INVESTIGATOR, RETAILER, ADMIN).
 * @param {string} canonical
 */
export function dbUserTypeFromCanonical(canonical) {
  const c = String(canonical ?? '')
    .trim()
    .toLowerCase();
  if (c === 'admin') return 'ADMIN';
  if (c === 'manager') return 'MANAGER';
  if (c === 'investigator') return 'INVESTIGATOR';
  if (c === 'seller') return 'RETAILER';
  return 'INVESTIGATOR';
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} userId
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
  const uid = row.user_id;
  return {
    ...row,
    id: uid != null ? String(uid) : null,
  };
}
