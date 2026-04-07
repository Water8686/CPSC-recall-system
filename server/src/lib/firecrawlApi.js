/**
 * Firecrawl client — scrapes a URL and extracts structured product data
 * using Firecrawl's LLM extraction mode.
 *
 * Required env vars:
 *   FIRECRAWL_API_KEY — Firecrawl API key
 */

import FirecrawlApp from '@mendable/firecrawl-js';

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY is required');
    client = new FirecrawlApp({ apiKey });
  }
  return client;
}

/**
 * Scrape a URL and extract product details.
 * @param {string} url — the listing page URL
 * @returns {{ product_name: string|null, manufacturer: string|null, model_number: string|null }}
 */
export async function scrapeAndExtract(url) {
  const fc = getClient();

  const result = await fc.scrapeUrl(url, {
    formats: ['extract'],
    extract: {
      schema: {
        type: 'object',
        properties: {
          product_name: {
            type: 'string',
            description: 'The full product name or title',
          },
          manufacturer: {
            type: 'string',
            description: 'The brand or manufacturer name',
          },
          model_number: {
            type: 'string',
            description: 'The model number, part number, or SKU',
          },
        },
      },
    },
  });

  if (!result.success) {
    throw new Error(`Firecrawl scrape failed for ${url}: ${result.error || 'unknown error'}`);
  }

  const extracted = result.extract || {};
  return {
    product_name: extracted.product_name || null,
    manufacturer: extracted.manufacturer || null,
    model_number: extracted.model_number || null,
  };
}
