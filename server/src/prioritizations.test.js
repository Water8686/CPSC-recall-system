import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('POST /api/prioritizations (API_MOCK_MODE)', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it('returns 400 when recall_id is missing', async () => {
    const res = await request(app).post('/api/prioritizations').send({ priority: 'High' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Recall ID is required');
  });

  it('returns 400 when recall_id is only whitespace', async () => {
    const res = await request(app)
      .post('/api/prioritizations')
      .send({ recall_id: '   ', priority: 'High' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Recall ID is required');
  });

  it('returns 400 when priority is invalid', async () => {
    const res = await request(app)
      .post('/api/prioritizations')
      .send({ recall_id: '24-001', priority: 'Urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('priority must be one of: High, Medium, Low');
  });

  it('returns 404 when recall_id does not exist', async () => {
    const res = await request(app)
      .post('/api/prioritizations')
      .send({ recall_id: '99-999', priority: 'High' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recall ID does not exist');
  });

  it('creates prioritization for a recall that has none yet', async () => {
    const res = await request(app)
      .post('/api/prioritizations')
      .send({ recall_id: '24-011', priority: 'Low' });
    expect(res.status).toBe(201);
    expect(res.body.recall_id).toBe('24-011');
    expect(res.body.priority).toBe('Low');
  });

  it('updates existing prioritization on second POST for same recall', async () => {
    const first = await request(app)
      .post('/api/prioritizations')
      .send({ recall_id: '24-001', priority: 'Medium' });
    expect(first.status).toBe(201);
    expect(first.body.priority).toBe('Medium');

    const second = await request(app)
      .post('/api/prioritizations')
      .send({ recall_id: '24-001', priority: 'High' });
    expect(second.status).toBe(201);
    expect(second.body.recall_id).toBe('24-001');
    expect(second.body.priority).toBe('High');
    expect(second.body.prioritized_at).toBeDefined();
  });
});
