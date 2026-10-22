import assert from "node:assert/strict";
import type { AddressInfo, Server } from "node:net";
import express from "express";
import mongoose from "mongoose";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import {
  createEmergencyContact,
  createEmergencyProcedure,
} from "./emergencyService.js";

const TEST_DATABASE_PREFIX = "chemical_safety_stage3b2_test_";
const TEST_JWT_SECRET = "stage3b2-disposable-test-secret";
const TEST_AUTH_COOKIE = "stage3b2_test_session";
const TEST_CSRF_TOKEN = "stage3b2-disposable-csrf";
const TEST_CSRF_COOKIE = "chem_safe_csrf";

interface ApiResponse {
  status: number;
  body: any;
}

const parseDisposableTestUri = (uri: string): { databaseName: string } => {
  const parsed = new URL(uri);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(hostname), "test MongoDB must be loopback");

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  assert.match(
    databaseName,
    new RegExp(`^${TEST_DATABASE_PREFIX}[a-z0-9_]+$`),
    "test database must have a unique Stage 3B.2 name"
  );
  return { databaseName };
};

const makeToken = (userId: number, roleName: string): string =>
  jwt.sign(
    {
      sub: String(userId),
      fullName: `Stage 3B.2 ${roleName}`,
      email: `${roleName.toLowerCase()}.stage3b2@example.invalid`,
      roleName,
    },
    TEST_JWT_SECRET,
    { expiresIn: "5m" }
  );

const expectedContactFields = [
  "contact_id",
  "contact_name",
  "contact_type",
  "email",
  "is_active",
  "organization",
  "phone",
];

const expectedProcedureFields = [
  "created_at",
  "emergency_type",
  "evacuation_area",
  "instructions",
  "procedure_id",
  "procedure_name",
];

