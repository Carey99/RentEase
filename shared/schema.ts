import { z } from "zod";

// Database schema definitions for RentFlow MongoDB collections
// Collections: landlords, tenants, properties

// Landlord Schema (stored in landlords collection)
export const landlordSchema = z.object({
  _id: z.string().optional(),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
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
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.literal("tenant"),
  status: z.enum(["active", "pending", "inactive", "overdue"]).default("active").optional(),
  apartmentInfo: z.object({
    propertyId: z.string().optional(),
    propertyName: z.string().optional(),
    propertyType: z.string().optional(),
    unitNumber: z.string().optional(),
    rentAmount: z.string().optional(),
    landlordId: z.string().optional(),
  }).optional(),
  rentCycle: z.object({
    lastPaymentDate: z.date().optional(), // When tenant last paid rent
    nextDueDate: z.date().optional(), // Next rent due date
    daysRemaining: z.number().optional(), // Days until next due date
    rentStatus: z.enum(["active", "overdue", "grace_period"]).default("active").optional(),
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
  rentSettings: z.object({
    paymentDay: z.number().min(1).max(31).default(1), // Day of month for rent payment (1-31)
    gracePeriodDays: z.number().min(0).max(30).default(3), // Grace period before overdue
  }).optional(),
  utilities: z.array(z.object({
    type: z.string().min(1, "Utility type is required"),
    price: z.string().min(1, "Price per unit is required"),
  })).optional(),
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
  phone: z.string().optional(),
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
