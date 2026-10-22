import { Router } from "express";
import { getDashboard } from "../controllers/dashboardController.js";
import { authorize } from "../middleware/auth.js";
import { API_ROLE_ACCESS } from "../auth/permissions.js";

const router = Router();

router.use(authorize(...API_ROLE_ACCESS.dashboardRead));

router.get("/stats", getDashboard);

export default router;
