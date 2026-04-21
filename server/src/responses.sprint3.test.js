import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbFetchResponses = vi.fn();
const mockDbCreateSellerResponseAtomic = vi.fn();
const mockDbFetchViolationWorkflowMeta = vi.fn();
const mockDbHasResponseForViolation = vi.fn();
const mockDbResolveAppUserId = vi.fn();
let mockUserType = 'SELLER';
let mockJwtRole = 'seller';

vi.mock('./middleware/requireCpscManager.js', () => ({
  applyApiMockUser: (req, _res, next) => next(),
  requireRealAuth: (req, _res, next) => {
    req.user = { id: '1', email: 'seller@example.com', user_metadata: { role: mockJwtRole } };
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
}));

vi.mock('./lib/supabaseViolationData.js', () => ({
  dbFetchResponses: (...args) => mockDbFetchResponses(...args),
  dbCreateSellerResponseAtomic: (...args) => mockDbCreateSellerResponseAtomic(...args),
  dbFetchViolationWorkflowMeta: (...args) => mockDbFetchViolationWorkflowMeta(...args),
  dbHasResponseForViolation: (...args) => mockDbHasResponseForViolation(...args),
}));

vi.mock('./lib/supabaseRecallData.js', () => ({
  dbResolveAppUserId: (...args) => mockDbResolveAppUserId(...args),
}));

import responsesRouter from './routes/responses.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/responses', responsesRouter);
  return app;
}

describe('Sprint 3 UC3 responses route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbResolveAppUserId.mockResolvedValue(77);
    mockUserType = 'SELLER';
    mockJwtRole = 'seller';
    mockDbFetchViolationWorkflowMeta.mockResolvedValue({
      violation_id: 101,
      listing: { seller_id: 55, seller: { seller_email: 'seller@example.com' } },
    });
    mockDbHasResponseForViolation.mockResolvedValue(false);
    mockDbCreateSellerResponseAtomic.mockResolvedValue({ response_id: 1, violation_id: 101 });
    mockDbFetchResponses.mockResolvedValue([]);
  });

  it('accepts valid response submission', async () => {
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'Seller has removed listing',
    });
    expect(res.status).toBe(201);
    expect(mockDbCreateSellerResponseAtomic).toHaveBeenCalled();
  });

  it('rejects missing violation id', async () => {
    const res = await request(makeApp()).post('/api/responses').send({
      response_text: 'x',
    });
    expect(res.status).toBe(400);
  });

  it('rejects whitespace-only response', async () => {
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: '   ',
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing response text', async () => {
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
    });
    expect(res.status).toBe(400);
  });

  it('rejects violation id not found', async () => {
    mockDbFetchViolationWorkflowMeta.mockResolvedValueOnce(null);
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 99999,
      response_text: 'x',
    });
    expect(res.status).toBe(404);
  });

  it('rejects unauthorized seller assignment', async () => {
    mockDbFetchViolationWorkflowMeta.mockResolvedValueOnce({
      violation_id: 101,
      listing: { seller_id: 10, seller: { seller_email: 'someoneelse@example.com' } },
    });
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
    });
    expect(res.status).toBe(403);
  });

  it('rejects duplicate response', async () => {
    mockDbHasResponseForViolation.mockResolvedValueOnce(true);
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
    });
    expect(res.status).toBe(409);
  });

  it('returns error when persistence fails', async () => {
    mockDbCreateSellerResponseAtomic.mockRejectedValueOnce(new Error('DB failure'));
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
    });
    expect(res.status).toBe(500);
  });

  it('injects seller id from server metadata', async () => {
    await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
      seller_id: 9999,
    });
    expect(mockDbCreateSellerResponseAtomic).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ seller_id: 55 }),
    );
  });

  it('ignores client-provided date submitted value', async () => {
    await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
      response_received_at: '2000-01-01T00:00:00.000Z',
    });
    expect(mockDbCreateSellerResponseAtomic).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({ response_received_at: expect.anything() }),
    );
  });

  it('rejects unauthorized non-seller role', async () => {
    mockUserType = 'INVESTIGATOR';
    mockJwtRole = 'investigator';
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
    });
    expect(res.status).toBe(403);
  });

  it('filters seller response list by violation id', async () => {
    await request(makeApp()).get('/api/responses?violation_id=101');
    expect(mockDbFetchResponses).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ violationId: 101, userId: 77 }),
    );
  });
});
