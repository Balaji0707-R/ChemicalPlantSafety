import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { createAuthToken, verifyAuthToken, verifyPassword } from "./authService.js";

test("password verification accepts bcrypt and rejects the legacy placeholder format", async () => {
  const hash = await bcrypt.hash("correct horse battery staple", 4);
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
  assert.equal(await verifyPassword("anything", "DEV_PLACEHOLDER"), false);
});

test("authentication tokens round-trip and expired tokens are rejected", () => {
  const user = {
    userId: 1,
    fullName: "Safety Officer",
    email: "safety.officer@chemsafe.local",
    roleName: "SAFETY_OFFICER" as const,
  };

  const token = createAuthToken(user);
  assert.deepEqual(verifyAuthToken(token), user);

  const expired = jwt.sign(user, env.auth.jwtSecret, { expiresIn: -1 });
  assert.equal(verifyAuthToken(expired), null);
});
