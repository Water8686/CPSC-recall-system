import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { normalizeAppRole } from 'shared';

const AuthContext = createContext(null);

const TOKEN_KEY = 'cpsc-app-jwt';
/** Persists audit session across reload (same tab); cleared on sign-out. */
const AUDIT_SESSION_ID_KEY = 'cpsc-audit-session-id';

const HEARTBEAT_MS = 3 * 60 * 1000;

const MOCK_USER = {
  id: 'mock-user-id',
  email: 'manager@cpsc.demo',
  user_metadata: { role: 'manager' },
};

const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

async function authFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(path, { ...options, headers });
}

function mapMeToProfile(data) {
  if (!data?.profile) return null;
  const p = data.profile;
  return {
    ...p,
    role: p.role ?? normalizeAppRole({ user_type: p.user_type }, null),
    display_name: p.full_name ?? null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(AUDIT_SESSION_ID_KEY);
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }
    const data = await res.json();
    const prof = mapMeToProfile(data);
    setProfile(prof);
    if (prof) {
      const u = {
        id: prof.id,
        email: prof.email,
        user_metadata: { role: prof.role },
      };
      setUser(u);
      setSession({
        access_token: localStorage.getItem(TOKEN_KEY),
        user: u,
      });
    }
  }, []);

  useEffect(() => {
    if (isMockMode) {
      const stored = localStorage.getItem('cpsc-mock-session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSession(parsed);
          setUser(parsed?.user ?? null);
        } catch {
          setSession(null);
          setUser(null);
        }
      }
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      await loadProfile();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  useEffect(() => {
    if (isMockMode || !user) return undefined;

    const sid = sessionStorage.getItem(AUDIT_SESSION_ID_KEY);
    if (!sid) return undefined;

    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      void authFetch('/api/auth/session-ping', {
        method: 'POST',
        body: JSON.stringify({ session_id: sid }),
      });
    };

    ping();
    const intervalId = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', ping);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', ping);
    };
  }, [user, isMockMode]);

  const signIn = async (email, password) => {
    if (isMockMode) {
      const mockUser = {
        ...MOCK_USER,
        email: email || 'manager@cpsc.demo',
        user_metadata: { role: 'manager' },
      };
      const mockSession = { user: mockUser, access_token: 'mock' };
      setSession(mockSession);
      setUser(mockUser);
      setProfile(null);
      localStorage.setItem('cpsc-mock-session', JSON.stringify(mockSession));
      return { data: { session: mockSession, user: mockUser }, error: null };
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      let message = data.error;
      if (!message && res.status >= 502) {
        message =
          'Server error (' +
          res.status +
          '). Check Railway logs and set APP_JWT_SECRET plus Supabase keys (SUPABASE_SERVICE_ROLE_KEY, URL, anon).';
      }
      if (!message) {
        message = 'Sign in failed';
      }
      return {
        data: null,
        error: { message },
      };
    }

    localStorage.setItem(TOKEN_KEY, data.access_token);
    if (data.session_id) {
      sessionStorage.setItem(AUDIT_SESSION_ID_KEY, data.session_id);
    } else {
      sessionStorage.removeItem(AUDIT_SESSION_ID_KEY);
    }
    const prof = mapMeToProfile({ profile: data.profile });
    const u = {
      id: data.user.id,
      email: data.user.email,
      user_metadata: { role: prof?.role ?? normalizeAppRole({ user_type: data.profile?.user_type }, null) },
    };
    setSession({
      access_token: data.access_token,
      user: u,
    });
    setUser(u);
    setProfile(prof);

    return { data: { session: data, user: data.user }, error: null };
  };

  const signOut = async () => {
    if (isMockMode) {
      setSession(null);
      setUser(null);
      setProfile(null);
      localStorage.removeItem('cpsc-mock-session');
      return { error: null };
    }
    const auditSid = sessionStorage.getItem(AUDIT_SESSION_ID_KEY);
    if (auditSid) {
      try {
        await authFetch('/api/auth/session-end', {
          method: 'POST',
          body: JSON.stringify({ session_id: auditSid }),
        });
      } catch {
        /* ignore audit failures */
      }
    }
    sessionStorage.removeItem(AUDIT_SESSION_ID_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setSession(null);
    setUser(null);
    setProfile(null);
    return { error: null };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    refreshProfile: loadProfile,
    isMockMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
