import assert from "node:assert/strict";
import type { AddressInfo, Server } from "node:net";
import express, { type Request } from "express";
import mongoose from "mongoose";
import { test } from "node:test";
import {
  createComplianceRecordMongo,
  deleteComplianceRecordMongo,
  getAllComplianceRecordsMongo,
  getComplianceRecordByIdMongo,
  updateComplianceRecordMongo,
} from "./complianceService.js";

const TEST_DATABASE_PREFIX = "chemical_safety_stage3b6a_test_";
const testUri = process.env.MONGODB_TEST_URI;

const getDisposableDatabaseName = (uri: string): string => {
  const parsed = new URL(uri);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(hostname),
    "test MongoDB must be loopback"
  );

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  assert.notEqual(databaseName, "chemical_safety_db", "production database is never a test target");
  assert.match(
    databaseName,
    new RegExp(`^${TEST_DATABASE_PREFIX}[a-z0-9_]+$`),
    "test database name must be unique to Stage 3B.6A"
  );
  return databaseName;
};

const readResponse = async (response: Response) => ({
  status: response.status,
  body: await response.json() as any,
});

const withTemporaryRouteEnvironment = async <T>(action: () => Promise<T>): Promise<T> => {
  const values: Record<string, string> = {
    DB_HOST: "127.0.0.1",
    DB_NAME: "stage3b6a_test_only",
    DB_USER: "stage3b6a_test_only",
    DB_PASSWORD: "stage3b6a_test_only",
    AUTH_JWT_SECRET: "stage3b6a-route-test-secret",
  };
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }

  try {
    return await action();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test("existing compliance write routes retain the ADMIN and COMPLIANCE_OFFICER role gate", async () => {
  await withTemporaryRouteEnvironment(async () => {
    const complianceRoutes = (await import("../routes/complianceRoutes.js")).default as unknown as express.Router;
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res, next) => {
      const roleName = (req.header("x-test-role") ?? "EMPLOYEE") as NonNullable<Request["user"]>["roleName"];
      req.user = {
        userId: 42,
        fullName: "Compliance Owner",
        email: "compliance.owner@example.invalid",
        roleName,
      };
      next();
    });
    app.use("/api/compliance", complianceRoutes);

    const server = await new Promise<Server>((resolve, reject) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
      listener.once("error", reject);
    });

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}/api/compliance`;
      const sendInvalidCreate = (role: string) => fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Test-Role": role },
        body: JSON.stringify({ requirement_name: "" }),
      });

      const denied = await readResponse(await sendInvalidCreate("EMPLOYEE"));
      assert.equal(denied.status, 403);
      assert.deepEqual(denied.body, { success: false, message: "Forbidden" });
      assert.equal((await sendInvalidCreate("ADMIN")).status, 400);
      assert.equal((await sendInvalidCreate("COMPLIANCE_OFFICER")).status, 400);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => error ? reject(error) : resolve())
      );
    }
  });
});

test(
  "compliance record MongoDB service preserves CRUD, joins, dates, IDs, validation, and route authorization",
  {
    skip: !testUri && "Set MONGODB_TEST_URI to a fresh loopback Stage 3B.6A database",
  },
  async () => {
    assert.ok(testUri, "MONGODB_TEST_URI must identify a disposable test database");
    assert.equal(mongoose.connection.readyState, 0, "test requires a fresh Mongoose connection");
    const databaseName = getDisposableDatabaseName(testUri);
    let ownsDisposableDatabase = false;

    try {
      await mongoose.connect(testUri, {
        autoCreate: false,
        autoIndex: false,
        serverSelectionTimeoutMS: 5_000,
      });
      const db = mongoose.connection.db;
      assert.ok(db, "MongoDB connection did not select a database");

      const listedBefore = await db.admin().listDatabases({ nameOnly: true });
      assert.equal(
        listedBefore.databases?.some(({ name }) => name === databaseName),
        false,
        "refusing to write to an existing database"
      );
      await db.collection<{ _id: string; owner: string }>("stage3b6a_test_guard").insertOne({
        _id: `${databaseName}:${process.pid}`,
        owner: "compliance-record-integration-test",
      });
      ownsDisposableDatabase = true;

      const seededTimestamp = new Date("2025-05-06T07:08:09.123Z");
      await db.collection("users").insertMany([
        { user_id: 42, full_name: "Compliance Owner" },
        { user_id: 43, full_name: "Second Compliance Owner" },
      ]);
      await db.collection("compliance_records").insertMany([
        {
          compliance_id: 3,
          requirement_name: "Earlier Test Requirement",
          regulatory_authority: null,
          description: null,
          issue_date: null,
          expiry_date: null,
          status: "ACTIVE",
          responsible_user: null,
          created_at: seededTimestamp,
        },
        {
          compliance_id: 7,
          requirement_name: "Later Test Requirement",
          regulatory_authority: "Test Authority",
          description: "Disposable test fixture",
          issue_date: new Date("2025-04-03T00:00:00.000Z"),
          expiry_date: new Date("2026-04-03T00:00:00.000Z"),
          status: "ACTIVE",
          responsible_user: 42,
          created_at: seededTimestamp,
        },
      ]);
      await db.collection<{ _id: string; sequence: number }>("id_counters").insertOne({
        _id: "compliance_records",
        sequence: 2,
      });

      const listed = await getAllComplianceRecordsMongo();
      const joinedFields = [
        "compliance_id",
        "requirement_name",
        "regulatory_authority",
        "description",
        "issue_date",
        "expiry_date",
        "status",
        "responsible_user",
        "created_at",
        "responsible_user_name",
      ];
      assert.deepEqual(listed.map((record) => record.compliance_id), [7, 3]);
      assert.deepEqual(Object.keys(listed[0]).sort(), [...joinedFields].sort());
      assert.equal(listed[0].responsible_user_name, "Compliance Owner");
      assert.equal(listed[0].issue_date, "2025-04-03T00:00:00.000Z");
      assert.equal(listed[0].expiry_date, "2026-04-03T00:00:00.000Z");
      assert.equal(listed[1].responsible_user_name, null);
      assert.equal(listed[1].regulatory_authority, null);
      assert.equal(listed[1].description, null);
      assert.equal(listed[1].issue_date, null);
      assert.equal(listed[1].expiry_date, null);
      assert.equal(listed[1].created_at.toISOString(), seededTimestamp.toISOString());
      assert.equal("_id" in listed[0], false);
      assert.equal("__v" in listed[0], false);

      const joined = await getComplianceRecordByIdMongo(7);
      assert.equal(joined?.responsible_user_name, "Compliance Owner");
      assert.equal(await getComplianceRecordByIdMongo(999), undefined);

      const created = await createComplianceRecordMongo({
        requirement_name: "New Test Requirement",
        regulatory_authority: "Test Regulator",
        description: "Created through the isolated Mongo service",
        issue_date: "2024-02-29",
        expiry_date: null,
        responsible_user: 43,
      });
      assert.equal(created.compliance_id, 8, "stale counter must advance past existing IDs");
      assert.equal(created.requirement_name, "New Test Requirement");
      assert.equal(created.regulatory_authority, "Test Regulator");
      assert.equal(created.description, "Created through the isolated Mongo service");
      assert.equal(created.issue_date, "2024-02-29T00:00:00.000Z");
      assert.equal(created.expiry_date, null);
      assert.equal(created.status, "ACTIVE");
      assert.equal(created.responsible_user, 43);
      assert.equal("responsible_user_name" in created, false, "INSERT response remains unjoined");
      assert.deepEqual(Object.keys(created).sort(), joinedFields.filter((field) => field !== "responsible_user_name").sort());
      assert.ok(created.created_at instanceof Date);
      assert.equal(
        (await getComplianceRecordByIdMongo(8))?.responsible_user_name,
        "Second Compliance Owner",
        "get-by-ID resolves the referenced user before the relationship is cleared"
      );

      const updated = await updateComplianceRecordMongo(8, {
        requirement_name: "Updated Test Requirement",
        regulatory_authority: null,
        description: null,
        issue_date: "2024-03-01",
        expiry_date: null,
        responsible_user: null,
      });
      assert.equal(updated?.requirement_name, "Updated Test Requirement");
      assert.equal(updated?.regulatory_authority, null);
      assert.equal(updated?.description, null);
      assert.equal(updated?.issue_date, "2024-03-01T00:00:00.000Z");
      assert.equal(updated?.expiry_date, null);
      assert.equal(updated?.responsible_user, null);
      assert.equal("responsible_user_name" in (updated ?? {}), false, "UPDATE response remains unjoined");
      assert.equal(
        (await getComplianceRecordByIdMongo(8))?.responsible_user_name,
        null,
        "get-by-ID returns null after the nullable user reference is cleared"
      );
      assert.equal(await updateComplianceRecordMongo(999, { requirement_name: "Missing" }), undefined);

      await assert.rejects(
        createComplianceRecordMongo({ requirement_name: "", status: "ACTIVE" }),
        mongoose.Error.ValidationError
      );
      await assert.rejects(
        createComplianceRecordMongo({ requirement_name: "Invalid Date", issue_date: "2025-02-30" }),
        /Invalid SQL DATE/
      );
      await assert.rejects(
        createComplianceRecordMongo({ requirement_name: "Missing User", responsible_user: 999 }),
        /Responsible user does not exist/
      );

      await db.collection<{ _id: string; sequence: number }>("id_counters").updateOne(
        { _id: "compliance_records" },
        { $set: { sequence: 20 } }
      );
      const aheadCounterRecord = await createComplianceRecordMongo({
        requirement_name: "Ahead Counter Test",
      });
      assert.equal(aheadCounterRecord.compliance_id, 21, "an ahead counter must be preserved");

      const deleted = await deleteComplianceRecordMongo(3);
      assert.equal(deleted?.compliance_id, 3);
      assert.equal(deleted?.responsible_user, null);
      assert.equal(await deleteComplianceRecordMongo(999), undefined);
      assert.equal(await getComplianceRecordByIdMongo(3), undefined);

      const remaining = await db.collection("compliance_records").countDocuments();
      assert.equal(remaining, 3);
    } finally {
      if (ownsDisposableDatabase && mongoose.connection.db) {
        const db = mongoose.connection.db;
        await db.dropDatabase();
        const listedAfter = await db.admin().listDatabases({ nameOnly: true });
        assert.equal(
          listedAfter.databases?.some(({ name }) => name === databaseName),
          false,
          "test cleanup must remove only the uniquely named disposable database"
        );
      }

      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  }
);
