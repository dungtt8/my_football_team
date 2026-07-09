/**
 * Business error hierarchy — mirrors backend/src/services/errorService.js.
 * The AllExceptionsFilter maps these to the same JSON error responses/status
 * codes the Express backend produced.
 */
export class BusinessError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, any>;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'BusinessError';
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string, details: Record<string, any> = {}) {
    super('VALIDATION_ERROR', message, 400);
    this.details = details;
  }
}

export class AuthenticationError extends BusinessError {
  constructor(message = 'Authentication failed') {
    super('AUTH_ERROR', message, 401);
  }
}

export class AuthorizationError extends BusinessError {
  constructor(message = 'Access denied') {
    super('RBAC_ERROR', message, 403);
  }
}

export class NotFoundError extends BusinessError {
  constructor(resource: string, id?: string | number) {
    super(
      'NOT_FOUND',
      id !== undefined
        ? `${resource} with id ${id} not found`
        : resource,
      404,
    );
  }
}

export class ConflictError extends BusinessError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}
