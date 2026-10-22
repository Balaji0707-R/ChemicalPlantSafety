import { Router } from "express";

import {
  getInspections,
  getInspection,
  addInspection,
  editInspection,
  removeInspection,
} from "../controllers/inspectionController.js";
import { authorize } from "../middleware/auth.js";
import { API_ROLE_ACCESS } from "../auth/permissions.js";

const router = Router();

router.use(authorize(...API_ROLE_ACCESS.inspectionsRead));

router.get("/", getInspections);
router.get("/:id", getInspection);
router.post("/", authorize(...API_ROLE_ACCESS.inspectionsWrite), addInspection);
router.put("/:id", authorize(...API_ROLE_ACCESS.inspectionsWrite), editInspection);
router.delete("/:id", authorize(...API_ROLE_ACCESS.inspectionsWrite), removeInspection);

export default router;
