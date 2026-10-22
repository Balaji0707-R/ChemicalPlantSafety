import bcrypt from "bcryptjs";
import UserModel from "../models/user.js";
import RoleModel from "../models/role.js";
import { ROLE_NAMES, type RoleName } from "../auth/authTypes.js";
import { serializeUserApiDto } from "../models/serializers.js";
import { getNextId } from "../models/counter.js";

export interface User {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface ManagedUser extends User {
  role_name: RoleName;
  created_at: Date;
}

type UserManagementErrorCode = "INVALID" | "CONFLICT" | "NOT_FOUND";

export class UserManagementError extends Error {
  constructor(
    message: string,
    readonly code: UserManagementErrorCode
  ) {
    super(message);
    this.name = "UserManagementError";
  }
}

interface ManagedUserRecord extends User {
  created_at: Date;
}

interface RoleRecord {
  role_id: number;
  role_name: string;
}

export interface CreateManagedUserInput {
  full_name?: unknown;
  email?: unknown;
  password?: unknown;
  role_id?: unknown;
}

const isRoleName = (value: string): value is RoleName =>
  ROLE_NAMES.includes(value as RoleName);

const toManagedUser = (user: ManagedUserRecord, roleName: string): ManagedUser => {
  if (!isRoleName(roleName)) {
    throw new Error("User references an unsupported role");
  }
  return {
    user_id: user.user_id,
    role_id: user.role_id,
    full_name: user.full_name,
    email: user.email,
    is_active: user.is_active,
    role_name: roleName,
    created_at: user.created_at,
  };
};

const getRole = async (roleId: number): Promise<RoleRecord | null> =>
  RoleModel.findOne({ role_id: roleId })
    .select("role_id role_name")
    .lean<RoleRecord>()
    .exec();

const getManagedUserRecord = async (userId: number): Promise<ManagedUserRecord | null> =>
  UserModel.findOne({ user_id: userId })
    .select("user_id role_id full_name email is_active created_at")
    .lean<ManagedUserRecord>()
    .exec();

const requireUserId = (userId: number): number => {
  if (!Number.isSafeInteger(userId) || userId < 1) {
    throw new UserManagementError("User ID must be a positive integer.", "INVALID");
  }
  return userId;
};

const findByEmail = async (email: string): Promise<{ user_id: number } | null> =>
  UserModel.findOne({
    $expr: { $eq: [{ $toLower: "$email" }, email.toLowerCase()] },
  })
    .select("user_id")
    .lean<{ user_id: number }>()
    .exec();

const ensureNotLastActiveAdmin = async (user: ManagedUserRecord): Promise<void> => {
  const adminRole = await RoleModel.findOne({ role_name: "ADMIN" })
    .select("role_id")
    .lean<{ role_id: number }>()
    .exec();
  if (!adminRole || user.role_id !== adminRole.role_id) return;

  const activeAdmins = await UserModel.countDocuments({
    role_id: adminRole.role_id,
    is_active: true,
  });
  if (activeAdmins <= 1) {
    throw new UserManagementError(
      "The last active ADMIN cannot be deactivated or assigned another role.",
      "CONFLICT"
    );
  }
};

/** Existing active-user directory used by inspection and incident forms. */
export const getAllUsers = async (): Promise<User[]> => {
  const users = await UserModel.find({ is_active: true })
    .select({
      user_id: 1,
      role_id: 1,
      full_name: 1,
      email: 1,
      is_active: 1,
      _id: 0,
    })
    .sort({ full_name: 1 })
    .lean();

  return users.map(serializeUserApiDto);
};

/** ADMIN directory includes inactive accounts and never selects password_hash. */
export const getManagedUsers = async (): Promise<ManagedUser[]> => {
  const [users, roles] = await Promise.all([
    UserModel.find()
      .select("user_id role_id full_name email is_active created_at")
      .sort({ full_name: 1 })
      .lean<ManagedUserRecord[]>()
      .exec(),
    RoleModel.find().select("role_id role_name").lean<RoleRecord[]>().exec(),
  ]);
  const roleNames = new Map(roles.map((role) => [role.role_id, role.role_name]));

  return users.map((user) => {
    const roleName = roleNames.get(user.role_id);
    if (!roleName) throw new Error("User references a missing role");
    return toManagedUser(user, roleName);
  });
};

export const createManagedUser = async (
  input: CreateManagedUserInput
): Promise<ManagedUser> => {
  const fullName = typeof input.full_name === "string" ? input.full_name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const roleId = input.role_id;

  if (!fullName || fullName.length > 100) {
    throw new UserManagementError("Full name is required and must be at most 100 characters.", "INVALID");
  }
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UserManagementError("Enter a valid email address.", "INVALID");
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new UserManagementError("Password must be 12 to 72 UTF-8 bytes.", "INVALID");
  }
  if (!Number.isSafeInteger(roleId) || (roleId as number) < 1) {
    throw new UserManagementError("Select a valid role.", "INVALID");
  }

