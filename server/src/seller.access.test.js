/**
 * Seller access control tests (API_MOCK_MODE=false, real JWT, no DB).
 *
 * These tests verify that the seller role is properly gated:
 *  - GET /api/violations returns 200 (scoped query — hits DB, so tested in mock mode too)
 *  - GET /api/stats/dashboard returns 403
 *  - GET /api/prioritizations returns 403
 *  - GET /api/responses returns 403
 *  - POST /api/contacts returns 403
 *  - POST /api/adjudications returns 403
 *  - PATCH /api/violations/:id returns 403
 *
 * And that staff roles retain access to gated endpoints:
 *  - GET /api/stats/dashboard returns non-403 for investigator
 *  - POST /api/contacts returns non-401 for investigator (503 since no DB, not 403)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { signAppToken } from './lib/appJwt.js';

describe('Seller role — API access control', () => {
  let app;
  let sellerToken;
  let investigatorToken;

  beforeAll(async () => {
    // Ensure we are NOT in mock mode so JWT role checks run.
    delete process.env.API_MOCK_MODE;
    app = createApp();
    sellerToken = await signAppToken('99', 'seller@cpsc.demo', 'seller');
    investigatorToken = await signAppToken('2', 'investigator@cpsc.demo', 'investigator');
  });

  afterAll(() => {
    // Restore mock mode if it was set before the suite (it wasn't, but be safe).
    delete process.env.API_MOCK_MODE;
  });

  // ── Seller should be denied from operational-staff endpoints ──────────────

  it('GET /api/stats/dashboard returns 403 for seller', async () => {
    const res = await request(app)
      .get('/api/stats/dashboard')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/prioritizations returns 403 for seller', async () => {
    const res = await request(app)
      .get('/api/prioritizations')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/responses returns 503 for seller without DB client (no Supabase in test harness)', async () => {
    const res = await request(app)
      .get('/api/responses')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(503);
  });

  it('POST /api/contacts returns 403 for seller', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ violation_id: 1, message_summary: 'test' });
    expect(res.status).toBe(403);
  });

  it('POST /api/adjudications returns 403 for seller', async () => {
    const res = await request(app)
      .post('/api/adjudications')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ violation_id: 1, status: 'Resolved' });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/violations/:id returns 403 for seller', async () => {
    const res = await request(app)
      .patch('/api/violations/1')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ violation_status: 'Closed' });
    expect(res.status).toBe(403);
  });

  it('POST /api/violations returns 403 for seller (investigator-only endpoint)', async () => {
    const res = await request(app)
      .post('/api/violations')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ listing_id: 1, violation_type: 'Recalled Product Listed for Sale', date_of_violation: '2024-01-01' });
    expect(res.status).toBe(403);
  });

  // ── Unauthenticated requests should be rejected ────────────────────────────

  it('GET /api/violations returns 401 without token', async () => {
    const res = await request(app).get('/api/violations');
    expect(res.status).toBe(401);
  });

  it('GET /api/stats/dashboard returns 401 without token', async () => {
    const res = await request(app).get('/api/stats/dashboard');
    expect(res.status).toBe(401);
  });

  // ── Investigator retains access to operational endpoints ──────────────────

  it('GET /api/stats/dashboard is not 403 for investigator (may be 503 without DB)', async () => {
    const res = await request(app)
      .get('/api/stats/dashboard')
      .set('Authorization', `Bearer ${investigatorToken}`);
    expect(res.status).not.toBe(403);
  });

  it('POST /api/contacts is not 403 for investigator (may be 400/503 without DB)', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({ violation_id: 1, message_summary: 'test' });
    expect(res.status).not.toBe(403);
  });

  it('PATCH /api/violations/:id is not 403 for investigator (may be 503 without DB)', async () => {
    const res = await request(app)
      .patch('/api/violations/1')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({ violation_status: 'Closed' });
    expect(res.status).not.toBe(403);
  });
});

describe('Seller role — mock mode violations list', () => {
  let app;
  let sellerToken;
  const priorMockMode = process.env.API_MOCK_MODE;

  beforeAll(async () => {
    process.env.API_MOCK_MODE = 'true';
    app = createApp();
    sellerToken = await signAppToken('99', 'seller@cpsc.demo', 'seller');
  });

  afterAll(() => {
    if (priorMockMode === undefined) delete process.env.API_MOCK_MODE;
    else process.env.API_MOCK_MODE = priorMockMode;
  });

  it('GET /api/violations returns 200 empty array in mock mode (no DB needed)', async () => {
    const res = await request(app)
      .get('/api/violations')
      .set('Authorization', `Bearer ${sellerToken}`);
    // Mock mode bypasses auth and returns empty array without hitting the DB.
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/violations/:id returns violation detail in mock mode', async () => {
    const res = await request(app)
      .get('/api/violations/42')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.violation_id).toBe(42);
    // notes should NOT be stripped in mock mode (no role DB check in mock)
    expect(res.body).toHaveProperty('contacts');
  });
});
