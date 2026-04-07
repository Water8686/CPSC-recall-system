import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('GET /api/recalls/:recall_number (detail, API_MOCK_MODE)', () => {
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

  it('returns full detail payload by recall_number', async () => {
    const recallNumber = '24-001';
    const res = await request(app).get(`/api/recalls/${recallNumber}`);

    expect(res.status).toBe(200);

    // Contract: identifier behavior
    expect(typeof res.body.id).toBe('string');
    expect(res.body.recall_id).toBe(recallNumber);

    // Existing summary keys must remain present
    [
      'id',
      'recall_id',
      'title',
      'product',
      'hazard',
      'image_url',
    ].forEach((k) => expect(res.body).toHaveProperty(k));

    // Detail keys must exist (values may be null/empty)
    [
      'recall_url',
      'consumer_contact',
      'recall_description',
      'injury',
      'remedy',
      'remedy_option',
      'manufacturer',
      'manufacturer_country',
      'importer',
      'distributor',
      'retailer',
      'product_name',
      'product_type',
      'number_of_units',
      'upc',
      'recall_date',
      'last_publish_date',
      'added_at',
    ].forEach((k) => expect(res.body).toHaveProperty(k));
  });

  it('returns 404 when recall_number does not exist', async () => {
    const res = await request(app).get('/api/recalls/99-999');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'Recall not found' });
  });

  it('list endpoint includes recall_date on each item', async () => {
    const res = await request(app).get('/api/recalls');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // Every recall object must have recall_date
    res.body.forEach((r) => {
      expect(r).toHaveProperty('recall_date');
    });
  });
});
