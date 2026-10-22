import assert from "node:assert/strict";
import type { AddressInfo, Server } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { test } from "node:test";

const TEST_DATABASE_PREFIX = "chemical_safety_stage3b4_test_";
const TEST_JWT_SECRET = "stage3b4-disposable-test-secret";
const TEST_AUTH_COOKIE = "stage3b4_test_session";
const TEST_CSRF_TOKEN = "stage3b4-disposable-csrf";
const TEST_CSRF_COOKIE = "chem_safe_csrf";

interface ApiResponse {
  status: number;
  body: any;
}

const parseDisposableTestUri = (uri: string): string => {
  const parsed = new URL(uri);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(hostname), "test MongoDB must be loopback");

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  assert.match(
    databaseName,
    new RegExp(`^${TEST_DATABASE_PREFIX}[a-z0-9_]+$`),
    "test database must have a unique Stage 3B.4 name"
  );
  return databaseName;
};

const makeToken = (userId: number, roleName: string): string =>
  jwt.sign(
    {
      sub: String(userId),
      fullName: `Stage 3B.4 ${roleName}`,
      email: `${roleName.toLowerCase()}.stage3b4@example.invalid`,
      roleName,
    },
    TEST_JWT_SECRET,
    { expiresIn: "5m" }
  );

const inspectionFields = [
  "area",
  "created_at",
  "inspection_date",
  "inspection_id",
  "inspector_id",
  "inspector_name",
  "remarks",
  "status",
];

const inspectionMutationFields = [
  "area",
  "created_at",
  "inspection_date",
  "inspection_id",
  "inspector_id",
  "remarks",
  "status",
];

const findingJoinedFields = [
  "corrective_action",
  "created_at",
  "due_date",
  "finding_description",
  "finding_id",
  "inspection_area",
  "inspection_date",
  "inspection_id",
  "severity",
  "status",
];

const findingMutationFields = [
  "corrective_action",
  "created_at",
  "due_date",
  "finding_description",
  "finding_id",
  "inspection_id",
  "severity",
  "status",
];

const findingForInspectionFields = [
  "corrective_action",
  "created_at",
  "due_date",
  "finding_description",
  "finding_id",
  "inspection_id",
  "severity",
  "status",
];

const keys = (record: Record<string, unknown>) => Object.keys(record).sort();

