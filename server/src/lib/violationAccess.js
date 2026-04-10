import { canAccessManagerFeatures, normalizeAppRole } from './roles.js';
import { dbResolveAppUserId } from './supabaseRecallData.js';

/**
 * Managers/admins may access any violation. Investigators may access unassigned violations
 * or violations they own (user_id matches app_users.user_id).
 */
export async function assertViolationAccess(req, res, supabase, ownerUserId) {
  if (req.isApiMockMode) return true;
  if (!supabase) {
    res.status(503).json({ error: 'Database not available' });
    return false;
  }

  const metaRole = req.user?.user_metadata?.role ?? req.user?.app_metadata?.role;
  const appUserId = await dbResolveAppUserId(supabase, req.user?.email, req.user?.id);

  if (appUserId == null) {
    res.status(403).json({
      error: 'No application user linked to this login. Ensure app_users has a row for your account.',
    });
    return false;
  }

  const { data: appRow } = await supabase
    .from('app_users')
    .select('user_type')
    .eq('user_id', appUserId)
    .maybeSingle();

  const role = normalizeAppRole(appRow, metaRole);
  if (canAccessManagerFeatures(role)) return true;

  if (ownerUserId == null || ownerUserId === undefined) return true;

  if (Number(ownerUserId) === Number(appUserId)) return true;

  res.status(403).json({ error: 'You do not have access to this violation' });
  return false;
}
