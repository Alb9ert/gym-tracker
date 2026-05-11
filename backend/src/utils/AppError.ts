export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'SERVER_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly field?: string;

  constructor(statusCode: number, code: ErrorCode, message: string, field?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, field?: string) {
    return new AppError(400, 'VALIDATION_ERROR', message, field);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'AUTH_REQUIRED', message);
  }

  static invalidCredentials() {
    return new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  static notFound(resource = 'Resource') {
    return new AppError(404, 'NOT_FOUND', `${resource} not found`);
  }

  static forbidden() {
    return new AppError(403, 'FORBIDDEN', 'Access denied');
  }

  static conflict(message: string) {
    return new AppError(409, 'CONFLICT', message);
  }
}
