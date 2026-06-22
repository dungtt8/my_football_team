const authMiddleware = require('../../src/middleware/authMiddleware');
const authService = require('../../src/services/authService');

jest.mock('../../src/services/authService');

describe('authMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should attach user context to req when valid token provided', () => {
    const mockUser = {
      user_id: 123,
      team_id: 456,
      email: 'test@example.com',
      role: 'member'
    };

    req.headers.authorization = 'Bearer valid-token';
    authService.verifyJWT.mockReturnValue(mockUser);

    authMiddleware(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(req.teamId).toBe(456);
    expect(next).toHaveBeenCalled();
  });

  test('should return 401 when token is missing', () => {
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authentication token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when token is invalid', () => {
    req.headers.authorization = 'Bearer invalid-token';
    authService.verifyJWT.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });
});
