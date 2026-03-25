/**
 * API requests with Supabase JWT when available (omit in client mock + server API_MOCK_MODE).
 */

export function apiFetch(path, session, options = {}) {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(path, { ...options, headers });
}

export async function getApiErrorMessage(response, fallback = 'Request failed') {
  try {
    const data = await response.clone().json();
    if (data?.error) return data.error;
  } catch {
    // ignore non-JSON
  }
  if (response.status === 401) {
    return 'Session expired or missing credentials. Please sign in again.';
  }
  if (response.status === 403) {
    return 'Unauthorized user.';
  }
  return fallback;
}
