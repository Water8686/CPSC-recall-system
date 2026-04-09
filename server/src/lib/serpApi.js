/**
 * SerpAPI client — search Google Shopping and eBay for marketplace listings.
 *
 * Required env vars:
 *   SERPAPI_KEY — SerpAPI key (free tier: 100 searches/month)
 */

const SERPAPI_URL = 'https://serpapi.com/search.json';

function getApiKey() {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY is required');
  return apiKey;
}

/**
 * Search Google Shopping for a product query.
 * Supports quoted phrases (e.g. `"Beestech" "Bee-210316-01"`) for exact matching.
 * Returns up to `limit` structured product results.
 */
export async function searchSerpApi(query, limit = 10) {
  const params = new URLSearchParams({
    api_key: getApiKey(),
    engine: 'google_shopping',
    q: query,
    num: String(limit),
  });

  const res = await fetch(`${SERPAPI_URL}?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SerpAPI Google Shopping request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const items = data.shopping_results || [];

  return items.slice(0, limit).map((item) => {
    const marketplace = detectMarketplace(item.source || item.link || '');
    return {
      title: item.title || 'Untitled',
      url: item.link || item.product_link || '',
      price: item.extracted_price ?? item.price ?? null,
      image: item.thumbnail || null,
      marketplace,
      source: 'SerpAPI-Shopping',
      description: item.snippet || null,
    };
  });
}

/**
 * Search eBay listings for a product query.
 * eBay is the most common place for recalled products to still appear after
 * major retailers delist them. Returns up to `limit` active listing results.
 */
export async function searchEbay(query, limit = 10) {
  const params = new URLSearchParams({
    api_key: getApiKey(),
    engine: 'ebay',
    _nkw: query,
    ebay_domain: 'ebay.com',
  });

  const res = await fetch(`${SERPAPI_URL}?${params}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SerpAPI eBay request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const items = data.organic_results || [];

  return items.slice(0, limit).map((item) => ({
    title: item.title || 'Untitled',
    url: item.link || '',
    price: item.price?.extracted ?? null,
    image: item.thumbnail || null,
    marketplace: 'eBay',
    source: 'SerpAPI-eBay',
    description: item.condition || null,
  }));
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
