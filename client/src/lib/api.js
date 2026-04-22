/**
 * API requests with Supabase JWT when available (omit in client mock + server API_MOCK_MODE).
 */

const TOKEN_KEY = 'cpsc-app-jwt';
const AUDIT_SESSION_ID_KEY = 'cpsc-audit-session-id';

// Guard to avoid redirect loops when we're already on a public page.
function onPublicRoute() {
  if (typeof window === 'undefined') return true;
  const p = window.location.pathname;
  return (
    p === '/login' ||
    p === '/register' ||
    p.startsWith('/forgot-password') ||
    p.startsWith('/reset-password')
  );
}

function handleUnauthenticated() {
  if (typeof window === 'undefined') return;
  if (onPublicRoute()) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(AUDIT_SESSION_ID_KEY);
  } catch {
    /* storage access can throw in private-mode iframes — safe to ignore */
  }
  // Hard-navigate so React state and all in-flight requests are torn down.
  window.location.assign('/login');
}

export async function apiFetch(path, session, options = {}) {
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
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401 && session?.access_token) {
    // Token is present but the server rejected it → it's expired/invalid.
    // Sign the user out and return the response so the caller can still handle it.
    handleUnauthenticated();
  }
  return res;
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
