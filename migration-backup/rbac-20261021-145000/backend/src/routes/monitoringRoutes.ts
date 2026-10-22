import { Router } from "express";
import { authorize } from "../middleware/auth.js";
import { acknowledge, addReading, listAlerts, listReadings } from "../controllers/monitoringController.js";

const router = Router();
router.get("/readings", listReadings);
router.post("/readings", authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"), addReading);
router.get("/alerts", listAlerts);
router.patch("/alerts/:id", authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"), acknowledge);
export default router;
