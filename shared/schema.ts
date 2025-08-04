import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["landlord", "tenant"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landlordId: varchar("landlord_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  utilities: json("utilities").$type<{
    electricity?: boolean;
    water?: boolean;
    garbage?: boolean;
    security?: boolean;
    internet?: boolean;
    other?: boolean;
  }>(),
  totalUnits: varchar("total_units"),
  occupiedUnits: varchar("occupied_units").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenantProperties = pgTable("tenant_properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => users.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  unitNumber: text("unit_number").notNull(),
  rentAmount: varchar("rent_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  occupiedUnits: true,
});

export const insertTenantPropertySchema = createInsertSchema(tenantProperties).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
export type InsertTenantProperty = z.infer<typeof insertTenantPropertySchema>;
export type TenantProperty = typeof tenantProperties.$inferSelect;