  const role = await getRole(roleId as number);
  if (!role || !isRoleName(role.role_name)) {
    throw new UserManagementError("Select a valid role.", "INVALID");
  }
  if (await findByEmail(email)) {
    throw new UserManagementError("A user with this email already exists.", "CONFLICT");
  }

  const userId = await getNextId("users");
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const created = await UserModel.create({
      user_id: userId,
      role_id: role.role_id,
      full_name: fullName,
      email,
      password_hash: passwordHash,
      is_active: true,
    });

    return toManagedUser(
      {
        user_id: created.user_id,
        role_id: created.role_id,
        full_name: created.full_name,
        email: created.email,
        is_active: created.is_active,
        created_at: created.created_at,
      },
      role.role_name
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new UserManagementError("A user with this email or ID already exists.", "CONFLICT");
    }
    throw error;
  }
};

export const updateManagedUserRole = async (
  rawUserId: number,
  actorId: number,
  rawRoleId: unknown
): Promise<ManagedUser> => {
  const userId = requireUserId(rawUserId);
  if (!Number.isSafeInteger(rawRoleId) || (rawRoleId as number) < 1) {
    throw new UserManagementError("Select a valid role.", "INVALID");
  }
  const role = await getRole(rawRoleId as number);
  if (!role || !isRoleName(role.role_name)) {
    throw new UserManagementError("Select a valid role.", "INVALID");
  }

  const user = await getManagedUserRecord(userId);
  if (!user) throw new UserManagementError("User not found.", "NOT_FOUND");
  if (userId === actorId) {
    throw new UserManagementError("You cannot change your own role.", "CONFLICT");
  }
  if (user.is_active && user.role_id !== role.role_id) {
    await ensureNotLastActiveAdmin(user);
  }

  const updated = await UserModel.findOneAndUpdate(
    { user_id: userId },
    { $set: { role_id: role.role_id } },
    { returnDocument: "after", runValidators: true }
  )
    .select("user_id role_id full_name email is_active created_at")
    .lean<ManagedUserRecord>()
    .exec();
  if (!updated) throw new UserManagementError("User not found.", "NOT_FOUND");
  return toManagedUser(updated, role.role_name);
};

export const updateManagedUserStatus = async (
  rawUserId: number,
  actorId: number,
  isActive: unknown
): Promise<ManagedUser> => {
  const userId = requireUserId(rawUserId);
  if (typeof isActive !== "boolean") {
    throw new UserManagementError("is_active must be true or false.", "INVALID");
  }

  const user = await getManagedUserRecord(userId);
  if (!user) throw new UserManagementError("User not found.", "NOT_FOUND");
  if (userId === actorId && !isActive) {
    throw new UserManagementError("You cannot deactivate your own account.", "CONFLICT");
  }
  if (user.is_active && !isActive) await ensureNotLastActiveAdmin(user);

  const updated = await UserModel.findOneAndUpdate(
    { user_id: userId },
    { $set: { is_active: isActive } },
    { returnDocument: "after", runValidators: true }
  )
    .select("user_id role_id full_name email is_active created_at")
    .lean<ManagedUserRecord>()
    .exec();
  if (!updated) throw new UserManagementError("User not found.", "NOT_FOUND");
  const role = await getRole(updated.role_id);
  if (!role) throw new Error("User references a missing role");
  return toManagedUser(updated, role.role_name);
};
