import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('Violations detail & contacts (API_MOCK_MODE)', () => {
  let app;
  const priorApiMockMode = process.env.API_MOCK_MODE;

  beforeAll(() => {
    process.env.API_MOCK_MODE = 'true';
    app = createApp();
  });

  afterAll(() => {
    if (priorApiMockMode === undefined) delete process.env.API_MOCK_MODE;
    else process.env.API_MOCK_MODE = priorApiMockMode;
  });

  it('GET /api/violations/:id returns 400 for non-numeric id', async () => {
    const res = await request(app).get('/api/violations/abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid violation id/i);
  });

  it('GET /api/violations/:id returns 404 when violation not found', async () => {
    const res = await request(app).get('/api/violations/99999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('GET /api/violations/:id returns detail payload with contacts array', async () => {
    const res = await request(app).get('/api/violations/42');
    expect(res.status).toBe(200);
    expect(res.body.violation_id).toBe(42);
    expect(res.body).toHaveProperty('contacts');
    expect(Array.isArray(res.body.contacts)).toBe(true);
    expect(res.body).toHaveProperty('violation_status');
    expect(res.body).toHaveProperty('listing_url');
  });

  it('POST /api/contacts returns 201 in mock mode', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({
        violation_id: 1,
        message_summary: 'Test seller outreach',
      });
    expect(res.status).toBe(201);
    expect(res.body.message_summary).toBe('Test seller outreach');
    expect(res.body).toHaveProperty('contact_id');
    expect(Array.isArray(res.body.responses)).toBe(true);
  });
});
