import type { RoleName } from "./authContext";

export const FRONTEND_ROLE_ACCESS = {
  dashboard: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"],
  chemicals: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"],
  inspections: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"],
  incidents: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"],
  emergency: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE", "COMPLIANCE_OFFICER"],
  compliance: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "COMPLIANCE_OFFICER"],
  monitoring: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"],
  userManagement: ["ADMIN"],
} as const satisfies Record<string, readonly RoleName[]>;

export type FrontendPage = keyof typeof FRONTEND_ROLE_ACCESS;

export const canAccessPage = (roleName: RoleName, page: FrontendPage): boolean =>
  (FRONTEND_ROLE_ACCESS[page] as readonly RoleName[]).includes(roleName);

export const canManageChemicals = (roleName: RoleName): boolean =>
  ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"].includes(roleName);

export const canDeleteChemicals = (roleName: RoleName): boolean =>
  ["ADMIN", "SAFETY_OFFICER"].includes(roleName);

export const canManageInspections = (roleName: RoleName): boolean =>
  ["ADMIN", "SAFETY_OFFICER"].includes(roleName);

export const canCreateIncidents = (roleName: RoleName): boolean =>
  ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE"].includes(roleName);

export const canUpdateIncidents = (roleName: RoleName): boolean =>
  ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"].includes(roleName);

export const canDeleteIncidents = (roleName: RoleName): boolean =>
  ["ADMIN", "SAFETY_OFFICER"].includes(roleName);

export const canManageIncidentActions = (roleName: RoleName): boolean =>
  ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"].includes(roleName);

export const canDeleteIncidentActions = (roleName: RoleName): boolean =>
  ["ADMIN", "SAFETY_OFFICER"].includes(roleName);

export const canManageEmergency = (roleName: RoleName): boolean =>
  ["ADMIN", "PLANT_MANAGER"].includes(roleName);

export const canManageCompliance = (roleName: RoleName): boolean =>
  ["ADMIN", "COMPLIANCE_OFFICER"].includes(roleName);
