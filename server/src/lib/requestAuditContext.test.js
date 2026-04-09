import { describe, it, expect } from 'vitest';
import { collectRequestAuditContext } from './requestAuditContext.js';

function makeReq(overrides = {}) {
  const headers = { ...overrides.headers };
  return {
    ip: overrides.ip ?? '127.0.0.1',
    headers,
    get(name) {
      const key = String(name).toLowerCase();
      const map = overrides.headerMap ?? {};
      return map[key] ?? null;
    },
  };
}

describe('collectRequestAuditContext', () => {
  it('collects ip, forwarded_for from x-forwarded-for, and header map', () => {
    const req = makeReq({
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.2' },
      headerMap: {
        'user-agent': 'TestAgent/1.0',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Chromium";v="120"',
        'sec-ch-ua-platform': '"macOS"',
        'sec-ch-ua-mobile': '?0',
        origin: 'https://app.example',
        referer: 'https://app.example/login',
      },
    });
    const ctx = collectRequestAuditContext(req);
    expect(ctx.ip).toBe('10.0.0.1');
    expect(ctx.forwarded_for).toBe('203.0.113.5, 10.0.0.2');
    expect(ctx.user_agent).toBe('TestAgent/1.0');
    expect(ctx.accept_language).toBe('en-US,en;q=0.9');
    expect(ctx.sec_ch_ua).toBe('"Chromium";v="120"');
    expect(ctx.sec_ch_ua_platform).toBe('"macOS"');
    expect(ctx.sec_ch_ua_mobile).toBe('?0');
    expect(ctx.origin).toBe('https://app.example');
    expect(ctx.referer).toBe('https://app.example/login');
  });

  it('uses x-real-ip when x-forwarded-for is absent', () => {
    const req = makeReq({
      headers: { 'x-real-ip': '198.51.100.1' },
    });
    const ctx = collectRequestAuditContext(req);
    expect(ctx.forwarded_for).toBe('198.51.100.1');
  });

  it('joins array x-forwarded-for', () => {
    const req = makeReq({
      headers: { 'x-forwarded-for': ['a', 'b'] },
    });
    expect(collectRequestAuditContext(req).forwarded_for).toBe('a, b');
  });
});
