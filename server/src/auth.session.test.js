import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { signAppToken } from './lib/appJwt.js';

describe('POST /api/auth/session-ping and session-end', () => {
  let app;
  let token;

  beforeAll(async () => {
    app = createApp();
    token = await signAppToken('1', 'tester@example.com', 'manager');
  });

  it('returns 401 without Authorization', async () => {
    const res = await request(app)
      .post('/api/auth/session-ping')
      .send({ session_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid JWT', async () => {
    const res = await request(app)
      .post('/api/auth/session-ping')
      .set('Authorization', 'Bearer not-a-jwt')
      .send({ session_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when session_id is missing or not a UUID v4', async () => {
    const bad = await request(app)
      .post('/api/auth/session-ping')
      .set('Authorization', `Bearer ${token}`)
      .send({ session_id: 'nope' });
    expect(bad.status).toBe(400);

    const empty = await request(app)
      .post('/api/auth/session-ping')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(empty.status).toBe(400);
  });

  it('returns 200 ok for well-formed session_id (audit may be disabled)', async () => {
    const res = await request(app)
      .post('/api/auth/session-ping')
      .set('Authorization', `Bearer ${token}`)
      .send({ session_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('session-end validates same as session-ping', async () => {
    const res = await request(app)
      .post('/api/auth/session-end')
      .set('Authorization', `Bearer ${token}`)
      .send({ session_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
