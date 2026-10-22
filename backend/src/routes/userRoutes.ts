import { Router } from "express";

import {
  createManagedUserController,
  getManagedUsersController,
  getUsers,
  updateManagedUserRoleController,
  updateManagedUserStatusController,
} from "../controllers/userController.js";
import { API_ROLE_ACCESS } from "../auth/permissions.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authorize(...API_ROLE_ACCESS.userDirectoryRead), getUsers);
router.get("/manage", authorize(...API_ROLE_ACCESS.userManagement), getManagedUsersController);
router.post("/", authorize(...API_ROLE_ACCESS.userManagement), createManagedUserController);
router.patch("/:id/role", authorize(...API_ROLE_ACCESS.userManagement), updateManagedUserRoleController);
router.patch("/:id/status", authorize(...API_ROLE_ACCESS.userManagement), updateManagedUserStatusController);

export default router;
