import { Router } from "express";

import {
  getFindings,
  getInspectionFindings,
  getFinding,
  addFinding,
  editFinding,
  removeFinding,
} from "../controllers/findingController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();


// GET all findings
router.get("/", getFindings);


// GET findings belonging to an inspection
router.get(
  "/inspection/:inspectionId",
  getInspectionFindings
);


// GET one finding
router.get(
  "/:id",
  getFinding
);


// CREATE finding
router.post(
  "/",
  authorize("ADMIN", "SAFETY_OFFICER"),
  addFinding
);


// UPDATE finding
router.put(
  "/:id",
  authorize("ADMIN", "SAFETY_OFFICER"),
  editFinding
);


// DELETE finding
router.delete(
  "/:id",
  authorize("ADMIN", "SAFETY_OFFICER"),
  removeFinding
);


export default router;