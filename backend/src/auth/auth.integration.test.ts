import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import express from "express";
import type { Server } from "node:http";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import test from "node:test";
import { env } from "../config/env.js";
import Role from "../models/role.js";
import User from "../models/user.js";
import { authenticate, authorize } from "../middleware/auth.js";
import authRoutes from "../routes/authRoutes.js";

const testUri = process.env.MONGODB_TEST_URI;
const disposablePrefix = "chemical_safety_stage3a_test_";
const activePassword = "stage3a-test-password";
const activeEmail = "stage3a.active@example.invalid";
const inactiveEmail = "stage3a.inactive@example.invalid";

const loginRequest = (baseUrl: string, email: string, password: string) =>
  fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

test(
  "MongoDB authentication preserves login, roles, cookies, CSRF, and public responses",
  { skip: !testUri && "Set MONGODB_TEST_URI to a new loopback disposable test database" },
  async (t) => {
    const uri = new URL(testUri as string);
    const databaseName = decodeURIComponent(uri.pathname.replace(/^\//, ""));
    const hostname = uri.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    assert.ok(["127.0.0.1", "localhost", "::1"].includes(hostname), "test MongoDB must be loopback");
    assert.match(databaseName, /^chemical_safety_stage3a_test_[a-z0-9_]+$/);

    let ownsDatabase = false;
    let server: Server | undefined;
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
      await db.collection<{ _id: string; owner: string }>("stage3a_test_guard").insertOne({
        _id: `${databaseName}:${process.pid}`,
        owner: "stage3a-auth-integration-test",
      });
      ownsDatabase = true;

      const activeHash = await bcrypt.hash(activePassword, 4);
      const inactiveHash = await bcrypt.hash("stage3a-inactive-password", 4);
      await Role.create([
        { role_id: 1, role_name: "ADMIN", description: null },
        { role_id: 2, role_name: "SAFETY_OFFICER", description: null },
      ]);
      await User.create([
        {
          user_id: 101,
          role_id: 2,
          full_name: "Stage 3A Active User",
          email: activeEmail,
          password_hash: activeHash,
          is_active: true,
        },
        {
          user_id: 102,
          role_id: 1,
          full_name: "Stage 3A Inactive User",
          email: inactiveEmail,
          password_hash: inactiveHash,
          is_active: false,
        },
      ]);

      const app = express();
      app.use(express.json());
      app.use("/api/auth", authRoutes);
      app.get("/test/safety", authenticate, authorize("SAFETY_OFFICER"), (_req, res) => {
        res.status(200).json({ success: true });
      });
      app.get("/test/admin", authenticate, authorize("ADMIN"), (_req, res) => {
        res.status(200).json({ success: true });
      });
      server = await new Promise<Server>((resolve, reject) => {
        const candidate = app.listen(0, "127.0.0.1", () => resolve(candidate));
        candidate.once("error", reject);
      });
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const baseUrl = `http://127.0.0.1:${address.port}`;

      await t.test("successful login resolves the role and preserves the response and cookies", async () => {
        const response = await loginRequest(baseUrl, activeEmail.toUpperCase(), activePassword);
        assert.equal(response.status, 200);
        const body = await response.json() as Record<string, any>;
        const expectedUser = {
          userId: 101,
          fullName: "Stage 3A Active User",
          email: activeEmail,
          roleName: "SAFETY_OFFICER",
        };
        assert.deepEqual(body, { success: true, user: expectedUser });
        assert.equal(JSON.stringify(body).includes("password_hash"), false);
        assert.equal(JSON.stringify(body).includes(activeHash), false);

        const cookies = response.headers.getSetCookie();
        assert.equal(cookies.length, 2);
        const authCookie = cookies.find((cookie) => cookie.startsWith(`${env.auth.cookieName}=`));
        const csrfCookie = cookies.find((cookie) => cookie.startsWith(`${env.auth.csrfCookieName}=`));
        assert.ok(authCookie);
        assert.ok(csrfCookie);

        const secure = process.env.NODE_ENV === "production";
        const sameSite = secure ? "Strict" : "Lax";
        assert.match(authCookie, /Max-Age=28800/);
        assert.match(authCookie, /Path=\//);
        assert.match(authCookie, /HttpOnly/);
        assert.match(authCookie, new RegExp(`SameSite=${sameSite}`));
        assert.equal(/; Secure(?:;|$)/.test(authCookie), secure);
        assert.match(csrfCookie, /Max-Age=28800/);
        assert.match(csrfCookie, /Path=\//);
        assert.doesNotMatch(csrfCookie, /HttpOnly/);
        assert.match(csrfCookie, new RegExp(`SameSite=${sameSite}`));
        assert.equal(/; Secure(?:;|$)/.test(csrfCookie), secure);

        const authPair = authCookie.split(";", 1)[0];
        const csrfPair = csrfCookie.split(";", 1)[0];
        const token = decodeURIComponent(authPair.slice(env.auth.cookieName.length + 1));
        const claims = jwt.verify(token, env.auth.jwtSecret) as JwtPayload;
        assert.equal(claims.sub, "101");
        assert.equal(claims.fullName, expectedUser.fullName);
        assert.equal(claims.email, activeEmail);
        assert.equal(claims.roleName, "SAFETY_OFFICER");
        assert.ok(typeof claims.exp === "number" && typeof claims.iat === "number" && claims.exp > claims.iat);

        const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Cookie: `${authPair}; ${csrfPair}` },
        });
        assert.equal(meResponse.status, 200);
        const meBody = await meResponse.json() as Record<string, any>;
        assert.deepEqual(meBody, { success: true, user: expectedUser });
        assert.equal(JSON.stringify(meBody).includes("password_hash"), false);

        const defaultUser = await User.findOne({ user_id: 101 }).lean().exec();
        assert.ok(defaultUser);
        assert.equal(Object.hasOwn(defaultUser, "password_hash"), false);
      });

      await t.test("incorrect password is rejected with the generic login response", async () => {
        const response = await loginRequest(baseUrl, activeEmail, "incorrect-password");
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
          success: false,
          message: "Invalid email or password",
        });
      });

      await t.test("inactive users cannot log in", async () => {
        const response = await loginRequest(baseUrl, inactiveEmail, "stage3a-inactive-password");
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
          success: false,
          message: "Invalid email or password",
        });
      });

      await t.test("missing users cannot log in", async () => {
        const response = await loginRequest(baseUrl, "missing@example.invalid", activePassword);
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
          success: false,
          message: "Invalid email or password",
        });
      });

      await t.test("existing role permissions remain attached to the resolved role", async () => {
        const response = await loginRequest(baseUrl, activeEmail, activePassword);
        const authCookie = response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${env.auth.cookieName}=`));
        assert.ok(authCookie);
        const authPair = authCookie.split(";", 1)[0];

        const allowed = await fetch(`${baseUrl}/test/safety`, { headers: { Cookie: authPair } });
        assert.equal(allowed.status, 200);
        assert.deepEqual(await allowed.json(), { success: true });

        const forbidden = await fetch(`${baseUrl}/test/admin`, { headers: { Cookie: authPair } });
        assert.equal(forbidden.status, 403);
        assert.deepEqual(await forbidden.json(), { success: false, message: "Forbidden" });
      });

      await t.test("logout retains CSRF validation and clears both cookies", async () => {
        const response = await loginRequest(baseUrl, activeEmail, activePassword);
        const cookies = response.headers.getSetCookie();
        const authCookie = cookies.find((cookie) => cookie.startsWith(`${env.auth.cookieName}=`));
        const csrfCookie = cookies.find((cookie) => cookie.startsWith(`${env.auth.csrfCookieName}=`));
        assert.ok(authCookie);
        assert.ok(csrfCookie);
        const authPair = authCookie.split(";", 1)[0];
        const csrfPair = csrfCookie.split(";", 1)[0];
        const csrfValue = decodeURIComponent(csrfPair.slice(env.auth.csrfCookieName.length + 1));

        const rejected = await fetch(`${baseUrl}/api/auth/logout`, {
          method: "POST",
          headers: { Cookie: `${authPair}; ${csrfPair}`, "X-CSRF-Token": "wrong-token" },
        });
        assert.equal(rejected.status, 403);
        assert.deepEqual(await rejected.json(), { success: false, message: "Invalid CSRF token" });

        const loggedOut = await fetch(`${baseUrl}/api/auth/logout`, {
          method: "POST",
          headers: { Cookie: `${authPair}; ${csrfPair}`, "X-CSRF-Token": csrfValue },
        });
        assert.equal(loggedOut.status, 204);
        const clearedCookies = loggedOut.headers.getSetCookie();
        assert.ok(clearedCookies.some((cookie) => cookie.startsWith(`${env.auth.cookieName}=; Max-Age=0`)));
        assert.ok(clearedCookies.some((cookie) => cookie.startsWith(`${env.auth.csrfCookieName}=; Max-Age=0`)));
      });

      await t.test("authentication rechecks active status on each request", async () => {
        const response = await loginRequest(baseUrl, activeEmail, activePassword);
        const authCookie = response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${env.auth.cookieName}=`));
        assert.ok(authCookie);
        const authPair = authCookie.split(";", 1)[0];
        await User.updateOne({ user_id: 101 }, { $set: { is_active: false } });

        const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Cookie: authPair },
        });
        assert.equal(meResponse.status, 401);
        assert.deepEqual(await meResponse.json(), {
          success: false,
          message: "Authentication required",
        });
      });
    } finally {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server?.close((error) => error ? reject(error) : resolve());
        });
      }
      if (ownsDatabase && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  }
);
