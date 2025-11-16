export class AppError extends Error {
  constructor(message = 'Unexpected error', status = 400, code = 'APP_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(message = 'Not enough credits to complete this action') {
    super(message, 402, 'INSUFFICIENT_CREDITS');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

