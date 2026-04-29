/**
 * In-memory mock data for development without Supabase.
 * Aligned with recall (D1) and prioritization (D2) tables used by the app.
 */

const recalls = [
  {
    id: '1',
    recall_id: '24-001',
    title: 'Infant Crib Recall',
    product: 'Baby Cribs',
    hazard: 'Fall',
    created_at: '2024-01-15T10:00:00Z',
    image_url: 'https://picsum.photos/seed/cpsc24001/96/96',
    recall_url: 'https://www.cpsc.gov/Recalls/2024/Infant-Crib-Recall',
    consumer_contact: 'Call (800) 555-0100 or visit example.com/support for a free repair kit.',
    recall_description:
      'The crib slats can loosen over time, creating an opening that poses a fall hazard to infants.',
    remedy: 'Repair',
    remedy_option: 'Free repair kit',
    manufacturer: 'Example Baby Co.',
    manufacturer_country: 'China',
    product_name: 'Infant Crib',
    product_type: 'Nursery furniture',
    number_of_units: 12000,
    upc: '012345678905',
    recall_date: '2024-01-15',
    last_publish_date: '2024-01-16',
  },
  {
    id: '2',
    recall_id: '24-002',
    title: 'Children\'s Toy Choking Hazard',
    product: 'Plastic Toys',
    hazard: 'Choking',
    created_at: '2024-01-18T14:30:00Z',
    image_url: 'https://picsum.photos/seed/cpsc24002/96/96',
    recall_url: 'https://www.cpsc.gov/Recalls/2024/Childrens-Toy-Choking-Hazard',
    consumer_contact: 'Email support@exampletoyco.com for a free replacement.',
    recall_description:
      'Small parts can detach from the toy, posing a choking hazard to young children.',
    injury: 'Choking hazard',
    remedy: 'Replace',
    manufacturer: 'Example Toy Co.',
    manufacturer_country: 'Vietnam',
    importer: 'Example Imports LLC',
    retailer: 'ExampleMart',
    product_name: 'Stacking Toy Set',
    product_type: 'Children\'s toys',
    number_of_units: 45000,
    upc: '098765432109',
    recall_date: '2024-01-18',
    last_publish_date: '2024-01-19',
  },
  { id: '3', recall_id: '24-003', title: 'Hair Dryer Fire Risk', product: 'Hair Dryers', hazard: 'Fire', created_at: '2024-01-22T09:15:00Z', image_url: 'https://picsum.photos/seed/cpsc24003/96/96', recall_date: '2024-01-22' },
  { id: '4', recall_id: '24-004', title: 'Power Strip Overheating', product: 'Power Strips', hazard: 'Fire', created_at: '2024-01-25T11:00:00Z', recall_date: '2024-01-25' },
  { id: '5', recall_id: '24-005', title: 'Blinds Strangulation Risk', product: 'Window Blinds', hazard: 'Strangulation', created_at: '2024-02-01T08:45:00Z', recall_date: '2024-02-01' },
  { id: '6', recall_id: '24-006', title: 'High Chair Tip-Over', product: 'High Chairs', hazard: 'Fall', created_at: '2024-02-05T13:20:00Z', recall_date: '2024-02-05' },
  { id: '7', recall_id: '24-007', title: 'Battery Pack Explosion', product: 'Portable Chargers', hazard: 'Fire', created_at: '2024-02-10T16:00:00Z', recall_date: '2024-02-10' },
  { id: '8', recall_id: '24-008', title: 'Lead Paint in Children\'s Furniture', product: 'Kids Furniture', hazard: 'Lead', created_at: '2024-02-14T10:30:00Z', recall_date: '2024-02-14' },
  { id: '9', recall_id: '24-009', title: 'Space Heater Burn Hazard', product: 'Space Heaters', hazard: 'Burn', created_at: '2024-02-18T09:00:00Z', recall_date: '2024-02-18' },
  { id: '10', recall_id: '24-010', title: 'Drawstring Hoodie Strangulation', product: 'Children\'s Clothing', hazard: 'Strangulation', created_at: '2024-02-22T14:00:00Z', recall_date: '2024-02-22' },
  { id: '11', recall_id: '24-011', title: 'Coffee Maker Scalding', product: 'Coffee Makers', hazard: 'Burn', created_at: '2024-02-26T11:45:00Z', recall_date: '2024-02-26' },
  { id: '12', recall_id: '24-012', title: 'Bunk Bed Collapse', product: 'Bunk Beds', hazard: 'Fall', created_at: '2024-03-01T08:00:00Z', recall_date: '2024-03-01' },
  { id: '13', recall_id: '24-013', title: 'Magnetic Toy Ingestion', product: 'Magnetic Toys', hazard: 'Ingestion', created_at: '2024-03-05T12:30:00Z', recall_date: '2024-03-05' },
  { id: '14', recall_id: '24-014', title: 'Extension Cord Overload', product: 'Extension Cords', hazard: 'Fire', created_at: '2024-03-08T15:00:00Z', recall_date: '2024-03-08' },
  { id: '15', recall_id: '24-015', title: 'Stroller Wheel Detachment', product: 'Strollers', hazard: 'Fall', created_at: '2024-03-12T10:15:00Z', recall_date: '2024-03-12' },
  { id: '16', recall_id: '24-016', title: 'Candle Fire Hazard', product: 'Scented Candles', hazard: 'Fire', created_at: '2024-03-15T09:30:00Z', recall_date: '2024-03-15' },
  { id: '17', recall_id: '24-017', title: 'Playpen Side Collapse', product: 'Playpens', hazard: 'Entrapment', created_at: '2024-03-18T13:45:00Z', recall_date: '2024-03-18' },
  { id: '18', recall_id: '24-018', title: 'Electric Blanket Overheating', product: 'Electric Blankets', hazard: 'Fire', created_at: '2024-03-22T11:00:00Z', recall_date: '2024-03-22' },
  { id: '19', recall_id: '24-019', title: 'Scooter Brake Failure', product: 'Kick Scooters', hazard: 'Fall', created_at: '2024-03-25T14:20:00Z', recall_date: '2024-03-25' },
  { id: '20', recall_id: '24-020', title: 'Dresser Tip-Over', product: 'Dressers', hazard: 'Tip-Over', created_at: '2024-03-28T08:30:00Z', recall_date: '2024-03-28' },
  { id: '21', recall_id: '24-021', title: 'Baby Monitor Cord Strangulation', product: 'Baby Monitors', hazard: 'Strangulation', created_at: '2024-04-01T10:00:00Z', recall_date: '2024-04-01' },
  { id: '22', recall_id: '24-022', title: 'Trampoline Net Tear', product: 'Trampolines', hazard: 'Fall', created_at: '2024-04-05T12:00:00Z', recall_date: '2024-04-05' },
  { id: '23', recall_id: '24-023', title: 'Lamp Electrical Shock', product: 'Table Lamps', hazard: 'Shock', created_at: '2024-04-08T15:30:00Z', recall_date: '2024-04-08' },
  { id: '24', recall_id: '24-024', title: 'Bike Helmet Impact Failure', product: 'Bicycle Helmets', hazard: 'Head Injury', created_at: '2024-04-12T09:15:00Z', recall_date: '2024-04-12' },
  { id: '25', recall_id: '24-025', title: 'Pet Crate Latch Failure', product: 'Pet Crates', hazard: 'Entrapment', created_at: '2024-04-15T11:45:00Z', recall_date: '2024-04-15' },
];

