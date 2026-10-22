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
import { API_ROLE_ACCESS } from "../auth/permissions.js";

const router = Router();

router.use(authorize(...API_ROLE_ACCESS.findingsRead));


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
  authorize(...API_ROLE_ACCESS.findingsWrite),
  addFinding
);


// UPDATE finding
router.put(
  "/:id",
  authorize(...API_ROLE_ACCESS.findingsWrite),
  editFinding
);


// DELETE finding
router.delete(
  "/:id",
  authorize(...API_ROLE_ACCESS.findingsWrite),
  removeFinding
);


export default router;
