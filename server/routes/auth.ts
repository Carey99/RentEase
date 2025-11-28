/**
 * Authentication Routes
 * POST /api/auth/register, /api/auth/login, /api/auth/signin, /api/auth/logout
 * GET /api/auth/session, /api/users/:id, /api/auth/current/:id
 */

import type { Express } from "express";
import { AuthController } from "../controllers/authController";
import { authLimiter } from "../middleware/security";

export function registerAuthRoutes(app: Express): void {
  // Authentication routes (with strict rate limiting)
  app.post("/api/auth/register", authLimiter, AuthController.register);
  app.post("/api/auth/login", authLimiter, AuthController.login);
  app.post("/api/auth/signin", authLimiter, AuthController.signin);
  app.post("/api/auth/logout", AuthController.logout);
  app.get("/api/auth/session", AuthController.getSession);
  app.get("/api/users/:id", AuthController.getUserById);
  app.get("/api/auth/current/:id", AuthController.getUserById);
}
