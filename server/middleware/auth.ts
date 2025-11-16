/**
 * Authentication Middleware
 * Handles session management, token generation, and authentication verification
 */

import type { Request, Response, NextFunction } from "express";
import session from "express-session";
import crypto from "crypto";

// Extend Express Session to include custom properties
declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: "landlord" | "tenant";
    rememberMe: boolean;
    createdAt: number;
  }
}

/**
 * Session configuration
 */
export const sessionConfig = session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  name: "rentease.sid", // Custom session cookie name
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days default
  },
  rolling: true, // Reset expiration on each request
});

/**
 * Generate session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create session for user
 */
export function createUserSession(
  req: Request,
  userId: string,
  userRole: "landlord" | "tenant",
  rememberMe: boolean = false
): void {
  req.session.userId = userId;
  req.session.userRole = userRole;
  req.session.rememberMe = rememberMe;
  req.session.createdAt = Date.now();

  // Extend cookie lifetime if "Remember Me" is checked
  if (rememberMe && req.session.cookie) {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  console.log(`✅ Session created for user ${userId} (${userRole})${rememberMe ? " [Remember Me]" : ""}`);
}

/**
 * Destroy user session (logout)
 */
export function destroyUserSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        reject(err);
      } else {
        console.log("✅ Session destroyed successfully");
        resolve();
      }
    });
  });
}

/**
 * Authentication middleware - Verify user session
 * Protects routes that require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    console.log("❌ Unauthorized access attempt - No valid session");
    res.status(401).json({ 
      error: "Unauthorized", 
      message: "Please sign in to continue",
      sessionExpired: true 
    });
    return;
  }

  // Session exists and is valid
  console.log(`✅ Authenticated request from user ${req.session.userId} (${req.session.userRole})`);
  next();
}

/**
 * Role-based authorization middleware
 * Ensures user has the required role
 */
export function requireRole(role: "landlord" | "tenant") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.userId) {
      res.status(401).json({ 
        error: "Unauthorized", 
        message: "Please sign in to continue" 
      });
      return;
    }

    if (req.session.userRole !== role) {
      console.log(`❌ Forbidden - User ${req.session.userId} attempted to access ${role}-only resource`);
      res.status(403).json({ 
        error: "Forbidden", 
        message: `This resource is only accessible to ${role}s` 
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Adds user info to request if session exists, but doesn't block
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.userId) {
    console.log(`🔓 Optional auth - User ${req.session.userId} (${req.session.userRole})`);
  } else {
    console.log("🔓 Optional auth - Anonymous request");
  }
  next();
}

/**
 * Session validation middleware
 * Checks if session has expired or is invalid
 */
export function validateSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    return next();
  }

  const sessionAge = Date.now() - (req.session.createdAt || 0);
  const maxAge = req.session.rememberMe 
    ? 30 * 24 * 60 * 60 * 1000  // 30 days
    : 7 * 24 * 60 * 60 * 1000;   // 7 days

  if (sessionAge > maxAge) {
    console.log(`⏰ Session expired for user ${req.session.userId}`);
    req.session.destroy((err) => {
      if (err) console.error("Error destroying expired session:", err);
    });
    res.status(401).json({ 
      error: "Session expired", 
      message: "Your session has expired. Please sign in again.",
      sessionExpired: true 
    });
    return;
  }

  next();
}

/**
 * Get current user from session
 */
export function getCurrentUserId(req: Request): string | null {
  return req.session?.userId || null;
}

/**
 * Get current user role from session
 */
export function getCurrentUserRole(req: Request): "landlord" | "tenant" | null {
  return req.session?.userRole || null;
}
