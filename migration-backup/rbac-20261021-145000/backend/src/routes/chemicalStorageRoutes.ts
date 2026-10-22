import { Router } from "express";
import {
  addChemicalStorage,
  editChemicalStorage,
  getChemicalStorage,
  removeChemicalStorage,
} from "../controllers/chemicalStorageController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get("/chemicals/:chemicalId/storage", getChemicalStorage);
router.post("/chemicals/:chemicalId/storage", authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"), addChemicalStorage);
router.put("/chemical-storage/:storageId", authorize("ADMIN", "SAFETY_OFFICER", "PLANT_MANAGER"), editChemicalStorage);
router.delete("/chemical-storage/:storageId", authorize("ADMIN", "SAFETY_OFFICER"), removeChemicalStorage);

export default router;
