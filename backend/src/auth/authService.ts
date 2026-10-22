import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import Role from "../models/role.js";
import User from "../models/user.js";
import { ROLE_NAMES, type AuthenticatedUser, type RoleName } from "./authTypes.js";

interface UserIdentityRecord {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

interface UserLoginRecord extends UserIdentityRecord {
  password_hash: string;
}

interface RoleNameRecord {
  role_name: string;
}

const isRoleName = (value: string): value is RoleName =>
  ROLE_NAMES.includes(value as RoleName);

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findRoleName = async (roleId: number): Promise<string | null> => {
  const role = await Role.findOne({ role_id: roleId })
    .select("role_name")
    .lean<RoleNameRecord>()
    .exec();
  return role?.role_name ?? null;
};

export const authenticateUser = async (
  email: string,
  password: string
): Promise<AuthenticatedUser | null> => {
  const emailPattern = `^${escapeRegex(email)}$`;
  const record = await User.findOne({ email: { $regex: emailPattern, $options: "i" } })
    .select("user_id role_id full_name email is_active +password_hash")
    .lean<UserLoginRecord>()
    .exec();

  if (!record || !record.is_active || !record.password_hash) {
    return null;
  }
  if (!(await verifyPassword(password, record.password_hash))) {
    return null;
  }

  const roleName = await findRoleName(record.role_id);
  if (!roleName) {
    return null;
  }
  return toAuthenticatedUser(record, roleName);
};

export const findActiveUserById = async (userId: number): Promise<AuthenticatedUser | null> => {
  const record = await User.findOne({ user_id: userId, is_active: true })
    .select("user_id role_id full_name email is_active")
    .lean<UserIdentityRecord>()
    .exec();
  if (!record) {
    return null;
  }

  const roleName = await findRoleName(record.role_id);
  return roleName ? toAuthenticatedUser(record, roleName) : null;
};

export const verifyPassword = async (
  password: string,
  passwordHash: string
): Promise<boolean> => {
  if (!passwordHash.startsWith("$2")) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
};

export const toAuthenticatedUser = (
  record: UserIdentityRecord,
  roleName: string
): AuthenticatedUser => {
  if (!isRoleName(roleName)) {
    throw new Error("User has an unsupported role");
  }

  return {
    userId: record.user_id,
    fullName: record.full_name,
    email: record.email,
    roleName,
  };
};

export const createAuthToken = (user: AuthenticatedUser): string =>
  jwt.sign(
    {
      sub: String(user.userId),
      fullName: user.fullName,
      email: user.email,
      roleName: user.roleName,
    },
    env.auth.jwtSecret,
    { expiresIn: env.auth.tokenTtl as jwt.SignOptions["expiresIn"] }
  );

export const verifyAuthToken = (token: string): AuthenticatedUser | null => {
  try {
    const payload = jwt.verify(token, env.auth.jwtSecret) as JwtPayload;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.fullName !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.roleName !== "string" ||
      !isRoleName(payload.roleName)
    ) {
      return null;
    }

    return {
      userId: Number(payload.sub),
      fullName: payload.fullName,
      email: payload.email,
      roleName: payload.roleName,
    };
  } catch {
    return null;
  }
};
