import assert from "node:assert/strict";
import { test } from "node:test";
import type { RoleName } from "../src/auth/authContext";
import {
  canAccessPage,
  canCreateIncidents,
  canDeleteChemicals,
  canDeleteIncidentActions,
  canDeleteIncidents,
  canManageChemicals,
  canManageCompliance,
  canManageEmergency,
  canManageIncidentActions,
  canManageInspections,
  canUpdateIncidents,
  FRONTEND_ROLE_ACCESS,
} from "../src/auth/permissions";

const roles: RoleName[] = [
  "ADMIN",
  "SAFETY_OFFICER",
  "PLANT_MANAGER",
  "EMPLOYEE",
  "COMPLIANCE_OFFICER",
];

test("frontend route access is explicitly defined for every page and role", () => {
  const pagePermissions: Record<keyof typeof FRONTEND_ROLE_ACCESS, readonly RoleName[]> = {
    dashboard: roles,
    chemicals: roles,
    inspections: roles,
    incidents: roles,
    emergency: roles,
    compliance: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "COMPLIANCE_OFFICER"],
    monitoring: ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"],
    userManagement: ["ADMIN"],
  };

  for (const page of Object.keys(pagePermissions) as (keyof typeof pagePermissions)[]) {
    for (const role of roles) {
      assert.equal(canAccessPage(role, page), pagePermissions[page].includes(role), `${role} ${page}`);
    }
  }
});

test("frontend write controls match the intended five-role permission matrix", () => {
  const cases: Array<[string, (role: RoleName) => boolean, readonly RoleName[]]> = [
    ["chemical write", canManageChemicals, ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"]],
    ["chemical delete", canDeleteChemicals, ["ADMIN", "SAFETY_OFFICER"]],
    ["inspection write", canManageInspections, ["ADMIN", "SAFETY_OFFICER"]],
    ["incident create", canCreateIncidents, ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER", "EMPLOYEE"]],
    ["incident update", canUpdateIncidents, ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"]],
    ["incident delete", canDeleteIncidents, ["ADMIN", "SAFETY_OFFICER"]],
    ["incident action write", canManageIncidentActions, ["ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"]],
    ["incident action delete", canDeleteIncidentActions, ["ADMIN", "SAFETY_OFFICER"]],
    ["emergency write", canManageEmergency, ["ADMIN", "PLANT_MANAGER"]],
    ["compliance write", canManageCompliance, ["ADMIN", "COMPLIANCE_OFFICER"]],
  ];

  for (const [label, canPerform, allowed] of cases) {
    for (const role of roles) {
      assert.equal(canPerform(role), allowed.includes(role), `${role} ${label}`);
    }
  }
});
