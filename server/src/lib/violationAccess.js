import { canAccessManagerFeatures, normalizeAppRole, USER_ROLES } from './roles.js';
import { dbResolveAppUserId } from './supabaseRecallData.js';
import { resolveSellerIdForAppUser } from './supabaseViolationData.js';

/**
 * Email that may view every violation and use seller response flows (class demo).
 * Set DEMO_SELLER_FULL_ACCESS_EMAIL=none to turn off (production with real sellers).
 */
export function getDemoSellerFullAccessEmail() {
  const raw = process.env.DEMO_SELLER_FULL_ACCESS_EMAIL;
  if (raw !== undefined && String(raw).trim() !== '') {
    const t = String(raw).trim().toLowerCase();
    if (t === 'none' || t === 'off' || t === 'false') return null;
    return String(raw).trim();
  }
  return 'seller@cpsc.demo';
}

/** Training/demo seller login — same capabilities across all violations as the role allows. */
export function isDemoSellerFullAccess(req) {
  const demo = getDemoSellerFullAccessEmail();
  if (!demo) return false;
  const email = req.user?.email ? String(req.user.email).trim().toLowerCase() : '';
  return email === demo.toLowerCase();
}

/**
 * Gate access to a violation:
 *  - Manager / Admin: full access to any violation.
 *  - Investigator: own violations (violation.user_id matches) or unassigned ones.
 *  - Seller: only if their resolved seller_id matches listing.seller_id for the violation.
 *
 * @param {object}      req
 * @param {object}      res
 * @param {object}      supabase
 * @param {number|null} ownerUserId   violation.user_id (the investigator who filed it)
 * @param {number|null} sellerOwnerId listing.seller_id for this violation's listing
 */
export async function assertViolationAccess(req, res, supabase, ownerUserId, sellerOwnerId) {
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

  // Managers and admins can access any violation.
  if (canAccessManagerFeatures(role)) return true;

  // Sellers: check if listing.seller_id matches their resolved seller_id.
  if (role === USER_ROLES.SELLER) {
    if (isDemoSellerFullAccess(req)) return true;

    if (sellerOwnerId == null) {
      res.status(403).json({ error: 'You do not have access to this violation' });
      return false;
    }
    const callerSellerId = await resolveSellerIdForAppUser(supabase, appUserId);
    if (callerSellerId == null || Number(callerSellerId) !== Number(sellerOwnerId)) {
      res.status(403).json({ error: 'You do not have access to this violation' });
      return false;
    }
    return true;
  }

  // Investigators (and other staff): own violations or unassigned.
  if (ownerUserId == null || ownerUserId === undefined) return true;
  if (Number(ownerUserId) === Number(appUserId)) return true;

  res.status(403).json({ error: 'You do not have access to this violation' });
  return false;
}
