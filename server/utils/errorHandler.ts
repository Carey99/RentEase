/**
 * Error Handler Utility
 * Centralizes error handling and logging
 * Converts various error types to standardized API responses
 */

import { Response } from 'express';
import {
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  ApiResponse,
} from './apiResponse';

/**
 * Custom application error types
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(
    public errors: { [field: string]: string | string[] },
    message: string = 'Validation failed'
  ) {
    super(422, message, 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, message, 'FORBIDDEN');
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message, 'RATE_LIMIT');
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Global error handler middleware
 * Catches all errors and returns standardized responses
 */
export function errorHandler(
  err: Error | AppError,
  req: any,
  res: Response,
  next: any
) {
  // Log the error
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle specific error types
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(
      validationErrorResponse(err.errors)
    );
  }

  if (err instanceof UnauthorizedError) {
    return res.status(err.statusCode).json(unauthorizedResponse());
  }

  if (err instanceof ForbiddenError) {
    return res.status(err.statusCode).json(forbiddenResponse());
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      errorResponse(err.message, err.statusCode)
    );
  }

  // Handle MongoDB validation errors
  if (err.name === 'ValidationError') {
    const errors: { [field: string]: string } = {};
    for (const field in (err as any).errors) {
      errors[field] = (err as any).errors[field].message;
    }
    return res.status(422).json(validationErrorResponse(errors));
  }

  // Handle MongoDB cast errors
  if (err.name === 'CastError') {
    return res.status(400).json(
      errorResponse('Invalid ID format', 400)
    );
  }

  // Handle duplicate key errors
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    return res.status(409).json(
      errorResponse(
        `${field} already exists`,
        409
      )
    );
  }

  // Default server error
  return res.status(500).json(
    serverErrorResponse(
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message
    )
  );
}

/**
 * Async error wrapper
 * Wraps async route handlers and passes errors to error handler
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Centralized error handler for non-Express contexts
 * Returns standardized response for any error
 */
export function handleError(error: Error | AppError): ApiResponse<null> {
  if (error instanceof ValidationError) {
    return validationErrorResponse(error.errors);
  }

  if (error instanceof UnauthorizedError) {
    return unauthorizedResponse();
  }

  if (error instanceof ForbiddenError) {
    return forbiddenResponse();
  }

  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode);
  }

  // Default to server error
  return serverErrorResponse(error.message);
}

/**
 * Assert condition and throw error if false
 */
export function assert(
  condition: boolean,
  error: Error | AppError
): asserts condition {
  if (!condition) {
    throw error;
  }
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
