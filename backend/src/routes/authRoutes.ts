import { Router } from "express";
import { login, logout, me } from "../controllers/authController.js";
import { authenticate, requireCsrf } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", authenticate, me);
router.post("/logout", authenticate, requireCsrf, logout);

export default router;
