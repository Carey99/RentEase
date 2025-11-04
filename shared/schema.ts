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
    lastPaymentDate: z.date().optional().nullable(), // When tenant last paid rent
    lastPaymentAmount: z.number().optional().nullable(), // Amount of last payment
    currentMonthPaid: z.boolean().default(false), // Has current month been paid?
    paidForMonth: z.number().min(1).max(12).optional().nullable(), // Month number payment was for
    paidForYear: z.number().optional().nullable(), // Year payment was for
    nextDueDate: z.date().optional(), // Next rent due date
    daysRemaining: z.number().optional(), // Days until next due date
    rentStatus: z.enum(["paid", "active", "overdue", "grace_period"]).default("active").optional(),
  }).default({}),
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
    units: z.number().min(1, "At least 1 unit is required").default(1),
  })).min(1, "At least one property type is required"),
  rentSettings: z.object({
    paymentDay: z.number().min(1).max(31).default(1), // Day of month for rent payment (1-31)
    gracePeriodDays: z.number().min(0).max(30).default(3), // Grace period before overdue
  }).default({ paymentDay: 1, gracePeriodDays: 3 }),
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
  property?: {
    id: string;
    landlordId: string;
    name: string;
    propertyTypes: Array<{ type: string; price: string }>;
    utilities?: Array<{ type: string; price: string }>;
    totalUnits?: string;
    occupiedUnits?: string;
    createdAt?: Date;
  };
  rentCycle?: {
    lastPaymentDate?: Date;
    nextDueDate?: Date;
    daysRemaining?: number;
    rentStatus?: 'active' | 'overdue' | 'grace_period' | 'paid_in_advance' | 'partial';
    advancePaymentDays?: number;
    advancePaymentMonths?: number;
  };
};

// Legacy schema for compatibility
export const insertTenantPropertySchema = z.object({
  tenantId: z.string(),
  propertyId: z.string(),
  propertyType: z.string(),
  unitNumber: z.string(),
  rentAmount: z.string().optional(),
});

// Payment History Schema
export const paymentHistorySchema = z.object({
  _id: z.string().optional(),
  tenantId: z.string(),
  landlordId: z.string(),
  propertyId: z.string(),
  amount: z.number().positive("Payment amount must be positive"),
  paymentDate: z.date(),
  forMonth: z.number().min(1).max(12), // Month this payment is for (1-12)
  forYear: z.number().min(2020), // Year this payment is for
  monthlyRent: z.number().positive("Monthly rent must be positive"), // Expected rent amount
  paymentMethod: z.string().optional(),
  status: z.enum(["pending", "partial", "completed", "overpaid", "failed"]).default("completed").optional(),
  notes: z.string().optional(),
  utilityCharges: z.array(z.object({
    type: z.string(), // e.g., "Water", "Electricity"
    unitsUsed: z.number().min(0), // e.g., 150 (kWh or liters)
    pricePerUnit: z.number().positive(), // e.g., 15 (price per unit)
    total: z.number().min(0), // e.g., 2250 (unitsUsed * pricePerUnit)
  })).optional(),
  totalUtilityCost: z.number().min(0).optional(), // Sum of all utility charges
  createdAt: z.date().optional(),
});

export const insertPaymentHistorySchema = paymentHistorySchema.omit({
  _id: true,
  createdAt: true,
});

export type PaymentHistory = z.infer<typeof paymentHistorySchema>;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;

// Activity Log Schema - Track all important landlord activities
export const activityLogSchema = z.object({
  _id: z.string().optional(),
  landlordId: z.string(),
  activityType: z.enum([
    "tenant_registered",      // New tenant added
    "tenant_removed",         // Tenant deleted
    "payment_received",       // Payment completed
    "payment_failed",         // Payment failed
    "property_added",         // New property created
    "property_updated",       // Property details changed
    "property_removed",       // Property deleted
    "debt_created",           // New debt/bill created
    "debt_cleared",           // Debt fully paid
    "rent_overdue",           // Tenant rent became overdue
    "utility_bill_added",     // Utility bill added to payment
    "system_alert",           // System-generated alerts
  ]),
  title: z.string(), // Short description (e.g., "New Tenant Registered")
  description: z.string(), // Detailed description
  metadata: z.object({
    tenantId: z.string().optional(),
    tenantName: z.string().optional(),
    propertyId: z.string().optional(),
    propertyName: z.string().optional(),
    paymentId: z.string().optional(),
    amount: z.number().optional(),
    unitNumber: z.string().optional(),
    previousValue: z.string().optional(), // For update tracking
    newValue: z.string().optional(), // For update tracking
  }).optional(),
  icon: z.enum([
    "user-plus",      // Tenant registered
    "user-minus",     // Tenant removed
    "dollar-sign",    // Payment received
    "alert-circle",   // Payment failed/overdue
    "building",       // Property added/updated
    "building-minus", // Property removed
    "file-text",      // Debt/bill created
    "check-circle",   // Debt cleared
    "zap",            // Utility bill
    "bell",           // System alert
  ]).default("bell"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  isRead: z.boolean().default(false),
  createdAt: z.date().optional(),
});

export const insertActivityLogSchema = activityLogSchema.omit({
  _id: true,
  createdAt: true,
  isRead: true,
});

export type ActivityLog = z.infer<typeof activityLogSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Tenant Activity Log Schema - Track tenant-specific notifications
export const tenantActivityLogSchema = z.object({
  _id: z.string().optional(),
  tenantId: z.string(),
  activityType: z.enum([
    "bill_created",           // New bill/invoice created
    "bill_reminder",          // Payment reminder
    "bill_overdue",           // Bill is overdue
    "grace_period_warning",   // Grace period about to end
    "payment_processed",      // Payment was successful
    "payment_failed",         // Payment failed
    "partial_payment_received", // Partial payment acknowledged
    "final_notice",           // 10 days overdue - final notice
    "system_alert",           // System alerts
  ]),
  title: z.string(),
  description: z.string(),
  metadata: z.object({
    landlordId: z.string().optional(),
    landlordName: z.string().optional(),
    propertyId: z.string().optional(),
    propertyName: z.string().optional(),
    paymentId: z.string().optional(),
    amount: z.number().optional(),
    dueDate: z.string().optional(),
    daysOverdue: z.number().optional(),
  }).optional(),
  icon: z.enum([
    "file-text",      // Bill created
    "bell",           // Reminder
    "alert-circle",   // Overdue/warning
    "alert-triangle", // Final notice
    "check-circle",   // Payment successful
    "x-circle",       // Payment failed
    "dollar-sign",    // Partial payment
    "clock",          // Grace period
  ]).default("bell"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  isRead: z.boolean().default(false),
  createdAt: z.date().optional(),
});

export const insertTenantActivityLogSchema = tenantActivityLogSchema.omit({
  _id: true,
  createdAt: true,
  isRead: true,
});

export type TenantActivityLog = z.infer<typeof tenantActivityLogSchema>;
export type InsertTenantActivityLog = z.infer<typeof insertTenantActivityLogSchema>;


