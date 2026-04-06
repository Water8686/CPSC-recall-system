/**
 * eBay Browse API client — OAuth client credentials + product search.
 *
 * Required env vars:
 *   EBAY_CLIENT_ID     — eBay application (client) ID
 *   EBAY_CLIENT_SECRET — eBay application secret
 *   EBAY_ENV           — 'sandbox' or 'production' (default: sandbox)
 */

const EBAY_SANDBOX_AUTH = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
const EBAY_PROD_AUTH = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_SANDBOX_BROWSE = 'https://api.sandbox.ebay.com/buy/browse/v1';
const EBAY_PROD_BROWSE = 'https://api.ebay.com/buy/browse/v1';

let cachedToken = null;
let tokenExpiresAt = 0;

function getUrls() {
  const isProd = process.env.EBAY_ENV === 'production';
  return {
    authUrl: isProd ? EBAY_PROD_AUTH : EBAY_SANDBOX_AUTH,
    browseUrl: isProd ? EBAY_PROD_BROWSE : EBAY_SANDBOX_BROWSE,
  };
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are required');
  }

  const { authUrl } = getUrls();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function searchEbay(query, limit = 20) {
  const token = await getAccessToken();
  const { browseUrl } = getUrls();
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  const res = await fetch(`${browseUrl}/item_summary/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay search failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data.itemSummaries || []).map((item) => ({
    title: item.title,
    url: item.itemWebUrl,
    price: item.price?.value ? Number(item.price.value) : null,
    image: item.image?.imageUrl ?? null,
    marketplace: 'eBay',
    source: 'eBay API',
    external_id: item.itemId,
    listed_at: item.itemCreationDate ?? null,
  }));
}
