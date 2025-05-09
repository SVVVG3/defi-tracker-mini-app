import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Error response interface for API errors
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

/**
 * Handler function type for Next.js API routes
 */
export type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Options for the withErrorHandler wrapper
 */
export interface ErrorHandlerOptions {
  logErrors?: boolean;
}

/**
 * Wraps an API handler with consistent error handling
 * 
 * @param handler The API handler function
 * @param options Options for error handling
 */
export function withErrorHandler(
  handler: ApiHandler,
  options: ErrorHandlerOptions = { logErrors: true }
): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      // Log error if enabled
      if (options.logErrors) {
        console.error(`API Error [${req.method} ${req.url}]:`, error);
      }

      // Don't override if response is already sent
      if (res.headersSent) {
        return;
      }

      // Build error response
      const errorResponse: ErrorResponse = {
        error: error.message || 'An unexpected error occurred',
      };

      // Add error code if available
      if (error.code) {
        errorResponse.code = error.code;
      }

      // Add details in development mode
      if (process.env.NODE_ENV === 'development' && error.stack) {
        errorResponse.details = error.stack;
      }

      // Send error response with appropriate status code
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json(errorResponse);
    }
  };
}

/**
 * Custom error class for API errors with status code
 */
export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }

  /**
   * Creates a 400 Bad Request error
   */
  static badRequest(message: string = 'Bad request', code?: string): ApiError {
    return new ApiError(message, 400, code);
  }

  /**
   * Creates a 401 Unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized', code?: string): ApiError {
    return new ApiError(message, 401, code);
  }

  /**
   * Creates a 403 Forbidden error
   */
  static forbidden(message: string = 'Forbidden', code?: string): ApiError {
    return new ApiError(message, 403, code);
  }

  /**
   * Creates a 404 Not Found error
   */
  static notFound(message: string = 'Not found', code?: string): ApiError {
    return new ApiError(message, 404, code);
  }

  /**
   * Creates a 409 Conflict error
   */
  static conflict(message: string = 'Conflict', code?: string): ApiError {
    return new ApiError(message, 409, code);
  }

  /**
   * Creates a 500 Internal Server Error
   */
  static internal(message: string = 'Internal server error', code?: string): ApiError {
    return new ApiError(message, 500, code);
  }
} 