test(
  "emergency contact and procedure routes use MongoDB CRUD and preserve their API contracts",
  { skip: !process.env.MONGODB_TEST_URI && "Set MONGODB_TEST_URI to a new loopback disposable test database" },
  async (t) => {
    const uri = process.env.MONGODB_TEST_URI;
    assert.ok(uri, "MONGODB_TEST_URI must point to a disposable local MongoDB database");
    const { databaseName } = parseDisposableTestUri(uri);
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

      const procedureCreatedAt = new Date("2025-04-03T12:34:56.000Z");
      await db.collection("emergency_contacts").insertMany([
        {
          contact_id: 9,
          contact_name: "Zulu Test Contact",
          organization: "Test Plant",
          contact_type: "Medical",
          phone: "+1-555-0109",
          email: "zulu@example.invalid",
          is_active: true,
        },
        {
          contact_id: 3,
          contact_name: "Alpha Test Contact",
          organization: null,
          contact_type: null,
          phone: "+1-555-0103",
          email: null,
          is_active: true,
        },
      ]);
      await db.collection("emergency_procedures").insertOne({
        procedure_id: 6,
        procedure_name: "Existing Test Procedure",
        emergency_type: "Spill",
        instructions: "Use the test response protocol.",
        evacuation_area: null,
        created_at: procedureCreatedAt,
      });
      await db.collection<{ _id: string; sequence: number }>("id_counters").insertMany([
        { _id: "emergency_contacts", sequence: 4 },
        { _id: "emergency_procedures", sequence: 2 },
      ]);
      await db.collection("roles").insertMany([
        { role_id: 1, role_name: "ADMIN" },
        { role_id: 2, role_name: "PLANT_MANAGER" },
        { role_id: 3, role_name: "SAFETY_OFFICER" },
      ]);
      await db.collection("users").insertMany([
        {
          user_id: 101,
          role_id: 1,
          full_name: "Stage 3B.2 Admin",
          email: "admin.stage3b2@example.invalid",
          is_active: true,
        },
        {
          user_id: 102,
          role_id: 2,
          full_name: "Stage 3B.2 Plant Manager",
          email: "manager.stage3b2@example.invalid",
          is_active: true,
        },
        {
          user_id: 103,
          role_id: 3,
          full_name: "Stage 3B.2 Safety Officer",
          email: "officer.stage3b2@example.invalid",
          is_active: true,
        },
      ]);

      // The isolated route harness uses the real auth and role middleware with test-only credentials.
      Object.assign(process.env, {
        DB_HOST: "127.0.0.1",
        DB_NAME: "stage3b2_test_only",
        DB_USER: "stage3b2_test_only",
        DB_PASSWORD: "stage3b2_test_only",
        AUTH_JWT_SECRET: TEST_JWT_SECRET,
        AUTH_COOKIE_NAME: TEST_AUTH_COOKIE,
      });
      const { authenticate, requireCsrf } = await import("../middleware/auth.js");
      const emergencyRoutes = (await import("../routes/emergencyRoutes.js")).default as unknown as express.Router;

      const app = express();
      app.use(express.json());
      app.use(authenticate, requireCsrf);
      app.use("/emergency", emergencyRoutes);

      server = app.listen(0, "127.0.0.1");
      await new Promise<void>((resolve, reject) => {
        server?.once("listening", resolve);
        server?.once("error", reject);
      });
      const address = server.address() as AddressInfo | null;
      assert.ok(address && typeof address !== "string", "test HTTP server did not bind to a port");
      const baseUrl = `http://127.0.0.1:${address.port}/emergency`;

      const request = async (
        path: string,
        roleName: string,
        method = "GET",
        body?: unknown
      ): Promise<ApiResponse> => {
        const userId = roleName === "ADMIN" ? 101 : roleName === "PLANT_MANAGER" ? 102 : 103;
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
        return {
          status: response.status,
          body: text ? JSON.parse(text) : undefined,
        };
      };

      await t.test("only ADMIN and PLANT_MANAGER can create emergency records", async () => {
        const beforeContacts = await db.collection("emergency_contacts").countDocuments();
        const beforeProcedures = await db.collection("emergency_procedures").countDocuments();
        const contactAttempt = await request("/contacts", "SAFETY_OFFICER", "POST", {
          contact_name: "Unauthorized Test Contact",
          phone: "+1-555-0190",
        });
        const contactUpdateAttempt = await request("/contacts/3", "SAFETY_OFFICER", "PUT", {
          contact_name: "Unauthorized Contact Update",
          phone: "+1-555-0191",
        });
        const contactDeleteAttempt = await request("/contacts/3", "SAFETY_OFFICER", "DELETE");
        const procedureAttempt = await request("/procedures", "SAFETY_OFFICER", "POST", {
          procedure_name: "Unauthorized Test Procedure",
          emergency_type: "Spill",
          instructions: "Must not be saved.",
        });
        const procedureUpdateAttempt = await request("/procedures/6", "SAFETY_OFFICER", "PUT", {
          procedure_name: "Unauthorized Procedure Update",
          emergency_type: "Spill",
          instructions: "Must not be saved.",
        });
        const procedureDeleteAttempt = await request("/procedures/6", "SAFETY_OFFICER", "DELETE");

        assert.equal(contactAttempt.status, 403);
        assert.deepEqual(contactAttempt.body, { success: false, message: "Forbidden" });
        assert.equal(contactUpdateAttempt.status, 403);
        assert.equal(contactDeleteAttempt.status, 403);
        assert.equal(procedureAttempt.status, 403);
        assert.deepEqual(procedureAttempt.body, { success: false, message: "Forbidden" });
        assert.equal(procedureUpdateAttempt.status, 403);
        assert.equal(procedureDeleteAttempt.status, 403);
        assert.equal(await db.collection("emergency_contacts").countDocuments(), beforeContacts);
        assert.equal(await db.collection("emergency_procedures").countDocuments(), beforeProcedures);
        assert.equal((await db.collection("emergency_contacts").findOne({ contact_id: 3 }))?.contact_name, "Alpha Test Contact");
        assert.equal((await db.collection("emergency_procedures").findOne({ procedure_id: 6 }))?.procedure_name, "Existing Test Procedure");
      });

      let createdContact: any;
      await t.test("contacts retain sorting, null/default values, CRUD responses, and numeric IDs", async () => {
        const initial = await request("/contacts", "ADMIN");
        assert.equal(initial.status, 200);
        assert.deepEqual(initial.body.map((contact: any) => contact.contact_id), [3, 9]);
        assert.deepEqual(Object.keys(initial.body[0]).sort(), expectedContactFields);

        const created = await request("/contacts", "ADMIN", "POST", {
          contact_name: "Created Test Contact",
          phone: "+1-555-0110",
        });
        assert.equal(created.status, 201);
        createdContact = created.body;
        assert.equal(createdContact.contact_id, 10);
        assert.equal(typeof createdContact.contact_id, "number");
        assert.equal(createdContact.organization, null);
        assert.equal(createdContact.contact_type, null);
        assert.equal(createdContact.email, null);
        assert.equal(createdContact.is_active, true);
        assert.deepEqual(Object.keys(createdContact).sort(), expectedContactFields);

        const listed = await request("/contacts", "PLANT_MANAGER");
        assert.equal(listed.status, 200);
        assert.deepEqual(listed.body.map((contact: any) => contact.contact_id), [3, 9, 10]);
        assert.deepEqual(Object.keys(listed.body[2]).sort(), expectedContactFields);

        const found = await request(`/contacts/${createdContact.contact_id}`, "ADMIN");
        assert.equal(found.status, 200);
        assert.equal(found.body.contact_id, createdContact.contact_id);
        assert.deepEqual(Object.keys(found.body).sort(), expectedContactFields);
        assert.equal((await request("/contacts/99999", "ADMIN")).status, 404);

        const updated = await request(
          `/contacts/${createdContact.contact_id}`,
          "PLANT_MANAGER",
          "PUT",
          {
            contact_name: "Updated Test Contact",
            phone: "+1-555-0111",
            is_active: false,
          }
        );
        assert.equal(updated.status, 200);
        assert.equal(updated.body.contact_name, "Updated Test Contact");
        assert.equal(updated.body.organization, null);
        assert.equal(updated.body.contact_type, null);
        assert.equal(updated.body.email, null);
        assert.equal(updated.body.is_active, false);
        assert.deepEqual(Object.keys(updated.body).sort(), expectedContactFields);
        assert.equal((await request("/contacts/99999", "ADMIN", "PUT", {
          contact_name: "Missing Test Contact",
          phone: "+1-555-0199",
        })).status, 404);

        const deleted = await request(
          `/contacts/${createdContact.contact_id}`,
          "ADMIN",
          "DELETE"
        );
        assert.equal(deleted.status, 200);
        assert.deepEqual(Object.keys(deleted.body).sort(), ["contact", "message"]);
        assert.equal(deleted.body.message, "Emergency contact deleted successfully");
        assert.equal(deleted.body.contact.contact_id, createdContact.contact_id);
        assert.equal((await request(`/contacts/${createdContact.contact_id}`, "ADMIN")).status, 404);
        assert.equal((await request("/contacts/99999", "ADMIN", "DELETE")).status, 404);
      });

      await t.test("procedures retain sorting, null/default values, CRUD responses, and numeric IDs", async () => {
        const initial = await request("/procedures", "ADMIN");
        assert.equal(initial.status, 200);
        assert.deepEqual(initial.body.map((procedure: any) => procedure.procedure_id), [6]);
        assert.deepEqual(Object.keys(initial.body[0]).sort(), expectedProcedureFields);

        const created = await request("/procedures", "PLANT_MANAGER", "POST", {
          procedure_name: "Created Test Procedure",
          emergency_type: "Spill",
          instructions: "Follow the test response steps.",
        });
        assert.equal(created.status, 201);
        const procedureId = created.body.procedure_id;
        const createdAt = created.body.created_at;
        assert.equal(procedureId, 7);
        assert.equal(typeof procedureId, "number");
        assert.equal(created.body.evacuation_area, null);
        assert.equal(Number.isNaN(Date.parse(createdAt)), false);
        assert.deepEqual(Object.keys(created.body).sort(), expectedProcedureFields);

        const listed = await request("/procedures", "ADMIN");
        assert.equal(listed.status, 200);
        assert.deepEqual(listed.body.map((procedure: any) => procedure.procedure_id), [6, 7]);
        assert.deepEqual(Object.keys(listed.body[1]).sort(), expectedProcedureFields);

        const found = await request(`/procedures/${procedureId}`, "PLANT_MANAGER");
        assert.equal(found.status, 200);
        assert.equal(found.body.procedure_id, procedureId);
        assert.equal((await request("/procedures/99999", "ADMIN")).status, 404);

        const updated = await request(`/procedures/${procedureId}`, "ADMIN", "PUT", {
          procedure_name: "Updated Test Procedure",
          emergency_type: "Leak",
          instructions: "Use the updated test response steps.",
        });
        assert.equal(updated.status, 200);
        assert.equal(updated.body.procedure_name, "Updated Test Procedure");
        assert.equal(updated.body.evacuation_area, null);
        assert.equal(updated.body.created_at, createdAt);
        assert.deepEqual(Object.keys(updated.body).sort(), expectedProcedureFields);
        assert.equal((await request("/procedures/99999", "ADMIN", "PUT", {
          procedure_name: "Missing Test Procedure",
          emergency_type: "Leak",
          instructions: "This should not create a procedure.",
        })).status, 404);

        const deleted = await request(`/procedures/${procedureId}`, "PLANT_MANAGER", "DELETE");
        assert.equal(deleted.status, 200);
        assert.deepEqual(Object.keys(deleted.body).sort(), ["message", "procedure"]);
        assert.equal(deleted.body.message, "Emergency procedure deleted successfully");
        assert.equal(deleted.body.procedure.procedure_id, procedureId);
        assert.equal((await request(`/procedures/${procedureId}`, "ADMIN")).status, 404);
        assert.equal((await request("/procedures/99999", "ADMIN", "DELETE")).status, 404);
      });

      await t.test("controller and model validations reject invalid data without saving records", async () => {
        const beforeContactCount = await db.collection("emergency_contacts").countDocuments();
        const beforeProcedureCount = await db.collection("emergency_procedures").countDocuments();
        const invalidContact = await request("/contacts", "ADMIN", "POST", {
          phone: "+1-555-0198",
        });
        const invalidProcedure = await request("/procedures", "ADMIN", "POST", {
          procedure_name: "Incomplete Test Procedure",
          emergency_type: "Spill",
        });
        assert.equal(invalidContact.status, 400);
        assert.deepEqual(invalidContact.body, { message: "Contact name is required" });
        assert.equal(invalidProcedure.status, 400);
        assert.deepEqual(invalidProcedure.body, { message: "Instructions are required" });

        await assert.rejects(
          createEmergencyContact({
            contact_name: "C".repeat(101),
            phone: "+1-555-0197",
          }),
          mongoose.Error.ValidationError
        );
        await assert.rejects(
          createEmergencyProcedure({
            procedure_name: "P".repeat(151),
            emergency_type: "Spill",
            instructions: "Invalid overlength test procedure.",
          }),
          mongoose.Error.ValidationError
        );
        assert.equal(await db.collection("emergency_contacts").countDocuments(), beforeContactCount);
        assert.equal(await db.collection("emergency_procedures").countDocuments(), beforeProcedureCount);
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
