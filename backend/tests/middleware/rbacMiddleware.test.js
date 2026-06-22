const rbacMiddleware = require('../../src/middleware/rbacMiddleware');

describe('rbacMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        role: 'member'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should allow access if user role matches required roles', () => {
    const rbac = rbacMiddleware(['member', 'owner']);

    rbac(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should deny access if user role does not match', () => {
    const rbac = rbacMiddleware(['owner', 'co_manager']);

    rbac(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });
});
