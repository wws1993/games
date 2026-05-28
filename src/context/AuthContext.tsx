import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { storageGet, storageRemove, storageSet } from '../lib/storage';

export interface User {
  id: string;
  phone: string;
  nickname: string;
}

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  login: (phone: string, code: string) => Promise<boolean>;
  logout: () => void;
}

const AUTH_KEY = 'user';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => storageGet<User>(AUTH_KEY));

  const login = useCallback(async (phone: string, code: string) => {
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length !== 11) return false;
    if (code !== '123456' && code.length !== 6) return false;

    const next: User = {
      id: `u_${normalized}`,
      phone: normalized,
      nickname: `用户${normalized.slice(-4)}`,
    };
    storageSet(AUTH_KEY, next);
    setUser(next);
    return true;
  }, []);

  const logout = useCallback(() => {
    storageRemove(AUTH_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
