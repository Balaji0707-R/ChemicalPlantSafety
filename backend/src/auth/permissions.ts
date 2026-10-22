import { ROLE_NAMES, type RoleName } from "./authTypes.js";

const safetyAndOperations = ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"] as const satisfies readonly RoleName[];
const allRoles = ROLE_NAMES;

/** Server-side role policy. Frontend visibility mirrors this policy for usability. */
export const API_ROLE_ACCESS = {
  dashboardRead: allRoles,
  userDirectoryRead: allRoles,
  userManagement: ["ADMIN"],
  chemicalsRead: allRoles,
  chemicalsWrite: safetyAndOperations,
  chemicalsDelete: ["ADMIN", "SAFETY_OFFICER"],
  chemicalStorageRead: allRoles,
  chemicalStorageWrite: safetyAndOperations,
  chemicalStorageDelete: ["ADMIN", "SAFETY_OFFICER"],
  inspectionsRead: allRoles,
  inspectionsWrite: ["ADMIN", "SAFETY_OFFICER"],
  findingsRead: allRoles,
  findingsWrite: ["ADMIN", "SAFETY_OFFICER"],
  incidentsRead: allRoles,
  incidentsCreate: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE"],
  incidentsUpdate: safetyAndOperations,
  incidentsDelete: ["ADMIN", "SAFETY_OFFICER"],
  incidentActionsRead: allRoles,
  incidentActionsWrite: safetyAndOperations,
  incidentActionsDelete: ["ADMIN", "SAFETY_OFFICER"],
  emergencyRead: allRoles,
  emergencyWrite: ["ADMIN", "PLANT_MANAGER"],
  complianceRead: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "COMPLIANCE_OFFICER"],
  complianceWrite: ["ADMIN", "COMPLIANCE_OFFICER"],
  monitoringRead: safetyAndOperations,
  monitoringWrite: safetyAndOperations,
} as const satisfies Record<string, readonly RoleName[]>;

export type ApiPermission = keyof typeof API_ROLE_ACCESS;