test(
  "inspection and finding routes preserve MongoDB CRUD, references, joins, and PostgreSQL response behavior",
  {
    skip: !process.env.MONGODB_TEST_URI
      && "Set MONGODB_TEST_URI to a new loopback disposable test database",
  },
  async (t) => {
    const uri = process.env.MONGODB_TEST_URI;
    assert.ok(uri, "MONGODB_TEST_URI must point to a disposable local MongoDB database");
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
      const listed = await db.admin().listDatabases({ nameOnly: true });
      assert.equal(
        listed.databases?.some(({ name }) => name === databaseName),
        false,
        "refusing to write to an existing test database"
      );
      await db.collection<{ _id: string; owner: string }>("stage3b4_test_guard").insertOne({
        _id: `${databaseName}:${process.pid}`,
        owner: "stage3b4-inspection-finding-integration-test",
      });
      ownsDisposableDatabase = true;

      const olderTimestamp = new Date("2024-01-02T03:04:05.678Z");
      const newerTimestamp = new Date("2025-06-07T08:09:10.111Z");
      await db.collection("roles").insertMany([
        { role_id: 1, role_name: "ADMIN", description: null },
        { role_id: 2, role_name: "SAFETY_OFFICER", description: null },
        { role_id: 3, role_name: "EMPLOYEE", description: null },
      ]);
      await db.collection("users").insertMany([
        {
          user_id: 301,
          role_id: 1,
          full_name: "Stage 3B.4 Admin",
          email: "admin.stage3b4@example.invalid",
          is_active: true,
        },
        {
          user_id: 302,
          role_id: 2,
          full_name: "Stage 3B.4 Safety Officer",
          email: "officer.stage3b4@example.invalid",
          is_active: true,
        },
        {
          user_id: 303,
          role_id: 3,
          full_name: "Stage 3B.4 Employee",
          email: "employee.stage3b4@example.invalid",
          is_active: true,
        },
      ]);
      await db.collection("inspections").insertMany([
        {
          inspection_id: 40,
          inspector_id: 302,
          inspection_date: new Date("2024-03-10T00:00:00.000Z"),
          area: "North process unit",
          status: "SCHEDULED",
          remarks: null,
          created_at: olderTimestamp,
        },
        {
          inspection_id: 12,
          inspector_id: 301,
          inspection_date: new Date("2024-03-31T00:00:00.000Z"),
          area: "South storage area",
          status: "COMPLETE",
          remarks: "Seeded inspection",
          created_at: newerTimestamp,
        },
      ]);
      await db.collection("inspection_findings").insertMany([
        {
          finding_id: 42,
          inspection_id: 40,
          finding_description: "Guard missing",
          severity: "HIGH",
          corrective_action: null,
          due_date: null,
          status: "OPEN",
          created_at: newerTimestamp,
        },
        {
          finding_id: 39,
          inspection_id: 40,
          finding_description: "Label faded",
          severity: "LOW",
          corrective_action: "Replace label",
          due_date: new Date("2024-04-01T00:00:00.000Z"),
          status: "OPEN",
          created_at: olderTimestamp,
        },
        {
          finding_id: 18,
          inspection_id: 12,
          finding_description: "Area needs marking",
          severity: "MEDIUM",
          corrective_action: null,
          due_date: null,
          status: "CLOSED",
          created_at: olderTimestamp,
        },
      ]);
      await db.collection<{ _id: string; sequence: number }>("id_counters").insertMany([
        { _id: "inspections", sequence: 31 },
        { _id: "inspection_findings", sequence: 20 },
      ]);

      // The isolated route harness uses real authentication, CSRF, and role middleware.
      Object.assign(process.env, {
        DB_HOST: "127.0.0.1",
        DB_NAME: "stage3b4_test_only",
        DB_USER: "stage3b4_test_only",
        DB_PASSWORD: "stage3b4_test_only",
        AUTH_JWT_SECRET: TEST_JWT_SECRET,
        AUTH_COOKIE_NAME: TEST_AUTH_COOKIE,
      });
      const { authenticate, requireCsrf } = await import("../middleware/auth.js");
      const inspectionRoutes = (await import("../routes/inspectionRoutes.js")).default as unknown as express.Router;
      const findingRoutes = (await import("../routes/findingRoutes.js")).default as unknown as express.Router;

      const app = express();
      app.use(express.json());
      app.use(authenticate, requireCsrf);
      app.use("/api/inspections", inspectionRoutes);
      app.use("/api/findings", findingRoutes);
      server = await new Promise<Server>((resolve, reject) => {
        const candidate = app.listen(0, "127.0.0.1", () => resolve(candidate));
        candidate.once("error", reject);
      });
      const address = server.address() as AddressInfo | null;
      assert.ok(address && typeof address !== "string", "test HTTP server did not bind to a port");
      const baseUrl = `http://127.0.0.1:${address.port}/api`;

      const request = async (
        path: string,
        roleName: string,
        method = "GET",
        body?: unknown
      ): Promise<ApiResponse> => {
        const userId = roleName === "ADMIN" ? 301 : roleName === "SAFETY_OFFICER" ? 302 : 303;
        const token = makeToken(userId, roleName);
        const response = await fetch(`${baseUrl}${path}`, {
          method,
          headers: {
            Cookie: `${TEST_AUTH_COOKIE}=${encodeURIComponent(token)}; ${TEST_CSRF_COOKIE}=${TEST_CSRF_TOKEN}`,
            ...(method === "GET" ? {} : { "X-CSRF-Token": TEST_CSRF_TOKEN }),
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const text = await response.text();
        return { status: response.status, body: text ? JSON.parse(text) : undefined };
      };

      await t.test("reads preserve sort order, joined fields, nulls, dates, and exact DTO fields", async () => {
        const inspections = await request("/inspections", "ADMIN");
        assert.equal(inspections.status, 200);
        assert.deepEqual(inspections.body.map((record: any) => record.inspection_id), [40, 12]);
        assert.deepEqual(keys(inspections.body[0]), inspectionFields);
        assert.equal(inspections.body[0].inspector_name, "Stage 3B.4 Safety Officer");
        assert.equal(inspections.body[0].inspection_date, "2024-03-10T00:00:00.000Z");
        assert.equal(inspections.body[0].remarks, null);
        assert.equal(inspections.body[0].created_at, olderTimestamp.toISOString());

        const inspection = await request("/inspections/12", "ADMIN");
        assert.equal(inspection.status, 200);
        assert.deepEqual(keys(inspection.body), inspectionFields);
        assert.equal(inspection.body.inspector_name, "Stage 3B.4 Admin");
        assert.equal((await request("/inspections/99999", "ADMIN")).status, 404);

        const findings = await request("/findings", "ADMIN");
        assert.equal(findings.status, 200);
        assert.deepEqual(findings.body.map((record: any) => record.finding_id), [42, 39, 18]);
        assert.deepEqual(keys(findings.body[0]), findingJoinedFields);
        assert.equal(findings.body[0].inspection_area, "North process unit");
        assert.equal(findings.body[0].inspection_date, "2024-03-10T00:00:00.000Z");
        assert.equal(findings.body[0].due_date, null);
        assert.equal(findings.body[1].due_date, "2024-04-01T00:00:00.000Z");

        const byInspection = await request("/findings/inspection/40", "SAFETY_OFFICER");
        assert.equal(byInspection.status, 200);
        assert.deepEqual(byInspection.body.map((record: any) => record.finding_id), [42, 39]);
        assert.deepEqual(keys(byInspection.body[0]), findingForInspectionFields);
        assert.equal("inspection_area" in byInspection.body[0], false);
        assert.equal(byInspection.body[0].corrective_action, null);

        const finding = await request("/findings/39", "ADMIN");
        assert.equal(finding.status, 200);
        assert.deepEqual(keys(finding.body), findingJoinedFields);
        assert.equal(finding.body.inspection_area, "North process unit");
        assert.equal((await request("/findings/99999", "ADMIN")).status, 404);
      });

      await t.test("route authorization rejects inspection and finding writes for employees", async () => {
        const inspectionCount = await db.collection("inspections").countDocuments();
        const findingCount = await db.collection("inspection_findings").countDocuments();
        const inspectionCounter = await db.collection<{ _id: string; sequence: number }>("id_counters")
          .findOne({ _id: "inspections" });
        const findingCounter = await db.collection<{ _id: string; sequence: number }>("id_counters")
          .findOne({ _id: "inspection_findings" });

        const inspectionWrite = await request("/inspections", "EMPLOYEE", "POST", {
          inspector_id: 303,
          inspection_date: "2024-04-01",
          area: "Unauthorized area",
        });
        const findingWrite = await request("/findings", "EMPLOYEE", "POST", {
          inspection_id: 40,
          finding_description: "Unauthorized finding",
          severity: "LOW",
        });
        assert.equal(inspectionWrite.status, 403);
        assert.deepEqual(inspectionWrite.body, { success: false, message: "Forbidden" });
        assert.equal(findingWrite.status, 403);
        assert.deepEqual(findingWrite.body, { success: false, message: "Forbidden" });
        assert.equal(await db.collection("inspections").countDocuments(), inspectionCount);
        assert.equal(await db.collection("inspection_findings").countDocuments(), findingCount);
        assert.equal(
          (await db.collection<{ _id: string; sequence: number }>("id_counters")
            .findOne({ _id: "inspections" }))?.sequence,
          inspectionCounter?.sequence
        );
        assert.equal(
          (await db.collection<{ _id: string; sequence: number }>("id_counters")
            .findOne({ _id: "inspection_findings" }))?.sequence,
          findingCounter?.sequence
        );
      });

      let createdInspectionId = 0;
      let createdFindingId = 0;
      await t.test("inspections preserve date-only input, timestamps, defaults, validation, and numeric IDs", async () => {
        const countBeforeInvalidReference = await db.collection("inspections").countDocuments();
        const counterBeforeInvalidReference = await db.collection<{ _id: string; sequence: number }>("id_counters")
          .findOne({ _id: "inspections" });
        assert.equal((await request("/inspections", "ADMIN", "POST", {
          inspector_id: 99999,
          inspection_date: "2024-04-01",
          area: "Missing inspector",
        })).status, 500);
        assert.equal(await db.collection("inspections").countDocuments(), countBeforeInvalidReference);
        assert.equal(
          (await db.collection<{ _id: string; sequence: number }>("id_counters")
            .findOne({ _id: "inspections" }))?.sequence,
          counterBeforeInvalidReference?.sequence
        );

        assert.equal((await request("/inspections", "ADMIN", "POST", {
          inspector_id: 302,
          area: "Missing inspection date",
        })).status, 400);

        const oldTimezone = process.env.TZ;
        process.env.TZ = "America/Los_Angeles";
        try {
          const created = await request("/inspections", "SAFETY_OFFICER", "POST", {
            inspector_id: 302,
            inspection_date: "2024-03-10",
            area: "Created west process unit",
          });
          assert.equal(created.status, 201);
          createdInspectionId = created.body.inspection_id;
          assert.equal(createdInspectionId, 41);
          assert.equal(typeof createdInspectionId, "number");
          assert.deepEqual(keys(created.body), inspectionMutationFields);
          assert.equal(created.body.inspection_date, "2024-03-10T00:00:00.000Z");
          assert.equal(created.body.status, "SCHEDULED");
          assert.equal(created.body.remarks, null);
          assert.ok(Number.isFinite(Date.parse(created.body.created_at)));
          assert.equal(
            (await db.collection<{ _id: string; sequence: number }>("id_counters")
              .findOne({ _id: "inspections" }))?.sequence,
            41
          );
        } finally {
          if (oldTimezone === undefined) delete process.env.TZ;
          else process.env.TZ = oldTimezone;
        }

        const updated = await request(`/inspections/12`, "ADMIN", "PUT", {
          inspector_id: 302,
          inspection_date: "2024-04-03",
          area: "Updated south storage area",
          status: "COMPLETE",
          remarks: null,
        });
        assert.equal(updated.status, 200);
        assert.deepEqual(keys(updated.body), inspectionMutationFields);
        assert.equal(updated.body.inspection_date, "2024-04-03T00:00:00.000Z");
        assert.equal(updated.body.created_at, newerTimestamp.toISOString());
        assert.equal(updated.body.remarks, null);
        assert.equal((await request("/inspections/99999", "ADMIN", "PUT", {
          inspector_id: 302,
          inspection_date: "2024-04-03",
          area: "Missing inspection",
        })).status, 404);
      });

      await t.test("findings preserve references, nullable dates, CRUD, and counter IDs", async () => {
        const countBeforeMissingReference = await db.collection("inspection_findings").countDocuments();
        const counterBeforeMissingReference = await db.collection<{ _id: string; sequence: number }>("id_counters")
          .findOne({ _id: "inspection_findings" });
        assert.equal((await request("/findings", "ADMIN", "POST", {
          inspection_id: 99999,
          finding_description: "Missing parent",
          severity: "LOW",
        })).status, 500);
        assert.equal(await db.collection("inspection_findings").countDocuments(), countBeforeMissingReference);
        assert.equal(
          (await db.collection<{ _id: string; sequence: number }>("id_counters")
            .findOne({ _id: "inspection_findings" }))?.sequence,
          counterBeforeMissingReference?.sequence
        );

        assert.equal((await request("/findings", "ADMIN", "POST", {
          inspection_id: 40,
          severity: "LOW",
        })).status, 400);

        const created = await request("/findings", "SAFETY_OFFICER", "POST", {
          inspection_id: createdInspectionId,
          finding_description: "Created inspection finding",
          severity: "MEDIUM",
        });
        assert.equal(created.status, 201);
        createdFindingId = created.body.finding_id;
        assert.equal(createdFindingId, 43);
        assert.deepEqual(keys(created.body), findingMutationFields);
        assert.equal(created.body.due_date, null);
        assert.equal(created.body.corrective_action, null);
        assert.equal(created.body.status, "OPEN");
        assert.equal(
          (await db.collection<{ _id: string; sequence: number }>("id_counters")
            .findOne({ _id: "inspection_findings" }))?.sequence,
          43
        );

        const oldTimezone = process.env.TZ;
        process.env.TZ = "America/Los_Angeles";
        try {
          const updated = await request(`/findings/${createdFindingId}`, "ADMIN", "PUT", {
            inspection_id: 12,
            finding_description: "Updated finding",
            severity: "HIGH",
            corrective_action: null,
            due_date: "2024-03-31",
            status: "IN_PROGRESS",
          });
          assert.equal(updated.status, 200);
          assert.deepEqual(keys(updated.body), findingMutationFields);
          assert.equal(updated.body.inspection_id, 12);
          assert.equal(updated.body.due_date, "2024-03-31T00:00:00.000Z");
          assert.equal(updated.body.corrective_action, null);
          assert.equal(updated.body.finding_description, "Updated finding");
          assert.equal(updated.body.created_at, created.body.created_at);
        } finally {
          if (oldTimezone === undefined) delete process.env.TZ;
          else process.env.TZ = oldTimezone;
        }

        const movedFinding = await request(`/findings/${createdFindingId}`, "ADMIN");
        assert.equal(movedFinding.status, 200);
        assert.equal(movedFinding.body.inspection_area, "Updated south storage area");
        assert.equal(movedFinding.body.inspection_date, "2024-04-03T00:00:00.000Z");
        assert.equal((await request(`/findings/99999`, "ADMIN", "PUT", {
          inspection_id: 12,
          finding_description: "Missing finding",
          severity: "LOW",
        })).status, 404);

        assert.equal((await request(`/findings/${createdFindingId}`, "ADMIN", "PUT", {
          inspection_id: 99999,
          finding_description: "Invalid new parent",
          severity: "LOW",
        })).status, 400);
        const unchanged = await request(`/findings/${createdFindingId}`, "ADMIN");
        assert.equal(unchanged.body.inspection_id, 12);
        assert.equal(unchanged.body.finding_description, "Updated finding");

        const deleted = await request(`/findings/${createdFindingId}`, "ADMIN", "DELETE");
        assert.equal(deleted.status, 200);
        assert.deepEqual(keys(deleted.body), ["finding", "message"]);
        assert.equal(deleted.body.message, "Finding deleted successfully");
        assert.deepEqual(keys(deleted.body.finding), findingMutationFields);
        assert.equal((await request(`/findings/${createdFindingId}`, "ADMIN")).status, 404);
        assert.equal((await request("/findings/99999", "ADMIN", "DELETE")).status, 404);
      });

      await t.test("deleting an inspection cascades findings as declared by PostgreSQL", async () => {
        const cascadeFinding = await request("/findings", "ADMIN", "POST", {
          inspection_id: createdInspectionId,
          finding_description: "Finding removed with inspection",
          severity: "LOW",
          due_date: null,
        });
        assert.equal(cascadeFinding.status, 201);
        const cascadeFindingId = cascadeFinding.body.finding_id;
        assert.equal(cascadeFindingId, 44);

        const deleted = await request(`/inspections/${createdInspectionId}`, "SAFETY_OFFICER", "DELETE");
        assert.equal(deleted.status, 200);
        assert.deepEqual(keys(deleted.body), ["inspection", "message"]);
        assert.equal(deleted.body.message, "Inspection deleted successfully");
        assert.deepEqual(keys(deleted.body.inspection), inspectionMutationFields);
        assert.equal(deleted.body.inspection.inspection_id, createdInspectionId);
        assert.equal(await db.collection("inspection_findings").countDocuments({ inspection_id: createdInspectionId }), 0);
        assert.equal((await request(`/inspections/${createdInspectionId}`, "ADMIN")).status, 404);
        assert.equal((await request(`/findings/${cascadeFindingId}`, "ADMIN")).status, 404);
        assert.equal((await request(`/inspections/99999`, "ADMIN", "DELETE")).status, 404);
      });
    } finally {
      if (server?.listening) {
        await new Promise<void>((resolve, reject) => {
          server?.close((error) => error ? reject(error) : resolve());
        });
      }
      if (ownsDisposableDatabase && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  }
);
