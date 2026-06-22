const logger = require('../utils/logger');

class BusinessError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'BusinessError';
  }
}

class ValidationError extends BusinessError {
  constructor(message, details = {}) {
    super('VALIDATION_ERROR', message, 400);
    this.details = details;
  }
}

class AuthenticationError extends BusinessError {
  constructor(message = 'Authentication failed') {
    super('AUTH_ERROR', message, 401);
  }
}

class AuthorizationError extends BusinessError {
  constructor(message = 'Access denied') {
    super('RBAC_ERROR', message, 403);
  }
}

class NotFoundError extends BusinessError {
  constructor(resource, id) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
  }
}

class ConflictError extends BusinessError {
  constructor(message) {
    super('CONFLICT', message, 409);
  }
}

const handleError = (error, req, res, context = {}) => {
  if (error instanceof BusinessError) {
    logger.warn(`Business error: ${error.code}`, {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...context
    });
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details || undefined
    });
  }

  // Unknown error
  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    ...context
  });

  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

module.exports = {
  BusinessError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  handleError
};
