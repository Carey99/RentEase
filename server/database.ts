import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL;
const DATABASE_NAME = process.env.DATABASE_NAME || "RentFlow";

if (!MONGODB_URL) {
  throw new Error('MONGODB_URL environment variable is required');
}

export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URL!, {
      dbName: DATABASE_NAME,
    });
    console.log('Connected to MongoDB Atlas - RentFlow database');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Landlord Model (landlords collection)
const landlordSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'landlord' },
  properties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
}, {
  timestamps: true,
  collection: 'landlords'
});

// Tenant Model (tenants collection)
const tenantSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'tenant' },
  apartmentInfo: {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyName: String,
    propertyType: String,
    unitNumber: String,
    rentAmount: String,
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord' },
  },
}, {
  timestamps: true,
  collection: 'tenants'
});

// Property Model (properties collection)
const propertySchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true },
  name: { type: String, required: true },
  propertyTypes: [{
    type: { type: String, required: true },
    price: { type: String, required: true },
  }],
  utilities: [{
    type: { type: String, required: true },
    price: { type: String, required: true },
  }],
  totalUnits: String,
  occupiedUnits: { type: String, default: '0' },
  tenants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }],
}, {
  timestamps: true,
  collection: 'properties'
});

export const Landlord = mongoose.model('Landlord', landlordSchema);
export const Tenant = mongoose.model('Tenant', tenantSchema);
export const Property = mongoose.model('Property', propertySchema);