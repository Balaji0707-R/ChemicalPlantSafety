import type { Request, Response } from "express";

import { getAllUsers } from "../services/userService.js";

export const getUsers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await getAllUsers();

    res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
};