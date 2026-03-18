import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isMockMode } from '../lib/supabase';

const AuthContext = createContext(null);

const MOCK_USER = {
  id: 'mock-user-id',
  email: 'manager@cpsc.demo',
  user_metadata: { role: 'manager' },
};

const MOCK_SESSION = {
  user: MOCK_USER,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode) {
      // Check for stored mock session (persists across refresh)
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
      setLoading(false);
      return;
    }

    // Real Supabase auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
      localStorage.setItem('cpsc-mock-session', JSON.stringify(mockSession));
      return { data: { session: mockSession, user: mockUser }, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    if (isMockMode) {
      setSession(null);
      setUser(null);
      localStorage.removeItem('cpsc-mock-session');
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
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
