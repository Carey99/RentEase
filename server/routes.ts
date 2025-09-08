import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertPropertySchema, insertTenantPropertySchema } from "@shared/schema";
import { connectToDatabase } from "./database";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = user;

      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User signin (alias for login)
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create property
  app.post("/api/properties", async (req, res) => {
    try {
      const propertyData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(propertyData);
      res.json(property);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid property data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get properties by landlord
  app.get("/api/properties/landlord/:landlordId", async (req, res) => {
    try {
      const properties = await storage.getPropertiesByLandlord(req.params.landlordId);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update property
  app.put("/api/properties/:propertyId", async (req, res) => {
    try {
      console.log('PUT /api/properties/:propertyId called');
      console.log('Property ID:', req.params.propertyId);
      console.log('Request body:', req.body);
      
      const { propertyTypes, utilities } = req.body;
      
      if (!propertyTypes || !Array.isArray(propertyTypes)) {
        return res.status(400).json({ message: "Invalid property types data" });
      }
      
      const updateData: any = { propertyTypes };
      
      // Include utilities in update if provided
      if (utilities && Array.isArray(utilities)) {
        updateData.utilities = utilities;
      }
      
      const property = await storage.updateProperty(req.params.propertyId, updateData);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      console.log('Property updated successfully:', property);
      res.json(property);
    } catch (error) {
      console.error('Property update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Internal server error", error: errorMessage });
    }
  });

  // Search properties by name
  app.get("/api/properties/search", async (req, res) => {
    try {
      const { name } = req.query;
      const searchTerm = typeof name === 'string' ? name : '';

      const properties = await storage.searchPropertiesByName(searchTerm);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get property types for a specific property
  app.get("/api/properties/:propertyId/types", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Return property types - this will be the propertyTypes array from the property
      res.json(property.propertyTypes || []);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create tenant property relationship
  app.post("/api/tenant-properties", async (req, res) => {
    try {
      const tenantPropertyData = insertTenantPropertySchema.parse(req.body);
      const tenantProperty = await storage.createTenantProperty(tenantPropertyData);
      res.json(tenantProperty);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid tenant property data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tenant property info
  app.get("/api/tenant-properties/tenant/:tenantId", async (req, res) => {
    try {
      const tenantProperty = await storage.getTenantProperty(req.params.tenantId);
      if (!tenantProperty) {
        return res.status(404).json({ message: "Tenant property not found" });
      }

      res.json(tenantProperty);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all tenants for a specific landlord
  app.get("/api/tenants/landlord/:landlordId", async (req, res) => {
    try {
      console.log('🔍 Frontend requesting tenants for landlord ID:', req.params.landlordId);
      const tenants = await storage.getTenantsByLandlord(req.params.landlordId);
      console.log('📊 Found tenants:', tenants.length);
      res.json(tenants);
    } catch (error) {
      console.error('Error getting tenants by landlord:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get tenants for a specific property
  app.get("/api/tenants/property/:propertyId", async (req, res) => {
    try {
      const tenants = await storage.getTenantsByProperty(req.params.propertyId);
      res.json(tenants);
    } catch (error) {
      console.error('Error getting tenants by property:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
