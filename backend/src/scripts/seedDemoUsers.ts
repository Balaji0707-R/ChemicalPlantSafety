import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { authenticateUser, createAuthToken, verifyAuthToken } from "../auth/authService.js";
import type { RoleName } from "../auth/authTypes.js";
import { env } from "../config/env.js";
import Role from "../models/role.js";
import User from "../models/user.js";
import { getNextId } from "../models/counter.js";

interface DemoAccountSpec {
  role_id: number;
  role_name: RoleName;
  full_name: string;
  email: string;
}

interface ExistingUser {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

interface NewCredential {
  user_id: number;
  full_name: string;
  email: string;
  role_name: RoleName;
  password: string;
  verified: boolean;
}

class SeedError extends Error {}

const demoAccounts: readonly DemoAccountSpec[] = [
  {
    role_id: 1,
    role_name: "ADMIN",
    full_name: "Demo Administrator",
    email: "admin@chemsafe.local",
  },
  {
    role_id: 3,
    role_name: "PLANT_MANAGER",
    full_name: "Demo Plant Manager",
    email: "plant.manager@chemsafe.local",
  },
  {
    role_id: 4,
    role_name: "EMPLOYEE",
    full_name: "Demo Employee",
    email: "employee@chemsafe.local",
  },
  {
    role_id: 5,
    role_name: "COMPLIANCE_OFFICER",
    full_name: "Demo Compliance Officer",
    email: "compliance.officer@chemsafe.local",
  },
];


const assertSafeTarget = (uri: string): void => {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new SeedError("MONGODB_URI is not a valid MongoDB URL.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (
    parsed.protocol !== "mongodb:" ||
    databaseName !== "chemical_safety_db" ||
    !localHosts.has(parsed.hostname.toLowerCase())
  ) {
    throw new SeedError(
      "Refusing to seed: MONGODB_URI must target chemical_safety_db on this machine."
    );
  }
};

const findUserByEmail = async (email: string): Promise<ExistingUser | null> =>
  User.findOne({
    email: new RegExp(`^${email}$`, "i"),
  })
    .select("user_id role_id full_name email is_active")
    .lean<ExistingUser>()
    .exec();

const hasExpectedRoleAndActiveStatus = (
  user: ExistingUser,
  account: DemoAccountSpec
): boolean => user.role_id === account.role_id && user.is_active;

const verifyCredentialsAndJwt = async (
  account: DemoAccountSpec,
  userId: number,
  password: string
): Promise<boolean> => {
  try {
    const authenticated = await authenticateUser(account.email, password);
    if (
      !authenticated ||
      authenticated.userId !== userId ||
      authenticated.roleName !== account.role_name
    ) {
      return false;
    }

    const token = createAuthToken(authenticated);
    const claims = verifyAuthToken(token);
    return Boolean(
      claims &&
        claims.userId === userId &&
        claims.email === account.email &&
        claims.roleName === account.role_name
    );
  } catch {
    return false;
  }
};

const samePublicUser = (
  left: ExistingUser | null,
  right: ExistingUser | null
): boolean =>
  Boolean(
    left &&
      right &&
      left.user_id === right.user_id &&
      left.role_id === right.role_id &&
      left.full_name === right.full_name &&
      left.email === right.email &&
      left.is_active === right.is_active
  );

const printReport = (
  created: readonly NewCredential[],
  skipped: readonly string[]
): void => {
  console.log("Demo-user seed result:");
  console.log(`Created: ${created.length}; skipped existing: ${skipped.length}`);

  for (const email of skipped) {
    console.log(`Skipped existing account: ${email}`);
  }

  if (created.length === 0) {
    console.log("No new demo passwords were generated.");
    return;
  }

  console.log("Temporary credentials (shown once; store them securely):");
  for (const account of created) {
    console.log(
      `${account.role_name} | ${account.email} | ${account.password} | login/JWT verification: ${account.verified ? "PASS" : "FAIL"}`
    );
  }
}

const run = async (): Promise<void> => {
  const created: NewCredential[] = [];
  const skipped: string[] = [];
  let failure: string | null = null;

  try {
    assertSafeTarget(env.mongodbUri);
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10_000 });

