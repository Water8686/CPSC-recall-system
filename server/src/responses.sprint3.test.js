import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbFetchResponses = vi.fn();
const mockDbCreateSellerResponseAtomic = vi.fn();
const mockDbCreateResponse = vi.fn();
const mockDbFetchViolationWorkflowMeta = vi.fn();
const mockDbFetchViolationAuthMeta = vi.fn();
const mockDbHasAdjudicationForViolation = vi.fn();
const mockDbSellerResponderExistsForViolation = vi.fn();
const mockDbMarkViolationReadyForAdjudication = vi.fn();
const mockDbResolveAppUserId = vi.fn();
const mockAssertViolationAccess = vi.fn();
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

vi.mock('./lib/violationAccess.js', async () => {
  const actual = await vi.importActual('./lib/violationAccess.js');
  return {
    ...actual,
    assertViolationAccess: (...args) => mockAssertViolationAccess(...args),
  };
});

vi.mock('./lib/supabaseViolationData.js', () => ({
  dbFetchResponses: (...args) => mockDbFetchResponses(...args),
  dbCreateSellerResponseAtomic: (...args) => mockDbCreateSellerResponseAtomic(...args),
  dbCreateResponse: (...args) => mockDbCreateResponse(...args),
  dbFetchViolationWorkflowMeta: (...args) => mockDbFetchViolationWorkflowMeta(...args),
  dbFetchViolationAuthMeta: (...args) => mockDbFetchViolationAuthMeta(...args),
  dbHasAdjudicationForViolation: (...args) => mockDbHasAdjudicationForViolation(...args),
  dbSellerResponderExistsForViolation: (...args) => mockDbSellerResponderExistsForViolation(...args),
  dbMarkViolationReadyForAdjudication: (...args) => mockDbMarkViolationReadyForAdjudication(...args),
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
      violation_status: 'Notice Sent',
      listing: { seller_id: 55, seller: { seller_email: 'seller@example.com' } },
    });
    mockDbFetchViolationAuthMeta.mockResolvedValue({
      violation_id: 101,
      user_id: 1,
      seller_id: 55,
    });
    mockDbHasAdjudicationForViolation.mockResolvedValue(false);
    mockDbSellerResponderExistsForViolation.mockResolvedValue(false);
    mockDbCreateSellerResponseAtomic.mockResolvedValue({ response_id: 1, violation_id: 101 });
    mockDbCreateResponse.mockResolvedValue({ response_id: 2, violation_id: 101 });
    mockDbFetchResponses.mockResolvedValue([]);
    mockAssertViolationAccess.mockImplementation(async () => true);
  });

  it('accepts valid response submission', async () => {
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'Seller has removed listing',
    });
    expect(res.status).toBe(201);
    expect(mockDbCreateSellerResponseAtomic).toHaveBeenCalled();
    expect(mockDbCreateResponse).not.toHaveBeenCalled();
  });

  it('allows second seller response via append path', async () => {
    mockDbSellerResponderExistsForViolation.mockResolvedValue(true);
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'follow-up message',
    });
    expect(res.status).toBe(201);
    expect(mockDbCreateSellerResponseAtomic).not.toHaveBeenCalled();
    expect(mockDbCreateResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        violation_id: 101,
        responder_type: 'seller',
        response_text: 'follow-up message',
      }),
    );
  });

  it('rejects seller response when adjudication exists', async () => {
    mockDbHasAdjudicationForViolation.mockResolvedValue(true);
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
    });
    expect(res.status).toBe(409);
    expect(mockDbCreateSellerResponseAtomic).not.toHaveBeenCalled();
    expect(mockDbCreateResponse).not.toHaveBeenCalled();
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
      violation_status: 'Notice Sent',
      listing: { seller_id: 10, seller: { seller_email: 'someoneelse@example.com' } },
    });
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
    });
    expect(res.status).toBe(403);
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

  it('allows investigator staff to append seller-typed response', async () => {
    mockUserType = 'INVESTIGATOR';
    mockJwtRole = 'investigator';
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'Seller confirmed removal',
      responder_type: 'seller',
    });
    expect(res.status).toBe(201);
    expect(mockDbCreateResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        violation_id: 101,
        responder_type: 'seller',
        seller_id: 55,
      }),
    );
    expect(mockDbMarkViolationReadyForAdjudication).not.toHaveBeenCalled();
  });

  it('allows investigator investigator-typed response', async () => {
    mockUserType = 'INVESTIGATOR';
    mockJwtRole = 'investigator';
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'Please clarify listing SKU',
      responder_type: 'investigator',
    });
    expect(res.status).toBe(201);
    expect(mockDbCreateResponse).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        responder_type: 'investigator',
        seller_id: null,
      }),
    );
  });

  it('calls dbMarkViolationReadyForAdjudication when record_no_seller_reply', async () => {
    mockUserType = 'INVESTIGATOR';
    mockJwtRole = 'investigator';
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'No response received',
      responder_type: 'investigator',
      record_no_seller_reply: true,
    });
    expect(res.status).toBe(201);
    expect(mockDbMarkViolationReadyForAdjudication).toHaveBeenCalledWith(expect.anything(), 101);
  });

  it('rejects record_no_seller_reply without investigator responder_type', async () => {
    mockUserType = 'MANAGER';
    mockJwtRole = 'manager';
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
      responder_type: 'seller',
      record_no_seller_reply: true,
    });
    expect(res.status).toBe(400);
    expect(mockDbMarkViolationReadyForAdjudication).not.toHaveBeenCalled();
  });

  it('rejects invalid responder_type for staff', async () => {
    mockUserType = 'MANAGER';
    mockJwtRole = 'manager';
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
      responder_type: 'bot',
    });
    expect(res.status).toBe(400);
  });

  it('returns 403 when staff lacks violation access', async () => {
    mockUserType = 'INVESTIGATOR';
    mockJwtRole = 'investigator';
    mockAssertViolationAccess.mockImplementationOnce(async (_req, res) => {
      res.status(403).json({ error: 'Forbidden' });
      return false;
    });
    const res = await request(makeApp()).post('/api/responses').send({
      violation_id: 101,
      response_text: 'x',
    });
    expect(res.status).toBe(403);
    expect(mockDbCreateResponse).not.toHaveBeenCalled();
  });

  it('filters seller response list by violation id', async () => {
    await request(makeApp()).get('/api/responses?violation_id=101');
    expect(mockDbFetchResponses).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ violationId: 101, userId: 77 }),
    );
  });
});
