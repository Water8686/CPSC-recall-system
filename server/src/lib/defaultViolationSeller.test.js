import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDefaultViolationSellerEmail } from './supabaseViolationData.js';

describe('getDefaultViolationSellerEmail', () => {
  const key = 'DEFAULT_VIOLATION_SELLER_EMAIL';

  beforeEach(() => {
    delete process.env[key];
  });

  afterEach(() => {
    delete process.env[key];
  });

  it('defaults to seller@cpsc.demo when unset', () => {
    expect(getDefaultViolationSellerEmail()).toBe('seller@cpsc.demo');
  });

  it('returns custom email when set', () => {
    process.env[key] = 'other@example.com';
    expect(getDefaultViolationSellerEmail()).toBe('other@example.com');
  });

  it('returns null when disabled with none', () => {
    process.env[key] = 'none';
    expect(getDefaultViolationSellerEmail()).toBeNull();
  });

  it('returns null when disabled with OFF', () => {
    process.env[key] = 'OFF';
    expect(getDefaultViolationSellerEmail()).toBeNull();
  });
});
