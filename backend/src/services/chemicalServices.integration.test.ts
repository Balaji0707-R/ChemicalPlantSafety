import assert from "node:assert/strict";
import type { AddressInfo, Server } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { test } from "node:test";
import { createChemical } from "./chemicalService.js";
import { createStorage } from "./chemicalStorageService.js";

const TEST_DATABASE_PREFIX = "chemical_safety_stage3b3_test_";
const TEST_JWT_SECRET = "stage3b3-disposable-test-secret";
const TEST_AUTH_COOKIE = "stage3b3_test_session";
const TEST_CSRF_TOKEN = "stage3b3-disposable-csrf";
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
    "test database must have a unique Stage 3B.3 name"
  );
  return databaseName;
};

const makeToken = (userId: number, roleName: string): string =>
  jwt.sign(
    {
      sub: String(userId),
      fullName: `Stage 3B.3 ${roleName}`,
      email: `${roleName.toLowerCase()}.stage3b3@example.invalid`,
      roleName,
    },
    TEST_JWT_SECRET,
    { expiresIn: "5m" }
  );

const silently = async <T>(action: () => Promise<T>): Promise<T> => {
  const originalError = console.error;
  console.error = () => {};
  try {
    return await action();
  } finally {
    console.error = originalError;
  }
};

const chemicalFields = [
  "cas_number",
  "chemical_id",
  "chemical_name",
  "created_at",
  "description",
  "hazard_class",
  "physical_state",
];

const storageFields = [
  "chemical_id",
  "maximum_capacity",
  "quantity",
  "storage_id",
  "storage_location",
  "unit",
  "updated_at",
];

