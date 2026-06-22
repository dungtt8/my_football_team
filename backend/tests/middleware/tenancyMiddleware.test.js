const tenancyMiddleware = require('../../src/middleware/tenancyMiddleware');

describe('tenancyMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        user_id: 123,
        team_id: 456
      },
      app: {
        set: jest.fn()
      }
    };
    res = {};
    next = jest.fn();
  });

  test('should set team_id in app context from user', () => {
    tenancyMiddleware(req, res, next);

    expect(req.app.set).toHaveBeenCalledWith('team_id', 456);
    expect(next).toHaveBeenCalled();
  });

  test('should return 403 if user has no team_id', () => {
    req.user = { user_id: 123 };
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn();

    tenancyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
