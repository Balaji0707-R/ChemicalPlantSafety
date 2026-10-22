import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import express, { type Request } from "express";
import mongoose from "mongoose";
import { test } from "node:test";
import { ROLE_NAMES, type RoleName } from "../auth/authTypes.js";
import Role from "../models/role.js";
import User from "../models/user.js";
import incidentRoutes from "../routes/incidentRoutes.js";

const TEST_DATABASE_PREFIX = "chemical_safety_rbac_incident_test_";

const parseDisposableUri = (uri: string): string => {
  const parsed = new URL(uri);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase()));
  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  assert.match(databaseName, new RegExp(`^${TEST_DATABASE_PREFIX}[a-z0-9_]+$`));
  return databaseName;
};

test(
  "employee incident creation is constrained to the signed-in reporter and OPEN status",
  { skip: !process.env.MONGODB_TEST_URI },
  async (t) => {
    const uri = process.env.MONGODB_TEST_URI;
    assert.ok(uri, "MONGODB_TEST_URI must name a fresh disposable local database");
    const databaseName = parseDisposableUri(uri);
    let ownsDatabase = false;
    let server: Server | undefined;

    try {
      await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 5_000 });
      const database = mongoose.connection.db;
      assert.ok(database);
      const databases = await database.admin().listDatabases({ nameOnly: true });
      assert.equal(databases.databases?.some(({ name }) => name === databaseName), false);
      ownsDatabase = true;

      await Role.create({ role_id: 4, role_name: "EMPLOYEE", description: null });
      await User.create({
        user_id: 41,
        role_id: 4,
        full_name: "RBAC Employee",
        email: "rbac.employee@example.invalid",
        password_hash: "not-used-by-this-route-test",
        is_active: true,
      });

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        const header = req.header("x-test-role") ?? "EMPLOYEE";
        const roleName = ROLE_NAMES.includes(header as RoleName) ? header as RoleName : "EMPLOYEE";
        (req as Request).user = {
          userId: 41,
          fullName: "RBAC Employee",
          email: "rbac.employee@example.invalid",
          roleName,
        };
        next();
      });
      app.use("/api/incidents", incidentRoutes);
      server = app.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const endpoint = `http://127.0.0.1:${address.port}/api/incidents`;

      await t.test("employee may report, but cannot choose another reporter or status", async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", "x-test-role": "EMPLOYEE" },
          body: JSON.stringify({
            reported_by: 999,
            incident_type: "Safety Observation",
            severity: "LOW",
            location: "Test Area",
            incident_date: "2026-10-21T12:00",
            description: "RBAC verification incident",
            status: "CLOSED",
          }),
        });
        assert.equal(response.status, 201);
        const body = await response.json() as { reported_by: number; status: string };
        assert.equal(body.reported_by, 41);
        assert.equal(body.status, "OPEN");
      });

      await t.test("compliance officer cannot create an incident", async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", "x-test-role": "COMPLIANCE_OFFICER" },
          body: JSON.stringify({}),
        });
        assert.equal(response.status, 403);
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
