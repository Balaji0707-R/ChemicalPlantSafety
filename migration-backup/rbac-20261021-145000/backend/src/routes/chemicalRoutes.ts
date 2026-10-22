import { Router } from "express";
import {
  getChemicals,
  getChemical,
  addChemical,
  editChemical,
  removeChemical,
} from "../controllers/chemicalController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", getChemicals);
router.get("/:id", getChemical);
router.post("/", authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"), addChemical);
router.put("/:id", authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"), editChemical);
router.delete("/:id", authorize("ADMIN", "SAFETY_OFFICER"), removeChemical);

export default router;