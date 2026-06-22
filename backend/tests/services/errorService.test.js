const {
  BusinessError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
} = require('../../src/services/errorService');

describe('Error Classes', () => {
  test('BusinessError has correct properties', () => {
    const error = new BusinessError('TEST_ERROR', 'Test message', 400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(400);
  });

  test('ValidationError inherits from BusinessError', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: 'email' });
  });

  test('AuthenticationError has 401 status', () => {
    const error = new AuthenticationError('Invalid credentials');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTH_ERROR');
  });

  test('AuthorizationError has 403 status', () => {
    const error = new AuthorizationError('Insufficient permissions');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('RBAC_ERROR');
  });

  test('NotFoundError creates correct message', () => {
    const error = new NotFoundError('User', 123);
    expect(error.message).toBe('User with id 123 not found');
    expect(error.statusCode).toBe(404);
  });

  test('ConflictError has 409 status', () => {
    const error = new ConflictError('Resource already exists');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });
});