test(
  "chemical and storage routes preserve MongoDB CRUD and PostgreSQL response behavior",
  { skip: !process.env.MONGODB_TEST_URI && "Set MONGODB_TEST_URI to a new loopback disposable test database" },
  async (t) => {
    const uri = process.env.MONGODB_TEST_URI;
    assert.ok(uri, "MONGODB_TEST_URI must point to a disposable local MongoDB database");
    const databaseName = parseDisposableTestUri(uri);
    let ownsDisposableDatabase = false;
    let server: Server | undefined;

    try {
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
      ownsDisposableDatabase = true;

      const seededAt = new Date("2024-01-02T03:04:05.000Z");
      await db.collection("chemicals").insertMany([
        {
          chemical_id: 4,
          chemical_name: "Alpha Test Chemical",
          cas_number: null,
          hazard_class: "Test hazard",
          physical_state: null,
          description: null,
          created_at: seededAt,
        },
        {
          chemical_id: 2,
          chemical_name: "Zulu Test Chemical",
          cas_number: "55-55-5",
          hazard_class: null,
          physical_state: "Liquid",
          description: "Disposable fixture",
          created_at: seededAt,
        },
      ]);
      await db.collection("chemical_storage").insertMany([
        {
          storage_id: 7,
          chemical_id: 4,
          storage_location: "Tank B",
          quantity: 2.1,
          unit: "kg",
          maximum_capacity: 5.5,
          updated_at: seededAt,
        },
        {
          storage_id: 3,
          chemical_id: 4,
          storage_location: "Tank A",
          quantity: 1.2,
          unit: "kg",
          maximum_capacity: null,
          updated_at: seededAt,
        },
      ]);
      await db.collection<{ _id: string; sequence: number }>("id_counters").insertMany([
        { _id: "chemicals", sequence: 1 },
        { _id: "chemical_storage", sequence: 2 },
      ]);
      await db.collection("roles").insertMany([
        { role_id: 1, role_name: "ADMIN" },
        { role_id: 2, role_name: "SAFETY_OFFICER" },
        { role_id: 3, role_name: "PLANT_MANAGER" },
        { role_id: 4, role_name: "EMPLOYEE" },
      ]);
      await db.collection("users").insertMany([
        { user_id: 301, role_id: 1, full_name: "Stage 3B.3 Admin", email: "admin.stage3b3@example.invalid", is_active: true },
        { user_id: 302, role_id: 2, full_name: "Stage 3B.3 Safety Officer", email: "safety.stage3b3@example.invalid", is_active: true },
        { user_id: 303, role_id: 3, full_name: "Stage 3B.3 Plant Manager", email: "manager.stage3b3@example.invalid", is_active: true },
        { user_id: 304, role_id: 4, full_name: "Stage 3B.3 Employee", email: "employee.stage3b3@example.invalid", is_active: true },
      ]);

      // The isolated route harness uses real auth and role middleware with test-only credentials.
      Object.assign(process.env, {
        DB_HOST: "127.0.0.1",
        DB_NAME: "stage3b3_test_only",
        DB_USER: "stage3b3_test_only",
        DB_PASSWORD: "stage3b3_test_only",
        AUTH_JWT_SECRET: TEST_JWT_SECRET,
        AUTH_COOKIE_NAME: TEST_AUTH_COOKIE,
      });
      const { authenticate, requireCsrf } = await import("../middleware/auth.js");
      const chemicalRoutes = (await import("../routes/chemicalRoutes.js")).default as unknown as express.Router;
      const chemicalStorageRoutes = (await import("../routes/chemicalStorageRoutes.js")).default as unknown as express.Router;

      const app = express();
      app.use(express.json());
      app.use(authenticate, requireCsrf);
      app.use("/api/chemicals", chemicalRoutes);
      app.use("/api", chemicalStorageRoutes);

      server = app.listen(0, "127.0.0.1");
      await new Promise<void>((resolve, reject) => {
        server?.once("listening", resolve);
        server?.once("error", reject);
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
        const userId = roleName === "ADMIN"
          ? 301
          : roleName === "SAFETY_OFFICER"
            ? 302
            : roleName === "PLANT_MANAGER"
              ? 303
              : 304;
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

      await t.test("route authorization rejects disallowed chemical and storage writes", async () => {
        const chemicalCount = await db.collection("chemicals").countDocuments();
        const storageCount = await db.collection("chemical_storage").countDocuments();
        const chemicalWrite = await request("/chemicals", "EMPLOYEE", "POST", {
          chemical_name: "Unauthorized Chemical",
        });
        const storageWrite = await request("/chemicals/4/storage", "EMPLOYEE", "POST", {
          storage_location: "Unauthorized Tank",
          quantity: 1,
          unit: "kg",
        });
        const chemicalDelete = await request("/chemicals/4", "PLANT_MANAGER", "DELETE");
        const storageDelete = await request("/chemical-storage/7", "PLANT_MANAGER", "DELETE");

        assert.equal(chemicalWrite.status, 403);
        assert.equal(storageWrite.status, 403);
        assert.equal(chemicalDelete.status, 403);
        assert.equal(storageDelete.status, 403);
        assert.equal(await db.collection("chemicals").countDocuments(), chemicalCount);
        assert.equal(await db.collection("chemical_storage").countDocuments(), storageCount);
      });

      let createdChemicalId = 0;
      await t.test("chemicals preserve descending order, nullable fields, DTO shape, and CRUD statuses", async () => {
        const initial = await request("/chemicals", "ADMIN");
        assert.equal(initial.status, 200);
        assert.deepEqual(initial.body.map((chemical: any) => chemical.chemical_id), [4, 2]);
        assert.deepEqual(Object.keys(initial.body[0]).sort(), chemicalFields);

        const created = await request("/chemicals", "ADMIN", "POST", {
          chemical_name: "Created Test Chemical",
        });
        assert.equal(created.status, 201);
        createdChemicalId = created.body.chemical_id;
        assert.equal(createdChemicalId, 5);
        assert.equal(typeof createdChemicalId, "number");
        assert.equal(created.body.cas_number, null);
        assert.equal(created.body.hazard_class, null);
        assert.equal(created.body.physical_state, null);
        assert.equal(created.body.description, null);
        assert.equal(Number.isNaN(Date.parse(created.body.created_at)), false);
        assert.deepEqual(Object.keys(created.body).sort(), chemicalFields);

        const listed = await request("/chemicals", "PLANT_MANAGER");
        assert.deepEqual(listed.body.map((chemical: any) => chemical.chemical_id), [5, 4, 2]);
        const found = await request(`/chemicals/${createdChemicalId}`, "ADMIN");
        assert.equal(found.status, 200);
        assert.equal(found.body.chemical_id, createdChemicalId);
        assert.equal((await request("/chemicals/99999", "ADMIN")).status, 404);

        const updated = await request(`/chemicals/${createdChemicalId}`, "PLANT_MANAGER", "PUT", {
          chemical_name: "Updated Test Chemical",
        });
        assert.equal(updated.status, 200);
        assert.equal(updated.body.chemical_name, "Updated Test Chemical");
        assert.equal(updated.body.cas_number, null);
        assert.equal(updated.body.hazard_class, null);
        assert.equal(updated.body.physical_state, null);
        assert.equal(updated.body.description, null);
        assert.equal(updated.body.created_at, created.body.created_at);
        assert.deepEqual(Object.keys(updated.body).sort(), chemicalFields);
        assert.equal((await request("/chemicals/99999", "ADMIN", "PUT", {
          chemical_name: "Missing Chemical",
        })).status, 404);

        const invalid = await request("/chemicals", "ADMIN", "POST", { chemical_name: "   " });
        assert.equal(invalid.status, 400);
        assert.deepEqual(invalid.body, { message: "chemical_name is required" });
      });

      await t.test("storage preserves descending order, decimal strings, null capacity, and updated_at", async () => {
        const initial = await request("/chemicals/4/storage", "ADMIN");
        assert.equal(initial.status, 200);
        assert.deepEqual(initial.body.map((record: any) => record.storage_id), [7, 3]);
        assert.equal(initial.body[0].quantity, "2.10");
        assert.equal(initial.body[0].maximum_capacity, "5.50");
        assert.equal(initial.body[1].quantity, "1.20");
        assert.equal(initial.body[1].maximum_capacity, null);
        assert.deepEqual(Object.keys(initial.body[0]).sort(), storageFields);

        const created = await request("/chemicals/4/storage", "ADMIN", "POST", {
          storage_location: "Tank C",
          quantity: 1.005,
          unit: "kg",
          maximum_capacity: 2.345,
        });
        assert.equal(created.status, 201);
        assert.equal(created.body.storage_id, 8);
        assert.equal(created.body.chemical_id, 4);
        assert.equal(created.body.quantity, "1.01");
        assert.equal(created.body.maximum_capacity, "2.35");
        assert.equal(Number.isNaN(Date.parse(created.body.updated_at)), false);
        assert.deepEqual(Object.keys(created.body).sort(), storageFields);

        const noCapacity = await request("/chemicals/4/storage", "ADMIN", "POST", {
          storage_location: "Tank Without Capacity Limit",
          quantity: 0.5,
          unit: "kg",
          maximum_capacity: null,
        });
        assert.equal(noCapacity.status, 201);
        assert.equal(noCapacity.body.storage_id, 9);
        assert.equal(noCapacity.body.quantity, "0.50");
        assert.equal(noCapacity.body.maximum_capacity, null);
        assert.deepEqual(Object.keys(noCapacity.body).sort(), storageFields);

        const listed = await request("/chemicals/4/storage", "SAFETY_OFFICER");
        assert.deepEqual(listed.body.map((record: any) => record.storage_id), [9, 8, 7, 3]);
        assert.deepEqual(Object.keys(listed.body[3]).sort(), storageFields);
        const otherChemical = await request(`/chemicals/${createdChemicalId}/storage`, "ADMIN");
        assert.equal(otherChemical.status, 200);
        assert.deepEqual(otherChemical.body, []);

        const updated = await request("/chemical-storage/7", "PLANT_MANAGER", "PUT", {
          storage_location: "Updated Tank B",
          quantity: 4.005,
          unit: "kg",
          maximum_capacity: 5.555,
        });
        assert.equal(updated.status, 200);
        assert.equal(updated.body.quantity, "4.01");
        assert.equal(updated.body.maximum_capacity, "5.56");
        assert.equal(updated.body.storage_location, "Updated Tank B");
        assert.equal(Date.parse(updated.body.updated_at) > Date.parse("2024-01-02T03:04:05.000Z"), true);
        assert.equal((await request("/chemical-storage/99999", "ADMIN", "PUT", {
          storage_location: "Missing Tank",
          quantity: 1,
          unit: "kg",
          maximum_capacity: null,
        })).status, 404);

        const negative = await request("/chemicals/4/storage", "ADMIN", "POST", {
          storage_location: "Invalid Tank",
          quantity: -1,
          unit: "kg",
        });
        assert.equal(negative.status, 400);
        const overCapacity = await request("/chemicals/4/storage", "ADMIN", "POST", {
          storage_location: "Invalid Tank",
          quantity: 5,
          unit: "kg",
          maximum_capacity: 4,
        });
        assert.equal(overCapacity.status, 400);
        assert.deepEqual(overCapacity.body, { message: "Maximum capacity cannot be less than quantity" });

        const beforeMissingParent = await db.collection("chemical_storage").countDocuments();
        const counterBeforeMissingParent = await db.collection<{ _id: string; sequence: number }>("id_counters")
          .findOne({ _id: "chemical_storage" });
        const missingParent = await silently(() => request("/chemicals/99999/storage", "ADMIN", "POST", {
          storage_location: "Orphan Tank",
          quantity: 1,
          unit: "kg",
        }));
        assert.equal(missingParent.status, 500);
        assert.equal(await db.collection("chemical_storage").countDocuments(), beforeMissingParent);
        const counterAfterMissingParent = await db.collection<{ _id: string; sequence: number }>("id_counters")
          .findOne({ _id: "chemical_storage" });
        assert.equal(counterAfterMissingParent?.sequence, counterBeforeMissingParent?.sequence);

        const restrictedDelete = await silently(() => request("/chemicals/4", "ADMIN", "DELETE"));
        assert.equal(restrictedDelete.status, 500);
        assert.equal(await db.collection("chemicals").countDocuments({ chemical_id: 4 }), 1);
        assert.equal(await db.collection("chemical_storage").countDocuments({ chemical_id: 4 }), 4);

        for (const storageId of [9, 8, 7, 3]) {
          const deleted = await request(`/chemical-storage/${storageId}`, "SAFETY_OFFICER", "DELETE");
          assert.equal(deleted.status, 204);
          assert.equal(deleted.body, undefined);
        }
        assert.equal((await request("/chemical-storage/99999", "ADMIN", "DELETE")).status, 404);

        const chemicalDeleted = await request("/chemicals/4", "SAFETY_OFFICER", "DELETE");
        assert.equal(chemicalDeleted.status, 200);
        assert.equal(chemicalDeleted.body.message, "Chemical deleted successfully");
        assert.equal(chemicalDeleted.body.chemical.chemical_id, 4);
        assert.equal((await request("/chemicals/4", "ADMIN")).status, 404);

        const unreferencedChemicalDeleted = await request(
          `/chemicals/${createdChemicalId}`,
          "ADMIN",
          "DELETE"
        );
        assert.equal(unreferencedChemicalDeleted.status, 200);
        assert.equal((await request(`/chemicals/${createdChemicalId}`, "ADMIN")).status, 404);
      });

      await t.test("service validation and concurrent storage/delete operations cannot create orphan references", async () => {
        const chemicalCount = await db.collection("chemicals").countDocuments();
        const storageCount = await db.collection("chemical_storage").countDocuments();
        await assert.rejects(
          createChemical({ chemical_name: "C".repeat(151) }),
          mongoose.Error.ValidationError
        );
        await assert.rejects(
          createStorage({
            chemical_id: 2,
            storage_location: "Negative Tank",
            quantity: -0.01,
            unit: "kg",
          }),
          /nonnegative/
        );
        await assert.rejects(
          createStorage({
            chemical_id: 2,
            storage_location: "Over Capacity Tank",
            quantity: 3,
            unit: "kg",
            maximum_capacity: 2,
          }),
          /less than quantity/
        );
        assert.equal(await db.collection("chemicals").countDocuments(), chemicalCount);
        assert.equal(await db.collection("chemical_storage").countDocuments(), storageCount);

        const race = await Promise.allSettled([
          createStorage({
            chemical_id: 2,
            storage_location: "Concurrent Tank",
            quantity: 1,
            unit: "kg",
            maximum_capacity: null,
          }),
          (async () => {
            const chemical = await import("./chemicalService.js");
            return chemical.deleteChemical(2);
          })(),
        ]);
        assert.equal(race.filter((result) => result.status === "fulfilled").length, 1);

        const parentExists = await db.collection("chemicals").countDocuments({ chemical_id: 2 }) === 1;
        const remainingReferences = await db.collection("chemical_storage").countDocuments({ chemical_id: 2 });
        assert.equal(parentExists || remainingReferences === 0, true);
        assert.equal(
          await db.collection<{ _id: string; sequence: number }>("id_counters")
            .countDocuments({ _id: "safety_alerts" }),
          0
        );
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
