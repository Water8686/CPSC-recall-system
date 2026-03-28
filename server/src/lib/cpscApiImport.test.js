import { describe, it, expect } from 'vitest';
import {
  normalizeRecallNumber,
  mapCpscJsonItemToRecallRecord,
  resolveCpscDateWindow,
} from './cpscApiImport.js';

describe('normalizeRecallNumber', () => {
  it('formats 5-digit CPSC numbers', () => {
    expect(normalizeRecallNumber('24090')).toBe('24-090');
    expect(normalizeRecallNumber('25001')).toBe('25-001');
  });

  it('preserves dashed form', () => {
    expect(normalizeRecallNumber('24-090')).toBe('24-090');
  });
});

describe('mapCpscJsonItemToRecallRecord', () => {
  it('maps sample API shape', () => {
    const rec = mapCpscJsonItemToRecallRecord({
      RecallNumber: '24090',
      Title: 'Test recall title',
      RecallDate: '2024-01-25T00:00:00',
      LastPublishDate: '2024-01-25T00:00:00',
      Products: [{ Name: 'Widget', Type: 'Toys' }],
      Hazards: [{ Name: 'Fire hazard' }],
      Images: [{ URL: 'https://example.com/x.png' }],
    });
    expect(rec.recall_number).toBe('24-090');
    expect(rec.recall_title).toBe('Test recall title');
    expect(rec.product_name).toBe('Widget');
    expect(rec.hazard).toBe('Fire hazard');
    expect(rec.image_url).toBe('https://example.com/x.png');
  });
});

describe('resolveCpscDateWindow', () => {
  it('requires both dates if one set', () => {
    const r = resolveCpscDateWindow({ recallDateStart: '2024-01-01' });
    expect(r.error).toBeDefined();
  });

  it('accepts valid range', () => {
    const r = resolveCpscDateWindow({
      recallDateStart: '2024-01-01',
      recallDateEnd: '2024-01-31',
    });
    expect(r.error).toBeUndefined();
    expect(r.recallDateStart).toBe('2024-01-01');
    expect(r.recallDateEnd).toBe('2024-01-31');
  });
});
