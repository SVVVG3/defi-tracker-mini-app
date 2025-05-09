import React from 'react';
import { AxiosError } from 'axios';

interface ApiErrorFallbackProps {
  /**
   * The error to display
   */
  error: AxiosError | Error | null;
  /**
   * Optional retry function
   */
  onRetry?: () => void;
  /**
   * Customize the retry button text
   */
  retryButtonText?: string;
  /**
   * Whether to show error details in non-production environments
   */
  showDetails?: boolean;
  /**
   * Custom message to show instead of the default
   */
  message?: string;
  /**
   * Custom CSS class name
   */
  className?: string;
}

// Type for API error responses
interface ApiErrorResponse {
  error?: string;
  message?: string;
  [key: string]: any;
}

/**
 * A component to display API errors with a retry option
 */
const ApiErrorFallback: React.FC<ApiErrorFallbackProps> = ({
  error,
  onRetry,
  retryButtonText = 'Try Again',
  showDetails = process.env.NODE_ENV !== 'production',
  message,
  className = '',
}) => {
  if (!error) return null;

  // Determine if it's an Axios error
  const isAxiosError = (error as AxiosError).isAxiosError;
  
  // Get the status code for axios errors
  const statusCode = isAxiosError ? (error as AxiosError).response?.status : null;
  
  // Get error response data safely
  const errorResponseData = isAxiosError 
    ? ((error as AxiosError).response?.data as ApiErrorResponse | undefined)
    : undefined;
  
  // Determine the error message to display
  const errorMessage =
    message ||
    (errorResponseData?.error || errorResponseData?.message) ||
    error.message ||
    'An unexpected error occurred';

  // Get a user-friendly error title based on status code
  const getErrorTitle = () => {
    if (!statusCode) return 'Error';
    
    switch (statusCode) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Authentication Required';
      case 403:
        return 'Access Denied';
      case 404:
        return 'Not Found';
      case 500:
        return 'Server Error';
      default:
        return `Error (${statusCode})`;
    }
  };

  return (
    <div className={`api-error-fallback p-4 bg-error-50 border border-error-300 rounded-lg ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <svg className="h-6 w-6 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-medium text-error-800">{getErrorTitle()}</h3>
          <p className="mt-1 text-sm text-error-700">{errorMessage}</p>
          
          {showDetails && (
            <details className="mt-2">
              <summary className="text-sm cursor-pointer text-error-600">More details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                {isAxiosError
                  ? JSON.stringify((error as AxiosError).response?.data || error, null, 2)
                  : error.stack || error.toString()}
              </pre>
            </details>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 btn btn-secondary btn-sm"
            >
              {retryButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiErrorFallback; 