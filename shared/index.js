/**
 * Shared constants and types used by both client and server.
 * Import from 'shared' in either workspace.
 */

// User roles — matches the user_type field in the User table
export const USER_ROLES = {
  MANAGER: 'manager',
  INVESTIGATOR: 'investigator',
  SELLER: 'seller',
};

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
