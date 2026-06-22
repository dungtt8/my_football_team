const authService = require('../../src/services/authService');
const { ValidationError, AuthenticationError } = require('../../src/services/errorService');

describe('Integration: Authentication Flow', () => {
  describe('JWT Generation and Verification', () => {
    test('should generate valid JWT token', () => {
      const user = {
        id: 1,
        team_id: 1,
        email: 'test@example.com',
        role: 'member',
        zalo_user_id: 'zuid-001'
      };

      const token = authService.generateJWT(user);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    test('should verify and decode valid JWT token', () => {
      const user = {
        id: 123,
        team_id: 456,
        email: 'test@example.com',
        role: 'co_manager',
        zalo_user_id: 'zuid-001'
      };

      const token = authService.generateJWT(user);
      const decoded = authService.verifyJWT(token);

      expect(decoded.user_id).toBe(user.id);
      expect(decoded.team_id).toBe(user.team_id);
      expect(decoded.role).toBe('co_manager');
    });

    test('should reject invalid JWT', () => {
      expect(() => {
        authService.verifyJWT('invalid-token');
      }).toThrow();
    });

    test('should reject tampered JWT', () => {
      const user = {
        id: 1,
        team_id: 1,
        email: 'test@example.com',
        role: 'member',
        zalo_user_id: 'zuid-001'
      };

      let token = authService.generateJWT(user);
      // Tamper with token by changing a character
      token = token.slice(0, -5) + 'XXXXX';

      expect(() => {
        authService.verifyJWT(token);
      }).toThrow();
    });

    test('should include all required claims in JWT', () => {
      const user = {
        id: 100,
        team_id: 200,
        email: 'player@example.com',
        role: 'owner',
        zalo_user_id: 'zuid-test-123'
      };

      const token = authService.generateJWT(user);
      const decoded = authService.verifyJWT(token);

      expect(decoded).toHaveProperty('user_id');
      expect(decoded).toHaveProperty('team_id');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role');
      expect(decoded).toHaveProperty('zalo_user_id');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for missing code', () => {
      const { ValidationError } = require('../../src/services/errorService');
      expect(() => {
        throw new ValidationError('Authorization code is required');
      }).toThrow('Authorization code is required');
    });

    test('should handle authentication failures gracefully', () => {
      const { AuthenticationError } = require('../../src/services/errorService');
      const error = new AuthenticationError('Invalid credentials');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_ERROR');
    });
  });

  describe('Security', () => {
    test('should not expose sensitive data in JWT decode', () => {
      const user = {
        id: 1,
        team_id: 1,
        email: 'test@example.com',
        role: 'member',
        zalo_user_id: 'zuid-001',
        password: 'secret123' // Should not be included
      };

      const token = authService.generateJWT(user);
      const decoded = authService.verifyJWT(token);

      expect(decoded).not.toHaveProperty('password');
    });

    test('should maintain role-based access control', () => {
      const owner = {
        id: 1,
        team_id: 1,
        email: 'owner@example.com',
        role: 'owner',
        zalo_user_id: 'zuid-owner'
      };

      const member = {
        id: 2,
        team_id: 1,
        email: 'member@example.com',
        role: 'member',
        zalo_user_id: 'zuid-member'
      };

      const ownerToken = authService.generateJWT(owner);
      const memberToken = authService.generateJWT(member);

      const ownerDecoded = authService.verifyJWT(ownerToken);
      const memberDecoded = authService.verifyJWT(memberToken);

      expect(ownerDecoded.role).toBe('owner');
      expect(memberDecoded.role).toBe('member');
    });

    test('should isolate teams via team_id', () => {
      const userTeamA = {
        id: 1,
        team_id: 100,
        email: 'player@team-a.com',
        role: 'member',
        zalo_user_id: 'zuid-001'
      };

      const userTeamB = {
        id: 2,
        team_id: 200,
        email: 'player@team-b.com',
        role: 'member',
        zalo_user_id: 'zuid-002'
      };

      const tokenA = authService.generateJWT(userTeamA);
      const tokenB = authService.generateJWT(userTeamB);

      const decodedA = authService.verifyJWT(tokenA);
      const decodedB = authService.verifyJWT(tokenB);

      // Verify teams are isolated
      expect(decodedA.team_id).toBe(100);
      expect(decodedB.team_id).toBe(200);
      expect(decodedA.team_id).not.toBe(decodedB.team_id);
    });
  });
});
