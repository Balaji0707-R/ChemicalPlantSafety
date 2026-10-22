import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { ROLE_NAMES, type RoleName } from "./authTypes.js";
import { API_ROLE_ACCESS, type ApiPermission } from "./permissions.js";
import { authorize } from "../middleware/auth.js";

const checkAuthorization = (roleName: RoleName, permission: ApiPermission) =>
  new Promise<{ status: number | null; passed: boolean }>((resolve) => {
    let status: number | null = null;
    const req = {
      user: { userId: 1, fullName: "RBAC test", email: "rbac@example.invalid", roleName },
    } as Request;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json() {
        resolve({ status, passed: false });
        return this;
      },
    } as unknown as Response;

    authorize(...API_ROLE_ACCESS[permission])(req, res, (error?: unknown) => {
      assert.equal(error, undefined);
      resolve({ status, passed: true });
    });
  });

test("backend authorization matrix allows and denies every permission for all roles", async (t) => {
  for (const permission of Object.keys(API_ROLE_ACCESS) as ApiPermission[]) {
    await t.test(permission, async () => {
      const allowedRoles = API_ROLE_ACCESS[permission] as readonly RoleName[];
      for (const role of ROLE_NAMES) {
        const result = await checkAuthorization(role, permission);
        assert.equal(result.passed, allowedRoles.includes(role), `${role} ${permission}`);
        assert.equal(result.status, allowedRoles.includes(role) ? null : 403);
      }
    });
  }
});