    const connectedDatabaseName = mongoose.connection.db?.databaseName;
    if (connectedDatabaseName !== "chemical_safety_db") {
      throw new SeedError("Connected database check failed; no users were seeded.");
    }

    for (const account of demoAccounts) {
      const role = await Role.findOne({ role_id: account.role_id })
        .select("role_id role_name")
        .lean<{ role_id: number; role_name: string }>()
        .exec();
      if (!role || role.role_name !== account.role_name) {
        throw new SeedError(
          `Expected role mapping ${account.role_id} -> ${account.role_name} was not found; no users were seeded.`
        );
      }
    }

    const safetyOfficer = await findUserByEmail("safety.officer@chemsafe.local");
    if (
      !safetyOfficer ||
      safetyOfficer.role_id !== 2 ||
      !safetyOfficer.is_active
    ) {
      throw new SeedError(
        "The existing active Safety Officer account did not match the expected role; no users were seeded."
      );
    }
    const safetyOfficerBefore = { ...safetyOfficer };

    const existingByEmail = new Map<string, ExistingUser>();
    for (const account of demoAccounts) {
      const existing = await findUserByEmail(account.email);
      if (existing) {
        if (!hasExpectedRoleAndActiveStatus(existing, account)) {
          throw new SeedError(
            `An existing account at ${account.email} has a different role or is inactive; it was left unchanged.`
          );
        }
        existingByEmail.set(account.email, existing);
      }
    }

    for (const account of demoAccounts) {
      if (existingByEmail.has(account.email)) {
        skipped.push(account.email);
        continue;
      }

      const password = randomBytes(18).toString("base64url");
      const password_hash = await bcrypt.hash(password, 12);
      const user_id = await getNextId("users");
      let createdByThisRun = false;

      try {
        await User.create({
          user_id,
          role_id: account.role_id,
          full_name: account.full_name,
          email: account.email,
          password_hash,
          is_active: true,
        });
        createdByThisRun = true;
      } catch {
        // A concurrent seed may have inserted this email after the preflight.
        // Never update that account; only accept it if our generated password authenticates.
        const racedUser = await findUserByEmail(account.email);
        if (
          racedUser &&
          hasExpectedRoleAndActiveStatus(racedUser, account) &&
          (await verifyCredentialsAndJwt(account, racedUser.user_id, password))
        ) {
          created.push({
            user_id: racedUser.user_id,
            full_name: account.full_name,
            email: account.email,
            role_name: account.role_name,
            password,
            verified: true,
          });
          continue;
        }

        if (racedUser && hasExpectedRoleAndActiveStatus(racedUser, account)) {
          skipped.push(account.email);
          continue;
        }
        throw new SeedError(
          `Could not create ${account.email}; no existing account was changed.`
        );
      }

      if (createdByThisRun) {
        const credential: NewCredential = {
          user_id,
          full_name: account.full_name,
          email: account.email,
          role_name: account.role_name,
          password,
          verified: false,
        };
        created.push(credential);
        credential.verified = await verifyCredentialsAndJwt(
          account,
          user_id,
          password
        );
      }
    }

    const safetyOfficerAfter = await findUserByEmail("safety.officer@chemsafe.local");
    if (!samePublicUser(safetyOfficerBefore, safetyOfficerAfter)) {
      throw new SeedError(
        "The existing Safety Officer account changed during seeding; investigate before retrying."
      );
    }

    if (created.some((account) => !account.verified)) {
      throw new SeedError(
        "One or more new accounts failed login or JWT-role verification. Credentials are shown in the result."
      );
    }
  } catch (error) {
    failure =
      error instanceof SeedError
        ? error.message
        : "Database seed operation failed; sensitive details were suppressed.";
  } finally {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch {
      if (!failure) failure = "MongoDB disconnect failed after seeding.";
    }
    printReport(created, skipped);
  }

  if (failure) throw new SeedError(failure);
};

run().catch((error: unknown) => {
  const message = error instanceof SeedError ? error.message : "Seed operation failed.";
  console.error(`Demo-user seed failed: ${message}`);
  process.exitCode = 1;
});
