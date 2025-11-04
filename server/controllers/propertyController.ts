/**
 * Property Controller
 * Handles all property-related HTTP requests
 */

import type { Request, Response } from "express";
import { storage } from "../storage";
import { insertPropertySchema } from "@shared/schema";
import { ZodError } from "zod";

export class PropertyController {
  /**
   * Create a new property
   * POST /api/properties
   */
  static async createProperty(req: Request, res: Response) {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.json(property);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid property data", details: error.errors });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ error: "Failed to create property" });
    }
  }

  /**
   * Get single property by ID
   * GET /api/properties/:id
   */
  static async getProperty(req: Request, res: Response) {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error getting property:", error);
      res.status(500).json({ error: "Failed to get property" });
    }
  }

  /**
   * Get properties by landlord
   * GET /api/properties/landlord/:landlordId
   */
  static async getPropertiesByLandlord(req: Request, res: Response) {
    try {
      const properties = await storage.getPropertiesByLandlord(req.params.landlordId);
      res.json(properties);
    } catch (error) {
      console.error("Error getting properties by landlord:", error);
      res.status(500).json({ error: "Failed to get properties" });
    }
  }

  /**
   * Update property
   * PUT /api/properties/:propertyId
   */
  static async updateProperty(req: Request, res: Response) {
    try {
      const propertyId = req.params.propertyId;
      const updates = req.body;

      const updatedProperty = await storage.updateProperty(propertyId, updates);

      if (!updatedProperty) {
        return res.status(404).json({ error: "Property not found" });
      }

      res.json({
        success: true,
        property: updatedProperty,
        message: "Property updated successfully"
      });

    } catch (error) {
      console.error("Error updating property:", error);
      res.status(500).json({ error: "Failed to update property" });
    }
  }

  /**
   * Search properties by name
   * GET /api/properties/search
   */
  static async searchProperties(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const searchQuery = (q && typeof q === "string") ? q : "";
      const properties = await storage.searchPropertiesByName(searchQuery);
      res.json(properties);
    } catch (error) {
      console.error("Error searching properties:", error);
      res.status(500).json({ error: "Failed to search properties" });
    }
  }

  /**
   * Get property types
   * GET /api/properties/:propertyId/types
   */
  static async getPropertyTypes(req: Request, res: Response) {
    try {
      const property = await storage.getProperty(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property.propertyTypes || []);
    } catch (error) {
      console.error("Error getting property types:", error);
      res.status(500).json({ error: "Failed to get property types" });
    }
  }

  /**
   * Get tenants by property
   * GET /api/properties/:propertyId/tenants
   */
  static async getTenantsByProperty(req: Request, res: Response) {
    try {
      const tenants = await storage.getTenantsByProperty(req.params.propertyId);
      res.json(tenants);
    } catch (error) {
      console.error("Error getting tenants by property:", error);
      res.status(500).json({ error: "Failed to get tenants" });
    }
  }

  /**
   * Update property rent settings
   * PUT /api/properties/:propertyId/rent-settings
   */
  static async updateRentSettings(req: Request, res: Response) {
    try {
      const { propertyId } = req.params;
      const { paymentDay, gracePeriodDays } = req.body;

      if (!paymentDay || paymentDay < 1 || paymentDay > 31) {
        return res.status(400).json({ error: "Payment day must be between 1 and 31" });
      }

      const success = await storage.updatePropertyRentSettings(
        propertyId, 
        paymentDay, 
        gracePeriodDays || 3
      );

      if (!success) {
        return res.status(404).json({ error: "Property not found or settings could not be updated" });
      }

      res.json({
        success: true,
        message: "Rent settings updated successfully",
        paymentDay,
        gracePeriodDays: gracePeriodDays || 3
      });

    } catch (error) {
      console.error("Error updating rent settings:", error);
      res.status(500).json({ error: "Failed to update rent settings" });
    }
  }

  /**
   * Get property utilities
   * GET /api/properties/:propertyId/utilities
   */
  static async getPropertyUtilities(req: Request, res: Response) {
    try {
      const propertyId = req.params.propertyId;
      const property = await storage.getProperty(propertyId);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Filter out utilities that are "Included" or "Not Included" since they can't be billed
      const billableUtilities = (property.utilities || []).filter(utility => {
        const price = utility.price.toLowerCase();
        return price !== 'included' && price !== 'not included';
      });

      res.json({
        success: true,
        propertyId: property._id,
        propertyName: property.name,
        utilities: billableUtilities
      });
    } catch (error) {
      console.error("Error getting property utilities:", error);
      res.status(500).json({ error: "Failed to get property utilities" });
    }
  }
}
