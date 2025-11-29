/**
 * Storage Module - Barrel Export
 * Re-exports the storage adapter for use throughout the application
 */

export { storage, MongoStorageAdapter } from './MongoStorageAdapter';
export { UserStorage } from './UserStorage';
export { PropertyStorage } from './PropertyStorage';
export { TenantStorage } from './TenantStorage';
export { PaymentStorage } from './PaymentStorage';
export { RentCycleStorage } from './RentCycleStorage';
export { ActivityStorage } from './ActivityStorage';
