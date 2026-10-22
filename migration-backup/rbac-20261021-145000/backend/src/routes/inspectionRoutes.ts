import { Router } from "express";

import {
  getInspections,
  getInspection,
  addInspection,
  editInspection,
  removeInspection,
} from "../controllers/inspectionController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", getInspections);
router.get("/:id", getInspection);
router.post("/", authorize("ADMIN", "SAFETY_OFFICER"), addInspection);
router.put("/:id", authorize("ADMIN", "SAFETY_OFFICER"), editInspection);
router.delete("/:id", authorize("ADMIN", "SAFETY_OFFICER"), removeInspection);

export default router;