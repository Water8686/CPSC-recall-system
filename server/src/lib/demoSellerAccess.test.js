import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDemoSellerFullAccessEmail } from './violationAccess.js';

describe('getDemoSellerFullAccessEmail', () => {
  const key = 'DEMO_SELLER_FULL_ACCESS_EMAIL';

  beforeEach(() => {
    delete process.env[key];
  });

  afterEach(() => {
    delete process.env[key];
  });

  it('defaults to seller@cpsc.demo when unset', () => {
    expect(getDemoSellerFullAccessEmail()).toBe('seller@cpsc.demo');
  });

  it('returns null when disabled with none', () => {
    process.env[key] = 'none';
    expect(getDemoSellerFullAccessEmail()).toBeNull();
  });
});
