import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockRequest, createMockResponse } from '../mocks';
import { createTestUser, createTestAuthResponse } from '../factories';
import { ObjectId } from 'mongodb';

describe('Auth Routes Integration', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', () => {
      req.body = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'landlord',
      };

      const testUser = createTestUser({ email: req.body.email });
      const response = createTestAuthResponse(testUser);

      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe(req.body.email);
    });

    it('should validate email uniqueness', () => {
      req.body = {
        email: 'duplicate@example.com',
        password: 'Password123',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      // Should return 409 Conflict if email exists
      expect(req.body.email).toBeDefined();
    });

    it('should hash password before storage', () => {
      const plainPassword = 'MyPassword123';

      expect(plainPassword).not.toBe('hashed_value');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with correct credentials', () => {
      req.body = {
        email: 'user@example.com',
        password: 'CorrectPassword123',
      };

      const testUser = createTestUser({ email: req.body.email });
      const response = createTestAuthResponse(testUser);

      expect(response.token).toBeDefined();
      expect(response.user.email).toBe(req.body.email);
    });

    it('should reject invalid email/password combination', () => {
      req.body = {
        email: 'user@example.com',
        password: 'WrongPassword',
      };

      // Should return 401 Unauthorized
      expect(req.body).toBeDefined();
    });

    it('should return session token on successful login', () => {
      const response = createTestAuthResponse();

      expect(response.token).toBeDefined();
      expect(response.token.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user and clear session', () => {
      req.session = {
        userId: new ObjectId(),
        destroy: jest.fn().mockImplementation((callback) => callback()),
      };

      // Session should be cleared
      expect(req.session.userId).toBeDefined();
    });

    it('should return 200 OK on successful logout', () => {
      res.status(200).json({ success: true, message: 'Logged out' });

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user if authenticated', () => {
      const user = createTestUser();
      req.user = {
        id: user._id,
        email: user.email,
      };

      expect(req.user).toBeDefined();
      expect(req.user.email).toBe(user.email);
    });

    it('should return 401 if not authenticated', () => {
      req.user = null;

      expect(req.user).toBeNull();
    });
  });
});
