/**
 * Shared constants and types used by both client and server.
 * Import from 'shared' in either workspace.
 */

// Profile / permission roles (public.profiles.role + auth metadata)
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  INVESTIGATOR: 'investigator',
  SELLER: 'seller',
};

/** All values allowed in profiles.role (order: admin → operational roles) */
export const ALL_PROFILE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.INVESTIGATOR,
  USER_ROLES.SELLER,
];

/** Roles that can use CPSC Manager recall APIs and /recalls UI */
export const MANAGER_ACCESS_ROLES = [USER_ROLES.ADMIN, USER_ROLES.MANAGER];

export function canAccessManagerFeatures(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.MANAGER;
}

/** Investigators (and above) can open the Recalls page (read); managers prioritize. */
export const RECALL_PAGE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.INVESTIGATOR,
];

export function canViewRecallsPage(role) {
  return RECALL_PAGE_ROLES.includes(role);
}

/** Admin, manager, investigator — not sellers (Sprint 2+ placeholder pages). */
export const OPERATIONAL_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.INVESTIGATOR,
];

export function canViewOperationalSprintPages(role) {
  return OPERATIONAL_ROLES.includes(role);
}

/** All roles that may access the violations/responses workflow (staff + sellers). */
export const VIOLATION_WORKFLOW_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.INVESTIGATOR,
  USER_ROLES.SELLER,
];

export function canAccessViolationWorkflow(role) {
  return VIOLATION_WORKFLOW_ROLES.includes(role);
}

/** Only CPSC Investigators may create violations (BIT 4454 Sprint 2 test cases). */
export function canFileViolations(role) {
  return role === USER_ROLES.INVESTIGATOR;
}

/**
 * Map profiles.user_type (ERD) or legacy profiles.role + JWT metadata to canonical USER_ROLES.*.
 */
export function normalizeAppRole(profile, jwtRoleFallback) {
  const meta = String(jwtRoleFallback || '')
    .toLowerCase()
    .trim();
  if (meta === USER_ROLES.ADMIN) return USER_ROLES.ADMIN;
  if (meta === USER_ROLES.MANAGER) return USER_ROLES.MANAGER;
  if (meta === USER_ROLES.INVESTIGATOR) return USER_ROLES.INVESTIGATOR;
  if (meta === USER_ROLES.SELLER) return USER_ROLES.SELLER;

  const raw = profile?.role ?? profile?.user_type ?? profile?.userType ?? '';
  const t = String(raw).toLowerCase().trim();

  if (!t) return USER_ROLES.INVESTIGATOR;

  if (t === 'admin' || t === 'administrator') return USER_ROLES.ADMIN;
  if (t === 'manager' || t === 'cpsc manager' || t === 'cpsc_manager') {
    return USER_ROLES.MANAGER;
  }
  if (t === 'seller' || t === 'retailer') return USER_ROLES.SELLER;
  if (t === 'investigator') return USER_ROLES.INVESTIGATOR;

  if (t.includes('admin')) return USER_ROLES.ADMIN;
  if (t.includes('manager')) return USER_ROLES.MANAGER;
  if (t.includes('seller')) return USER_ROLES.SELLER;

  return USER_ROLES.INVESTIGATOR;
}

// Recall priority levels — Sprint 1
export const PRIORITY_LEVELS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

// Violation adjudication statuses — Sprint 3
export const ADJUDICATION_STATUS = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ESCALATED: 'Escalated',
};

export const SPRINT3_VIOLATION_STATUS = {
  OPEN: 'Open',
  NOTICE_SENT: 'Notice Sent',
  RESPONSE_SUBMITTED: 'RESPONSE SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ESCALATED: 'ESCALATED',
};

// Discovery — confidence tiers & review statuses (Smart Listing Discovery)
export const CONFIDENCE_TIERS = {
  HIGH: 'High',
  UNCERTAIN: 'Uncertain',
  NO_MATCH: 'No Match',
};

export const REVIEW_STATUSES = {
  PENDING: 'Pending Review',
  CONFIRMED: 'Confirmed Match',
  REJECTED: 'Rejected',
};

export { VIOLATION_TYPES, INVESTIGATOR_ROLES } from './violationTypes.js';
