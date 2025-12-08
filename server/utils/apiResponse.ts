/**
 * API Response Standardization
 * Provides consistent response format across all endpoints
 * Format: { success: boolean, data?: T, error?: string, message?: string }
 */

/**
 * Standard API response type
 * All endpoints should return this format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

/**
 * Success response builder
 * @param data - The response data
 * @param message - Optional success message
 * @returns Standardized success response
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message: message || 'Request successful',
    timestamp: new Date().toISOString(),
    statusCode: 200,
  };
}

/**
 * Error response builder
 * @param error - Error message or error object
 * @param statusCode - HTTP status code
 * @returns Standardized error response
 */
export function errorResponse(
  error: string | Error,
  statusCode: number = 400
): ApiResponse<null> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  return {
    success: false,
    data: null,
    error: errorMessage,
    message: 'Request failed',
    timestamp: new Date().toISOString(),
    statusCode,
  };
}

/**
 * Paginated response builder
 * @param items - Array of items
 * @param total - Total number of items
 * @param page - Current page
 * @param limit - Items per page
 * @param message - Optional message
 * @returns Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number = 1,
  limit: number = 10,
  message?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data: items,
    message: message || 'Data retrieved successfully',
    timestamp: new Date().toISOString(),
    statusCode: 200,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Created response builder (for POST requests)
 * @param data - Created resource
 * @param statusCode - HTTP status (defaults to 201)
 * @returns Created response
 */
export function createdResponse<T>(
  data: T,
  statusCode: number = 201
): ApiResponse<T> {
  return {
    success: true,
    data,
    message: 'Resource created successfully',
    timestamp: new Date().toISOString(),
    statusCode,
  };
}

/**
 * Updated response builder (for PUT/PATCH requests)
 * @param data - Updated resource
 * @returns Updated response
 */
export function updatedResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    message: 'Resource updated successfully',
    timestamp: new Date().toISOString(),
    statusCode: 200,
  };
}

/**
 * Deleted response builder (for DELETE requests)
 * @param data - Deleted resource or deletion confirmation
 * @returns Deleted response
 */
export function deletedResponse<T = null>(data?: T): ApiResponse<T | null> {
  return {
    success: true,
    data: data || null,
    message: 'Resource deleted successfully',
    timestamp: new Date().toISOString(),
    statusCode: 200,
  };
}

/**
 * Validation error response builder
 * @param errors - Validation errors (field: error message)
 * @returns Validation error response
 */
export interface ValidationError {
  [field: string]: string | string[];
}

export function validationErrorResponse(
  errors: ValidationError
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: 'Validation failed',
    message: JSON.stringify(errors),
    timestamp: new Date().toISOString(),
    statusCode: 422,
  };
}

/**
 * Not found response builder
 * @param resource - Resource name (e.g., "User", "Property")
 * @returns Not found response
 */
export function notFoundResponse(resource: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: `${resource} not found`,
    message: `The requested ${resource.toLowerCase()} does not exist`,
    timestamp: new Date().toISOString(),
    statusCode: 404,
  };
}

/**
 * Unauthorized response builder
 * @returns Unauthorized response
 */
export function unauthorizedResponse(): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: 'Unauthorized',
    message: 'Authentication required',
    timestamp: new Date().toISOString(),
    statusCode: 401,
  };
}

/**
 * Forbidden response builder
 * @returns Forbidden response
 */
export function forbiddenResponse(): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: 'Forbidden',
    message: 'Access denied',
    timestamp: new Date().toISOString(),
    statusCode: 403,
  };
}

/**
 * Server error response builder
 * @param message - Error message
 * @returns Server error response
 */
export function serverErrorResponse(
  message: string = 'Internal server error'
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: message,
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    statusCode: 500,
  };
}
