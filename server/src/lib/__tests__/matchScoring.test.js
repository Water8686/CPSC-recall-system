import { describe, it, expect } from 'vitest';
import { scoreMatch, computeSimilarity } from '../matchScoring.js';

describe('computeSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(computeSimilarity('Fisher-Price', 'Fisher-Price')).toBe(1);
  });

  it('returns 1.0 for case-insensitive match', () => {
    expect(computeSimilarity('Fisher-Price', 'fisher-price')).toBe(1);
  });

  it('returns 0 when either string is null or empty', () => {
    expect(computeSimilarity(null, 'test')).toBe(0);
    expect(computeSimilarity('test', '')).toBe(0);
  });

  it('returns a value between 0 and 1 for partial matches', () => {
    const score = computeSimilarity('Fisher-Price Toy', 'Fisher Price Toys');
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('scoreMatch', () => {
  const recall = {
    product_name: 'Toddler Sleeper Gown',
    manufacturer: 'Fisher-Price',
    model_number: 'GKW70',
  };

  it('returns High tier when all 3 fields match closely', () => {
    const scraped = {
      product_name: 'Toddler Sleeper Gown',
      manufacturer: 'Fisher-Price',
      model_number: 'GKW70',
    };
    const result = scoreMatch(scraped, recall);
    expect(result.tier).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('returns High tier when model + manufacturer match (score >= 60)', () => {
    const scraped = {
      product_name: 'Completely Different Name',
      manufacturer: 'Fisher-Price',
      model_number: 'GKW70',
    };
    const result = scoreMatch(scraped, recall);
    expect(result.tier).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('returns Uncertain tier for partial match (1 field)', () => {
    const scraped = {
      product_name: 'Baby Sleeping Bag',
      manufacturer: 'Fisher-Price',
      model_number: 'XYZ999',
    };
    const result = scoreMatch(scraped, recall);
    expect(result.tier).toBe('Uncertain');
    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.score).toBeLessThan(60);
  });

  it('returns No Match when nothing matches', () => {
    const scraped = {
      product_name: 'Kitchen Blender Pro',
      manufacturer: 'Vitamix',
      model_number: 'A2500',
    };
    const result = scoreMatch(scraped, recall);
    expect(result.tier).toBe('No Match');
    expect(result.score).toBeLessThan(25);
  });

  it('redistributes weights when recall field is missing', () => {
    const recallNoModel = {
      product_name: 'Toddler Sleeper Gown',
      manufacturer: 'Fisher-Price',
      model_number: null,
    };
    const scraped = {
      product_name: 'Toddler Sleeper Gown',
      manufacturer: 'Fisher-Price',
      model_number: 'GKW70',
    };
    const result = scoreMatch(scraped, recallNoModel);
    expect(result.tier).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('redistributes weights when scraped field is missing', () => {
    const scraped = {
      product_name: 'Toddler Sleeper Gown',
      manufacturer: 'Fisher-Price',
      model_number: null,
    };
    const result = scoreMatch(scraped, recall);
    expect(result.tier).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});
