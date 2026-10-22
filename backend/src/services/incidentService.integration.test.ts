import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import type { AddressInfo, Server } from "node:net";
import { resolve } from "node:path";
import express from "express";
import mongoose from "mongoose";
import test from "node:test";
import { createAuthToken } from "../auth/authService.js";
import type { RoleName } from "../auth/authTypes.js";
import { env } from "../config/env.js";
import { authenticate, requireCsrf } from "../middleware/auth.js";
import incidentRoutes from "../routes/incidentRoutes.js";
import {
  createIncident,
  createIncidentAction,
  parseIncidentDateTime,
} from "./incidentService.js";

const TEST_DATABASE_PREFIX = "chemical_safety_stage3b5_test_";
const TEST_CSRF_TOKEN = "stage3b5-disposable-csrf";

interface ApiResponse {
  status: number;
  body: any;
}

const parseDisposableTestUri = (uri: string): string => {
  const parsed = new URL(uri);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(hostname),
    "test MongoDB must be loopback"
  );

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  assert.match(
    databaseName,
    new RegExp(`^${TEST_DATABASE_PREFIX}[a-z0-9_]+$`),
    "test database must have a unique Stage 3B.5 name"
  );
  assert.notEqual(databaseName, "chemical_safety_db");
  return databaseName;
};

const incidentMutationFields = [
  "created_at",
  "description",
  "incident_date",
  "incident_id",
  "incident_type",
  "location",
  "reported_by",
  "severity",
  "status",
];

const incidentJoinedFields = [
  "created_at",
  "description",
  "incident_date",
  "incident_id",
  "incident_type",
  "location",
  "reported_by",
  "reporter_name",
  "severity",
  "status",
];

const actionMutationFields = [
  "action_description",
  "action_id",
  "assigned_to",
  "completed_at",
  "due_date",
  "incident_id",
  "status",
];

const actionJoinedFields = [
  "action_description",
  "action_id",
  "assigned_to",
  "assigned_to_name",
  "completed_at",
  "due_date",
  "incident_id",
  "status",
];

const sortedKeys = (value: Record<string, unknown>) => Object.keys(value).sort();

const makeToken = (userId: number, roleName: RoleName): string =>
  createAuthToken({
    userId,
    fullName: `Stage 3B.5 ${roleName}`,
    email: `${roleName.toLowerCase()}.stage3b5@example.invalid`,
    roleName,
  });

const jsonRequest = async (
  baseUrl: string,
  userId: number,
  roleName: RoleName,
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Cookie: `${env.auth.cookieName}=${makeToken(userId, roleName)}; ${env.auth.csrfCookieName}=${TEST_CSRF_TOKEN}`,
      "X-CSRF-Token": TEST_CSRF_TOKEN,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : {},
  };
};

