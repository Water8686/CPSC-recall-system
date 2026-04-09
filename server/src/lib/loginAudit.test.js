import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();

vi.mock('./auditSupabase.js', () => ({
  auditSupabase: {
    get from() {
      return fromMock;
    },
  },
}));

import {
  isValidSessionUuid,
  recordSuccessfulLoginAndSession,
  logLoginAttemptAsync,
  touchAuditSession,
  endAuditSession,
} from './loginAudit.js';

function mockReq() {
  return {
    ip: '127.0.0.1',
    headers: {},
    get(h) {
      if (String(h).toLowerCase() === 'user-agent') return 'Vitest';
      return null;
    },
  };
}

describe('isValidSessionUuid', () => {
  it('accepts UUID v4', () => {
    expect(isValidSessionUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects non-v4 and garbage', () => {
    expect(isValidSessionUuid('not-a-uuid')).toBe(false);
    expect(isValidSessionUuid('')).toBe(false);
    expect(isValidSessionUuid(null)).toBe(false);
    // v1-style variant nibble
    expect(isValidSessionUuid('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });
});

describe('loginAudit with mocked auditSupabase', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('recordSuccessfulLoginAndSession inserts event and session and returns session uuid', async () => {
    const eventId = 'aaaaaaaa-bbbb-4ccc-8ddd-111111111111';
    fromMock.mockImplementation((table) => {
      if (table === 'login_audit_events') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: eventId }, error: null }),
            }),
          }),
        };
      }
      if (table === 'login_audit_sessions') {
        return {
          insert: () => Promise.resolve({ error: null }),
        };
      }
      return {};
    });

    const sid = await recordSuccessfulLoginAndSession(
      mockReq(),
      { user_id: 42, email: 't@example.com', user_type: 'MANAGER' },
      'success',
    );

    expect(sid).toBeTruthy();
    expect(isValidSessionUuid(sid)).toBe(true);
    expect(fromMock).toHaveBeenCalledWith('login_audit_events');
    expect(fromMock).toHaveBeenCalledWith('login_audit_sessions');
  });

  it('logLoginAttemptAsync inserts login_audit_events (fire-and-forget)', async () => {
    const insertThen = vi.fn((cb) => Promise.resolve(cb({ error: null })));
    fromMock.mockImplementation((table) => {
      if (table === 'login_audit_events') {
        return {
          insert: () => ({ then: insertThen }),
        };
      }
      return {};
    });

    logLoginAttemptAsync(mockReq(), {
      outcome: 'unknown_user',
      emailNormalized: 'x@y.com',
    });

    await new Promise((r) => setImmediate(r));
    expect(fromMock).toHaveBeenCalledWith('login_audit_events');
    expect(insertThen).toHaveBeenCalled();
  });

  it('touchAuditSession chains update', async () => {
    const isPromise = Promise.resolve({ error: null });
    fromMock.mockImplementation((table) => {
      if (table === 'login_audit_sessions') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                is: () => isPromise,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const r = await touchAuditSession(1, '550e8400-e29b-41d4-a716-446655440000');
    expect(r.ok).toBe(true);
  });

  it('endAuditSession chains update', async () => {
    const isPromise = Promise.resolve({ error: null });
    fromMock.mockImplementation((table) => {
      if (table === 'login_audit_sessions') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                is: () => isPromise,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const r = await endAuditSession(1, '550e8400-e29b-41d4-a716-446655440000');
    expect(r.ok).toBe(true);
  });
});
