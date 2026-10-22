import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { findActiveUserById, verifyAuthToken } from "../auth/authService.js";
import type { RoleName } from "../auth/authTypes.js";

const readCookie = (request: { headers: { cookie?: string } }, name: string): string | null => {
  const entry = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
};

export const issueCsrfToken = (): string => crypto.randomBytes(32).toString("hex");

export const setAuthCookies = (
  res: Parameters<RequestHandler>[1],
  token: string,
  csrfToken: string
): void => {
  const secure = process.env.NODE_ENV === "production";
  const sameSite = secure ? "Strict" : "Lax";
  const options = `Path=/; HttpOnly; SameSite=${sameSite}${secure ? "; Secure" : ""}`;
  res.setHeader("Set-Cookie", [
    `${env.auth.cookieName}=${encodeURIComponent(token)}; Max-Age=28800; ${options}`,
    `${env.auth.csrfCookieName}=${csrfToken}; Max-Age=28800; Path=/; SameSite=${sameSite}${secure ? "; Secure" : ""}`,
  ]);
};

export const clearAuthCookies = (res: Parameters<RequestHandler>[1]): void => {
  res.setHeader("Set-Cookie", [
    `${env.auth.cookieName}=; Max-Age=0; Path=/; HttpOnly`,
    `${env.auth.csrfCookieName}=; Max-Age=0; Path=/`,
  ]);
};

export const authenticate: RequestHandler = async (req, res, next) => {
  const token = readCookie(req, env.auth.cookieName);
  const user = token ? verifyAuthToken(token) : null;

  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  try {
    const currentUser = await findActiveUserById(user.userId);
    if (!currentUser) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireCsrf: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const cookieToken = readCookie(req, env.auth.csrfCookieName);
  const headerToken = req.header("X-CSRF-Token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ success: false, message: "Invalid CSRF token" });
    return;
  }

  next();
};

export const authorize = (...roles: RoleName[]): RequestHandler => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.roleName)) {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  next();
};

export const getCookie = readCookie;
