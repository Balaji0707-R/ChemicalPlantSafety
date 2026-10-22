import type { Request, Response } from "express";
import { authenticateUser, createAuthToken } from "../auth/authService.js";
import { clearAuthCookies, getCookie, issueCsrfToken, setAuthCookies } from "../middleware/auth.js";
import { requiredText } from "../utils/validation.js";

export const login = async (req: Request, res: Response): Promise<void> => {
  const email = requiredText(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : null;

  if (!email || !password || password.length < 8) {
    res.status(401).json({ success: false, message: "Invalid email or password" });
    return;
  }

  try {
    const user = await authenticateUser(email, password);
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }

    setAuthCookies(res, createAuthToken(user), issueCsrfToken());
    res.status(200).json({ success: true, user });
  } catch {
    res.status(401).json({ success: false, message: "Invalid email or password" });
  }
};

export const me = (req: Request, res: Response): void => {
  res.status(200).json({ success: true, user: req.user });
};

export const logout = (_req: Request, res: Response): void => {
  clearAuthCookies(res);
  res.status(204).send();
};