// Prioritizations: recall_id -> { id, recall_id, priority, prioritized_at, user_id }
// Mutable so POST can create/update
const prioritizationsMap = new Map([
  ['24-001', { id: 'p1', recall_id: '24-001', priority: 'High', prioritized_at: '2024-04-01T10:00:00Z', user_id: 'mock-user-id' }],
  ['24-002', { id: 'p2', recall_id: '24-002', priority: 'High', prioritized_at: '2024-04-01T10:05:00Z', user_id: 'mock-user-id' }],
  ['24-003', { id: 'p3', recall_id: '24-003', priority: 'Medium', prioritized_at: '2024-04-01T10:10:00Z', user_id: 'mock-user-id' }],
  ['24-004', { id: 'p4', recall_id: '24-004', priority: 'Medium', prioritized_at: '2024-04-01T10:15:00Z', user_id: 'mock-user-id' }],
  ['24-005', { id: 'p5', recall_id: '24-005', priority: 'High', prioritized_at: '2024-04-01T10:20:00Z', user_id: 'mock-user-id' }],
  ['24-006', { id: 'p6', recall_id: '24-006', priority: 'Low', prioritized_at: '2024-04-01T10:25:00Z', user_id: 'mock-user-id' }],
  ['24-007', { id: 'p7', recall_id: '24-007', priority: 'High', prioritized_at: '2024-04-01T10:30:00Z', user_id: 'mock-user-id' }],
  ['24-008', { id: 'p8', recall_id: '24-008', priority: 'High', prioritized_at: '2024-04-01T10:35:00Z', user_id: 'mock-user-id' }],
  ['24-009', { id: 'p9', recall_id: '24-009', priority: 'Medium', prioritized_at: '2024-04-01T10:40:00Z', user_id: 'mock-user-id' }],
  ['24-010', { id: 'p10', recall_id: '24-010', priority: 'High', prioritized_at: '2024-04-01T10:45:00Z', user_id: 'mock-user-id' }],
]);

let nextPrioritizationId = 11;

