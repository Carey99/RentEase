import { z } from "zod";

// Zod validation schemas for onboarding forms
export const personalInfoSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(1, "Phone number is required").refine((val) => {
    return /^[\+]?[0-9\(\)\-\s]+$/.test(val) && val.replace(/\D/g, "").length >= 10;
  }, "Please enter a valid phone number with at least 10 digits"),
});

export const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const landlordPropertySchema = z.object({
  propertyName: z.string().min(1, "Property name is required"),
  customType: z.string().optional(),
  customPrice: z.string().optional(),
  utilities: z.array(z.object({
    type: z.string().min(1, "Utility type is required"),
    price: z.string().min(1, "Price per unit is required"),
  })).optional(),
}).refine((data) => {
  // Custom validation will be handled separately for property types
  return true;
}, {
  message: "Property validation failed",
});

export const tenantPropertySchema = z.object({
  propertyId: z.string().min(1, "Please select a property").refine(val => val !== "no-properties", "Please select a valid property"),
  propertyType: z.string().min(1, "Please select a property type"),
  unitNumber: z.string().min(1, "Unit number is required"),
});
