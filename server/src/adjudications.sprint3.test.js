import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbFetchAdjudications = vi.fn();
const mockDbCreateAdjudicationAtomic = vi.fn();
const mockDbFetchViolationWorkflowMeta = vi.fn();
const mockDbHasAdjudicationForViolation = vi.fn();
const mockDbResolveAppUserId = vi.fn();
let mockUserType = 'INVESTIGATOR';
let mockJwtRole = 'investigator';

vi.mock('./middleware/requireCpscManager.js', () => ({
  applyApiMockUser: (req, _res, next) => next(),
  requireOperationalStaff: (_req, _res, next) => next(),
  requireRealAuth: (req, _res, next) => {
    req.user = {
      id: '2',
      email: 'investigator@example.com',
      user_metadata: { role: mockJwtRole },
    };
    req.supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { user_type: mockUserType } }),
          }),
        }),
      }),
    };
    next();
  },
  requireInvestigatorOnly: (req, res, next) => {
    const role = (mockJwtRole || '').toLowerCase();
    if (role === 'investigator') return next();
    return res.status(403).json({
      error: 'Unauthorized. CPSC Investigator role required.',
    });
  },
}));

vi.mock('./lib/supabaseViolationData.js', () => ({
  dbFetchAdjudications: (...args) => mockDbFetchAdjudications(...args),
  dbCreateAdjudicationAtomic: (...args) => mockDbCreateAdjudicationAtomic(...args),
  dbFetchViolationWorkflowMeta: (...args) => mockDbFetchViolationWorkflowMeta(...args),
  dbHasAdjudicationForViolation: (...args) => mockDbHasAdjudicationForViolation(...args),
}));

vi.mock('./lib/supabaseRecallData.js', () => ({
  dbResolveAppUserId: (...args) => mockDbResolveAppUserId(...args),
}));

import adjudicationsRouter from './routes/adjudications.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/adjudications', adjudicationsRouter);
  return app;
}

describe('Sprint 3 UC4 adjudications route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbResolveAppUserId.mockResolvedValue(88);
    mockUserType = 'INVESTIGATOR';
    mockJwtRole = 'investigator';
    mockDbFetchViolationWorkflowMeta.mockResolvedValue({
      violation_id: 201,
      violation_status: 'RESPONSE SUBMITTED',
    });
    mockDbHasAdjudicationForViolation.mockResolvedValue(false);
    mockDbCreateAdjudicationAtomic.mockResolvedValue({ adjudication_id: 1, violation_id: 201 });
    mockDbFetchAdjudications.mockResolvedValue([]);
  });

  it('accepts valid approved adjudication', async () => {
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Approved',
      notes: 'Evidence confirms violation.',
    });
    expect(res.status).toBe(201);
  });

  it('accepts valid rejected adjudication', async () => {
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Rejected',
      notes: 'Insufficient proof.',
    });
    expect(res.status).toBe(201);
  });

  it('accepts valid escalated adjudication', async () => {
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Escalated',
      notes: 'Escalate for legal review.',
    });
    expect(res.status).toBe(201);
  });

  it('accepts valid archive adjudication', async () => {
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Archive',
      notes: 'Unable to resolve with available evidence.',
    });
    expect(res.status).toBe(201);
  });

  it('rejects missing violation id', async () => {
    const res = await request(makeApp()).post('/api/adjudications').send({
      status: 'Approved',
      notes: 'x',
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid status', async () => {
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Resolved',
      notes: 'x',
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing adjudication status', async () => {
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      notes: 'x',
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing notes', async () => {
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Approved',
      notes: '  ',
    });
    expect(res.status).toBe(400);
  });

  it('rejects violation not found', async () => {
    mockDbFetchViolationWorkflowMeta.mockResolvedValueOnce(null);
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 999,
      status: 'Approved',
      notes: 'x',
    });
    expect(res.status).toBe(404);
  });

  it('rejects violation in wrong workflow status', async () => {
    mockDbFetchViolationWorkflowMeta.mockResolvedValueOnce({
      violation_id: 201,
      violation_status: 'Open',
    });
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Approved',
      notes: 'x',
    });
    expect(res.status).toBe(409);
  });

  it('rejects duplicate adjudication', async () => {
    mockDbHasAdjudicationForViolation.mockResolvedValueOnce(true);
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Rejected',
      notes: 'x',
    });
    expect(res.status).toBe(409);
  });

  it('ignores client-provided decision date value', async () => {
    await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Approved',
      notes: 'x',
      adjudicated_at: '2000-01-01T00:00:00.000Z',
    });
    expect(mockDbCreateAdjudicationAtomic).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({ adjudicated_at: expect.anything() }),
    );
  });

  it('returns error when persistence fails', async () => {
    mockDbCreateAdjudicationAtomic.mockRejectedValueOnce(new Error('DB failure'));
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Approved',
      notes: 'x',
    });
    expect(res.status).toBe(500);
  });

  it('filters investigator adjudication list by violation id', async () => {
    await request(makeApp()).get('/api/adjudications?violation_id=201');
    expect(mockDbFetchAdjudications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ violationId: 201, investigatorId: 88 }),
    );
  });

  it('injects investigator id from session', async () => {
    await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Approved',
      notes: 'x',
      investigator_id: 999,
    });
    expect(mockDbCreateAdjudicationAtomic).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ investigator_id: 88 }),
    );
  });

  it('rejects unauthorized non-investigator role', async () => {
    mockUserType = 'SELLER';
    mockJwtRole = 'seller';
    const res = await request(makeApp()).post('/api/adjudications').send({
      violation_id: 201,
      status: 'Approved',
      notes: 'x',
    });
    expect(res.status).toBe(403);
  });
});
