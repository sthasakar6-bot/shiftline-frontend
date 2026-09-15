import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  api,
  clearToken,
  getSelectedCompany,
  getToken,
  setSelectedCompany,
  setToken,
} from "../api/client";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    logo: File;
  }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const company = getSelectedCompany();
    if (!company) {
      throw new Error("No company selected");
    }
    const res = await api.login(email, password, company.id);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  async function signup(data: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    logo: File;
  }) {
    const res = await api.signup(data);
    setToken(res.token);
    setUser(res.user);
    // Signup skips the company-picker entirely, so nothing else would set
    // this -- needed for a later /login visit on this device.
    setSelectedCompany({ id: res.user.companyId, name: res.user.companyName });
    return res.user;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  async function refreshUser() {
    const current = await api.me();
    setUser(current);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