// Assignments: recall_id -> { id, recall_id, investigator_user_id, assigned_at, assigned_by_user_id }
const assignmentsMap = new Map([
  ['24-001', { id: 'a1', recall_id: '24-001', investigator_user_id: 2001, assigned_at: '2024-04-01T11:00:00Z', assigned_by_user_id: 'mock-user-id' }],
  ['24-002', { id: 'a2', recall_id: '24-002', investigator_user_id: 2001, assigned_at: '2024-04-01T11:05:00Z', assigned_by_user_id: 'mock-user-id' }],
  ['24-003', { id: 'a3', recall_id: '24-003', investigator_user_id: 2002, assigned_at: '2024-04-01T11:10:00Z', assigned_by_user_id: 'mock-user-id' }],
]);

let nextAssignmentId = 4;

// Violations: recall_id -> { violation_status, violation_noticed_at }
const violationsMap = new Map([
  ['24-001', { violation_status: 'Open', violation_noticed_at: '2024-04-10T08:00:00Z' }],
  ['24-002', { violation_status: 'Under Review', violation_noticed_at: '2024-04-12T09:30:00Z' }],
  ['24-003', { violation_status: 'Closed', violation_noticed_at: '2024-04-08T14:00:00Z' }],
]);

export function getLatestViolationStatusByRecallId(recallId) {
  return violationsMap.get(recallId)?.violation_status ?? null;
}

export function getAllRecalls() {
  return [...recalls];
}

export function getRecallById(id) {
  return recalls.find((r) => r.id === id) ?? null;
}

export function getRecallByRecallId(recallId) {
  return recalls.find((r) => r.recall_id === recallId) ?? null;
}

const RECALL_DETAIL_DEFAULTS = {
  recall_url: null,
  consumer_contact: null,
  recall_description: null,
  injury: null,
  remedy: null,
  remedy_option: null,
  manufacturer: null,
  manufacturer_country: null,
  importer: null,
  distributor: null,
  retailer: null,
  product_name: null,
  product_type: null,
  number_of_units: null,
  upc: null,
  recall_date: null,
  last_publish_date: null,
  added_at: null,
};

export function normalizeRecallDetailShape(recall) {
  if (!recall) return null;
  return {
    ...RECALL_DETAIL_DEFAULTS,
    ...recall,
  };
}

export function getAllPrioritizations() {
  return Array.from(prioritizationsMap.values());
}

export function getPrioritizationByRecallId(recallId) {
  return prioritizationsMap.get(recallId) ?? null;
}

export function createOrUpdatePrioritization(recallId, priority, userId = 'mock-user-id') {
  const recall = getRecallByRecallId(recallId);
  if (!recall) return { success: false, error: 'Recall ID does not exist' };

  const existing = prioritizationsMap.get(recallId);
  const now = new Date().toISOString();

  if (existing) {
    existing.priority = priority;
    existing.prioritized_at = now;
    existing.user_id = userId;
    return { success: true, data: existing };
  }

  const newPrioritization = {
    id: `p${nextPrioritizationId++}`,
    recall_id: recallId,
    priority,
    prioritized_at: now,
    user_id: userId,
  };
  prioritizationsMap.set(recallId, newPrioritization);
  return { success: true, data: newPrioritization };
}

export function getAllAssignments() {
  return Array.from(assignmentsMap.values());
}

export function getAssignmentByRecallId(recallId) {
  return assignmentsMap.get(recallId) ?? null;
}

export function createOrUpdateAssignment(recallId, investigatorUserId, assignedByUserId = 'mock-user-id') {
  const recall = getRecallByRecallId(recallId);
  if (!recall) return { success: false, error: 'Recall ID does not exist' };

  const now = new Date().toISOString();
  const existing = assignmentsMap.get(recallId);
  if (existing) {
    existing.investigator_user_id = investigatorUserId;
    existing.assigned_at = now;
    existing.assigned_by_user_id = assignedByUserId;
    return { success: true, data: existing };
  }

  const newAssignment = {
    id: `a${nextAssignmentId++}`,
    recall_id: recallId,
    investigator_user_id: investigatorUserId,
    assigned_at: now,
    assigned_by_user_id: assignedByUserId,
  };
  assignmentsMap.set(recallId, newAssignment);
  return { success: true, data: newAssignment };
}

export function updateRecallByRecallId(recallId, patch) {
  const idx = recalls.findIndex((r) => r.recall_id === recallId);
  if (idx < 0) return { success: false, error: 'Recall not found' };
  const next = {
    ...recalls[idx],
    ...patch,
  };
  recalls[idx] = next;
  return { success: true, data: next };
}

export function deleteRecallByRecallId(recallId) {
  const idx = recalls.findIndex((r) => r.recall_id === recallId);
  if (idx < 0) return { success: false, error: 'Recall not found' };
  const [deleted] = recalls.splice(idx, 1);
  prioritizationsMap.delete(recallId);
  assignmentsMap.delete(recallId);
  return { success: true, data: deleted };
}
