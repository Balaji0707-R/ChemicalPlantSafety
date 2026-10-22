export const ROLE_NAMES = [
  "ADMIN",
  "SAFETY_OFFICER",
  "PLANT_MANAGER",
  "EMPLOYEE",
  "COMPLIANCE_OFFICER",
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export interface AuthenticatedUser {
  userId: number;
  fullName: string;
  email: string;
  roleName: RoleName;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
