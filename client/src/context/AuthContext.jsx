import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isMockMode } from '../lib/supabase';
import { normalizeAppRole } from 'shared';

const AuthContext = createContext(null);

const MOCK_USER = {
  id: 'mock-user-id',
  email: 'manager@cpsc.demo',
  user_metadata: { role: 'manager' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId, jwtRoleHint) => {
    if (!userId || isMockMode || !supabase) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'user_type, full_name, username, email, updated_at, approved, avatar_url, requested_role',
      )
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('profiles load error:', error.message);
    }
    if (!data) {
      setProfile(null);
      return;
    }
    const role = normalizeAppRole(data, jwtRoleHint);
    setProfile({
      ...data,
      role,
      display_name: data.full_name ?? null,
    });
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

    async function init() {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await loadProfile(s.user.id, s.user.user_metadata?.role);
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await loadProfile(s.user.id, s.user.user_metadata?.role);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email, password) => {
    if (isMockMode) {
      const mockUser = {
        ...MOCK_USER,
        email: email || 'manager@cpsc.demo',
        user_metadata: { role: 'manager' },
      };
      const mockSession = { user: mockUser };
      setSession(mockSession);
      setUser(mockUser);
      setProfile(null);
      localStorage.setItem('cpsc-mock-session', JSON.stringify(mockSession));
      return { data: { session: mockSession, user: mockUser }, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data?.session?.user) {
      await loadProfile(
        data.session.user.id,
        data.session.user.user_metadata?.role,
      );
    }
    return { data, error };
  };

  const refreshProfile = useCallback(async () => {
    if (isMockMode || !supabase || !user?.id) return;
    await loadProfile(user.id, user?.user_metadata?.role);
  }, [loadProfile, user?.id, user?.user_metadata?.role]);

  const signUp = async ({ email, password, fullName, requestedRole }) => {
    if (isMockMode) {
      return { data: null, error: { message: 'Sign up is disabled in mock mode' } };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: requestedRole },
        emailRedirectTo: `${window.location.origin}/reset-password`,
      },
    });
    if (error) return { data, error };
    if (data.user) {
      const { error: pErr } = await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          full_name: fullName || null,
          requested_role: requestedRole,
          user_type: requestedRole || 'seller',
          approved: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (pErr) {
        console.warn('profiles upsert after signup:', pErr.message);
      }
      if (data.session?.user) {
        await loadProfile(data.session.user.id, requestedRole);
      }
    }
    return { data, error };
  };

  const signOut = async () => {
    if (isMockMode) {
      setSession(null);
      setUser(null);
      setProfile(null);
      localStorage.removeItem('cpsc-mock-session');
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    setProfile(null);
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
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
