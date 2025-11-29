import { ObjectId } from 'mongodb';

/**
 * Factory for creating test user data
 */
export function createTestUser(overrides = {}) {
  return {
    _id: new ObjectId(),
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+254712345678',
    role: 'landlord',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory for creating test property data
 */
export function createTestProperty(overrides: any = {}) {
  const landlordId = overrides.landlordId || new ObjectId();
  return {
    _id: new ObjectId(),
    name: 'Test Property',
    landlordId,
    address: '123 Main St',
    city: 'Nairobi',
    county: 'Nairobi',
    units: 5,
    rentAmount: 20000,
    utilitiesCost: 2000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory for creating test tenant data
 */
export function createTestTenant(overrides: any = {}) {
  const propertyId = overrides.propertyId || new ObjectId();
  return {
    _id: new ObjectId(),
    propertyId,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '+254798765432',
    idNumber: '12345678',
    rentAmount: 20000,
    status: 'active',
    moveInDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory for creating test payment data
 */
export function createTestPayment(overrides: any = {}) {
  const tenantId = overrides.tenantId || new ObjectId();
  const now = new Date();
  return {
    _id: new ObjectId(),
    tenantId,
    amount: 20000,
    status: 'completed',
    paymentDate: now,
    paymentMethod: 'mpesa',
    transactionId: 'TRX123456789',
    description: 'Monthly rent payment',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Factory for creating test rent cycle data
 */
export function createTestRentCycle(overrides: any = {}) {
  const propertyId = overrides.propertyId || new ObjectId();
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
  return {
    _id: new ObjectId(),
    propertyId,
    startDate,
    endDate,
    dueDate: new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from start
    rentAmount: 20000,
    utilitiesAmount: 2000,
    totalAmount: 22000,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory for creating test activity data
 */
export function createTestActivity(overrides: any = {}) {
  const propertyId = overrides.propertyId || new ObjectId();
  return {
    _id: new ObjectId(),
    propertyId,
    description: 'Test activity',
    type: 'payment',
    details: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory for creating test payment allocation data
 */
export function createTestPaymentAllocation(overrides: any = {}) {
  const paymentId = overrides.paymentId || new ObjectId();
  const tenantId = overrides.tenantId || new ObjectId();
  return {
    _id: new ObjectId(),
    paymentId,
    tenantId,
    rentAllocated: 15000,
    utilitiesAllocated: 2000,
    balanceAllocated: 3000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory for creating test authentication response
 */
export function createTestAuthResponse(user = createTestUser()) {
  return {
    success: true,
    message: 'Authentication successful',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    token: 'test-jwt-token',
  };
}
