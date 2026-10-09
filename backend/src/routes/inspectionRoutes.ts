import { Router } from "express";

import {
  getInspections,
  getInspection,
  addInspection,
  editInspection,
  removeInspection,
} from "../controllers/inspectionController.js";

const router = Router();

router.get("/", getInspections);
router.get("/:id", getInspection);
router.post("/", addInspection);
router.put("/:id", editInspection);
router.delete("/:id", removeInspection);

export default router;