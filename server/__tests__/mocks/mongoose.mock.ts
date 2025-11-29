import { jest } from '@jest/globals';

// Mock mongoose globally for all tests
jest.unstable_mockModule('mongoose', () => ({
  Schema: jest.fn(function() {
    return {
      Types: {
        ObjectId: String,
      },
    };
  }),
  default: {
    Schema: jest.fn(function() {
      return {
        Types: {
          ObjectId: String,
        },
      };
    }),
    model: jest.fn().mockReturnValue({
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    }),
    connection: {
      db: {
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
          findOne: jest.fn().mockResolvedValue(null),
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
          deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
        }),
      },
    },
  },
  connect: jest.fn().mockResolvedValue(undefined),
}));
