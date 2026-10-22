import { createContext } from "react";

export type RoleName =
  | "ADMIN"
  | "SAFETY_OFFICER"
  | "PLANT_MANAGER"
  | "EMPLOYEE"
  | "COMPLIANCE_OFFICER";

export interface AuthUser {
  userId: number;
  fullName: string;
  email: string;
  roleName: RoleName;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
