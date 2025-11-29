import { jest } from '@jest/globals';

/**
 * Mock database connection and mongoose operations
 */
export const mockMongoDB = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  connection: {
    db: {
      collection: jest.fn().mockReturnValue({
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
        findOne: jest.fn().mockResolvedValue(null),
      }),
    },
  },
};

/**
 * Mock Express app and middleware
 */
export const mockExpressApp = {
  use: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

/**
 * Mock request/response objects
 */
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    session: {},
    ...overrides,
  };
}

export function createMockResponse() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
}

export function createMockNext() {
  return jest.fn();
}

/**
 * Mock Storage Classes
 */
export const mockUserStorage = {
  createUser: jest.fn(),
  getUserById: jest.fn(),
  getUserByEmail: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getAllUsers: jest.fn(),
};

export const mockPropertyStorage = {
  createProperty: jest.fn(),
  getPropertyById: jest.fn(),
  getPropertiesByLandlord: jest.fn(),
  updateProperty: jest.fn(),
  deleteProperty: jest.fn(),
  getAllProperties: jest.fn(),
};

export const mockPaymentStorage = {
  recordPayment: jest.fn(),
  getPaymentById: jest.fn(),
  getPaymentsByTenant: jest.fn(),
  updatePaymentStatus: jest.fn(),
  allocatePayment: jest.fn(),
  getOutstandingBalance: jest.fn(),
};

export const mockTenantStorage = {
  createTenant: jest.fn(),
  getTenantById: jest.fn(),
  getTenantsByProperty: jest.fn(),
  updateTenant: jest.fn(),
  deleteTenant: jest.fn(),
  getAllTenants: jest.fn(),
};

export const mockRentCycleStorage = {
  createRentCycle: jest.fn(),
  getRentCycleById: jest.fn(),
  getRentCyclesByProperty: jest.fn(),
  updateRentCycleStatus: jest.fn(),
  calculateRent: jest.fn(),
  getRentSummary: jest.fn(),
};

export const mockActivityStorage = {
  createActivity: jest.fn(),
  getActivityById: jest.fn(),
  getActivitiesByProperty: jest.fn(),
  getActivitiesByTenant: jest.fn(),
  getAllActivities: jest.fn(),
};

/**
 * Create a mock storage adapter with all storage services
 */
export function createMockStorageAdapter() {
  return {
    userStorage: mockUserStorage,
    propertyStorage: mockPropertyStorage,
    paymentStorage: mockPaymentStorage,
    tenantStorage: mockTenantStorage,
    rentCycleStorage: mockRentCycleStorage,
    activityStorage: mockActivityStorage,
  };
}
