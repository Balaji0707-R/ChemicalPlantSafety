import { Router } from "express";
import {
  getChemicals,
  getChemical,
  addChemical,
  editChemical,
  removeChemical,
} from "../controllers/chemicalController.js";

const router = Router();

router.get("/", getChemicals);
router.get("/:id", getChemical);
router.post("/", addChemical);
router.put("/:id", editChemical);
router.delete("/:id", removeChemical);

export default router;