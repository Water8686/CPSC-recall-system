import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isMockMode } from '../lib/supabase';

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

  const loadProfile = useCallback(async (userId) => {
    if (!userId || isMockMode || !supabase) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('profiles load error:', error.message);
    }
    setProfile(data ?? null);
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
        await loadProfile(s.user.id);
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
          await loadProfile(s.user.id);
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
      await loadProfile(data.session.user.id);
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
    signOut,
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
