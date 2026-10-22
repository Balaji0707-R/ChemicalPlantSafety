import assert from "node:assert/strict";
import mongoose from "mongoose";
import test from "node:test";
import { getNextId } from "./counter.js";

const disposablePrefix = "chemical_safety_stage2c_test_";
const testUri = process.env.MONGODB_TEST_URI;

test(
  "ID allocation handles missing, stale, ahead, invalid, exhausted, and concurrent counters",
  { skip: !testUri && "Set MONGODB_TEST_URI to a new loopback disposable test database" },
  async () => {
    const uri = new URL(testUri as string);
    const databaseName = decodeURIComponent(uri.pathname.replace(/^\//, ""));
    const hostname = uri.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    assert.ok(["127.0.0.1", "localhost", "::1"].includes(hostname), "test MongoDB must be loopback");
    assert.match(databaseName, /^chemical_safety_stage2c_test_[a-z0-9_]+$/);

    let ownsDatabase = false;
    try {
      await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 5000 });
      const db = mongoose.connection.db;
      assert.ok(db, "MongoDB connection did not provide a database handle");

      const listed = await db.admin().listDatabases({ nameOnly: true });
      assert.equal(
        listed.databases.some((entry) => entry.name === databaseName),
        false,
        "refusing to write to a database that already exists"
      );

      const markerId = `${databaseName}:${process.pid}`;
      await db.collection<{ _id: string; owner: string }>("stage2c_test_guard").insertOne({
        _id: markerId,
        owner: "stage2c-counter-integration-test",
      });
      ownsDatabase = true;

      await db.collection("chemicals").insertOne({ chemical_id: 9 });
      await db.collection<{ _id: string; sequence: number }>("id_counters").insertOne({ _id: "chemicals", sequence: 2 });
      assert.equal(await getNextId("chemicals"), 10, "a stale counter must advance past stored IDs");

      await db.collection("roles").insertOne({ role_id: 5 });
      await db.collection<{ _id: string; sequence: number }>("id_counters").insertOne({ _id: "roles", sequence: 8 });
      assert.equal(await getNextId("roles"), 9, "an ahead counter must retain its sequence");

      const allocations = await Promise.all(
        Array.from({ length: 32 }, () => getNextId("incident_actions"))
      );
      assert.equal(new Set(allocations).size, 32, "concurrent allocations must be unique");
      assert.deepEqual([...allocations].sort((a, b) => a - b), Array.from({ length: 32 }, (_, i) => i + 1));

      for (const invalidName of ["toString", "constructor", "__proto__", "unknown"]) {
        await assert.rejects(getNextId(invalidName), /Unsupported ID counter/);
      }

      await db.collection<{ _id: string; sequence: number }>("id_counters").insertOne({
        _id: "process_readings",
        sequence: 2_147_483_647,
      });
      await assert.rejects(getNextId("process_readings"), /sequence is exhausted/);
    } finally {
      if (ownsDatabase && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  }
);
