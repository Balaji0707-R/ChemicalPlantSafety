import type { Request, Response } from "express";
import {
  createManagedUser,
  getAllUsers,
  getManagedUsers,
  updateManagedUserRole,
  updateManagedUserStatus,
  UserManagementError,
} from "../services/userService.js";

const sendManagementError = (res: Response, error: unknown): void => {
  if (error instanceof UserManagementError) {
    const status =
      error.code === "INVALID" ? 400 :
      error.code === "NOT_FOUND" ? 404 : 409;
    res.status(status).json({ success: false, message: error.message });
    return;
  }

  // Avoid logging request bodies or database errors that may contain user data.
  console.error("User management operation failed.");
  res.status(500).json({ success: false, message: "User management request failed." });
};

export const getUsers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch {
    console.error("Get users operation failed.");
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const getManagedUsersController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await getManagedUsers();
    res.status(200).json({ success: true, users });
  } catch (error) {
    sendManagementError(res, error);
  }
};

export const createManagedUserController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await createManagedUser(req.body ?? {});
    res.status(201).json({ success: true, user });
  } catch (error) {
    sendManagementError(res, error);
  }
};

export const updateManagedUserRoleController = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }
  try {
    const user = await updateManagedUserRole(
      Number(req.params.id),
      req.user.userId,
      req.body?.role_id
    );
    res.status(200).json({ success: true, user });
  } catch (error) {
    sendManagementError(res, error);
  }
};

export const updateManagedUserStatusController = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }
  try {
    const user = await updateManagedUserStatus(
      Number(req.params.id),
      req.user.userId,
      req.body?.is_active
    );
    res.status(200).json({ success: true, user });
  } catch (error) {
    sendManagementError(res, error);
  }
};
