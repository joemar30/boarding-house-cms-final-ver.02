import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { phpAuth, type PhpUser, setAuthToken, getAuthToken, PhpBackendError } from '@/lib/phpApi';

interface PhpAuthContextType {
  user: PhpUser | null;
  loading: boolean;
  backendAvailable: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isTenant: boolean;
}

const PhpAuthContext = createContext<PhpAuthContextType | null>(null);

export function PhpAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                 = useState<PhpUser | null>(null);
  const [loading, setLoading]           = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);

  useEffect(() => {
    // Check if we have a stored token and validate it
    const token = getAuthToken();
    if (token) {
      phpAuth.me()
        .then(u => {
          setUser(u);
          setBackendAvailable(true);
        })
        .catch(err => {
          // If backend is unavailable, don't crash — just show as logged out
          if (err instanceof PhpBackendError) {
            setBackendAvailable(false);
          }
          setAuthToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      // Even without a token, ping the backend to see if it's available
      phpAuth.me()
        .then(() => setBackendAvailable(true))
        .catch(err => {
          if (err instanceof PhpBackendError) {
            setBackendAvailable(false);
          }
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const { user: u } = await phpAuth.login(identifier, password);
    setUser(u);
    setBackendAvailable(true);
  }, []);

  const logout = useCallback(async () => {
    // Clear UI state immediately for "fast logout"
    setUser(null);
    setAuthToken(null);
    
    // Attempt backend logout in background
    phpAuth.logout().catch(() => {
      // Ignore errors on logout
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    backendAvailable,
    login,
    logout,
    isAdmin:  user?.role === 'admin',
    isStaff:  user?.role === 'staff',
    isTenant: user?.role === 'tenant',
  }), [user, loading, backendAvailable, login, logout]);

  return (
    <PhpAuthContext.Provider value={value}>
      {children}
    </PhpAuthContext.Provider>
  );
}

export function usePhpAuth() {
  const ctx = useContext(PhpAuthContext);
  if (!ctx) throw new Error('usePhpAuth must be used within PhpAuthProvider');
  return ctx;
}
