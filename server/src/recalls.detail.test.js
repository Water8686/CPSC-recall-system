import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('GET /api/recalls/:id (detail, API_MOCK_MODE)', () => {
  let app;

  beforeAll(() => {
    process.env.API_MOCK_MODE = 'true';
    app = createApp();
  });

  it('returns full detail payload by recall_number', async () => {
    const res = await request(app).get('/api/recalls/24-001');

    expect(res.status).toBe(200);

    const summaryKeys = ['id', 'recall_id', 'title', 'product', 'hazard', 'image_url'];
    summaryKeys.forEach((k) => expect(res.body).toHaveProperty(k));

    const detailKeys = [
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
    ];
    detailKeys.forEach((k) => expect(res.body).toHaveProperty(k));

    expect(typeof res.body.id).toBe('string');
    expect(res.body.recall_id).toBe('24-001');
  });

  it('returns 404 when recall_number does not exist', async () => {
    const res = await request(app).get('/api/recalls/99-999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Recall not found' });
  });
});

