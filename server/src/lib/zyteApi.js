/**
 * Zyte API client — scrape marketplace product pages.
 *
 * Required env vars:
 *   ZYTE_API_KEY — Zyte API key (from GitHub Education pack or zyte.com)
 */

const ZYTE_API_URL = 'https://api.zyte.com/v1/extract';

function buildSearchUrls(query) {
  const encoded = encodeURIComponent(query);
  return [
    {
      marketplace: 'Amazon',
      url: `https://www.amazon.com/s?k=${encoded}`,
    },
    {
      marketplace: 'Walmart',
      url: `https://www.walmart.com/search?q=${encoded}`,
    },
  ];
}

export async function searchZyte(query) {
  const apiKey = process.env.ZYTE_API_KEY;
  if (!apiKey) {
    throw new Error('ZYTE_API_KEY is required');
  }

  const targets = buildSearchUrls(query);
  const results = [];

  for (const target of targets) {
    try {
      const res = await fetch(ZYTE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        },
        body: JSON.stringify({
          url: target.url,
          product: true,
          productList: true,
        }),
      });

      if (!res.ok) {
        console.warn(`Zyte scrape failed for ${target.marketplace} (${res.status})`);
        continue;
      }

      const data = await res.json();
      const products = data.productList?.products || [];

      for (const product of products.slice(0, 10)) {
        results.push({
          title: product.name || product.title || 'Untitled',
          url: product.url || target.url,
          price: product.price ?? null,
          image: product.mainImage?.url ?? null,
          marketplace: target.marketplace,
          source: 'Zyte',
          description: product.description ?? null,
        });
      }
    } catch (err) {
      console.warn(`Zyte error for ${target.marketplace}:`, err.message);
    }
  }

  return results;
}
