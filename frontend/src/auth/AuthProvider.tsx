import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../services/api";
import { AuthContext, type AuthUser } from "./authContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ user: AuthUser }>("/auth/me")
      .then((response) => setUser(response.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const expireSession = () => setUser(null);
    window.addEventListener("auth:expired", expireSession);
    return () => window.removeEventListener("auth:expired", expireSession);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (email: string, password: string) => {
      const response = await api.post<{ user: AuthUser }>("/auth/login", { email, password });
      setUser(response.data.user);
    },
    logout: async () => {
      await api.post("/auth/logout");
      setUser(null);
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
