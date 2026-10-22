import { Router } from "express";
import { authorize } from "../middleware/auth.js";
import { API_ROLE_ACCESS } from "../auth/permissions.js";
import { acknowledge, addReading, listAlerts, listReadings } from "../controllers/monitoringController.js";

const router = Router();
router.use(authorize(...API_ROLE_ACCESS.monitoringRead));
router.get("/readings", listReadings);
router.post("/readings", authorize(...API_ROLE_ACCESS.monitoringWrite), addReading);
router.get("/alerts", listAlerts);
router.patch("/alerts/:id", authorize(...API_ROLE_ACCESS.monitoringWrite), acknowledge);
export default router;
