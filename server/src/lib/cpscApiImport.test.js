import { describe, it, expect } from 'vitest';
import {
  normalizeRecallNumber,
  mapCpscJsonItemToRecallRecord,
  resolveCpscDateWindow,
  resolveCpscDateBasis,
  buildCpscRecallApiQuery,
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
      Products: [{ Name: 'Widget', Type: 'Toys', Model: 'GKW70' }],
      Hazards: [{ Name: 'Fire hazard' }],
      Images: [{ URL: 'https://example.com/x.png' }],
    });
    expect(rec.recall_number).toBe('24-090');
    expect(rec.recall_title).toBe('Test recall title');
    expect(rec.product_name).toBe('Widget');
    expect(rec.model_number).toBe('GKW70');
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

describe('resolveCpscDateBasis', () => {
  it('defaults to recall', () => {
    expect(resolveCpscDateBasis({})).toEqual({ dateBasis: 'recall' });
    expect(resolveCpscDateBasis({ dateBasis: '' })).toEqual({ dateBasis: 'recall' });
  });

  it('accepts lastPublish variants', () => {
    expect(resolveCpscDateBasis({ dateBasis: 'lastPublish' })).toEqual({
      dateBasis: 'lastPublish',
    });
    expect(resolveCpscDateBasis({ dateBasis: 'last_publish' })).toEqual({
      dateBasis: 'lastPublish',
    });
  });

  it('rejects unknown', () => {
    expect(resolveCpscDateBasis({ dateBasis: 'bogus' }).error).toBeDefined();
  });
});

describe('buildCpscRecallApiQuery', () => {
  it('uses RecallDate params for recall basis', () => {
    const q = buildCpscRecallApiQuery({
      recallDateStart: '2024-01-01',
      recallDateEnd: '2024-01-31',
      dateBasis: 'recall',
    });
    expect(q.get('format')).toBe('json');
    expect(q.get('RecallDateStart')).toBe('2024-01-01');
    expect(q.get('RecallDateEnd')).toBe('2024-01-31');
    expect(q.get('LastPublishDateStart')).toBeNull();
  });

  it('uses LastPublishDate params for lastPublish basis', () => {
    const q = buildCpscRecallApiQuery({
      recallDateStart: '2024-01-01',
      recallDateEnd: '2024-01-31',
      dateBasis: 'lastPublish',
    });
    expect(q.get('LastPublishDateStart')).toBe('2024-01-01');
    expect(q.get('LastPublishDateEnd')).toBe('2024-01-31');
    expect(q.get('RecallDateStart')).toBeNull();
  });

  it('uses RecallNumber when set', () => {
    const q = buildCpscRecallApiQuery({ recallNumber: '24-090', dateBasis: 'lastPublish' });
    expect(q.get('RecallNumber')).toBe('24090');
    expect(q.get('RecallDateStart')).toBeNull();
    expect(q.get('LastPublishDateStart')).toBeNull();
  });

  it('defaults to RecallDate when dateBasis omitted', () => {
    const q = buildCpscRecallApiQuery({
      recallDateStart: '2024-06-01',
      recallDateEnd: '2024-06-07',
    });
    expect(q.get('RecallDateStart')).toBe('2024-06-01');
    expect(q.get('LastPublishDateStart')).toBeNull();
  });
});
