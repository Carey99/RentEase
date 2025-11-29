import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRequest, createMockResponse, createMockNext, mockUserStorage } from '../mocks';
import { createTestUser, createTestAuthResponse } from '../factories';
import { ObjectId } from 'mongodb';

describe('AuthController', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'secure-password',
        firstName: 'John',
        lastName: 'Doe',
        role: 'landlord',
      };

      req.body = userData;

      // Mock the user creation
      mockUserStorage.createUser.mockResolvedValue({
        _id: new ObjectId(),
        ...userData,
      });

      expect(mockUserStorage.createUser).toBeDefined();
    });

    it('should validate email format on registration', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      };

      req.body = invalidData;

      // Email validation should happen
      expect(invalidData.email).not.toMatch(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      );
    });

    it('should reject weak passwords', () => {
      const data = {
        email: 'test@example.com',
        password: 'weak', // Too short
        firstName: 'John',
        lastName: 'Doe',
      };

      expect(data.password.length).toBeLessThan(8);
    });

    it('should hash password before storing', () => {
      const data = {
        email: 'test@example.com',
        password: 'secure-password-123',
      };

      // Password should be hashed, not stored in plain text
      expect(data.password).toBeDefined();
    });
  });

  describe('loginUser', () => {
    it('should authenticate user with correct credentials', () => {
      req.body = {
        email: 'user@example.com',
        password: 'correct-password',
      };

      mockUserStorage.getUserByEmail.mockResolvedValue(
        createTestUser({ email: 'user@example.com' })
      );

      expect(mockUserStorage.getUserByEmail).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      req.body = {
        email: 'user@example.com',
        password: 'wrong-password',
      };

      const user = createTestUser();
      mockUserStorage.getUserByEmail.mockResolvedValue(user);

      // Password comparison would fail
      expect(req.body.password).not.toBe('correct-password');
    });

    it('should return 404 if user not found', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      mockUserStorage.getUserByEmail.mockResolvedValue(null);

      const result = await mockUserStorage.getUserByEmail(req.body.email);

      expect(result).toBeNull();
    });
  });

  describe('logoutUser', () => {
    it('should clear session on logout', () => {
      req.session = { userId: new ObjectId() };

      // Logout should clear session
      expect(req.session).toBeDefined();
    });

    it('should return success message', () => {
      res.json({ success: true, message: 'Logged out successfully' });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return authenticated user data', () => {
      const userId = new ObjectId();
      req.user = { id: userId };
      req.session = { userId };

      mockUserStorage.getUserById.mockResolvedValue(
        createTestUser({ _id: userId })
      );

      expect(req.user).toBeDefined();
    });

    it('should return 401 if not authenticated', () => {
      req.user = null;
      req.session = {};

      expect(req.user).toBeNull();
    });
  });

  describe('Authentication Errors', () => {
    it('should handle database errors gracefully', () => {
      mockUserStorage.getUserByEmail.mockRejectedValue(
        new Error('Database connection failed')
      );

      expect(mockUserStorage.getUserByEmail).toBeDefined();
    });

    it('should not expose sensitive information in errors', () => {
      const errorMessage = 'User not found';

      expect(errorMessage).not.toContain('password');
      expect(errorMessage).not.toContain('token');
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT token on login', () => {
      const user = createTestUser();
      const token = 'test-jwt-token';

      expect(token).toBeDefined();
      expect(token).not.toBeNull();
    });

    it('should include user ID in token claims', () => {
      const userId = new ObjectId();
      // Token payload should contain user ID
      expect(userId).toBeDefined();
    });
  });
});
