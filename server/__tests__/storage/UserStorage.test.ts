import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserStorage } from '../../storage/UserStorage';
import { createTestUser } from '../factories';
import { ObjectId } from 'mongodb';

// Mock mongoose
jest.mock('mongoose', () => ({
  connection: {
    db: {
      collection: jest.fn(),
    },
  },
}));

describe('UserStorage', () => {
  let storage: UserStorage;
  let mockCollection: any;

  beforeEach(() => {
    // Mock the collection methods
    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn(),
    };

    // Mock mongoose connection
    const mongoose = require('mongoose');
    mongoose.connection.db.collection.mockReturnValue(mockCollection);

    storage = new UserStorage();
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const userData = createTestUser({
        email: 'new@example.com',
      });

      mockCollection.insertOne.mockResolvedValue({
        insertedId: userData._id,
      });

      const result = await storage.createUser(userData);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
        email: userData.email,
      }));
      expect(result._id).toBeDefined();
    });

    it('should throw error on duplicate email', async () => {
      const userData = createTestUser();

      mockCollection.insertOne.mockRejectedValue(
        new Error('E11000 duplicate key error')
      );

      await expect(storage.createUser(userData)).rejects.toThrow();
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      const userId = new ObjectId();
      const user = createTestUser({ _id: userId });

      mockCollection.findOne.mockResolvedValue(user);

      const result = await storage.getUserById(userId.toString());

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: expect.any(ObjectId),
      });
      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await storage.getUserById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve user by email', async () => {
      const email = 'test@example.com';
      const user = createTestUser({ email });

      mockCollection.findOne.mockResolvedValue(user);

      const result = await storage.getUserByEmail(email);

      expect(mockCollection.findOne).toHaveBeenCalledWith({ email });
      expect(result?.email).toBe(email);
    });

    it('should return null if email not found', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await storage.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const userId = new ObjectId();
      const updates = { firstName: 'Updated' };

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await storage.updateUser(userId.toString(), updates);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        { $set: expect.objectContaining(updates) }
      );
    });

    it('should handle update with no changes', async () => {
      const userId = new ObjectId();

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });

      await storage.updateUser(userId.toString(), {});

      expect(mockCollection.updateOne).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete user by ID', async () => {
      const userId = new ObjectId();

      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await storage.deleteUser(userId.toString());

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({
        _id: expect.any(ObjectId),
      });
    });

    it('should return 0 when user not found', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

      await storage.deleteUser('nonexistent-id');

      expect(mockCollection.deleteOne).toHaveBeenCalled();
    });
  });

  describe('getAllUsers', () => {
    it('should retrieve all users', async () => {
      const users = [
        createTestUser({ email: 'user1@example.com' }),
        createTestUser({ email: 'user2@example.com' }),
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(users),
      });

      const result = await storage.getAllUsers();

      expect(mockCollection.find).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no users exist', async () => {
      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const result = await storage.getAllUsers();

      expect(result).toEqual([]);
    });
  });
});
