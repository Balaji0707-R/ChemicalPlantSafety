import { Router } from "express";
import {
  addChemicalStorage,
  editChemicalStorage,
  getChemicalStorage,
  removeChemicalStorage,
} from "../controllers/chemicalStorageController.js";
import { authorize } from "../middleware/auth.js";
import { API_ROLE_ACCESS } from "../auth/permissions.js";

const router = Router();

router.use(authorize(...API_ROLE_ACCESS.chemicalStorageRead));

router.get("/chemicals/:chemicalId/storage", getChemicalStorage);
router.post("/chemicals/:chemicalId/storage", authorize(...API_ROLE_ACCESS.chemicalStorageWrite), addChemicalStorage);
router.put("/chemical-storage/:storageId", authorize(...API_ROLE_ACCESS.chemicalStorageWrite), editChemicalStorage);
router.delete("/chemical-storage/:storageId", authorize(...API_ROLE_ACCESS.chemicalStorageDelete), removeChemicalStorage);

export default router;
