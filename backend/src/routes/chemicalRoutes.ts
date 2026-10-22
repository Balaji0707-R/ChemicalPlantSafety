import { Router } from "express";
import {
  getChemicals,
  getChemical,
  addChemical,
  editChemical,
  removeChemical,
} from "../controllers/chemicalController.js";
import { authorize } from "../middleware/auth.js";
import { API_ROLE_ACCESS } from "../auth/permissions.js";

const router = Router();

router.use(authorize(...API_ROLE_ACCESS.chemicalsRead));

router.get("/", getChemicals);
router.get("/:id", getChemical);
router.post("/", authorize(...API_ROLE_ACCESS.chemicalsWrite), addChemical);
router.put("/:id", authorize(...API_ROLE_ACCESS.chemicalsWrite), editChemical);
router.delete("/:id", authorize(...API_ROLE_ACCESS.chemicalsDelete), removeChemical);

export default router;
