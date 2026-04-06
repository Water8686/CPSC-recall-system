/**
 * CPSC-aligned violation type categories — Sprint 2.
 * Values must match the violation_type_enum in the database.
 */
export const VIOLATION_TYPES = [
  'Recalled Product Listed for Sale',
  'Failure to Notify Consumers',
  'Banned Hazardous Substance',
  'Misbranded or Mislabeled Product',
  'Failure to Report',
  'Counterfeit Safety Certification',
];

/** Roles allowed to create violations and manage listings. */
export const INVESTIGATOR_ROLES = ['admin', 'investigator'];
