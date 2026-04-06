/**
 * SerpAPI client — search Google Shopping and Walmart for marketplace listings.
 *
 * Required env vars:
 *   SERPAPI_KEY — SerpAPI key (free tier: 100 searches/month)
 */

const SERPAPI_URL = 'https://serpapi.com/search.json';

/**
 * Search Google Shopping for a product query.
 * Returns up to `limit` structured product results.
 */
export async function searchSerpApi(query, limit = 20) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_KEY is required');
  }

  const results = [];

  // Google Shopping search
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_shopping',
    q: query,
    num: String(limit),
  });

  const res = await fetch(`${SERPAPI_URL}?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SerpAPI request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const items = data.shopping_results || [];

  for (const item of items.slice(0, limit)) {
    const marketplace = detectMarketplace(item.source || item.link || '');
    results.push({
      title: item.title || 'Untitled',
      url: item.link || item.product_link || '',
      price: item.extracted_price ?? item.price ?? null,
      image: item.thumbnail || null,
      marketplace,
      source: 'SerpAPI',
      description: item.snippet || null,
    });
  }

  return results;
}

/**
 * Detect marketplace from the source name or URL.
 */
function detectMarketplace(sourceOrUrl) {
  const lower = sourceOrUrl.toLowerCase();
  if (lower.includes('amazon')) return 'Amazon';
  if (lower.includes('walmart')) return 'Walmart';
  if (lower.includes('ebay')) return 'eBay';
  if (lower.includes('target')) return 'Target';
  if (lower.includes('etsy')) return 'Etsy';
  return 'Other';
}