const startServer = async (): Promise<{ server: Server; baseUrl: string }> => {
  const app = express();
  app.use(express.json());
  app.use(authenticate, requireCsrf);
  app.use("/api/incidents", incidentRoutes);
  const server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}/api/incidents` };
};

test("incident datetime-local input is interpreted as Asia/Calcutta independent of runtime timezone", () => {
  assert.equal(
    parseIncidentDateTime("2026-10-21T09:15").toISOString(),
    "2026-10-21T03:45:00.000Z"
  );
  assert.equal(
    parseIncidentDateTime("2026-10-21T09:15:30.125").toISOString(),
    "2026-10-21T03:45:30.125Z"
  );
  assert.equal(
    parseIncidentDateTime("2026-10-21T09:15:00+05:30").toISOString(),
    "2026-10-21T03:45:00.000Z"
  );
  assert.throws(() => parseIncidentDateTime("2026-02-30T09:15"), /Invalid incident_date/);
  assert.throws(() => parseIncidentDateTime("2026-10-21 09:15"), /datetime-local/);

  const serviceModule = resolve(__dirname, "incidentService.ts");
  const source = [
    `const { parseIncidentDateTime } = require(${JSON.stringify(serviceModule)});`,
    "const value = parseIncidentDateTime('2026-10-21T09:15').toISOString();",
    "if (value !== '2026-10-21T03:45:00.000Z') process.exit(2);",
    "process.stdout.write(value);",
  ].join("\n");
  for (const timezone of ["UTC", "Asia/Calcutta", "America/Los_Angeles"]) {
    const child = spawnSync(process.execPath, ["-r", "tsx/cjs", "-e", source], {
      cwd: resolve(__dirname, "../.."),
      encoding: "utf8",
      env: { ...process.env, TZ: timezone },
    });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, "2026-10-21T03:45:00.000Z");
  }
});

test(
  "incident and action services preserve PostgreSQL API behavior in isolated MongoDB",
  {
    skip: !process.env.MONGODB_TEST_URI
      && "Set MONGODB_TEST_URI to a new loopback Stage 3B.5 disposable database",
  },
  async (t) => {
    const uri = process.env.MONGODB_TEST_URI;
    assert.ok(uri, "MONGODB_TEST_URI must point to a fresh disposable local database");
    const databaseName = parseDisposableTestUri(uri);
    let ownsDisposableDatabase = false;
    let server: Server | undefined;

    try {
      assert.equal(mongoose.connection.readyState, 0, "test requires a fresh Mongoose connection");
      await mongoose.connect(uri, {
        autoCreate: false,
        autoIndex: false,
        serverSelectionTimeoutMS: 5_000,
      });
      const db = mongoose.connection.db;
      assert.ok(db, "MongoDB connection did not select a database");
      const before = await db.admin().listDatabases({ nameOnly: true });
      assert.equal(
        before.databases.some(({ name }) => name === databaseName),
        false,
        "refusing to write to an existing database"
      );

      await db.collection<{ _id: string; owner: string }>("stage3b5_test_guard").insertOne({
        _id: `${databaseName}:${process.pid}`,
        owner: "stage3b5-incident-action-integration-test",
      });
      ownsDisposableDatabase = true;

      await db.collection("roles").insertMany([
        { role_id: 1, role_name: "ADMIN", description: null },
        { role_id: 2, role_name: "SAFETY_OFFICER", description: null },
        { role_id: 3, role_name: "PLANT_MANAGER", description: null },
        { role_id: 4, role_name: "EMPLOYEE", description: null },
      ]);
      await db.collection("users").insertMany([
        {
          user_id: 501,
          role_id: 1,
          full_name: "Stage 3B.5 Admin",
          email: "admin.stage3b5@example.invalid",
          is_active: true,
        },
        {
          user_id: 502,
          role_id: 4,
          full_name: "Stage 3B.5 Employee",
          email: "employee.stage3b5@example.invalid",
          is_active: true,
        },
        {
          user_id: 503,
          role_id: 3,
          full_name: "Stage 3B.5 Assignee",
          email: "assignee.stage3b5@example.invalid",
          is_active: true,
        },
      ]);

      const historicalIncidentDate = new Date("2023-04-05T06:07:08.000Z");
      const historicalCreatedAt = new Date("2023-04-05T06:08:09.000Z");
      await db.collection("incidents").insertMany([
        {
          incident_id: 800,
          reported_by: 501,
          incident_type: "Historical incident",
          severity: "LOW",
          location: "North unit",
          incident_date: historicalIncidentDate,
          description: "Historical timestamp must remain unchanged",
          status: "OPEN",
          created_at: historicalCreatedAt,
        },
        {
          incident_id: 500,
          reported_by: 502,
          incident_type: "Older incident",
          severity: "MEDIUM",
          location: "South unit",
          incident_date: new Date("2022-01-02T03:04:05.000Z"),
          description: "Seeded test incident",
          status: "CLOSED",
          created_at: new Date("2022-01-02T04:05:06.000Z"),
        },
        {
          incident_id: 490,
          reported_by: 9999,
          incident_type: "Orphaned historical reporter",
          severity: "LOW",
          location: "East unit",
          incident_date: new Date("2021-01-01T00:00:00.000Z"),
          description: "Inner join compatibility case",
          status: "OPEN",
          created_at: new Date("2021-01-01T01:00:00.000Z"),
        },
      ]);
      await db.collection("incident_actions").insertMany([
        {
          action_id: 910,
          incident_id: 800,
          action_description: "Assigned action",
          assigned_to: 503,
          due_date: new Date("2024-02-29T00:00:00.000Z"),
          status: "IN_PROGRESS",
          completed_at: null,
        },
        {
          action_id: 909,
          incident_id: 800,
          action_description: "Unassigned action",
          assigned_to: null,
          due_date: null,
          status: "PENDING",
          completed_at: null,
        },
        {
          action_id: 908,
          incident_id: 800,
          action_description: "Missing historical assignee",
          assigned_to: 7777,
          due_date: null,
          status: "PENDING",
          completed_at: null,
        },
        {
          action_id: 850,
          incident_id: 500,
          action_description: "Older action",
          assigned_to: null,
          due_date: null,
          status: "PENDING",
          completed_at: null,
        },
      ]);

      const running = await startServer();
      server = running.server;
      const { baseUrl } = running;

      await t.test("read joins preserve sorting, nulls, exact fields, and historical timestamps", async () => {
        const incidents = await jsonRequest(baseUrl, 501, "ADMIN", "", { method: "GET" });
        assert.equal(incidents.status, 200);
        assert.deepEqual(incidents.body.map((item: any) => item.incident_id), [800, 500]);
        assert.deepEqual(sortedKeys(incidents.body[0]), incidentJoinedFields);
        assert.equal(incidents.body[0].reporter_name, "Stage 3B.5 Admin");
        assert.equal(incidents.body[0].incident_date, historicalIncidentDate.toISOString());
        assert.equal(incidents.body.some((item: any) => item.incident_id === 490), false);

        const missingReporter = await jsonRequest(baseUrl, 501, "ADMIN", "/490", { method: "GET" });
        assert.equal(missingReporter.status, 404);
        const joinedIncident = await jsonRequest(baseUrl, 501, "ADMIN", "/800", { method: "GET" });
        assert.equal(joinedIncident.status, 200);
        assert.deepEqual(sortedKeys(joinedIncident.body), incidentJoinedFields);

        const actions = await jsonRequest(baseUrl, 501, "ADMIN", "/800/actions", { method: "GET" });
        assert.equal(actions.status, 200);
        assert.deepEqual(actions.body.map((item: any) => item.action_id), [910, 909, 908]);
        assert.deepEqual(sortedKeys(actions.body[0]), actionJoinedFields);
        assert.equal(actions.body[0].assigned_to_name, "Stage 3B.5 Assignee");
        assert.equal(actions.body[0].due_date, "2024-02-29T00:00:00.000Z");
        assert.equal(actions.body[1].assigned_to, null);
        assert.equal(actions.body[1].assigned_to_name, null);
        assert.equal(actions.body[1].due_date, null);
        assert.equal(actions.body[2].assigned_to, 7777);
        assert.equal(actions.body[2].assigned_to_name, null);

        const missingAssignee = await jsonRequest(baseUrl, 501, "ADMIN", "/actions/908", { method: "GET" });
        assert.equal(missingAssignee.status, 200);
        assert.equal(missingAssignee.body.assigned_to_name, null);
        assert.deepEqual(sortedKeys(missingAssignee.body), actionJoinedFields);

        const unchanged = await db.collection("incidents").findOne({ incident_id: 800 });
        assert.equal(unchanged?.incident_date.toISOString(), historicalIncidentDate.toISOString());
        assert.equal(unchanged?.created_at.toISOString(), historicalCreatedAt.toISOString());
      });

      await t.test("creation and update preserve date mappings, IDs, defaults, and API timestamp strings", async () => {
        const beforeCreate = Date.now();
        const createdIncident = await jsonRequest(baseUrl, 502, "EMPLOYEE", "", {
          method: "POST",
          body: JSON.stringify({
            reported_by: 502,
            incident_type: "Datetime-local input",
            severity: "MEDIUM",
            location: "Control room",
            incident_date: "2026-10-21T09:15",
            description: "Frontend datetime-local contract",
          }),
        });
        const afterCreate = Date.now();
        assert.equal(createdIncident.status, 201);
        assert.deepEqual(sortedKeys(createdIncident.body), incidentMutationFields);
        assert.equal(createdIncident.body.incident_id, 801);
        assert.equal(createdIncident.body.incident_date, "2026-10-21T03:45:00.000Z");
        assert.equal(createdIncident.body.status, "OPEN");
        assert.ok(Date.parse(createdIncident.body.created_at) >= beforeCreate);
        assert.ok(Date.parse(createdIncident.body.created_at) <= afterCreate);
        assert.match(createdIncident.body.created_at, /^\d{4}-\d\d-\d\dT.*\.\d{3}Z$/);
        assert.equal(new Date(createdIncident.body.created_at).toISOString(), createdIncident.body.created_at);

        const updatePayload = {
          reported_by: 501,
          incident_type: "Updated incident",
          severity: "HIGH",
          location: "Control room",
          incident_date: "2026-10-21T10:00:00+05:30",
          description: "Explicit offset remains an instant",
          status: "UNDER_REVIEW",
        };
        const updatedIncident = await jsonRequest(baseUrl, 501, "ADMIN", "/801", {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });
        assert.equal(updatedIncident.status, 200);
        assert.deepEqual(sortedKeys(updatedIncident.body), incidentMutationFields);
        assert.equal(updatedIncident.body.incident_date, "2026-10-21T04:30:00.000Z");
        assert.equal(updatedIncident.body.created_at, createdIncident.body.created_at);
        assert.equal(updatedIncident.body.status, "UNDER_REVIEW");
        assert.equal((await jsonRequest(baseUrl, 501, "ADMIN", "/999999", {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        })).status, 404);

        const beforeAction = Date.now();
        const createdAction = await jsonRequest(baseUrl, 501, "ADMIN", "/actions", {
          method: "POST",
          body: JSON.stringify({
            incident_id: 801,
            action_description: "New corrective action",
            assigned_to: null,
            due_date: "2026-10-23",
          }),
        });
        assert.equal(createdAction.status, 201);
        assert.deepEqual(sortedKeys(createdAction.body), actionMutationFields);
        assert.equal(createdAction.body.action_id, 911);
        assert.equal(createdAction.body.assigned_to, null);
        assert.equal(createdAction.body.due_date, "2026-10-23T00:00:00.000Z");
        assert.equal(createdAction.body.status, "PENDING");
        assert.equal(createdAction.body.completed_at, null);

        const completing = await jsonRequest(baseUrl, 501, "ADMIN", "/actions/911", {
          method: "PUT",
          body: JSON.stringify({
            incident_id: 801,
            action_description: "Completed corrective action",
            assigned_to: 503,
            due_date: "2026-10-23",
            status: "COMPLETED",
          }),
        });
        const afterComplete = Date.now();
        assert.equal(completing.status, 200);
        assert.deepEqual(sortedKeys(completing.body), actionMutationFields);
        assert.ok(Date.parse(completing.body.completed_at) >= beforeAction);
        assert.ok(Date.parse(completing.body.completed_at) <= afterComplete);
        assert.match(completing.body.completed_at, /^\d{4}-\d\d-\d\dT.*\.\d{3}Z$/);
        assert.equal(new Date(completing.body.completed_at).toISOString(), completing.body.completed_at);

        const completedAt = completing.body.completed_at;
        const stillCompleted = await jsonRequest(baseUrl, 501, "ADMIN", "/actions/911", {
          method: "PUT",
          body: JSON.stringify({
            incident_id: 801,
            action_description: "Completion time retained",
            assigned_to: 503,
            due_date: null,
            status: "COMPLETED",
          }),
        });
        assert.equal(stillCompleted.status, 200);
        assert.equal(stillCompleted.body.completed_at, completedAt);
        assert.equal(stillCompleted.body.due_date, null);

        const reopened = await jsonRequest(baseUrl, 501, "ADMIN", "/actions/911", {
          method: "PUT",
          body: JSON.stringify({
            incident_id: 801,
            action_description: "Reopened corrective action",
            assigned_to: null,
            due_date: null,
            status: "IN_PROGRESS",
          }),
        });
        assert.equal(reopened.status, 200);
        assert.equal(reopened.body.completed_at, null);
        assert.equal(reopened.body.assigned_to, null);

        const joinedCreatedAction = await jsonRequest(baseUrl, 501, "ADMIN", "/actions/911", {
          method: "GET",
        });
        assert.equal(joinedCreatedAction.status, 200);
        assert.deepEqual(sortedKeys(joinedCreatedAction.body), actionJoinedFields);
        assert.equal(joinedCreatedAction.body.assigned_to_name, null);
      });

      await t.test("references, authorization, action deletion, and incident cascade are preserved", async () => {
        await assert.rejects(
          createIncident({
            reported_by: 9999,
            incident_type: "Invalid reporter",
            severity: "LOW",
            location: "Test",
            incident_date: "2026-10-21T09:15",
            description: "Reference check",
          }),
          /existing user/
        );
        await assert.rejects(
          createIncidentAction({
            incident_id: 9999,
            action_description: "Missing incident",
          }),
          /existing incident/
        );
        await assert.rejects(
          createIncidentAction({
            incident_id: 800,
            action_description: "Missing assignee",
            assigned_to: 9999,
          }),
          /existing user/
        );

        const employeeActionAttempt = await jsonRequest(baseUrl, 502, "EMPLOYEE", "/actions", {
          method: "POST",
          body: JSON.stringify({ incident_id: 800, action_description: "Denied" }),
        });
        assert.equal(employeeActionAttempt.status, 403);
        const employeeDeleteAttempt = await jsonRequest(baseUrl, 502, "EMPLOYEE", "/800", {
          method: "DELETE",
        });
        assert.equal(employeeDeleteAttempt.status, 403);

        const deletedAction = await jsonRequest(baseUrl, 501, "ADMIN", "/actions/909", {
          method: "DELETE",
        });
        assert.equal(deletedAction.status, 200);
        assert.equal(deletedAction.body.message, "Incident action deleted successfully");
        assert.deepEqual(sortedKeys(deletedAction.body.action), actionMutationFields);
        assert.equal((await jsonRequest(baseUrl, 501, "ADMIN", "/actions/999999", {
          method: "DELETE",
        })).status, 404);

        const deletedIncident = await jsonRequest(baseUrl, 501, "ADMIN", "/800", {
          method: "DELETE",
        });
        assert.equal(deletedIncident.status, 200);
        assert.equal(deletedIncident.body.message, "Incident deleted successfully");
        assert.deepEqual(sortedKeys(deletedIncident.body.incident), incidentMutationFields);
        assert.equal(await db.collection("incidents").countDocuments({ incident_id: 800 }), 0);
        assert.equal(await db.collection("incident_actions").countDocuments({ incident_id: 800 }), 0);

        const createdIncident = await db.collection("incidents").findOne({ incident_id: 801 });
        assert.ok(createdIncident, "the newly created incident should remain before its own cascade test");
        const createdActions = await db.collection("incident_actions").countDocuments({ incident_id: 801 });
        assert.equal(createdActions, 1);
        const finalIncidentDelete = await jsonRequest(baseUrl, 501, "ADMIN", "/801", {
          method: "DELETE",
        });
        assert.equal(finalIncidentDelete.status, 200);
        assert.equal(await db.collection("incident_actions").countDocuments({ incident_id: 801 }), 0);
        assert.equal((await jsonRequest(baseUrl, 501, "ADMIN", "/801/actions", { method: "GET" })).body.length, 0);
      });
    } finally {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server?.close((error) => error ? reject(error) : resolve());
        });
      }
      if (ownsDisposableDatabase && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
        const after = await mongoose.connection.db.admin().listDatabases({ nameOnly: true });
        assert.equal(
          after.databases.some(({ name }) => name === databaseName),
          false,
          "the uniquely named disposable database must be absent after cleanup"
        );
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  }
);
