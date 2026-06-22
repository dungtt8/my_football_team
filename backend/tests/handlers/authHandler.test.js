const db = require('../../src/config/database');
const authService = require('../../src/services/authService');
const authHandler = require('../../src/handlers/authHandler');

jest.mock('../../src/config/database');
jest.mock('../../src/services/authService');

describe('POST /auth/zalo/callback', () => {
  let req, res;

  beforeEach(() => {
    req = { query: { code: 'auth-code-123' } };
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  test('should create JWT and return user data for new user', async () => {
    const zaloUserData = {
      zalo_user_id: 'zuid-001',
      email: 'newuser@example.com',
      full_name: 'New Player'
    };

    authService.exchangeZaloCode.mockResolvedValue('access-token');
    authService.fetchZaloUserInfo.mockResolvedValue(zaloUserData);
    authService.generateJWT.mockReturnValue('jwt-token-123');

    db.query = jest.fn().mockResolvedValue(null); // User not found

    await authHandler(req, res);

    expect(authService.exchangeZaloCode).toHaveBeenCalledWith('auth-code-123');
    expect(authService.fetchZaloUserInfo).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'jwt-token-123',
        user: expect.objectContaining({
          email: 'newuser@example.com'
        })
      })
    );
  });

  test('should return 400 for invalid code', async () => {
    authService.exchangeZaloCode.mockRejectedValue(new Error('Invalid code'));

    await authHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
