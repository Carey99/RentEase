/**
 * Landlord Controller
 * Handles landlord-specific HTTP requests
 */

import type { Request, Response } from "express";
import { storage } from "../storage";
import { userStorage } from "../storage/UserStorage";

export class LandlordController {
  /**
   * Get complete landlord details with properties
   * GET /api/landlords/:landlordId
   */
  static async getDetails(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const landlordDetails = await userStorage.getLandlordDetails(landlordId);
      
      if (!landlordDetails) {
        return res.status(404).json({ error: "Landlord not found" });
      }
      
      res.json(landlordDetails);
    } catch (error) {
      console.error("Error getting landlord details:", error);
      res.status(500).json({ error: "Failed to get landlord details" });
    }
  }

  /**
   * Get landlord settings
   * GET /api/landlords/:landlordId/settings
   */
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await storage.getLandlordSettings(req.params.landlordId);
      if (!settings) {
        return res.status(404).json({ error: "Landlord settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error getting landlord settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  }

  /**
   * Update landlord settings
   * PUT /api/landlords/:landlordId/settings
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const updates = req.body;

      const updatedSettings = await storage.updateLandlordSettings(landlordId, updates);

      if (!updatedSettings) {
        return res.status(404).json({ error: "Landlord not found or settings could not be updated" });
      }

      res.json({
        success: true,
        settings: updatedSettings,
        message: "Settings updated successfully"
      });

    } catch (error) {
      console.error("Error updating landlord settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  }

  /**
   * Change landlord password
   * PUT /api/landlords/:landlordId/password
   */
  static async changePassword(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ error: "Password must be at least 8 characters and contain uppercase, lowercase, number, and symbol" });
      }

      const success = await storage.changeLandlordPassword(landlordId, currentPassword, newPassword);

      if (!success) {
        return res.status(400).json({ error: "Invalid current password or landlord not found" });
      }

      res.json({
        success: true,
        message: "Password changed successfully"
      });

    } catch (error) {
      console.error("Error changing landlord password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
}
