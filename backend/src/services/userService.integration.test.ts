import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { getAllUsers } from "./userService.js";

const TEST_DATABASE_PREFIX = "chemical_safety_stage3b1_test_";
const PASSWORD_HASH_SENTINEL = "stage3b1_private_hash_marker";

const parseDisposableTestUri = (uri: string): { hostname: string; databaseName: string } => {
  const parsed = new URL(uri);
  const hostname = parsed.hostname.toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("User service integration tests require a loopback MongoDB URI");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const allowedName = new RegExp(`^${TEST_DATABASE_PREFIX}[a-z0-9_]+$`);
  if (!allowedName.test(databaseName)) {
    throw new Error("User service integration tests require a uniquely named Stage 3B.1 test database");
  }

  return { hostname, databaseName };
};

test(
  "getAllUsers returns active users as the password-safe directory DTO",
  { skip: !process.env.MONGODB_TEST_URI },
  async (t) => {
    const uri = process.env.MONGODB_TEST_URI;
    assert.ok(uri, "MONGODB_TEST_URI must point to a disposable local MongoDB database");
    const { databaseName } = parseDisposableTestUri(uri);
    let ownsDisposableDatabase = false;

    try {
      await mongoose.connect(uri, {
        autoIndex: false,
        serverSelectionTimeoutMS: 5_000,
      });

      const database = mongoose.connection.db;
      assert.ok(database, "MongoDB connection did not select a database");

      const listedDatabases = await database.admin().listDatabases({ nameOnly: true });
      const alreadyExists = listedDatabases.databases?.some(({ name }) => name === databaseName);
      assert.equal(alreadyExists, false, "Refusing to use an existing test database");
      ownsDisposableDatabase = true;

      await database.collection("users").insertMany([
        {
          user_id: 51,
          role_id: 2,
          full_name: "Zoe Stage3B1",
          email: "zoe.stage3b1@example.invalid",
          password_hash: PASSWORD_HASH_SENTINEL,
          is_active: true,
          __v: 7,
          private_note: "must not be serialized",
        },
        {
          user_id: 52,
          role_id: 1,
          full_name: "Alice Stage3B1",
          email: "alice.stage3b1@example.invalid",
          password_hash: PASSWORD_HASH_SENTINEL,
          is_active: true,
          __v: 8,
          private_note: "must not be serialized",
        },
        {
          user_id: 53,
          role_id: 3,
          full_name: "Aaron Inactive Stage3B1",
          email: "inactive.stage3b1@example.invalid",
          password_hash: PASSWORD_HASH_SENTINEL,
          is_active: false,
        },
      ]);

      const users = await getAllUsers();

      await t.test("filters inactive users and sorts active users by full_name ascending", () => {
        assert.deepEqual(users.map(({ user_id }) => user_id), [52, 51]);
        assert.deepEqual(users.map(({ full_name }) => full_name), ["Alice Stage3B1", "Zoe Stage3B1"]);
      });

      await t.test("returns exactly the existing user-directory fields", () => {
        const expectedKeys = ["email", "full_name", "is_active", "role_id", "user_id"];
        for (const user of users) {
          assert.deepEqual(Object.keys(user).sort(), expectedKeys);
        }
      });

      await t.test("never returns password hashes or MongoDB/internal fields", () => {
        assert.equal(JSON.stringify(users).includes(PASSWORD_HASH_SENTINEL), false);
        for (const user of users) {
          assert.equal(Object.hasOwn(user, "password_hash"), false);
          assert.equal(Object.hasOwn(user, "_id"), false);
          assert.equal(Object.hasOwn(user, "__v"), false);
          assert.equal(Object.hasOwn(user, "private_note"), false);
        }
      });
    } finally {
      if (ownsDisposableDatabase) {
        await mongoose.connection.dropDatabase();
      }
      await mongoose.disconnect();
    }
  }
);
