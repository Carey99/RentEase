import { type User, type InsertUser, type Property, type InsertProperty, type TenantProperty, type InsertTenantProperty } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Property operations
  getProperty(id: string): Promise<Property | undefined>;
  getPropertiesByLandlord(landlordId: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  searchPropertiesByName(name: string): Promise<Property[]>;
  
  // Tenant property relationships
  getTenantProperty(tenantId: string): Promise<TenantProperty | undefined>;
  createTenantProperty(tenantProperty: InsertTenantProperty): Promise<TenantProperty>;
  getTenantsByProperty(propertyId: string): Promise<TenantProperty[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private properties: Map<string, Property>;
  private tenantProperties: Map<string, TenantProperty>;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.tenantProperties = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      (property) => property.landlordId === landlordId,
    );
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const property: Property = { 
      ...insertProperty, 
      id,
      occupiedUnits: "0",
      createdAt: new Date()
    };
    this.properties.set(id, property);
    return property;
  }

  async searchPropertiesByName(name: string): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(
      (property) => property.name.toLowerCase().includes(name.toLowerCase()),
    );
  }

  async getTenantProperty(tenantId: string): Promise<TenantProperty | undefined> {
    return Array.from(this.tenantProperties.values()).find(
      (tp) => tp.tenantId === tenantId,
    );
  }

  async createTenantProperty(insertTenantProperty: InsertTenantProperty): Promise<TenantProperty> {
    const id = randomUUID();
    const tenantProperty: TenantProperty = { 
      ...insertTenantProperty, 
      id,
      createdAt: new Date()
    };
    this.tenantProperties.set(id, tenantProperty);
    return tenantProperty;
  }

  async getTenantsByProperty(propertyId: string): Promise<TenantProperty[]> {
    return Array.from(this.tenantProperties.values()).filter(
      (tp) => tp.propertyId === propertyId,
    );
  }
}

export const storage = new MemStorage();
