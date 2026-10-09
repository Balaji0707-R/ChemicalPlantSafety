import { Router } from "express";
import { getDashboard } from "../controllers/dashboardController.js";

const router = Router();

router.get("/stats", getDashboard);

export default router;