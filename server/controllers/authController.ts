/**
 * Auth Controller
 * Handles authentication-related HTTP requests
 */

import type { Request, Response } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { logActivity, createActivityLog } from "./activityController";
import { createUserSession, destroyUserSession } from "../middleware/auth";

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response) {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ error: "User already exists with this email" });
      }

      const user = await storage.createUser(userData);
      
      // Log activity if tenant was registered
      if (user.role === 'tenant') {
        const tenant = await storage.getTenant(user.id);
        if (tenant && tenant.apartmentInfo?.landlordId) {
          await logActivity(createActivityLog(
            tenant.apartmentInfo.landlordId,
            'tenant_registered',
            'New Tenant Registered',
            `${user.fullName} has been added as a new tenant${tenant.apartmentInfo.propertyName ? ` at ${tenant.apartmentInfo.propertyName}` : ''}`,
            {
              tenantId: user.id,
              tenantName: user.fullName,
              propertyId: tenant.apartmentInfo.propertyId,
              propertyName: tenant.apartmentInfo.propertyName,
              unitNumber: tenant.apartmentInfo.unitNumber,
            },
            'medium'
          ));
        }
      }
      
      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({
        message: "User created successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  }

  /**
   * Login user (legacy endpoint)
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Create session
      createUserSession(req, user.id, user.role, rememberMe || false);

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "Login successful",
        user: userWithoutPassword,
        session: {
          expiresIn: rememberMe ? "30 days" : "7 days"
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }

  /**
   * Sign in user
   * POST /api/auth/signin
   */
  static async signin(req: Request, res: Response) {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Create session
      createUserSession(req, user.id, user.role, rememberMe || false);

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "Sign in successful",
        user: userWithoutPassword,
        session: {
          expiresIn: rememberMe ? "30 days" : "7 days"
        }
      });
    } catch (error) {
      console.error("Error during signin:", error);
      res.status(500).json({ error: "Sign in failed" });
    }
  }

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  static async getUserById(req: Request, res: Response) {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  }

  /**
   * Get current session user
   * GET /api/auth/session
   */
  static async getSession(req: Request, res: Response) {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ 
          error: "No active session",
          sessionExpired: true 
        });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ 
          error: "User not found",
          sessionExpired: true 
        });
      }

      const { password, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        session: {
          createdAt: req.session.createdAt,
          rememberMe: req.session.rememberMe,
          expiresIn: req.session.rememberMe ? "30 days" : "7 days"
        }
      });
    } catch (error) {
      console.error("Error getting session:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  }

  /**
   * Logout user (destroy session)
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response) {
    try {
      const userId = req.session?.userId;
      
      await destroyUserSession(req);
      
      console.log(`👋 User ${userId} logged out successfully`);
      res.json({ 
        message: "Logged out successfully",
        success: true 
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  }
}
