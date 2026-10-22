import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import express, { type Request } from "express";
import mongoose from "mongoose";
import { test } from "node:test";
import { authenticateUser } from "../auth/authService.js";
import { ROLE_NAMES, type RoleName } from "../auth/authTypes.js";
import Role from "../models/role.js";
import User from "../models/user.js";
import userRoutes from "../routes/userRoutes.js";

const TEST_DATABASE_PREFIX = "chemical_safety_rbac_test_";
const INITIAL_PASSWORD = "RbacIntegrationPassword#42";

const parseDisposableUri = (uri: string): string => {
  const parsed = new URL(uri);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase()));
  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  assert.match(databaseName, new RegExp(`^${TEST_DATABASE_PREFIX}[a-z0-9_]+$`));
  return databaseName;
};

test(
  "ADMIN user management is role protected and safely creates, assigns, and toggles users",
  { skip: !process.env.MONGODB_TEST_URI },
  async (t) => {
    const uri = process.env.MONGODB_TEST_URI;
    assert.ok(uri, "MONGODB_TEST_URI must name a fresh disposable local database");
    const databaseName = parseDisposableUri(uri);
    let ownsDatabase = false;
    let server: Server | undefined;

    try {
      await mongoose.connect(uri, {
        autoIndex: false,
        serverSelectionTimeoutMS: 5_000,
      });
      const database = mongoose.connection.db;
      assert.ok(database);
      const databases = await database.admin().listDatabases({ nameOnly: true });
      assert.equal(
        databases.databases?.some(({ name }) => name === databaseName),
        false,
        "Refusing to use an existing database"
      );
      ownsDatabase = true;

      await Role.insertMany([
        { role_id: 1, role_name: "ADMIN", description: null },
        { role_id: 2, role_name: "SAFETY_OFFICER", description: null },
        { role_id: 3, role_name: "PLANT_MANAGER", description: null },
        { role_id: 4, role_name: "EMPLOYEE", description: null },
        { role_id: 5, role_name: "COMPLIANCE_OFFICER", description: null },
      ]);
      const adminHash = await import("bcryptjs").then(({ default: bcrypt }) => bcrypt.hash(INITIAL_PASSWORD, 12));
      const officerHash = await import("bcryptjs").then(({ default: bcrypt }) => bcrypt.hash(INITIAL_PASSWORD, 12));
      await User.insertMany([
        {
          user_id: 1,
          role_id: 1,
          full_name: "RBAC Admin",
          email: "rbac.admin@example.invalid",
          password_hash: adminHash,
          is_active: true,
        },
        {
          user_id: 2,
          role_id: 2,
          full_name: "RBAC Safety Officer",
          email: "rbac.officer@example.invalid",
          password_hash: officerHash,
          is_active: true,
        },
      ]);

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        const requestedRole = req.header("x-test-role") ?? "EMPLOYEE";
        const roleName = ROLE_NAMES.includes(requestedRole as RoleName)
          ? requestedRole as RoleName
          : "EMPLOYEE";
        (req as Request).user = {
          userId: roleName === "ADMIN" ? 1 : 2,
          fullName: "RBAC fixture",
          email: "rbac.fixture@example.invalid",
          roleName,
        };
        next();
      });
      app.use("/api/users", userRoutes);
      server = app.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const baseUrl = `http://127.0.0.1:${address.port}/api/users`;

      const request = async (
        role: RoleName,
        path: string,
        method = "GET",
        body?: unknown
      ) => fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          "x-test-role": role,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });

      await t.test("all five roles can use the existing active user directory", async () => {
        for (const roleName of ROLE_NAMES) {
          const response = await request(roleName, "/");
          assert.equal(response.status, 200, roleName);
          const users = await response.json() as Array<Record<string, unknown>>;
          assert.deepEqual(Object.keys(users[0] ?? {}).sort(), [
            "email", "full_name", "is_active", "role_id", "user_id",
          ]);
        }
      });

      await t.test("only ADMIN can reach management list and write endpoints", async () => {
        for (const roleName of ROLE_NAMES) {
          const listResponse = await request(roleName, "/manage");
          assert.equal(listResponse.status, roleName === "ADMIN" ? 200 : 403, `${roleName} list`);
          if (roleName === "ADMIN") continue;
          for (const [path, method, body] of [
            ["/", "POST", { full_name: "Denied", email: "denied@example.invalid", password: INITIAL_PASSWORD, role_id: 4 }],
            ["/2/role", "PATCH", { role_id: 3 }],
            ["/2/status", "PATCH", { is_active: false }],
          ] as const) {
            const response = await request(roleName, path, method, body);
            assert.equal(response.status, 403, `${roleName} ${method} ${path}`);
          }
        }
      });

      await t.test("ADMIN can create, reassign, deactivate, and reactivate without exposing hashes", async () => {
        const listResponse = await request("ADMIN", "/manage");
        const listBody = await listResponse.json() as { users: Array<Record<string, unknown>> };
        assert.equal(listBody.users.length, 2);
        assert.equal(JSON.stringify(listBody).includes("password_hash"), false);

        const createResponse = await request("ADMIN", "/", "POST", {
          full_name: "RBAC Managed Employee",
          email: "managed.employee@example.invalid",
          password: INITIAL_PASSWORD,
          role_id: 4,
        });
        assert.equal(createResponse.status, 201);
        const createBody = await createResponse.json() as { user: Record<string, unknown> };
        const expectedKeys = ["created_at", "email", "full_name", "is_active", "role_id", "role_name", "user_id"];
        assert.deepEqual(Object.keys(createBody.user).sort(), expectedKeys);
        assert.equal(createBody.user.role_name, "EMPLOYEE");
        const createdId = createBody.user.user_id as number;
        const initialLogin = await authenticateUser("managed.employee@example.invalid", INITIAL_PASSWORD);
        assert.equal(initialLogin?.roleName, "EMPLOYEE");

        const duplicateResponse = await request("ADMIN", "/", "POST", {
          full_name: "Duplicate",
          email: "MANAGED.EMPLOYEE@example.invalid",
          password: INITIAL_PASSWORD,
          role_id: 4,
        });
        assert.equal(duplicateResponse.status, 409);

        const roleResponse = await request("ADMIN", `/${createdId}/role`, "PATCH", { role_id: 5 });
        assert.equal(roleResponse.status, 200);
        const roleBody = await roleResponse.json() as { user: { role_name: string; role_id: number } };
        assert.equal(roleBody.user.role_name, "COMPLIANCE_OFFICER");
        assert.equal(roleBody.user.role_id, 5);
        assert.equal((await authenticateUser("managed.employee@example.invalid", INITIAL_PASSWORD))?.roleName, "COMPLIANCE_OFFICER");

        const invalidRoleResponse = await request("ADMIN", `/${createdId}/role`, "PATCH", { role_id: 999 });
        assert.equal(invalidRoleResponse.status, 400);

        const deactivateResponse = await request("ADMIN", `/${createdId}/status`, "PATCH", { is_active: false });
        assert.equal(deactivateResponse.status, 200);
        assert.equal((await authenticateUser("managed.employee@example.invalid", INITIAL_PASSWORD)), null);
        const activateResponse = await request("ADMIN", `/${createdId}/status`, "PATCH", { is_active: true });
        assert.equal(activateResponse.status, 200);
        assert.equal((await authenticateUser("managed.employee@example.invalid", INITIAL_PASSWORD))?.roleName, "COMPLIANCE_OFFICER");
      });

      await t.test("an ADMIN cannot deactivate or demote its own account", async () => {
        const statusResponse = await request("ADMIN", "/1/status", "PATCH", { is_active: false });
        const roleResponse = await request("ADMIN", "/1/role", "PATCH", { role_id: 3 });
        assert.equal(statusResponse.status, 409);
        assert.equal(roleResponse.status, 409);
        assert.equal((await authenticateUser("rbac.admin@example.invalid", INITIAL_PASSWORD))?.roleName, "ADMIN");
      });
    } finally {
      if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
      if (ownsDatabase && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
        const databases = await mongoose.connection.db.admin().listDatabases({ nameOnly: true });
        assert.equal(databases.databases?.some(({ name }) => name === databaseName), false);
      }
      await mongoose.disconnect();
    }
  }
);
