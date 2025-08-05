import { z } from "zod";

// MongoDB Schema Definitions for RentFlow Database
// Collections: landlords, tenants, properties

// Landlord Schema (stored in landlords collection)
export const landlordSchema = z.object({
  _id: z.string().optional(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.literal("landlord"),
  properties: z.array(z.string()).optional(), // Array of property IDs
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Tenant Schema (stored in tenants collection)
export const tenantSchema = z.object({
  _id: z.string().optional(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.literal("tenant"),
  apartmentInfo: z.object({
    propertyId: z.string().optional(),
    propertyName: z.string().optional(),
    propertyType: z.string().optional(),
    unitNumber: z.string().optional(),
    rentAmount: z.string().optional(),
    landlordId: z.string().optional(),
  }).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Property Schema (stored in properties collection within landlords)
export const propertySchema = z.object({
  _id: z.string().optional(),
  landlordId: z.string(),
  name: z.string().min(1, "Property name is required"),
  propertyTypes: z.array(z.object({
    type: z.string().min(1, "Property type is required"),
    price: z.string().min(1, "Price is required"),
  })).min(1, "At least one property type is required"),
  utilities: z.object({
    electricity: z.boolean().optional(),
    water: z.boolean().optional(),
    garbage: z.boolean().optional(),
    security: z.boolean().optional(),
    internet: z.boolean().optional(),
    other: z.boolean().optional(),
  }).optional(),
  totalUnits: z.string().optional(),
  occupiedUnits: z.string().default("0"),
  tenants: z.array(z.string()).optional(), // Array of tenant IDs
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Insert schemas (omitting auto-generated fields)
export const insertLandlordSchema = landlordSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  properties: true,
});

export const insertTenantSchema = tenantSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = propertySchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  occupiedUnits: true,
  tenants: true,
});

// User registration schemas
export const insertUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["landlord", "tenant"]),
});

// Type exports
export type Landlord = z.infer<typeof landlordSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type Property = z.infer<typeof propertySchema>;
export type InsertLandlord = z.infer<typeof insertLandlordSchema>;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Legacy types for compatibility
export type User = {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: 'landlord' | 'tenant';
  createdAt?: Date;
};
export type InsertTenantProperty = {
  tenantId: string;
  propertyId: string;
  propertyType: string;
  unitNumber: string;
  rentAmount?: string;
};
export type TenantProperty = InsertTenantProperty & {
  _id: string;
  createdAt: Date;
};

// Legacy schema for compatibility
export const insertTenantPropertySchema = z.object({
  tenantId: z.string(),
  propertyId: z.string(),
  propertyType: z.string(),
  unitNumber: z.string(),
  rentAmount: z.string().optional(),
});
